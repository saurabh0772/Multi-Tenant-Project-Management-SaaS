import mongoose from "mongoose";
import { env } from "./config/env.js";
import { logger } from "./utils/logger.js";
import {
  createNotificationWorker,
  closeNotificationWorker,
} from "./workers/notification.worker.js";
import { closeNotificationQueue } from "./queues/notification.queue.js";
import { closeRedisConnection } from "./config/redis.js";

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
  logger.info({ signal }, "Received shutdown signal in worker process");

  try {
    await closeNotificationWorker();
    await closeNotificationQueue();
    await closeRedisConnection();
    await mongoose.disconnect();
    logger.info("Worker process graceful shutdown complete");
    process.exit(0);
  } catch (error) {
    logger.error({ error }, "Error during worker process shutdown");
    process.exit(1);
  }
};

process.on("SIGINT", () => handleShutdown("SIGINT"));
process.on("SIGTERM", () => handleShutdown("SIGTERM"));

startWorkerProcess();
