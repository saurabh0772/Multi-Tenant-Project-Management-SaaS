import { Types } from "mongoose";
import {
  notificationRepository,
  FindNotificationOptions,
} from "../repositories/notification.repository.js";
import { AppError } from "../utils/AppError.js";
import { INotificationDocument } from "../models/notification.model.js";
import { realtimeEventPublisher } from "../realtime/socket.publisher.js";

export class NotificationService {
  /**
   * Safe DTO formatting for notification response
   */
  private formatNotificationResponse(notification: INotificationDocument) {
    return {
      id: notification._id.toString(),
      organizationId: notification.organizationId.toString(),
      recipientId: notification.recipientId.toString(),
      type: notification.type,
      title: notification.title,
      message: notification.message,
      entityType: notification.entityType,
      entityId: notification.entityId ? notification.entityId.toString() : null,
      eventId: notification.eventId || null,
      readAt: notification.readAt || null,
      createdAt: notification.createdAt,
    };
  }

  /**
   * Gets recipient notifications in tenant with pagination
   */
  public async getUserNotifications(
    organizationId: string,
    recipientId: string,
    options: FindNotificationOptions
  ) {
    const orgObjId = new Types.ObjectId(organizationId);
    const recipientObjId = new Types.ObjectId(recipientId);

    const { notifications, total, page, limit } =
      await notificationRepository.findRecipientNotificationsPaginated(
        recipientObjId,
        orgObjId,
        options
      );

    return {
      notifications: notifications.map((n) =>
        this.formatNotificationResponse(n)
      ),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Gets unread notification count for recipient in tenant
   */
  public async getUnreadCount(organizationId: string, recipientId: string) {
    const orgObjId = new Types.ObjectId(organizationId);
    const recipientObjId = new Types.ObjectId(recipientId);

    const unreadCount = await notificationRepository.getUnreadCount(
      recipientObjId,
      orgObjId
    );

    return {
      unreadCount,
    };
  }

  /**
   * Marks a single notification as read (recipient & tenant scoped)
   */
  public async markAsRead(
    organizationId: string,
    recipientId: string,
    notificationId: string
  ) {
    const orgObjId = new Types.ObjectId(organizationId);
    const recipientObjId = new Types.ObjectId(recipientId);

    const updated = await notificationRepository.markNotificationAsRead(
      notificationId,
      recipientObjId,
      orgObjId
    );

    if (!updated) {
      throw new AppError(
        "Notification not found or access denied",
        404,
        "RESOURCE_NOT_FOUND"
      );
    }

    realtimeEventPublisher.publishNotificationEvent(
      "notification:read",
      organizationId,
      recipientId,
      { notificationId }
    );

    return {
      message: "Notification marked as read",
    };
  }

  /**
   * Marks all unread notifications for recipient in tenant as read
   */
  public async markAllAsRead(organizationId: string, recipientId: string) {
    const orgObjId = new Types.ObjectId(organizationId);
    const recipientObjId = new Types.ObjectId(recipientId);

    const count = await notificationRepository.markAllNotificationsAsRead(
      recipientObjId,
      orgObjId
    );

    realtimeEventPublisher.publishNotificationEvent(
      "notification:read-all",
      organizationId,
      recipientId,
      { modifiedCount: count }
    );

    return {
      message: "All notifications marked as read",
      modifiedCount: count,
    };
  }
}

export const notificationService = new NotificationService();
