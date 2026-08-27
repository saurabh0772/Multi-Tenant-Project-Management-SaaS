import dotenv from "dotenv";
import path from "path";
import { z } from "zod";

// Load environment variables from current process directory and parent root
dotenv.config({ path: path.resolve(process.cwd(), ".env") });
dotenv.config({ path: path.resolve(process.cwd(), "../.env") });

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "staging", "production"])
    .default("development"),
  PORT: z.coerce.number().default(5000),
  MONGODB_URI: z
    .string()
    .min(1, "MONGODB_URI is required")
    .default("mongodb://localhost:27017/project_manager_dev"),
  MONGODB_TEST_URI: z
    .string()
    .default("mongodb://localhost:27017/project_manager_test"),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  CLIENT_URL: z.string().default("http://localhost:5173"),
  ACCESS_TOKEN_SECRET: z
    .string()
    .min(1)
    .default("development_access_token_secret_min_32_chars_long"),
  ACCESS_TOKEN_EXPIRES_IN: z.string().default("15m"),
  REFRESH_TOKEN_EXPIRES_IN_DAYS: z.coerce.number().default(7),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),
  SEARCH_CACHE_TTL: z.coerce.number().default(60),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60000),
  RATE_LIMIT_MAX: z.coerce.number().default(100),
  SLOW_REQUEST_THRESHOLD_MS: z.coerce.number().default(500),
});

const parseEnv = () => {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error(
      "❌ Invalid Environment Variables:",
      JSON.stringify(result.error.format(), null, 2)
    );
    throw new Error("Invalid Environment Variables");
  }
  return result.data;
};

export const env = parseEnv();
