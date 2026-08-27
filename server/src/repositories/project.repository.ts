import { Types } from "mongoose";
import { BaseRepository } from "./base.repository.js";
import { Project, IProjectDocument } from "../models/project.model.js";

export interface FindOrgProjectsOptions {
  page?: number;
  limit?: number;
  status?: string;
  ownerId?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export class ProjectRepository extends BaseRepository<IProjectDocument> {
  constructor() {
    super(Project);
  }

  /**
   * Tenant-scoped project lookup by ID
   */
  public async getProjectById(
    projectId: Types.ObjectId | string,
    organizationId: Types.ObjectId | string
  ): Promise<IProjectDocument | null> {
    return await this.model
      .findOne({ _id: projectId, organizationId })
      .populate("ownerId", "name email avatarUrl status")
      .populate("createdBy", "name email")
      .exec();
  }

  /**
   * Tenant-scoped project lookup by slug
   */
  public async findBySlug(
    slug: string,
    organizationId: Types.ObjectId | string
  ): Promise<IProjectDocument | null> {
    return await this.findOne({
      slug: slug.toLowerCase().trim(),
      organizationId,
    });
  }

  /**
   * Tenant-scoped retrieval of active projects
   */
  public async findOrgProjects(
    organizationId: Types.ObjectId | string
  ): Promise<IProjectDocument[]> {
    return await this.findMany({
      organizationId,
      status: { $ne: "ARCHIVED" },
    });
  }

  /**
   * Tenant-scoped paginated search, filter, and sorting for organization projects
   */
  public async findOrgProjectsPaginated(
    organizationId: Types.ObjectId | string,
    options: FindOrgProjectsOptions = {}
  ): Promise<{ projects: IProjectDocument[]; total: number; page: number; limit: number }> {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 20));
    const skip = (page - 1) * limit;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: Record<string, any> = { organizationId };

    // Status filtering
    if (options.status) {
      if (options.status !== "ALL") {
        filter.status = options.status;
      }
    } else {
      filter.status = { $ne: "ARCHIVED" };
    }

    // Owner filtering
    if (options.ownerId) {
      filter.ownerId = options.ownerId;
    }

    // Sanitized tenant-scoped text search
    if (options.search) {
      const safeSearch = options.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const searchRegex = new RegExp(safeSearch, "i");
      filter.$or = [
        { name: searchRegex },
        { description: searchRegex },
        { slug: searchRegex },
      ];
    }

    // Whitelisted sorting
    const allowedSortFields = [
      "createdAt",
      "updatedAt",
      "name",
      "startDate",
      "dueDate",
      "status",
    ];
    const sortField =
      options.sortBy && allowedSortFields.includes(options.sortBy)
        ? options.sortBy
        : "createdAt";
    const sortDirection = options.sortOrder === "asc" ? 1 : -1;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sortOptions: Record<string, any> = { [sortField]: sortDirection };

    const [projects, total] = await Promise.all([
      this.model
        .find(filter)
        .populate("ownerId", "name email avatarUrl status")
        .populate("createdBy", "name email")
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .exec(),
      this.model.countDocuments(filter).exec(),
    ]);

    return {
      projects,
      total,
      page,
      limit,
    };
  }

  /**
   * Tenant-scoped update operation
   */
  public async updateProjectInOrg(
    projectId: Types.ObjectId | string,
    organizationId: Types.ObjectId | string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    updateData: Record<string, any>
  ): Promise<IProjectDocument | null> {
    return await this.model
      .findOneAndUpdate({ _id: projectId, organizationId }, updateData, {
        new: true,
        runValidators: true,
      })
      .populate("ownerId", "name email avatarUrl status")
      .populate("createdBy", "name email")
      .exec();
  }

  /**
   * Tenant-scoped deletion operation
   */
  public async deleteProjectInOrg(
    projectId: Types.ObjectId | string,
    organizationId: Types.ObjectId | string
  ): Promise<boolean> {
    const result = await this.model
      .deleteOne({ _id: projectId, organizationId })
      .exec();
    return result.deletedCount > 0;
  }
}

export const projectRepository = new ProjectRepository();
