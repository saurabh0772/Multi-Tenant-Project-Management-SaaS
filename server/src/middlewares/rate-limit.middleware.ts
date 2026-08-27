import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/AppError.js";
import { getRedisClient } from "../config/redis.js";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

interface RateLimiterOptions {
  windowMs?: number;
  max?: number;
  keyPrefix?: string;
}

// In-memory fallback bucket store
interface MemoryRecord {
  count: number;
  resetTime: number;
}

const memoryStore = new Map<string, MemoryRecord>();

// Periodic memory store cleanup every 60 seconds
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of memoryStore.entries()) {
    if (now > record.resetTime) {
      memoryStore.delete(key);
    }
  }
}, 60000).unref();

export const createRateLimiter = (options: RateLimiterOptions = {}) => {
  const windowMs = options.windowMs ?? env.RATE_LIMIT_WINDOW_MS;
  const max = options.max ?? env.RATE_LIMIT_MAX;
  const keyPrefix = options.keyPrefix ?? "global";
  const windowSeconds = Math.ceil(windowMs / 1000);

  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    // Authenticated user ID or IP address fallback
    // Express req.user is attached by authenticate middleware
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const identity = (req as any).user?._id || (req as any).user?.id || req.ip || "unknown-client";
    const route = req.baseUrl || req.path || "route";
    const cacheKey = `saas:ratelimit:${keyPrefix}:${identity}:${route}`;

    try {
      const redis = getRedisClient();
      if (redis && redis.status === "ready") {
        const currentCount = await redis.incr(cacheKey);

        if (currentCount === 1) {
          await redis.expire(cacheKey, windowSeconds);
        }

        if (currentCount > max) {
          return next(
            new AppError("Too many requests", 429, "RATE_LIMIT_EXCEEDED")
          );
        }

        return next();
      }
    } catch (err) {
      logger.warn({ err }, "Redis rate limiter error, falling back to in-memory store");
    }

    // In-memory store fallback
    const now = Date.now();
    let record = memoryStore.get(cacheKey);

    if (!record || now > record.resetTime) {
      record = {
        count: 1,
        resetTime: now + windowMs,
      };
      memoryStore.set(cacheKey, record);
    } else {
      record.count += 1;
    }

    if (record.count > max) {
      return next(
        new AppError("Too many requests", 429, "RATE_LIMIT_EXCEEDED")
      );
    }

    return next();
  };
};

export const defaultRateLimiter = createRateLimiter();
