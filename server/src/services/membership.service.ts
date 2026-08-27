import { Types } from "mongoose";
import {
  membershipRepository,
  FindOrgMembersOptions,
} from "../repositories/membership.repository.js";
import { activityLogRepository } from "../repositories/activity.repository.js";
import { realtimeEventPublisher } from "../realtime/socket.publisher.js";
import { AppError } from "../utils/AppError.js";
import { OrganizationRole } from "../constants/roles.js";

export class MembershipService {
  /**
   * Lists organization members with pagination and filters.
   */
  public async getOrgMembers(
    organizationId: string,
    options: FindOrgMembersOptions
  ) {
    const { members, total, page, limit } =
      await membershipRepository.findOrgMembers(organizationId, options);

    const data = members.map((m) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const user = m.userId as any;
      return {
        id: m._id.toString(),
        userId: user?._id?.toString() || m.userId.toString(),
        user: user
          ? {
              id: user._id.toString(),
              name: user.name,
              email: user.email,
              avatarUrl: user.avatarUrl || null,
            }
          : null,
        role: m.role,
        status: m.status,
        joinedAt: m.joinedAt,
      };
    });

    return {
      members: data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Tenant-scoped lookup of specific member document by ID and Organization ID.
   */
  public async getMemberDetails(organizationId: string, memberId: string) {
    const membership = await membershipRepository.findMemberInOrg(
      memberId,
      organizationId
    );

    if (!membership || membership.status === "REMOVED") {
      throw new AppError("Member not found", 404, "RESOURCE_NOT_FOUND");
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = membership.userId as any;

    return {
      id: membership._id.toString(),
      user: user
        ? {
            id: user._id.toString(),
            name: user.name,
            email: user.email,
            avatarUrl: user.avatarUrl || null,
          }
        : null,
      role: membership.role,
      status: membership.status,
      joinedAt: membership.joinedAt,
    };
  }

  /**
   * Updates a member's role with owner protection and admin boundaries.
   */
  public async updateMemberRole(
    organizationId: string,
    memberId: string,
    newRole: "ADMIN" | "MANAGER" | "MEMBER",
    actor: { userId: string; role: OrganizationRole }
  ) {
    const membership = await membershipRepository.findMemberInOrg(
      memberId,
      organizationId
    );

    if (!membership || membership.status === "REMOVED") {
      throw new AppError("Member not found", 404, "RESOURCE_NOT_FOUND");
    }

    // Owner Protection Invariant: Cannot change role of an OWNER via generic role update
    if (membership.role === "OWNER") {
      throw new AppError(
        "Cannot modify role of organization owner. Use ownership transfer instead.",
        403,
        "FORBIDDEN"
      );
    }

    // Admin Boundary: ADMIN cannot modify another ADMIN or grant OWNER
    if (actor.role === "ADMIN") {
      if (membership.role === "ADMIN") {
        throw new AppError(
          "Administrators cannot modify another administrator's role",
          403,
          "FORBIDDEN"
        );
      }
    }

    const updated = await membershipRepository.update(
      { _id: memberId, organizationId },
      { role: newRole }
    );

    if (!updated) {
      throw new AppError("Member not found", 404, "RESOURCE_NOT_FOUND");
    }

    await activityLogRepository.create({
      organizationId: new Types.ObjectId(organizationId),
      actorId: new Types.ObjectId(actor.userId),
      action: "MEMBER_ROLE_CHANGED",
      entityType: "Membership",
      entityId: updated._id,
      metadata: { previousRole: membership.role, newRole },
    });

    const resultRole = {
      id: updated._id.toString(),
      role: updated.role,
      status: updated.status,
    };

    realtimeEventPublisher.publishMemberEvent(
      "member:role-changed",
      organizationId,
      memberId,
      { member: resultRole, actorId: actor.userId }
    );

    return resultRole;
  }

  /**
   * Updates a member's status (ACTIVE or SUSPENDED).
   */
  public async updateMemberStatus(
    organizationId: string,
    memberId: string,
    newStatus: "ACTIVE" | "SUSPENDED",
    actor: { userId: string; role: OrganizationRole }
  ) {
    const membership = await membershipRepository.findMemberInOrg(
      memberId,
      organizationId
    );

    if (!membership || membership.status === "REMOVED") {
      throw new AppError("Member not found", 404, "RESOURCE_NOT_FOUND");
    }

    // Owner Protection Invariant: Cannot suspend organization owner
    if (membership.role === "OWNER") {
      throw new AppError(
        "Cannot suspend organization owner",
        403,
        "FORBIDDEN"
      );
    }

    // Admin Boundary: ADMIN cannot suspend another ADMIN
    if (actor.role === "ADMIN" && membership.role === "ADMIN") {
      throw new AppError(
        "Administrators cannot suspend another administrator",
        403,
        "FORBIDDEN"
      );
    }

    const updated = await membershipRepository.update(
      { _id: memberId, organizationId },
      { status: newStatus }
    );

    if (!updated) {
      throw new AppError("Member not found", 404, "RESOURCE_NOT_FOUND");
    }

    const actionName =
      newStatus === "SUSPENDED" ? "MEMBER_SUSPENDED" : "MEMBER_REACTIVATED";

    await activityLogRepository.create({
      organizationId: new Types.ObjectId(organizationId),
      actorId: new Types.ObjectId(actor.userId),
      action: actionName,
      entityType: "Membership",
      entityId: updated._id,
      metadata: { status: newStatus },
    });

    const resultStatus = {
      id: updated._id.toString(),
      role: updated.role,
      status: updated.status,
    };

    realtimeEventPublisher.publishMemberEvent(
      "member:updated",
      organizationId,
      memberId,
      { member: resultStatus, actorId: actor.userId }
    );

    return resultStatus;
  }

  /**
   * Removes a member from organization (status = REMOVED).
   */
  public async removeMember(
    organizationId: string,
    memberId: string,
    actor: { userId: string; role: OrganizationRole }
  ) {
    const membership = await membershipRepository.findMemberInOrg(
      memberId,
      organizationId
    );

    if (!membership || membership.status === "REMOVED") {
      throw new AppError("Member not found", 404, "RESOURCE_NOT_FOUND");
    }

    // Owner Protection Invariant: Cannot remove organization owner
    if (membership.role === "OWNER") {
      throw new AppError("Cannot remove organization owner", 403, "FORBIDDEN");
    }

    // Admin Boundary: ADMIN cannot remove another ADMIN
    if (actor.role === "ADMIN" && membership.role === "ADMIN") {
      throw new AppError(
        "Administrators cannot remove another administrator",
        403,
        "FORBIDDEN"
      );
    }

    const updated = await membershipRepository.update(
      { _id: memberId, organizationId },
      { status: "REMOVED" }
    );

    if (!updated) {
      throw new AppError("Member not found", 404, "RESOURCE_NOT_FOUND");
    }

    await activityLogRepository.create({
      organizationId: new Types.ObjectId(organizationId),
      actorId: new Types.ObjectId(actor.userId),
      action: "MEMBER_REMOVED",
      entityType: "Membership",
      entityId: updated._id,
    });

    realtimeEventPublisher.publishMemberEvent(
      "member:removed",
      organizationId,
      memberId,
      { memberId, actorId: actor.userId }
    );

    return {
      message: "Member removed successfully",
    };
  }
}

export const membershipService = new MembershipService();
