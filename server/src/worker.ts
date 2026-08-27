import mongoose from "mongoose";
import { env } from "./config/env.js";
import { logger } from "./utils/logger.js";
import {
  createNotificationWorker,
  closeNotificationWorker,
} from "./workers/notification.worker.js";
import { closeNotificationQueue } from "./queues/notification.queue.js";
import { closeRedisConnection } from "./config/redis.js";

let isShuttingDown = false;

const startWorkerProcess = async () => {
  try {
    logger.info("Initializing standalone worker process...");

    // Connect to MongoDB
    await mongoose.connect(env.MONGODB_URI);
    logger.info("MongoDB connection established for worker process");

    // Initialize Worker
    createNotificationWorker();

    logger.info("🚀 Background Worker process is running...");
  } catch (error) {
    logger.error({ error }, "Failed to start worker process");
    process.exit(1);
  }
};

const handleShutdown = async (signal: string) => {
  if (isShuttingDown) {
    logger.warn({ signal }, "Worker shutdown already in progress. Ignoring duplicate signal.");
    return;
  }
  isShuttingDown = true;

  logger.info({ signal }, "Received shutdown signal in worker process");

  const forceExitTimer = setTimeout(() => {
    logger.error("Forced worker shutdown due to 10s timeout.");
    process.exit(1);
  }, 10000);
  forceExitTimer.unref();

  try {
    await closeNotificationWorker();
    logger.info("Notification worker closed");
    await closeNotificationQueue();
    logger.info("Notification queue closed");
    await closeRedisConnection();
    logger.info("Redis connection closed");
    await mongoose.disconnect();
    logger.info("Worker process graceful shutdown complete");

    clearTimeout(forceExitTimer);
    process.exit(0);
  } catch (error) {
    logger.error({ error }, "Error during worker process shutdown");
    clearTimeout(forceExitTimer);
    process.exit(1);
  }
};

process.on("SIGINT", () => handleShutdown("SIGINT"));
process.on("SIGTERM", () => handleShutdown("SIGTERM"));

startWorkerProcess();
