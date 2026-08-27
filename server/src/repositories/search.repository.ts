import { Types } from "mongoose";
import { Project } from "../models/project.model.js";
import { Task } from "../models/task.model.js";
import { Comment } from "../models/comment.model.js";
import { Membership } from "../models/membership.model.js";
import { SearchQueryParams, escapeRegex } from "../validators/search.schema.js";

export interface RawSearchResult {
  projects: Array<Record<string, unknown>>;
  tasks: Array<Record<string, unknown>>;
  comments: Array<Record<string, unknown>>;
  members: Array<Record<string, unknown>>;
}

export class SearchRepository {
  /**
   * Search projects within a tenant organization
   */
  async searchProjects(
    organizationId: string,
    params: SearchQueryParams
  ): Promise<Array<Record<string, unknown>>> {
    const orgObjectId = new Types.ObjectId(organizationId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: Record<string, any> = { organizationId: orgObjectId };

    if (params.status) {
      filter.status = params.status;
    }

    if (params.q) {
      const safeQ = escapeRegex(params.q);
      const regex = new RegExp(safeQ, "i");
      filter.$or = [{ name: regex }, { description: regex }, { slug: regex }];
    }

    const sortOrderNum = params.sortOrder === "asc" ? 1 : -1;

    const projects = await Project.find(filter)
      .select("_id name slug description status createdAt updatedAt")
      .sort({ createdAt: sortOrderNum })
      .lean()
      .maxTimeMS(5000)
      .exec();

    return projects as Array<Record<string, unknown>>;
  }

  /**
   * Search tasks within a tenant organization
   */
  async searchTasks(
    organizationId: string,
    params: SearchQueryParams
  ): Promise<Array<Record<string, unknown>>> {
    const orgObjectId = new Types.ObjectId(organizationId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: Record<string, any> = {
      organizationId: orgObjectId,
      $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
    };

    if (params.projectId && Types.ObjectId.isValid(params.projectId)) {
      filter.projectId = new Types.ObjectId(params.projectId);
    }
    if (params.status) {
      filter.status = params.status;
    }
    if (params.priority) {
      filter.priority = params.priority;
    }
    if (params.assignedTo && Types.ObjectId.isValid(params.assignedTo)) {
      filter.assignedTo = new Types.ObjectId(params.assignedTo);
    }
    if (params.createdBy && Types.ObjectId.isValid(params.createdBy)) {
      filter.createdBy = new Types.ObjectId(params.createdBy);
    }

    if (params.q) {
      const safeQ = escapeRegex(params.q);
      const regex = new RegExp(safeQ, "i");
      const textConditions = [{ title: regex }, { description: regex }];

      if (filter.$or) {
        filter.$and = [{ $or: filter.$or }, { $or: textConditions }];
        delete filter.$or;
      } else {
        filter.$or = textConditions;
      }
    }

    const sortOrderNum = params.sortOrder === "asc" ? 1 : -1;

    const tasks = await Task.find(filter)
      .select("_id title description status priority projectId assignedTo createdBy createdAt updatedAt")
      .sort({ createdAt: sortOrderNum })
      .lean()
      .maxTimeMS(5000)
      .exec();

    return tasks as Array<Record<string, unknown>>;
  }

  /**
   * Search comments within a tenant organization
   */
  async searchComments(
    organizationId: string,
    params: SearchQueryParams
  ): Promise<Array<Record<string, unknown>>> {
    const orgObjectId = new Types.ObjectId(organizationId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: Record<string, any> = {
      organizationId: orgObjectId,
      $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
    };

    if (params.q) {
      const safeQ = escapeRegex(params.q);
      const regex = new RegExp(safeQ, "i");
      const textConditions = [{ content: regex }];

      if (filter.$or) {
        filter.$and = [{ $or: filter.$or }, { $or: textConditions }];
        delete filter.$or;
      } else {
        filter.$or = textConditions;
      }
    }

    const sortOrderNum = params.sortOrder === "asc" ? 1 : -1;

    const comments = await Comment.find(filter)
      .select("_id taskId authorId content createdAt updatedAt")
      .sort({ createdAt: sortOrderNum })
      .lean()
      .maxTimeMS(5000)
      .exec();

    return comments as Array<Record<string, unknown>>;
  }

  /**
   * Search members within a tenant organization
   */
  async searchMembers(
    organizationId: string,
    params: SearchQueryParams
  ): Promise<Array<Record<string, unknown>>> {
    const orgObjectId = new Types.ObjectId(organizationId);

    const memberships = await Membership.find({
      organizationId: orgObjectId,
      status: "ACTIVE",
    })
      .populate({
        path: "userId",
        select: "_id name email avatarUrl status",
      })
      .lean()
      .maxTimeMS(5000)
      .exec();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const results: Array<Record<string, any>> = [];

    for (const mem of memberships) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const user = mem.userId as any;
      if (!user) continue;

      if (params.q) {
        const safeQ = params.q.toLowerCase();
        const nameMatch = user.name?.toLowerCase().includes(safeQ);
        const emailMatch = user.email?.toLowerCase().includes(safeQ);
        if (!nameMatch && !emailMatch) {
          continue;
        }
      }

      results.push({
        _id: mem._id,
        userId: user._id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl || null,
        role: mem.role,
      });
    }

    return results;
  }
}

export const searchRepository = new SearchRepository();
