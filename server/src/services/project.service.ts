import { Types } from "mongoose";
import {
  projectRepository,
  FindOrgProjectsOptions,
} from "../repositories/project.repository.js";
import { taskRepository } from "../repositories/task.repository.js";
import { membershipRepository } from "../repositories/membership.repository.js";
import { activityLogRepository } from "../repositories/activity.repository.js";
import { realtimeEventPublisher } from "../realtime/socket.publisher.js";
import { authorizationService } from "./authorization.service.js";
import { searchService } from "./search.service.js";
import { AppError } from "../utils/AppError.js";
import { runInTransaction } from "../utils/transaction.js";
import {
  CreateProjectInput,
  UpdateProjectInput,
} from "../validators/project.schema.js";
import { IProjectDocument } from "../models/project.model.js";
import { OrganizationRole } from "../constants/roles.js";

export class ProjectService {
  /**
   * Helper to format safe project response DTO with user roles included
   */
  private async formatProjectResponse(project: IProjectDocument) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const owner = project.ownerId as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const creator = project.createdBy as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const membersArr = Array.isArray(project.members) ? (project.members as any[]) : [];

    const orgMemberships = await membershipRepository.findMany({
      organizationId: project.organizationId,
      status: { $ne: "REMOVED" },
    });

    const userRoleMap = new Map<string, string>();
    orgMemberships.forEach((m) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mUser = m.userId as any;
      const uIdStr = mUser?._id ? mUser._id.toString() : m.userId?.toString() || "";
      if (uIdStr) {
        userRoleMap.set(uIdStr, m.role);
      }
    });

    const formattedMembers = membersArr.map((m) => {
      if (typeof m === "object" && m !== null) {
        const idStr = m._id ? m._id.toString() : m.id?.toString() || "";
        return {
          id: idStr,
          name: m.name || "",
          email: m.email || "",
          role: userRoleMap.get(idStr) || "MEMBER",
          avatarUrl: m.avatarUrl || null,
        };
      }
      const idStr = m.toString();
      return {
        id: idStr,
        name: "Member",
        email: "",
        role: userRoleMap.get(idStr) || "MEMBER",
        avatarUrl: null,
      };
    });

    const ownerIdStr = owner?._id ? owner._id.toString() : project.ownerId.toString();
    const creatorIdStr = creator?._id ? creator._id.toString() : project.createdBy.toString();

    return {
      id: project._id.toString(),
      organizationId: project.organizationId.toString(),
      name: project.name,
      slug: project.slug,
      description: project.description || "",
      ownerId: ownerIdStr,
      owner: owner?._id
        ? {
            id: ownerIdStr,
            name: owner.name,
            email: owner.email,
            role: userRoleMap.get(ownerIdStr) || "OWNER",
            avatarUrl: owner.avatarUrl || null,
          }
        : null,
      createdBy: creator?._id
        ? {
            id: creatorIdStr,
            name: creator.name,
            email: creator.email,
            role: userRoleMap.get(creatorIdStr) || "MEMBER",
          }
        : project.createdBy.toString(),
      members: formattedMembers,
      memberIds: formattedMembers.map((m) => m.id),
      status: project.status,
      startDate: project.startDate || null,
      dueDate: project.dueDate || null,
      archivedAt: project.archivedAt || null,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    };
  }

  /**
   * Helper to get user's accessible project IDs for non-admin/owner roles
   */
  public async getAccessibleProjectIds(
    organizationId: string,
    userId: string,
    role: OrganizationRole
  ): Promise<Types.ObjectId[] | null> {
    if (role === "OWNER" || role === "ADMIN") {
      return null; // Full organization access
    }

    const orgObjId = new Types.ObjectId(organizationId);
    const userObjId = new Types.ObjectId(userId);

    const [projectMemberIds, taskProjectIds] = await Promise.all([
      projectRepository.findUserAccessibleProjectIds(userObjId, orgObjId),
      taskRepository.findProjectIdsForUser(userObjId, orgObjId),
    ]);

    const allIds = new Set<string>();
    projectMemberIds.forEach((id) => allIds.add(id.toString()));
    taskProjectIds.forEach((id) => allIds.add(id.toString()));

    return Array.from(allIds).map((idStr) => new Types.ObjectId(idStr));
  }

  /**
   * Creates a new project in the target organization with multiple members validation.
   */
  public async createProject(
    organizationId: string,
    input: CreateProjectInput,
    actorUserId: string,
    actorRole: OrganizationRole
  ) {
    if (actorRole === "MEMBER") {
      throw new AppError(
        "Members are not permitted to create projects",
        403,
        "FORBIDDEN"
      );
    }

    if (input.startDate && input.dueDate && new Date(input.dueDate) < new Date(input.startDate)) {
      throw new AppError(
        "Due date must be on or after start date",
        400,
        "VALIDATION_ERROR"
      );
    }

    const orgObjId = new Types.ObjectId(organizationId);
    const actorObjId = new Types.ObjectId(actorUserId);
    const targetOwnerId = input.ownerId || actorUserId;
    const ownerObjId = new Types.ObjectId(targetOwnerId);

    // 1. Validate owner has ACTIVE membership in the SAME organization
    const activeOwnerMembership =
      await membershipRepository.findActiveMembership(
        ownerObjId,
        orgObjId
      );

    if (!activeOwnerMembership) {
      throw new AppError(
        "Project owner must be an active member of the target organization",
        400,
        "VALIDATION_ERROR"
      );
    }

    // 2. Build unique project members list (owner + creator + input.memberIds)
    const membersSet = new Set<string>();
    membersSet.add(ownerObjId.toString());
    membersSet.add(actorObjId.toString());

    if (input.memberIds && Array.isArray(input.memberIds)) {
      for (const mId of input.memberIds) {
        if (mId) {
          const activeMem = await membershipRepository.findActiveMembership(
            mId,
            orgObjId
          );
          if (activeMem) {
            membersSet.add(mId.toString());
          }
        }
      }
    }

    const memberObjectIds = Array.from(membersSet).map(
      (idStr) => new Types.ObjectId(idStr)
    );

    // 3. Generate slug if omitted
    const slug =
      input.slug ||
      input.name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

    // 4. Tenant-scoped slug uniqueness check
    const existingProject = await projectRepository.findBySlug(
      slug,
      orgObjId
    );

    if (existingProject) {
      throw new AppError(
        "Project slug already exists in this organization",
        409,
        "DUPLICATE_RESOURCE"
      );
    }

    // 5. Atomic project creation and activity logging
    return await runInTransaction(async (session) => {
      const options = session ? { session } : {};

      const projects = await projectRepository["model"].create(
        [
          {
            organizationId: orgObjId,
            name: input.name,
            slug,
            description: input.description || "",
            ownerId: ownerObjId,
            createdBy: actorObjId,
            members: memberObjectIds,
            status: input.status || "PLANNING",
            startDate: input.startDate ? new Date(input.startDate) : null,
            dueDate: input.dueDate ? new Date(input.dueDate) : null,
          },
        ],
        options
      );

      const createdProject = projects[0];

      await activityLogRepository["model"].create(
        [
          {
            organizationId: orgObjId,
            actorId: actorObjId,
            action: "PROJECT_CREATED",
            entityType: "Project",
            entityId: createdProject._id,
            metadata: {
              name: createdProject.name,
              slug: createdProject.slug,
              ownerId: targetOwnerId,
              memberCount: memberObjectIds.length,
            },
          },
        ],
        options
      );

      // Populate references for clean DTO formatting
      const populatedProject = await projectRepository.getProjectById(
        createdProject._id,
        orgObjId
      );

      const formatted = await this.formatProjectResponse(populatedProject || createdProject);
      const result = { project: formatted };

      realtimeEventPublisher.publishProjectEvent(
        "project:created",
        organizationId,
        createdProject._id.toString(),
        { project: result.project, actorId: actorUserId }
      );

      searchService.invalidateSearchCache(organizationId);

      return result;
    });
  }

  /**
   * Lists, filters, searches, and paginates organization projects based on role & project visibility.
   */
  public async listProjects(
    organizationId: string,
    options: FindOrgProjectsOptions,
    actorUserId: string,
    actorRole: OrganizationRole
  ) {
    const accessibleProjectIds = await this.getAccessibleProjectIds(
      organizationId,
      actorUserId,
      actorRole
    );

    const { projects, total, page, limit } =
      await projectRepository.findOrgProjectsPaginated(
        organizationId,
        options,
        accessibleProjectIds
      );

    const formattedProjects = await Promise.all(projects.map((p) => this.formatProjectResponse(p)));

    return {
      projects: formattedProjects,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Tenant-scoped lookup for specific project details with authorization checks.
   */
  public async getProjectDetails(
    organizationId: string,
    projectId: string,
    actorUserId: string,
    actorRole: OrganizationRole
  ) {
    const project = await projectRepository.getProjectById(
      projectId,
      organizationId
    );

    if (!project) {
      throw new AppError("Project not found", 404, "RESOURCE_NOT_FOUND");
    }

    authorizationService.assertProjectAccess(project, actorUserId, actorRole);

    const formatted = await this.formatProjectResponse(project);

    return {
      project: formatted,
    };
  }

  /**
   * Updates project details with role, project-level authorization, and project members management.
   */
  public async updateProject(
    organizationId: string,
    projectId: string,
    input: UpdateProjectInput,
    actorUserId: string,
    actorRole: OrganizationRole
  ) {
    const orgObjId = new Types.ObjectId(organizationId);
    const actorObjId = new Types.ObjectId(actorUserId);

    const project = await projectRepository.getProjectById(
      projectId,
      orgObjId
    );

    if (!project) {
      throw new AppError("Project not found", 404, "RESOURCE_NOT_FOUND");
    }

    authorizationService.assertProjectUpdateAccess(project, actorUserId, actorRole);

    const newStartDate = input.startDate !== undefined ? (input.startDate ? new Date(input.startDate) : null) : project.startDate;
    const newDueDate = input.dueDate !== undefined ? (input.dueDate ? new Date(input.dueDate) : null) : project.dueDate;

    if (newStartDate && newDueDate && new Date(newDueDate) < new Date(newStartDate)) {
      throw new AppError(
        "Due date must be on or after start date",
        400,
        "VALIDATION_ERROR"
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updatePayload: Record<string, any> = {};

    if (input.name !== undefined) updatePayload.name = input.name;
    if (input.description !== undefined) updatePayload.description = input.description;
    if (input.startDate !== undefined) {
      updatePayload.startDate = input.startDate ? new Date(input.startDate) : null;
    }
    if (input.dueDate !== undefined) {
      updatePayload.dueDate = input.dueDate ? new Date(input.dueDate) : null;
    }

    // Owner validation if ownerId is changed
    let targetOwnerId = project.ownerId.toString();
    if (input.ownerId !== undefined && input.ownerId !== project.ownerId.toString()) {
      const activeOwner = await membershipRepository.findActiveMembership(
        input.ownerId,
        orgObjId
      );

      if (!activeOwner) {
        throw new AppError(
          "Project owner must be an active member of the target organization",
          400,
          "VALIDATION_ERROR"
        );
      }
      targetOwnerId = input.ownerId;
      updatePayload.ownerId = new Types.ObjectId(input.ownerId);
    }

    // Project members update if memberIds is provided
    if (input.memberIds !== undefined && Array.isArray(input.memberIds)) {
      const membersSet = new Set<string>();
      membersSet.add(targetOwnerId);
      membersSet.add(project.createdBy.toString());

      for (const mId of input.memberIds) {
        if (mId) {
          const activeMem = await membershipRepository.findActiveMembership(
            mId,
            orgObjId
          );
          if (activeMem) {
            membersSet.add(mId.toString());
          }
        }
      }

      updatePayload.members = Array.from(membersSet).map(
        (idStr) => new Types.ObjectId(idStr)
      );
    }

    // Slug validation if slug is changed
    if (input.slug !== undefined && input.slug !== project.slug) {
      const existing = await projectRepository.findBySlug(input.slug, orgObjId);
      if (existing && existing._id.toString() !== projectId) {
        throw new AppError(
          "Project slug already exists in this organization",
          409,
          "DUPLICATE_RESOURCE"
        );
      }
      updatePayload.slug = input.slug;
    }

    // Status & Archiving synchronization
    if (input.status !== undefined && input.status !== project.status) {
      updatePayload.status = input.status;
      if (input.status === "ARCHIVED") {
        updatePayload.archivedAt = new Date();
      } else if (project.status === "ARCHIVED") {
        updatePayload.archivedAt = null;
      }
    }

    const updatedProject = await projectRepository.updateProjectInOrg(
      projectId,
      orgObjId,
      updatePayload
    );

    if (!updatedProject) {
      throw new AppError("Project not found", 404, "RESOURCE_NOT_FOUND");
    }

    // Activity Logging
    let actionName = "PROJECT_UPDATED";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let activityMetadata: Record<string, any> = updatePayload;

    if (input.status !== undefined && input.status !== project.status) {
      actionName = "PROJECT_STATUS_CHANGED";
      activityMetadata = { previousStatus: project.status, newStatus: input.status };
    } else if (input.ownerId !== undefined && input.ownerId !== project.ownerId.toString()) {
      actionName = "PROJECT_OWNER_CHANGED";
      activityMetadata = { previousOwnerId: project.ownerId.toString(), newOwnerId: input.ownerId };
    }

    await activityLogRepository.create({
      organizationId: orgObjId,
      actorId: actorObjId,
      action: actionName,
      entityType: "Project",
      entityId: updatedProject._id,
      metadata: activityMetadata,
    });

    const formattedProject = await this.formatProjectResponse(updatedProject);

    realtimeEventPublisher.publishProjectEvent(
      "project:updated",
      organizationId,
      projectId,
      { project: formattedProject, actorId: actorUserId }
    );

    searchService.invalidateSearchCache(organizationId);

    return {
      project: formattedProject,
    };
  }

  /**
   * Archives a project (OWNER and ADMIN only).
   */
  public async archiveProject(
    organizationId: string,
    projectId: string,
    actorUserId: string,
    actorRole: OrganizationRole
  ) {
    authorizationService.assertProjectArchiveAccess(actorRole);

    const orgObjId = new Types.ObjectId(organizationId);
    const actorObjId = new Types.ObjectId(actorUserId);

    const project = await projectRepository.getProjectById(projectId, orgObjId);
    if (!project) {
      throw new AppError("Project not found", 404, "RESOURCE_NOT_FOUND");
    }

    authorizationService.assertProjectAccess(project, actorUserId, actorRole);

    if (project.status === "ARCHIVED") {
      const formatted = await this.formatProjectResponse(project);
      return {
        message: "Project is already archived",
        project: formatted,
      };
    }

    const updated = await projectRepository.updateProjectInOrg(
      projectId,
      orgObjId,
      { status: "ARCHIVED", archivedAt: new Date() }
    );

    if (!updated) {
      throw new AppError("Project not found", 404, "RESOURCE_NOT_FOUND");
    }

    await activityLogRepository.create({
      organizationId: orgObjId,
      actorId: actorObjId,
      action: "PROJECT_ARCHIVED",
      entityType: "Project",
      entityId: updated._id,
    });

    const formattedProject = await this.formatProjectResponse(updated);

    realtimeEventPublisher.publishProjectEvent(
      "project:archived",
      organizationId,
      projectId,
      { project: formattedProject, actorId: actorUserId }
    );

    searchService.invalidateSearchCache(organizationId);

    return {
      message: "Project archived successfully",
      project: formattedProject,
    };
  }

  /**
   * Restores an archived project (OWNER and ADMIN only).
   */
  public async restoreProject(
    organizationId: string,
    projectId: string,
    actorUserId: string,
    actorRole: OrganizationRole
  ) {
    authorizationService.assertProjectArchiveAccess(actorRole);

    const orgObjId = new Types.ObjectId(organizationId);
    const actorObjId = new Types.ObjectId(actorUserId);

    const project = await projectRepository.getProjectById(projectId, orgObjId);
    if (!project) {
      throw new AppError("Project not found", 404, "RESOURCE_NOT_FOUND");
    }

    authorizationService.assertProjectAccess(project, actorUserId, actorRole);

    if (project.status !== "ARCHIVED") {
      const formatted = await this.formatProjectResponse(project);
      return {
        message: "Project is not archived",
        project: formatted,
      };
    }

    const updated = await projectRepository.updateProjectInOrg(
      projectId,
      orgObjId,
      { status: "ACTIVE", archivedAt: null }
    );

    if (!updated) {
      throw new AppError("Project not found", 404, "RESOURCE_NOT_FOUND");
    }

    await activityLogRepository.create({
      organizationId: orgObjId,
      actorId: actorObjId,
      action: "PROJECT_RESTORED",
      entityType: "Project",
      entityId: updated._id,
    });

    const formattedProject = await this.formatProjectResponse(updated);

    realtimeEventPublisher.publishProjectEvent(
      "project:restored",
      organizationId,
      projectId,
      { project: formattedProject, actorId: actorUserId }
    );

    searchService.invalidateSearchCache(organizationId);

    return {
      message: "Project restored successfully",
      project: formattedProject,
    };
  }

  /**
   * Deletes a project (OWNER and ADMIN only).
   */
  public async deleteProject(
    organizationId: string,
    projectId: string,
    actorUserId: string,
    actorRole: OrganizationRole
  ) {
    authorizationService.assertProjectDeleteAccess(actorRole);

    const orgObjId = new Types.ObjectId(organizationId);
    const actorObjId = new Types.ObjectId(actorUserId);
    const projObjId = new Types.ObjectId(projectId);

    const project = await projectRepository.getProjectById(projectId, orgObjId);
    if (!project) {
      throw new AppError("Project not found", 404, "RESOURCE_NOT_FOUND");
    }

    authorizationService.assertProjectAccess(project, actorUserId, actorRole);

    return await runInTransaction(async (session) => {
      const options = session ? { session } : {};

      await projectRepository.deleteProjectInOrg(projectId, orgObjId);

      await activityLogRepository["model"].create(
        [
          {
            organizationId: orgObjId,
            actorId: actorObjId,
            action: "PROJECT_DELETED",
            entityType: "Project",
            entityId: projObjId,
            metadata: { name: project.name, slug: project.slug },
          },
        ],
        options
      );

      const result = {
        message: "Project deleted successfully",
      };

      realtimeEventPublisher.publishProjectEvent(
        "project:deleted",
        organizationId,
        projectId,
        { projectId, actorId: actorUserId }
      );

      searchService.invalidateSearchCache(organizationId);

      return result;
    });
  }
}

export const projectService = new ProjectService();
