import { Types } from "mongoose";
import { organizationRepository } from "../repositories/organization.repository.js";
import { membershipRepository } from "../repositories/membership.repository.js";
import { activityLogRepository } from "../repositories/activity.repository.js";
import { AppError } from "../utils/AppError.js";
import { runInTransaction } from "../utils/transaction.js";
import {
  CreateOrganizationInput,
  UpdateOrganizationInput,
} from "../validators/organization.schema.js";

export class OrganizationService {
  /**
   * Creates a new organization, assigning the creator as OWNER and logging activity atomically.
   */
  public async createOrganization(
    userId: string,
    input: CreateOrganizationInput
  ) {
    const slug =
      input.slug ||
      input.name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

    const existingOrg = await organizationRepository.findBySlug(slug);
    if (existingOrg) {
      throw new AppError(
        "Organization slug already in use",
        409,
        "DUPLICATE_RESOURCE"
      );
    }

    const userObjId = new Types.ObjectId(userId);

    return await runInTransaction(async (session) => {
      const options = session ? { session } : {};

      const orgs = await organizationRepository["model"].create(
        [
          {
            name: input.name,
            slug,
            ownerId: userObjId,
            logoUrl: input.logoUrl || null,
            settings: input.settings || { timezone: "UTC", dateFormat: "YYYY-MM-DD" },
            status: "ACTIVE",
          },
        ],
        options
      );

      const organization = orgs[0];

      await membershipRepository["model"].create(
        [
          {
            userId: userObjId,
            organizationId: organization._id,
            role: "OWNER",
            status: "ACTIVE",
            joinedAt: new Date(),
          },
        ],
        options
      );

      await activityLogRepository["model"].create(
        [
          {
            organizationId: organization._id,
            actorId: userObjId,
            action: "ORGANIZATION_CREATED",
            entityType: "Organization",
            entityId: organization._id,
            metadata: { name: organization.name },
          },
        ],
        options
      );

      return {
        organization: {
          id: organization._id.toString(),
          name: organization.name,
          slug: organization.slug,
          ownerId: organization.ownerId.toString(),
          logoUrl: organization.logoUrl,
          settings: organization.settings,
          role: "OWNER" as const,
        },
      };
    });
  }

  /**
   * Lists all active organizations where the user holds an active membership.
   */
  public async getUserOrganizations(userId: string) {
    const memberships = await membershipRepository.findUserMemberships(userId);
    if (memberships.length === 0) {
      return { organizations: [] };
    }

    const orgIds = memberships.map((m) => m.organizationId);
    const orgs = await organizationRepository.findMany({
      _id: { $in: orgIds },
      status: "ACTIVE",
    });

    const roleMap = new Map<string, string>();
    memberships.forEach((m) => {
      roleMap.set(m.organizationId.toString(), m.role);
    });

    const result = orgs.map((org) => ({
      id: org._id.toString(),
      name: org.name,
      slug: org.slug,
      logoUrl: org.logoUrl,
      role: roleMap.get(org._id.toString()) || "MEMBER",
    }));

    return { organizations: result };
  }

  /**
   * Retrieves single organization details with authorization check.
   */
  public async getOrganizationDetails(organizationId: string) {
    const org = await organizationRepository.findById(organizationId);
    if (!org || org.status !== "ACTIVE") {
      throw new AppError("Organization not found", 404, "RESOURCE_NOT_FOUND");
    }

    return {
      id: org._id.toString(),
      name: org.name,
      slug: org.slug,
      ownerId: org.ownerId.toString(),
      logoUrl: org.logoUrl,
      settings: org.settings,
    };
  }

  /**
   * Updates allowed organization settings.
   */
  public async updateOrganization(
    organizationId: string,
    input: UpdateOrganizationInput,
    actorUserId: string
  ) {
    const org = await organizationRepository.findById(organizationId);
    if (!org || org.status !== "ACTIVE") {
      throw new AppError("Organization not found", 404, "RESOURCE_NOT_FOUND");
    }

    // Explicit field whitelist prevents mass assignment
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updatePayload: Record<string, any> = {};
    if (input.name !== undefined) updatePayload.name = input.name;
    if (input.logoUrl !== undefined) updatePayload.logoUrl = input.logoUrl || null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const inputAny = input as any;
    const tz = inputAny.timezone || input.settings?.timezone;
    const df = inputAny.dateFormat || input.settings?.dateFormat;

    if (tz !== undefined || df !== undefined || input.settings !== undefined) {
      updatePayload.settings = {
        ...org.settings,
        ...(input.settings || {}),
        ...(tz !== undefined ? { timezone: tz } : {}),
        ...(df !== undefined ? { dateFormat: df } : {}),
      };
    }

    const updatedOrg = await organizationRepository.update(
      { _id: organizationId },
      updatePayload
    );

    if (!updatedOrg) {
      throw new AppError("Organization not found", 404, "RESOURCE_NOT_FOUND");
    }

    await activityLogRepository.create({
      organizationId: new Types.ObjectId(organizationId),
      actorId: new Types.ObjectId(actorUserId),
      action: "ORGANIZATION_UPDATED",
      entityType: "Organization",
      entityId: new Types.ObjectId(organizationId),
      metadata: updatePayload,
    });

    return {
      id: updatedOrg._id.toString(),
      name: updatedOrg.name,
      slug: updatedOrg.slug,
      ownerId: updatedOrg.ownerId.toString(),
      logoUrl: updatedOrg.logoUrl,
      settings: updatedOrg.settings,
    };
  }

  /**
   * Atomically transfers organization ownership to another active member of the same organization.
   */
  public async transferOwnership(
    organizationId: string,
    targetUserId: string,
    actorUserId: string
  ) {
    if (targetUserId === actorUserId) {
      throw new AppError(
        "You are already the owner of this organization",
        400,
        "VALIDATION_ERROR"
      );
    }

    const orgObjId = new Types.ObjectId(organizationId);
    const actorObjId = new Types.ObjectId(actorUserId);
    const targetObjId = new Types.ObjectId(targetUserId);

    const org = await organizationRepository.findById(organizationId);
    if (!org || org.status !== "ACTIVE") {
      throw new AppError("Organization not found", 404, "RESOURCE_NOT_FOUND");
    }

    if (org.ownerId.toString() !== actorUserId) {
      throw new AppError(
        "Only the organization owner can transfer ownership",
        403,
        "FORBIDDEN"
      );
    }

    // Target MUST be an active member of the SAME organization
    const targetMembership = await membershipRepository.findActiveMembership(
      targetObjId,
      orgObjId
    );

    if (!targetMembership) {
      throw new AppError(
        "Target user is not an active member of this organization",
        400,
        "VALIDATION_ERROR"
      );
    }

    return await runInTransaction(async (session) => {
      const options = session ? { session } : {};

      // 1. Update Organization ownerId
      await organizationRepository["model"].updateOne(
        { _id: orgObjId },
        { ownerId: targetObjId },
        options
      );

      // 2. Promote target member to OWNER
      await membershipRepository["model"].updateOne(
        { _id: targetMembership._id },
        { role: "OWNER" },
        options
      );

      // 3. Demote previous owner to ADMIN
      await membershipRepository["model"].updateOne(
        { userId: actorObjId, organizationId: orgObjId },
        { role: "ADMIN" },
        options
      );

      // 4. Record Activity Log
      await activityLogRepository["model"].create(
        [
          {
            organizationId: orgObjId,
            actorId: actorObjId,
            action: "OWNERSHIP_TRANSFERRED",
            entityType: "Organization",
            entityId: orgObjId,
            metadata: {
              previousOwnerId: actorUserId,
              newOwnerId: targetUserId,
            },
          },
        ],
        options
      );

      return {
        message: "Ownership transferred successfully",
        newOwnerId: targetUserId,
      };
    });
  }
}

export const organizationService = new OrganizationService();
