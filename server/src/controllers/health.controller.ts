import { Request, Response } from "express";
import mongoose from "mongoose";
import { getRedisClient } from "../config/redis.js";
import { logger } from "../utils/logger.js";

export const healthController = {
  getLiveness: (_req: Request, res: Response): void => {
    res.status(200).json({
      status: "ok",
      service: "api",
    });
  },

  getReadiness: async (_req: Request, res: Response): Promise<void> => {
    let mongoUp = false;
    let redisUp = false;

    // Check MongoDB readiness
    try {
      mongoUp = mongoose.connection.readyState === 1;
    } catch (err) {
      logger.warn({ err }, "MongoDB readiness check failed");
      mongoUp = false;
    }

    // Check Redis readiness
    try {
      const redis = getRedisClient();
      if (redis && (redis.status === "ready" || redis.status === "connect")) {
        const pingResult = await redis.ping();
        redisUp = pingResult === "PONG";
      }
    } catch (err) {
      logger.warn({ err }, "Redis readiness check failed");
      redisUp = false;
    }

    const isReady = mongoUp && redisUp;
    const statusCode = isReady ? 200 : 503;

    res.status(statusCode).json({
      status: isReady ? "ready" : "unavailable",
      checks: {
        mongodb: mongoUp ? "up" : "down",
        redis: redisUp ? "up" : "down",
      },
    });
  },
};
