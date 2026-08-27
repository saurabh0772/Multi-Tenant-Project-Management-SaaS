import crypto from "node:crypto";
import { Types } from "mongoose";
import { invitationRepository, FindOrgInvitationsOptions } from "../repositories/invitation.repository.js";
import { userRepository } from "../repositories/user.repository.js";
import { membershipRepository } from "../repositories/membership.repository.js";
import { activityLogRepository } from "../repositories/activity.repository.js";
import { AppError } from "../utils/AppError.js";
import { runInTransaction } from "../utils/transaction.js";
import { CreateInvitationInput } from "../validators/invitation.schema.js";

export class InvitationService {
  /**
   * Generates a cryptographically random invitation token, computes SHA-256 tokenHash,
   * persists tokenHash, and returns raw token once to the caller.
   */
  public async sendInvitation(
    organizationId: string,
    input: CreateInvitationInput,
    actorUserId: string
  ) {
    const email = input.email.toLowerCase().trim();
    const orgObjId = new Types.ObjectId(organizationId);

    // 1. Check if user is already an active member of this organization
    const existingUser = await userRepository.findByEmail(email);
    if (existingUser) {
      const activeMembership = await membershipRepository.findActiveMembership(
        existingUser._id,
        orgObjId
      );
      if (activeMembership) {
        throw new AppError(
          "User is already a member of this organization",
          409,
          "DUPLICATE_RESOURCE"
        );
      }
    }

    // 2. Check if an active pending invitation already exists for this org & email
    const pendingInvitation = await invitationRepository.findPendingByOrgAndEmail(
      organizationId,
      email
    );

    if (pendingInvitation) {
      // If pending invitation exists and is not expired
      if (pendingInvitation.expiresAt > new Date()) {
        throw new AppError(
          "A pending invitation already exists for this email address",
          409,
          "DUPLICATE_RESOURCE"
        );
      }
    }

    // 3. Generate raw token and SHA-256 tokenHash
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const invitation = await invitationRepository.create({
      email,
      organizationId: orgObjId,
      invitedBy: new Types.ObjectId(actorUserId),
      role: input.role,
      tokenHash,
      status: "PENDING",
      expiresAt,
    });

    await activityLogRepository.create({
      organizationId: orgObjId,
      actorId: new Types.ObjectId(actorUserId),
      action: "MEMBER_INVITED",
      entityType: "Invitation",
      entityId: invitation._id,
      metadata: { email, role: input.role },
    });

    return {
      message: "Invitation created successfully",
      invitation: {
        id: invitation._id.toString(),
        email: invitation.email,
        role: invitation.role,
        status: invitation.status,
        expiresAt: invitation.expiresAt,
      },
      token: rawToken, // Returned ONCE to client
    };
  }

  /**
   * Lists organization invitations with safe field projections.
   */
  public async getOrgInvitations(
    organizationId: string,
    options: FindOrgInvitationsOptions
  ) {
    const { invitations, total, page, limit } =
      await invitationRepository.findOrgInvitations(organizationId, options);

    const data = invitations.map((inv) => ({
      id: inv._id.toString(),
      email: inv.email,
      role: inv.role,
      status: inv.status,
      expiresAt: inv.expiresAt,
      createdAt: inv.createdAt,
      invitedBy: inv.invitedBy
        ? {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            id: (inv.invitedBy as any)._id?.toString() || inv.invitedBy.toString(),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            name: (inv.invitedBy as any).name,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            email: (inv.invitedBy as any).email,
          }
        : null,
    }));

    return {
      invitations: data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Revokes a pending invitation (status = REVOKED).
   */
  public async revokeInvitation(
    organizationId: string,
    invitationId: string,
    actorUserId: string
  ) {
    const invitation = await invitationRepository.findOne({
      _id: invitationId,
      organizationId,
    });

    if (!invitation) {
      throw new AppError("Invitation not found", 404, "RESOURCE_NOT_FOUND");
    }

    if (invitation.status !== "PENDING") {
      throw new AppError(
        `Cannot revoke invitation with status '${invitation.status}'`,
        400,
        "VALIDATION_ERROR"
      );
    }

    const updated = await invitationRepository.update(
      { _id: invitationId, organizationId },
      { status: "REVOKED" }
    );

    if (!updated) {
      throw new AppError("Invitation not found", 404, "RESOURCE_NOT_FOUND");
    }

    await activityLogRepository.create({
      organizationId: new Types.ObjectId(organizationId),
      actorId: new Types.ObjectId(actorUserId),
      action: "INVITATION_REVOKED",
      entityType: "Invitation",
      entityId: new Types.ObjectId(invitationId),
    });

    return {
      message: "Invitation revoked successfully",
    };
  }

  /**
   * Accepts invitation using raw token.
   * Hashes token, verifies status, expiration, and authenticated email match.
   * Atomically creates Membership and updates Invitation to ACCEPTED.
   */
  public async acceptInvitation(
    rawToken: string,
    authenticatedUserId: string
  ) {
    const user = await userRepository.findById(authenticatedUserId);
    if (!user || user.status !== "ACTIVE") {
      throw new AppError("User not found or inactive", 401, "UNAUTHORIZED");
    }

    const tokenHash = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");

    const invitation = await invitationRepository.findByTokenHash(tokenHash);

    if (!invitation) {
      throw new AppError(
        "Invalid or expired invitation token",
        404,
        "RESOURCE_NOT_FOUND"
      );
    }

    if (invitation.status === "EXPIRED" || invitation.expiresAt < new Date()) {
      if (invitation.status === "PENDING") {
        await invitationRepository.update(
          { _id: invitation._id },
          { status: "EXPIRED" }
        );
      }
      throw new AppError("Invitation has expired", 400, "VALIDATION_ERROR");
    }

    if (invitation.status !== "PENDING") {
      throw new AppError(
        `Invitation has already been ${invitation.status.toLowerCase()}`,
        400,
        "VALIDATION_ERROR"
      );
    }

    // Email Matching Security Check (Case-insensitive comparison)
    const userEmail = user.email.toLowerCase().trim();
    const invEmail = invitation.email.toLowerCase().trim();

    if (userEmail !== invEmail) {
      throw new AppError(
        "Invitation email does not match authenticated user email",
        403,
        "FORBIDDEN"
      );
    }

    const userObjId = user._id;
    const orgObjId = invitation.organizationId;

    // Check if membership already exists
    const existingMembership = await membershipRepository.findByUserAndOrg(
      userObjId,
      orgObjId
    );

    if (existingMembership && existingMembership.status === "ACTIVE") {
      throw new AppError(
        "User is already an active member of this organization",
        409,
        "DUPLICATE_RESOURCE"
      );
    }

    return await runInTransaction(async (session) => {
      const options = session ? { session } : {};

      // 1. Create or reactivate Membership
      if (existingMembership) {
        await membershipRepository["model"].updateOne(
          { _id: existingMembership._id },
          { role: invitation.role, status: "ACTIVE", joinedAt: new Date() },
          options
        );
      } else {
        await membershipRepository["model"].create(
          [
            {
              userId: userObjId,
              organizationId: orgObjId,
              role: invitation.role,
              status: "ACTIVE",
              joinedAt: new Date(),
            },
          ],
          options
        );
      }

      // 2. Mark Invitation ACCEPTED
      await invitationRepository["model"].updateOne(
        { _id: invitation._id },
        { status: "ACCEPTED", acceptedAt: new Date() },
        options
      );

      // 3. Log Activity
      await activityLogRepository["model"].create(
        [
          {
            organizationId: orgObjId,
            actorId: userObjId,
            action: "INVITATION_ACCEPTED",
            entityType: "Invitation",
            entityId: invitation._id,
          },
        ],
        options
      );

      return {
        message: "Invitation accepted successfully",
        organizationId: orgObjId.toString(),
      };
    });
  }
}

export const invitationService = new InvitationService();
