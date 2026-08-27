import { enqueueNotificationJob } from "../queues/notification.queue.js";
import { NotificationType } from "../models/notification.model.js";

export class NotificationDispatcher {
  /**
   * Dispatches task assignment notification job
   */
  public async dispatchTaskAssigned(params: {
    organizationId: string;
    recipientId: string;
    taskId: string;
    taskTitle: string;
    actorUserId: string;
  }): Promise<void> {
    // Don't notify self if actor assigned task to themselves
    if (params.recipientId === params.actorUserId) return;

    const eventId = `task_assigned_${params.taskId}_${params.recipientId}`;

    await enqueueNotificationJob({
      eventId,
      organizationId: params.organizationId,
      recipientId: params.recipientId,
      type: "TASK_ASSIGNED" as NotificationType,
      title: "Task Assigned",
      message: `You have been assigned to task "${params.taskTitle}"`,
      entityType: "Task",
      entityId: params.taskId,
    });
  }

  /**
   * Dispatches task status change notification job to assignee
   */
  public async dispatchTaskStatusChanged(params: {
    organizationId: string;
    recipientId: string;
    taskId: string;
    taskTitle: string;
    newStatus: string;
    actorUserId: string;
  }): Promise<void> {
    if (params.recipientId === params.actorUserId) return;

    const eventId = `task_status_${params.taskId}_${params.newStatus}_${Date.now()}`;

    await enqueueNotificationJob({
      eventId,
      organizationId: params.organizationId,
      recipientId: params.recipientId,
      type: "TASK_UPDATED" as NotificationType,
      title: "Task Status Updated",
      message: `Task "${params.taskTitle}" status changed to ${params.newStatus}`,
      entityType: "Task",
      entityId: params.taskId,
    });
  }

  /**
   * Dispatches comment added notification job to task assignee
   */
  public async dispatchCommentAdded(params: {
    organizationId: string;
    recipientId: string;
    taskId: string;
    commentId: string;
    commentSnippet: string;
    actorUserId: string;
  }): Promise<void> {
    if (params.recipientId === params.actorUserId) return;

    const eventId = `comment_added_${params.commentId}_${params.recipientId}`;

    await enqueueNotificationJob({
      eventId,
      organizationId: params.organizationId,
      recipientId: params.recipientId,
      type: "COMMENT_ADDED" as NotificationType,
      title: "New Comment on Task",
      message: `New comment added: "${params.commentSnippet.substring(0, 50)}..."`,
      entityType: "Comment",
      entityId: params.commentId,
    });
  }
}

export const notificationDispatcher = new NotificationDispatcher();
