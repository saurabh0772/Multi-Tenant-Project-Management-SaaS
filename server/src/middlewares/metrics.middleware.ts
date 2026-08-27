import { Request, Response, NextFunction } from "express";
import { metricsService } from "../services/metrics.service.js";
import { env } from "../config/env.js";

export const metricsMiddleware = (_req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;

    // Increment total requests
    metricsService.increment("http_requests_total");
    metricsService.observe("http_request_duration_ms_total", duration);

    // Track status code buckets
    if (statusCode >= 200 && statusCode < 300) {
      metricsService.increment("http_requests_2xx_total");
    } else if (statusCode >= 400 && statusCode < 500) {
      metricsService.increment("http_requests_4xx_total");
      if (statusCode === 429) {
        metricsService.increment("rate_limit_rejections_total");
      }
    } else if (statusCode >= 500) {
      metricsService.increment("http_requests_5xx_total");
    }

    // Track slow requests
    if (duration >= env.SLOW_REQUEST_THRESHOLD_MS) {
      metricsService.increment("http_slow_requests_total");
    }
  });

  next();
};
