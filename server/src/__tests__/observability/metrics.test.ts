import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { metricsService } from "../../services/metrics.service.js";
import { createApp } from "../../app.js";

const app = createApp();

describe("Application Metrics & Observability Suite", () => {
  beforeEach(() => {
    metricsService.resetMetrics();
  });

  it("should correctly record and increment in-memory metrics", () => {
    metricsService.increment("http_requests_total");
    metricsService.increment("search_cache_hits_total", {}, 5);
    metricsService.observe("http_request_duration_ms_total", 120);

    const json = metricsService.getMetricsJSON();
    expect(json).toHaveProperty("uptimeSeconds");

    const metrics = json.metrics as Record<string, number>;
    expect(metrics.http_requests_total).toBe(1);
    expect(metrics.search_cache_hits_total).toBe(5);
    expect(metrics.http_request_duration_ms_total).toBe(120);
  });

  it("should export Prometheus-formatted exposition text", () => {
    metricsService.increment("http_requests_total");
    metricsService.increment("http_requests_2xx_total");

    const text = metricsService.toPrometheusText();
    expect(text).toContain("# HELP http_requests_total Total HTTP requests received");
    expect(text).toContain("# TYPE http_requests_total counter");
    expect(text).toContain("http_requests_total 1");
    expect(text).toContain("http_requests_2xx_total 1");
  });

  it("should serve GET /metrics endpoint in Prometheus format by default", async () => {
    const res = await request(app).get("/metrics");

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("text/plain");
    expect(res.text).toContain("http_requests_total");
  });

  it("should serve GET /metrics endpoint in JSON format when requested", async () => {
    const res = await request(app).get("/metrics?format=json");

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("uptimeSeconds");
    expect(res.body).toHaveProperty("metrics");
  });
});
