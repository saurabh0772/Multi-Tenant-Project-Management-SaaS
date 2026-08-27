import { Types } from "mongoose";
import { BaseRepository } from "./base.repository.js";
import { ActivityLog, IActivityLogDocument } from "../models/activity.model.js";

export interface FindActivityOptions {
  page?: number;
  limit?: number;
  entityType?: string;
  entityId?: string;
  action?: string;
  actorId?: string;
}

export class ActivityLogRepository extends BaseRepository<IActivityLogDocument> {
  constructor() {
    super(ActivityLog);
  }

  public async findOrgActivities(
    organizationId: Types.ObjectId | string,
    limit: number = 50
  ): Promise<IActivityLogDocument[]> {
    return await this.findMany(
      { organizationId },
      undefined,
      { sort: { createdAt: -1 }, limit }
    );
  }

  public async findEntityActivities(
    organizationId: Types.ObjectId | string,
    entityType: string,
    entityId: Types.ObjectId | string
  ): Promise<IActivityLogDocument[]> {
    return await this.findMany(
      { organizationId, entityType, entityId },
      undefined,
      { sort: { createdAt: -1 } }
    );
  }

  /**
   * Tenant-scoped paginated organization activity feed with safe actor population
   */
  public async findOrgActivitiesPaginated(
    organizationId: Types.ObjectId | string,
    options: FindActivityOptions = {}
  ): Promise<{ activities: IActivityLogDocument[]; total: number; page: number; limit: number }> {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 20));
    const skip = (page - 1) * limit;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: Record<string, any> = { organizationId };

    if (options.entityType) filter.entityType = options.entityType;
    if (options.entityId) filter.entityId = options.entityId;
    if (options.action) filter.action = options.action;
    if (options.actorId) filter.actorId = options.actorId;

    const [activities, total] = await Promise.all([
      this.model
        .find(filter)
        .populate("actorId", "name email avatarUrl status")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.model.countDocuments(filter).exec(),
    ]);

    return {
      activities,
      total,
      page,
      limit,
    };
  }

  /**
   * Tenant & Entity scoped paginated activity feed
   */
  public async findEntityActivitiesPaginated(
    organizationId: Types.ObjectId | string,
    entityType: string,
    entityId: Types.ObjectId | string,
    options: FindActivityOptions = {}
  ): Promise<{ activities: IActivityLogDocument[]; total: number; page: number; limit: number }> {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 20));
    const skip = (page - 1) * limit;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: Record<string, any> = {
      organizationId,
      entityType,
      entityId,
    };

    if (options.action) filter.action = options.action;
    if (options.actorId) filter.actorId = options.actorId;

    const [activities, total] = await Promise.all([
      this.model
        .find(filter)
        .populate("actorId", "name email avatarUrl status")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.model.countDocuments(filter).exec(),
    ]);

    return {
      activities,
      total,
      page,
      limit,
    };
  }
}

export const activityLogRepository = new ActivityLogRepository();
