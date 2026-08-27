import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      id?: string;
    }
  }
}

export const requestIdMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const incomingId = req.header("X-Request-ID");
  // Validate incoming requestId format (alphanumeric, hyphens, min length 1, max length 128)
  const isValidIncomingId =
    incomingId &&
    typeof incomingId === "string" &&
    /^[a-zA-Z0-9_-]{1,128}$/.test(incomingId);

  const requestId = isValidIncomingId ? incomingId : crypto.randomUUID();

  req.id = requestId;
  res.setHeader("X-Request-ID", requestId);

  const startTime = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - startTime;

    if (duration >= env.SLOW_REQUEST_THRESHOLD_MS) {
      logger.warn(
        {
          requestId,
          method: req.method,
          path: req.originalUrl || req.url,
          duration,
          statusCode: res.statusCode,
        },
        "Slow request detected"
      );
    }
  });

  next();
};
