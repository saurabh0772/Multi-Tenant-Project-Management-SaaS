import { Types } from "mongoose";
import { BaseRepository } from "./base.repository.js";
import { Task, ITaskDocument, TaskStatus } from "../models/task.model.js";

export interface FindProjectTasksOptions {
  page?: number;
  limit?: number;
  status?: string;
  priority?: string;
  assignedTo?: string;
  dueDate?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export class TaskRepository extends BaseRepository<ITaskDocument> {
  constructor() {
    super(Task);
  }

  /**
   * Tenant-scoped active task lookup by ID
   */
  public async getTaskById(
    taskId: Types.ObjectId | string,
    organizationId: Types.ObjectId | string
  ): Promise<ITaskDocument | null> {
    return await this.model
      .findOne({
        _id: taskId,
        organizationId,
        $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
      })
      .populate("assignedTo", "name email avatarUrl status")
      .populate("createdBy", "name email")
      .populate("projectId", "name slug")
      .exec();
  }

  /**
   * Tenant and project-scoped active task lookup by ID
   */
  public async getTaskByIdInProject(
    taskId: Types.ObjectId | string,
    projectId: Types.ObjectId | string,
    organizationId: Types.ObjectId | string
  ): Promise<ITaskDocument | null> {
    return await this.model
      .findOne({
        _id: taskId,
        projectId,
        organizationId,
        $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
      })
      .populate("assignedTo", "name email avatarUrl status")
      .populate("createdBy", "name email")
      .populate("projectId", "name slug")
      .exec();
  }

  /**
   * Tenant and project-scoped retrieval of tasks for a project
   */
  public async findProjectTasks(
    projectId: Types.ObjectId | string,
    organizationId: Types.ObjectId | string,
    status?: TaskStatus
  ): Promise<ITaskDocument[]> {
    const filter: Record<string, unknown> = {
      projectId,
      organizationId,
      $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
    };
    if (status) {
      filter.status = status;
    }
    return await this.findMany(filter, undefined, { sort: { position: 1 } });
  }

  /**
   * Tenant and project-scoped paginated search, filter, and sorting for project tasks
   */
  public async findProjectTasksPaginated(
    projectId: Types.ObjectId | string,
    organizationId: Types.ObjectId | string,
    options: FindProjectTasksOptions = {}
  ): Promise<{ tasks: ITaskDocument[]; total: number; page: number; limit: number }> {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 20));
    const skip = (page - 1) * limit;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: Record<string, any> = {
      projectId,
      organizationId,
      $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
    };

    if (options.status) {
      filter.status = options.status;
    }

    if (options.priority) {
      filter.priority = options.priority;
    }

    if (options.assignedTo) {
      filter.assignedTo = options.assignedTo;
    }

    if (options.dueDate) {
      if (options.dueDate === "overdue") {
        filter.dueDate = { $lt: new Date() };
      } else {
        filter.dueDate = new Date(options.dueDate);
      }
    }

    if (options.search) {
      const safeSearch = options.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const searchRegex = new RegExp(safeSearch, "i");
      filter.$or = [
        { title: searchRegex },
        { description: searchRegex },
        { labels: searchRegex },
      ];
    }

    const allowedSortFields = [
      "position",
      "createdAt",
      "updatedAt",
      "dueDate",
      "priority",
      "title",
    ];
    const sortField =
      options.sortBy && allowedSortFields.includes(options.sortBy)
        ? options.sortBy
        : "position";
    const sortDirection = options.sortOrder === "desc" ? -1 : 1;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sortOptions: Record<string, any> = { [sortField]: sortDirection };

    const [tasks, total] = await Promise.all([
      this.model
        .find(filter)
        .populate("assignedTo", "name email avatarUrl status")
        .populate("createdBy", "name email")
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .exec(),
      this.model.countDocuments(filter).exec(),
    ]);

    return {
      tasks,
      total,
      page,
      limit,
    };
  }

  /**
   * Tenant-scoped retrieval of active tasks assigned to a specific user ("My Tasks")
   */
  public async findMyTasksPaginated(
    userId: Types.ObjectId | string,
    organizationId: Types.ObjectId | string,
    options: FindProjectTasksOptions = {}
  ): Promise<{ tasks: ITaskDocument[]; total: number; page: number; limit: number }> {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 20));
    const skip = (page - 1) * limit;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: Record<string, any> = {
      assignedTo: userId,
      organizationId,
      $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
    };

    if (options.status) {
      filter.status = options.status;
    }

    if (options.priority) {
      filter.priority = options.priority;
    }

    if (options.search) {
      const safeSearch = options.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const searchRegex = new RegExp(safeSearch, "i");
      filter.$or = [
        { title: searchRegex },
        { description: searchRegex },
        { labels: searchRegex },
      ];
    }

    const sortField = options.sortBy || "dueDate";
    const sortDirection = options.sortOrder === "desc" ? -1 : 1;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sortOptions: Record<string, any> = { [sortField]: sortDirection };

    const [tasks, total] = await Promise.all([
      this.model
        .find(filter)
        .populate("projectId", "name slug")
        .populate("assignedTo", "name email avatarUrl status")
        .populate("createdBy", "name email")
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .exec(),
      this.model.countDocuments(filter).exec(),
    ]);

    return {
      tasks,
      total,
      page,
      limit,
    };
  }

  /**
   * Tenant-scoped update for an active task
   */
  public async updateTaskInOrg(
    taskId: Types.ObjectId | string,
    organizationId: Types.ObjectId | string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    updateData: Record<string, any>
  ): Promise<ITaskDocument | null> {
    return await this.model
      .findOneAndUpdate(
        {
          _id: taskId,
          organizationId,
          $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
        },
        updateData,
        { new: true, runValidators: true }
      )
      .populate("assignedTo", "name email avatarUrl status")
      .populate("createdBy", "name email")
      .populate("projectId", "name slug")
      .exec();
  }

  /**
   * Soft-delete a task
   */
  public async softDeleteTask(
    taskId: Types.ObjectId | string,
    organizationId: Types.ObjectId | string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    options: Record<string, any> = {}
  ): Promise<ITaskDocument | null> {
    return await this.model
      .findOneAndUpdate(
        {
          _id: taskId,
          organizationId,
          $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
        },
        { deletedAt: new Date() },
        { new: true, ...options }
      )
      .exec();
  }

  /**
   * Restore a soft-deleted task
   */
  public async restoreTaskInOrg(
    taskId: Types.ObjectId | string,
    organizationId: Types.ObjectId | string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    options: Record<string, any> = {}
  ): Promise<ITaskDocument | null> {
    return await this.model
      .findOneAndUpdate(
        {
          _id: taskId,
          organizationId,
          deletedAt: { $ne: null },
        },
        { deletedAt: null },
        { new: true, ...options }
      )
      .populate("assignedTo", "name email avatarUrl status")
      .populate("createdBy", "name email")
      .populate("projectId", "name slug")
      .exec();
  }
  /**
   * Finds distinct project IDs where user is assigned or creator of a task in target organization
   */
  public async findProjectIdsForUser(
    userId: Types.ObjectId | string,
    organizationId: Types.ObjectId | string
  ): Promise<Types.ObjectId[]> {
    const userObjId = new Types.ObjectId(userId);
    const orgObjId = new Types.ObjectId(organizationId);

    const projectIds = await this.model.distinct("projectId", {
      organizationId: orgObjId,
      $or: [{ assignedTo: userObjId }, { createdBy: userObjId }],
    });

    return projectIds as Types.ObjectId[];
  }
}

export const taskRepository = new TaskRepository();
