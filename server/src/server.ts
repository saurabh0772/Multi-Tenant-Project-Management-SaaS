import http from "http";
import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { connectDatabase, disconnectDatabase } from "./config/database.js";
import { initSocketServer, closeSocketServer } from "./realtime/socket.server.js";
import { logger } from "./utils/logger.js";

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

    // Graceful shutdown handling
    const gracefulShutdown = async (signal: string) => {
      logger.info(`Received ${signal}. Starting graceful shutdown...`);

      try {
        await closeSocketServer();
        logger.info("Socket.IO server closed successfully");
      } catch (socketErr) {
        logger.error({ err: socketErr }, "Error closing Socket.IO server");
      }

      server.close(async (err) => {
        if (err) {
          logger.error({ err }, "Error closing HTTP server");
        } else {
          logger.info("HTTP server closed");
        }

        try {
          await disconnectDatabase();
          logger.info("Graceful shutdown completed successfully.");
          process.exit(0);
        } catch (dbErr) {
          logger.error({ err: dbErr }, "Error disconnecting database during shutdown");
          process.exit(1);
        }
      });

      // Force shutdown after 10 seconds if shutdown hangs
      setTimeout(() => {
        logger.error("Forced shutdown due to timeout.");
        process.exit(1);
      }, 10000).unref();
    };

    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
    process.on("SIGINT", () => gracefulShutdown("SIGINT"));
  } catch (error) {
    logger.fatal({ err: error }, "Server startup failed");
    process.exit(1);
  }
};

startServer();
