import { Types } from "mongoose";
import { BaseRepository } from "./base.repository.js";
import {
  Notification,
  INotificationDocument,
} from "../models/notification.model.js";

export interface FindNotificationOptions {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
}

export class NotificationRepository extends BaseRepository<INotificationDocument> {
  constructor() {
    super(Notification);
  }

  /**
   * Application-level & DB idempotency lookup
   */
  public async findExistingByEventId(
    organizationId: Types.ObjectId | string,
    recipientId: Types.ObjectId | string,
    eventId: string
  ): Promise<INotificationDocument | null> {
    if (!eventId) return null;
    return await this.model
      .findOne({ organizationId, recipientId, eventId })
      .exec();
  }

  /**
   * Recipient & Tenant scoped paginated notifications
   */
  public async findRecipientNotificationsPaginated(
    recipientId: Types.ObjectId | string,
    organizationId: Types.ObjectId | string,
    options: FindNotificationOptions = {}
  ): Promise<{
    notifications: INotificationDocument[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 20));
    const skip = (page - 1) * limit;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: Record<string, any> = { recipientId, organizationId };
    if (options.unreadOnly) {
      filter.readAt = null;
    }

    const [notifications, total] = await Promise.all([
      this.model
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.model.countDocuments(filter).exec(),
    ]);

    return {
      notifications,
      total,
      page,
      limit,
    };
  }

  /**
   * Recipient & Tenant scoped unread count
   */
  public async getUnreadCount(
    recipientId: Types.ObjectId | string,
    organizationId: Types.ObjectId | string
  ): Promise<number> {
    return await this.count({ recipientId, organizationId, readAt: null });
  }

  /**
   * Recipient & Tenant scoped single notification mark read
   */
  public async markNotificationAsRead(
    notificationId: Types.ObjectId | string,
    recipientId: Types.ObjectId | string,
    organizationId: Types.ObjectId | string
  ): Promise<INotificationDocument | null> {
    return await this.model
      .findOneAndUpdate(
        { _id: notificationId, recipientId, organizationId },
        { readAt: new Date() },
        { new: true }
      )
      .exec();
  }

  /**
   * Recipient & Tenant scoped bulk mark all notifications as read
   */
  public async markAllNotificationsAsRead(
    recipientId: Types.ObjectId | string,
    organizationId: Types.ObjectId | string
  ): Promise<number> {
    const result = await this.model
      .updateMany(
        { recipientId, organizationId, readAt: null },
        { readAt: new Date() }
      )
      .exec();

    return result.modifiedCount;
  }
}

export const notificationRepository = new NotificationRepository();
