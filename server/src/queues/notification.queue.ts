import { Queue } from "bullmq";
import { getRedisClient } from "../config/redis.js";
import { logger } from "../utils/logger.js";
import { NotificationType } from "../models/notification.model.js";

export const NOTIFICATION_QUEUE_NAME = "notifications";

export interface NotificationJobPayload {
  eventId: string;
  organizationId: string;
  recipientId: string;
  type: NotificationType;
  title: string;
  message: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
}

let notificationQueue: Queue<NotificationJobPayload> | null = null;

export const getNotificationQueue = (): Queue<NotificationJobPayload> => {
  if (!notificationQueue) {
    const connection = getRedisClient();
    notificationQueue = new Queue<NotificationJobPayload>(
      NOTIFICATION_QUEUE_NAME,
      {
        connection,
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: "exponential",
            delay: 1000,
          },
          removeOnComplete: 100,
          removeOnFail: 500,
        },
      }
    );

    logger.info(
      { queueName: NOTIFICATION_QUEUE_NAME },
      "Notification Queue initialized"
    );
  }

  return notificationQueue;
};

export const enqueueNotificationJob = async (
  payload: NotificationJobPayload
): Promise<string | undefined> => {
  try {
    const queue = getNotificationQueue();
    const job = await queue.add("create-notification", payload, {
      jobId: `${payload.organizationId}_${payload.recipientId}_${payload.eventId}`,
    });

    logger.info(
      {
        jobId: job.id,
        organizationId: payload.organizationId,
        recipientId: payload.recipientId,
        type: payload.type,
      },
      "Enqueued notification job"
    );

    return job.id;
  } catch (error) {
    logger.error(
      {
        error,
        organizationId: payload.organizationId,
        recipientId: payload.recipientId,
      },
      "Failed to enqueue notification job"
    );
    // Note: Crash window exists if DB transaction succeeded but Redis enqueue failed.
  }
};

export const closeNotificationQueue = async (): Promise<void> => {
  if (notificationQueue) {
    logger.info("Closing Notification Queue...");
    await notificationQueue.close();
    notificationQueue = null;
  }
};
