import pino from "pino";
import { env } from "../config/env.js";

export const logger = pino({
  level: env.LOG_LEVEL,
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "password",
      "accessToken",
      "refreshToken",
      "resetToken",
      "secret",
    ],
    remove: true,
  },
  base:
    env.NODE_ENV === "production"
      ? { pid: process.pid }
      : { pid: false, hostname: false },
  timestamp: pino.stdTimeFunctions.isoTime,
});
