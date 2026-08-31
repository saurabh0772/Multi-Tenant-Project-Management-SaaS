import { Types } from "mongoose";
import { membershipRepository } from "../repositories/membership.repository.js";
import { OrganizationRole } from "../constants/roles.js";
import { Permission, ROLE_PERMISSIONS } from "../constants/permissions.js";
import { AppError } from "../utils/AppError.js";
import { IMembershipDocument } from "../models/membership.model.js";

export class AuthorizationService {
  /**
   * Retrieves user membership record in an organization (regardless of status)
   */
  public async getMembership(
    userId: Types.ObjectId | string,
    organizationId: Types.ObjectId | string
  ): Promise<IMembershipDocument | null> {
    return await membershipRepository.findByUserAndOrg(userId, organizationId);
  }

  /**
   * Evaluates if user role matches allowed roles
   */
  public hasRole(
    userRole: OrganizationRole,
    allowedRoles: OrganizationRole[]
  ): boolean {
    return allowedRoles.includes(userRole);
  }

  /**
   * Evaluates if user role possesses a specific permission
   */
  public hasPermission(
    userRole: OrganizationRole,
    permission: Permission
  ): boolean {
    const permissions = ROLE_PERMISSIONS[userRole];
    return permissions ? permissions.includes(permission) : false;
  }

  /**
   * Asserts user has an active membership in the target organization
   */
  public async assertOrganizationMember(
    userId: Types.ObjectId | string,
    organizationId: Types.ObjectId | string
  ): Promise<IMembershipDocument> {
    const membership = await this.getMembership(userId, organizationId);

    if (!membership) {
      throw new AppError(
        "Active organization membership required",
        403,
        "MEMBERSHIP_REQUIRED"
      );
    }

    if (membership.status === "SUSPENDED") {
      throw new AppError(
        "Organization membership is suspended",
        403,
        "MEMBERSHIP_SUSPENDED"
      );
    }

    if (membership.status === "REMOVED") {
      throw new AppError(
        "Active organization membership required",
        403,
        "MEMBERSHIP_REQUIRED"
      );
    }

    return membership;
  }

  /**
   * Asserts user role has requested permission
   */
  public assertPermission(
    userRole: OrganizationRole,
    permission: Permission
  ): void {
    if (!this.hasPermission(userRole, permission)) {
      throw new AppError(
        "You do not have permission to perform this action",
        403,
        "FORBIDDEN"
      );
    }
  }

  /**
   * Helper to check if a user is in a project's members list or owner/creator
   */
  public isProjectMember(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    project: { ownerId: any; createdBy: any; members?: any[] },
    userId: string
  ): boolean {
    const ownerStr = project.ownerId?._id
      ? project.ownerId._id.toString()
      : project.ownerId?.toString() || "";
    const creatorStr = project.createdBy?._id
      ? project.createdBy._id.toString()
      : project.createdBy?.toString() || "";

    if (ownerStr === userId || creatorStr === userId) {
      return true;
    }

    if (Array.isArray(project.members)) {
      return project.members.some((m) => {
        if (!m) return false;
        const mStr = typeof m === "object" ? (m._id ? m._id.toString() : m.id?.toString() || "") : m.toString();
        return mStr === userId;
      });
    }

    return false;
  }

  /**
   * Asserts user has access to view/access a specific project
   */
  public assertProjectAccess(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    project: { ownerId: any; createdBy: any; members?: any[] },
    userId: string,
    role: OrganizationRole
  ): void {
    if (role === "OWNER" || role === "ADMIN") {
      return; // OWNER & ADMIN have complete access
    }

    if (!this.isProjectMember(project, userId)) {
      throw new AppError(
        "You do not have permission to access this project",
        403,
        "FORBIDDEN"
      );
    }
  }

  /**
   * Asserts user has permission to update project details
   */
  public assertProjectUpdateAccess(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    project: { ownerId: any; createdBy: any; members?: any[] },
    userId: string,
    role: OrganizationRole
  ): void {
    if (role === "MEMBER") {
      throw new AppError(
        "Members are not permitted to update projects",
        403,
        "FORBIDDEN"
      );
    }

    this.assertProjectAccess(project, userId, role);
  }

  /**
   * Asserts user has permission to delete a project (OWNER & ADMIN only)
   */
  public assertProjectDeleteAccess(role: OrganizationRole): void {
    if (role !== "OWNER" && role !== "ADMIN") {
      throw new AppError(
        "Only organization owners and administrators can delete projects",
        403,
        "FORBIDDEN"
      );
    }
  }

  /**
   * Asserts user has permission to archive or restore a project (OWNER & ADMIN only)
   */
  public assertProjectArchiveAccess(role: OrganizationRole): void {
    if (role !== "OWNER" && role !== "ADMIN") {
      throw new AppError(
        "Only organization owners and administrators can archive or restore projects",
        403,
        "FORBIDDEN"
      );
    }
  }

  /**
   * Asserts user has permission to assign/reassign tasks (OWNER, ADMIN, MANAGER only)
   */
  public assertTaskAssignAccess(role: OrganizationRole): void {
    if (role === "MEMBER") {
      throw new AppError(
        "Members are not permitted to assign or reassign tasks",
        403,
        "FORBIDDEN"
      );
    }
  }

  /**
   * Asserts user has permission to update a task, enforcing MEMBER restrictions on modifying assignedTo and other members' tasks
   */
  public assertTaskUpdateAccess(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    task: { createdBy: any; assignedTo?: any },
    userId: string,
    role: OrganizationRole,
    requestedAssignedTo?: string | null
  ): void {
    if (role === "MEMBER") {
      if (requestedAssignedTo !== undefined) {
        throw new AppError(
          "Members are not permitted to change task assignment",
          403,
          "FORBIDDEN"
        );
      }

      const creatorStr = task.createdBy?._id
        ? task.createdBy._id.toString()
        : task.createdBy?.toString() || "";
      const assigneeStr = task.assignedTo?._id
        ? task.assignedTo._id.toString()
        : task.assignedTo?.toString() || "";

      if (creatorStr !== userId && assigneeStr !== userId) {
        throw new AppError(
          "You do not have permission to edit another member's task",
          403,
          "FORBIDDEN"
        );
      }
    }
  }

  /**
   * Asserts user has permission to move a task between Kanban columns
   */
  public assertTaskMoveAccess(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    task: { createdBy: any; assignedTo?: any },
    userId: string,
    role: OrganizationRole
  ): void {
    if (role === "MEMBER") {
      const creatorStr = task.createdBy?._id
        ? task.createdBy._id.toString()
        : task.createdBy?.toString() || "";
      const assigneeStr = task.assignedTo?._id
        ? task.assignedTo._id.toString()
        : task.assignedTo?.toString() || "";

      if (creatorStr !== userId && assigneeStr !== userId) {
        throw new AppError(
          "You do not have permission to move another member's task",
          403,
          "FORBIDDEN"
        );
      }
    }
  }

  /**
   * Asserts user has permission to delete a task (OWNER, ADMIN, MANAGER only)
   */
  public assertTaskDeleteAccess(role: OrganizationRole): void {
    if (role === "MEMBER") {
      throw new AppError(
        "Members are not permitted to delete tasks",
        403,
        "FORBIDDEN"
      );
    }
  }

  /**
   * Asserts user has permission to create an organization invitation (OWNER and ADMIN only, no OWNER invitations)
   */
  public assertInvitationCreateAccess(
    actorRole: OrganizationRole,
    requestedRole: OrganizationRole
  ): void {
    if (actorRole !== "OWNER" && actorRole !== "ADMIN") {
      throw new AppError(
        "Only organization owners and administrators can send invitations",
        403,
        "FORBIDDEN"
      );
    }

    if (requestedRole === "OWNER") {
      throw new AppError(
        "Creating an OWNER invitation is not permitted",
        403,
        "FORBIDDEN"
      );
    }

    if (!["ADMIN", "MANAGER", "MEMBER"].includes(requestedRole)) {
      throw new AppError(
        "Invalid invitation role requested",
        400,
        "VALIDATION_ERROR"
      );
    }
  }
}

export const authorizationService = new AuthorizationService();
