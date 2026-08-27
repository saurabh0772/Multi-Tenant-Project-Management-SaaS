import { Types } from "mongoose";
import {
  activityLogRepository,
  FindActivityOptions,
} from "../repositories/activity.repository.js";
import { projectRepository } from "../repositories/project.repository.js";
import { taskRepository } from "../repositories/task.repository.js";
import { AppError } from "../utils/AppError.js";
import { IActivityLogDocument } from "../models/activity.model.js";

export class ActivityService {
  /**
   * Safe DTO formatting for activity log response
   */
  private formatActivityResponse(activity: IActivityLogDocument) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const actor = activity.actorId as any;

    return {
      id: activity._id.toString(),
      organizationId: activity.organizationId.toString(),
      actorId: actor?._id ? actor._id.toString() : activity.actorId.toString(),
      actor: actor?._id
        ? {
            id: actor._id.toString(),
            name: actor.name,
            email: actor.email,
            avatarUrl: actor.avatarUrl || null,
          }
        : null,
      action: activity.action,
      entityType: activity.entityType,
      entityId: activity.entityId.toString(),
      metadata: activity.metadata || {},
      createdAt: activity.createdAt,
    };
  }

  /**
   * Organization-wide activity feed
   */
  public async getOrganizationActivities(
    organizationId: string,
    options: FindActivityOptions
  ) {
    const orgObjId = new Types.ObjectId(organizationId);

    const { activities, total, page, limit } =
      await activityLogRepository.findOrgActivitiesPaginated(
        orgObjId,
        options
      );

    return {
      activities: activities.map((a) => this.formatActivityResponse(a)),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Project activity feed with project-tenant relationship verification
   */
  public async getProjectActivities(
    organizationId: string,
    projectId: string,
    options: FindActivityOptions
  ) {
    const orgObjId = new Types.ObjectId(organizationId);
    const projObjId = new Types.ObjectId(projectId);

    const project = await projectRepository.getProjectById(
      projObjId,
      orgObjId
    );

    if (!project) {
      throw new AppError("Project not found in this organization", 404, "RESOURCE_NOT_FOUND");
    }

    const { activities, total, page, limit } =
      await activityLogRepository.findEntityActivitiesPaginated(
        orgObjId,
        "Project",
        projObjId,
        options
      );

    return {
      activities: activities.map((a) => this.formatActivityResponse(a)),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Task activity feed with task-tenant relationship verification
   */
  public async getTaskActivities(
    organizationId: string,
    taskId: string,
    options: FindActivityOptions
  ) {
    const orgObjId = new Types.ObjectId(organizationId);
    const taskObjId = new Types.ObjectId(taskId);

    const task = await taskRepository.getTaskById(taskObjId, orgObjId);

    if (!task) {
      throw new AppError("Task not found in this organization", 404, "RESOURCE_NOT_FOUND");
    }

    const { activities, total, page, limit } =
      await activityLogRepository.findEntityActivitiesPaginated(
        orgObjId,
        "Task",
        taskObjId,
        options
      );

    return {
      activities: activities.map((a) => this.formatActivityResponse(a)),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}

export const activityService = new ActivityService();
