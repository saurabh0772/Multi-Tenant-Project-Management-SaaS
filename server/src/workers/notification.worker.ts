import { Worker, Job } from "bullmq";
import { Types } from "mongoose";
import { getRedisClient } from "../config/redis.js";
import {
  NOTIFICATION_QUEUE_NAME,
  NotificationJobPayload,
} from "../queues/notification.queue.js";
import { notificationRepository } from "../repositories/notification.repository.js";
import { membershipRepository } from "../repositories/membership.repository.js";
import { realtimeEventPublisher } from "../realtime/socket.publisher.js";
import { logger } from "../utils/logger.js";

let workerInstance: Worker<NotificationJobPayload> | null = null;

export const processNotificationJob = async (
  job: Job<NotificationJobPayload>
): Promise<void> => {
  const {
    organizationId,
    recipientId,
    type,
    title,
    message,
    entityType,
    entityId,
    eventId,
  } = job.data;

  logger.info(
    { jobId: job.id, organizationId, recipientId, type, eventId },
    "Processing notification job"
  );

  const orgObjId = new Types.ObjectId(organizationId);
  const recipientObjId = new Types.ObjectId(recipientId);

  // 1. Verify recipient has an ACTIVE membership in the organization
  const membership = await membershipRepository.findActiveMembership(
    recipientObjId,
    orgObjId
  );

  if (!membership || membership.status !== "ACTIVE") {
    logger.warn(
      { organizationId, recipientId },
      "Skipping notification: recipient is not an active member in organization"
    );
    return;
  }

  // 2. Application-level & Database-level Idempotency Check
  const existing = await notificationRepository.findExistingByEventId(
    orgObjId,
    recipientObjId,
    eventId
  );

  if (existing) {
    logger.info(
      { jobId: job.id, eventId },
      "Idempotency check: Notification already exists. Skipping creation."
    );
    return;
  }

  try {
    const createdNotif = await notificationRepository.create({
      organizationId: orgObjId,
      recipientId: recipientObjId,
      type,
      title,
      message,
      entityType,
      entityId: entityId ? new Types.ObjectId(entityId) : null,
      eventId: eventId || null,
      readAt: null,
    });

    logger.info(
      { jobId: job.id, organizationId, recipientId, type },
      "Notification successfully created in database"
    );

    realtimeEventPublisher.publishNotificationEvent(
      "notification:created",
      organizationId,
      recipientId,
      {
        notification: {
          id: createdNotif._id.toString(),
          organizationId,
          recipientId,
          type: createdNotif.type,
          title: createdNotif.title,
          message: createdNotif.message,
          entityType: createdNotif.entityType,
          entityId: createdNotif.entityId
            ? createdNotif.entityId.toString()
            : null,
          eventId: createdNotif.eventId || null,
          readAt: null,
          createdAt: createdNotif.createdAt,
        },
      }
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    // 11000 Duplicate Key Error (Database-level unique index idempotency protection)
    if (error && (error.code === 11000 || error.name === "MongoServerError")) {
      logger.info(
        { jobId: job.id, eventId },
        "Database-level idempotency protection triggered: duplicate key caught safely"
      );
      return;
    }
    throw error;
  }
};

export const createNotificationWorker = (): Worker<NotificationJobPayload> => {
  if (!workerInstance) {
    const connection = getRedisClient();
    workerInstance = new Worker<NotificationJobPayload>(
      NOTIFICATION_QUEUE_NAME,
      processNotificationJob,
      {
        connection,
        concurrency: 5,
      }
    );

    workerInstance.on("completed", (job) => {
      logger.info({ jobId: job.id }, "Worker completed notification job");
    });

    workerInstance.on("failed", (job, err) => {
      logger.error(
        { jobId: job?.id, attemptsMade: job?.attemptsMade, err },
        "Worker failed notification job"
      );
    });

    logger.info(
      { queueName: NOTIFICATION_QUEUE_NAME },
      "Notification Worker process started"
    );
  }

  return workerInstance;
};

export const closeNotificationWorker = async (): Promise<void> => {
  if (workerInstance) {
    logger.info("Closing Notification Worker...");
    await workerInstance.close();
    workerInstance = null;
  }
};
