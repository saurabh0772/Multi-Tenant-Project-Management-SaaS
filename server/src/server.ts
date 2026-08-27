import http from "http";
import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { connectDatabase, disconnectDatabase } from "./config/database.js";
import { initSocketServer, closeSocketServer } from "./realtime/socket.server.js";
import { closeNotificationQueue } from "./queues/notification.queue.js";
import { closeRedisConnection } from "./config/redis.js";
import { logger } from "./utils/logger.js";

let isShuttingDown = false;

const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDatabase();

    const app = createApp();
    const server = http.createServer(app);

    // Initialize Socket.IO Real-Time Gateway
    initSocketServer(server);

    server.listen(env.PORT, () => {
      logger.info(
        `🚀 Server listening on port ${env.PORT} in ${env.NODE_ENV} mode`
      );
      logger.info(`Health check available at http://localhost:${env.PORT}/health`);
    });

    // Idempotent graceful shutdown handler
    const gracefulShutdown = async (signal: string) => {
      if (isShuttingDown) {
        logger.warn({ signal }, "Shutdown already in progress. Ignoring duplicate signal.");
        return;
      }
      isShuttingDown = true;

      logger.info(`Received ${signal}. Starting graceful shutdown...`);

      // Set force exit timer (10s)
      const forceExitTimer = setTimeout(() => {
        logger.error("Forced shutdown due to 10s timeout.");
        process.exit(1);
      }, 10000);
      forceExitTimer.unref();

      // 1. Stop accepting new HTTP requests
      server.close(async (err) => {
        if (err) {
          logger.error({ err }, "Error closing HTTP server");
        } else {
          logger.info("HTTP server closed");
        }

        try {
          // 2. Close Socket.IO gateway
          await closeSocketServer();
          logger.info("Socket.IO server closed");

          // 3. Close BullMQ queue resources
          await closeNotificationQueue();
          logger.info("Notification queue closed");

          // 4. Close Redis connection
          await closeRedisConnection();
          logger.info("Redis connection closed");

          // 5. Disconnect MongoDB
          await disconnectDatabase();
          logger.info("Database disconnected. Shutdown complete.");

          clearTimeout(forceExitTimer);
          process.exit(0);
        } catch (shutdownErr) {
          logger.error({ err: shutdownErr }, "Error during graceful shutdown sequence");
          clearTimeout(forceExitTimer);
          process.exit(1);
        }
      });
    };

    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
    process.on("SIGINT", () => gracefulShutdown("SIGINT"));
  } catch (error) {
    logger.fatal({ err: error }, "Server startup failed");
    process.exit(1);
  }
};

startServer();
