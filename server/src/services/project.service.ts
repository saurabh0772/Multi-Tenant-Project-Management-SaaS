import { Types } from "mongoose";
import {
  projectRepository,
  FindOrgProjectsOptions,
} from "../repositories/project.repository.js";
import { membershipRepository } from "../repositories/membership.repository.js";
import { activityLogRepository } from "../repositories/activity.repository.js";
import { realtimeEventPublisher } from "../realtime/socket.publisher.js";
import { searchService } from "./search.service.js";
import { AppError } from "../utils/AppError.js";
import { runInTransaction } from "../utils/transaction.js";
import {
  CreateProjectInput,
  UpdateProjectInput,
} from "../validators/project.schema.js";
import { IProjectDocument } from "../models/project.model.js";

export class ProjectService {
  /**
   * Helper to format safe project response DTO
   */
  private formatProjectResponse(project: IProjectDocument) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const owner = project.ownerId as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const creator = project.createdBy as any;

    return {
      id: project._id.toString(),
      organizationId: project.organizationId.toString(),
      name: project.name,
      slug: project.slug,
      description: project.description || "",
      ownerId: owner?._id ? owner._id.toString() : project.ownerId.toString(),
      owner: owner?._id
        ? {
            id: owner._id.toString(),
            name: owner.name,
            email: owner.email,
            avatarUrl: owner.avatarUrl || null,
          }
        : null,
      createdBy: creator?._id
        ? {
            id: creator._id.toString(),
            name: creator.name,
            email: creator.email,
          }
        : project.createdBy.toString(),
      status: project.status,
      startDate: project.startDate || null,
      dueDate: project.dueDate || null,
      archivedAt: project.archivedAt || null,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    };
  }

  /**
   * Creates a new project in the target organization with active owner validation.
   */
  public async createProject(
    organizationId: string,
    input: CreateProjectInput,
    actorUserId: string
  ) {
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

    // 2. Generate slug if omitted
    const slug =
      input.slug ||
      input.name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

    // 3. Tenant-scoped slug uniqueness check
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

    // 4. Atomic project creation and activity logging
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

      const result = {
        project: this.formatProjectResponse(populatedProject || createdProject),
      };

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
   * Lists, filters, searches, and paginates organization projects.
   */
  public async listProjects(
    organizationId: string,
    options: FindOrgProjectsOptions
  ) {
    const { projects, total, page, limit } =
      await projectRepository.findOrgProjectsPaginated(
        organizationId,
        options
      );

    const formattedProjects = projects.map((p) => this.formatProjectResponse(p));

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
   * Tenant-scoped lookup for specific project details.
   */
  public async getProjectDetails(organizationId: string, projectId: string) {
    const project = await projectRepository.getProjectById(
      projectId,
      organizationId
    );

    if (!project) {
      throw new AppError("Project not found", 404, "RESOURCE_NOT_FOUND");
    }

    return {
      project: this.formatProjectResponse(project),
    };
  }

  /**
   * Updates project details with tenant scoping and owner membership validation.
   */
  public async updateProject(
    organizationId: string,
    projectId: string,
    input: UpdateProjectInput,
    actorUserId: string
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
      updatePayload.ownerId = new Types.ObjectId(input.ownerId);
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

    const formattedProject = this.formatProjectResponse(updatedProject);

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
   * Archives a project (status = ARCHIVED, archivedAt = now).
   */
  public async archiveProject(
    organizationId: string,
    projectId: string,
    actorUserId: string
  ) {
    const orgObjId = new Types.ObjectId(organizationId);
    const actorObjId = new Types.ObjectId(actorUserId);

    const project = await projectRepository.getProjectById(projectId, orgObjId);
    if (!project) {
      throw new AppError("Project not found", 404, "RESOURCE_NOT_FOUND");
    }

    if (project.status === "ARCHIVED") {
      return {
        message: "Project is already archived",
        project: this.formatProjectResponse(project),
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

    const formattedProject = this.formatProjectResponse(updated);

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
   * Restores an archived project (status = ACTIVE, archivedAt = null).
   */
  public async restoreProject(
    organizationId: string,
    projectId: string,
    actorUserId: string
  ) {
    const orgObjId = new Types.ObjectId(organizationId);
    const actorObjId = new Types.ObjectId(actorUserId);

    const project = await projectRepository.getProjectById(projectId, orgObjId);
    if (!project) {
      throw new AppError("Project not found", 404, "RESOURCE_NOT_FOUND");
    }

    if (project.status !== "ARCHIVED") {
      return {
        message: "Project is not archived",
        project: this.formatProjectResponse(project),
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

    const formattedProject = this.formatProjectResponse(updated);

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
    actorUserId: string
  ) {
    const orgObjId = new Types.ObjectId(organizationId);
    const actorObjId = new Types.ObjectId(actorUserId);
    const projObjId = new Types.ObjectId(projectId);

    const project = await projectRepository.getProjectById(projectId, orgObjId);
    if (!project) {
      throw new AppError("Project not found", 404, "RESOURCE_NOT_FOUND");
    }

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
