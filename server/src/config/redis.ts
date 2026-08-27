import Redis, { RedisOptions } from "ioredis";
import { env } from "./env.js";
import { logger } from "../utils/logger.js";

let redisClient: Redis | null = null;

export const getRedisOptions = (): RedisOptions => {
  return {
    maxRetriesPerRequest: null, // Required by BullMQ
    enableReadyCheck: false,
    retryStrategy(times) {
      const delay = Math.min(times * 100, 3000);
      return delay;
    },
  };
};

export const getRedisClient = (): Redis => {
  if (!redisClient) {
    redisClient = new Redis(env.REDIS_URL, getRedisOptions());

    redisClient.on("connect", () => {
      logger.info({ redisUrl: env.REDIS_URL }, "Redis connection established");
    });

    redisClient.on("error", (err) => {
      logger.error({ err }, "Redis connection error");
    });

    redisClient.on("close", () => {
      logger.warn("Redis connection closed");
    });
  }

  return redisClient;
};

export const closeRedisConnection = async (): Promise<void> => {
  if (redisClient) {
    logger.info("Closing Redis connection...");
    await redisClient.quit().catch(() => {});
    redisClient = null;
  }
};
