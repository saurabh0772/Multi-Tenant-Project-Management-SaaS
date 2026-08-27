import { Request, Response } from "express";
import { metricsService } from "../services/metrics.service.js";
import { env } from "../config/env.js";

export class MetricsController {
  public getMetrics = (req: Request, res: Response): void => {
    if (!env.METRICS_ENABLED) {
      res.status(404).json({
        success: false,
        error: {
          code: "METRICS_DISABLED",
          message: "Application metrics collection is disabled",
        },
      });
      return;
    }

    // Optional HTTP Basic Auth check if METRICS_USER and METRICS_PASS are configured
    if (env.METRICS_USER && env.METRICS_PASS) {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Basic ")) {
        res.setHeader("WWW-Authenticate", 'Basic realm="Metrics"');
        res.status(401).json({
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "Authentication required for metrics access",
          },
        });
        return;
      }

      const credentials = Buffer.from(authHeader.split(" ")[1], "base64")
        .toString("utf-8")
        .split(":");
      const username = credentials[0];
      const password = credentials[1];

      if (username !== env.METRICS_USER || password !== env.METRICS_PASS) {
        res.setHeader("WWW-Authenticate", 'Basic realm="Metrics"');
        res.status(401).json({
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "Invalid metrics credentials",
          },
        });
        return;
      }
    }

    const format = req.query.format || (req.headers.accept?.includes("application/json") ? "json" : "prometheus");

    if (format === "json") {
      res.status(200).json(metricsService.getMetricsJSON());
    } else {
      res.setHeader("Content-Type", "text/plain; version=0.0.4; charset=utf-8");
      res.status(200).send(metricsService.toPrometheusText());
    }
  };
}

export const metricsController = new MetricsController();
