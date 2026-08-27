import express, { Express } from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import { env } from "./config/env.js";
import { logger } from "./utils/logger.js";
import { requestIdMiddleware } from "./middlewares/request-id.middleware.js";
import healthRouter from "./routes/health.routes.js";
import { healthController } from "./controllers/health.controller.js";
import apiV1Router from "./routes/index.js";
import { notFoundHandler } from "./middlewares/notFoundHandler.js";
import { errorHandler } from "./middlewares/errorHandler.js";

export const createApp = (): Express => {
  const app = express();

  // Attach Request ID & performance tracking early
  app.use(requestIdMiddleware);

  // Security headers
  app.use(helmet());

  // CORS configuration
  app.use(
    cors({
      origin: env.CLIENT_URL,
      credentials: true,
    })
  );

  // Request logging
  app.use(
    pinoHttp({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      logger: logger as any,
      autoLogging: env.NODE_ENV !== "test",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      customProps: (req) => ({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        requestId: (req as any).id,
      }),
    })
  );

  // Body and cookie parsing
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));
  app.use(cookieParser());

  // Public process health check (unversioned)
  app.use("/health", healthRouter);

  // Operational readiness check (unversioned)
  app.get("/ready", healthController.getReadiness);

  // Versioned API routes
  app.use("/api/v1", apiV1Router);

  // 404 Handler
  app.use(notFoundHandler);

  // Global Error Handler
  app.use(errorHandler);

  return app;
};
