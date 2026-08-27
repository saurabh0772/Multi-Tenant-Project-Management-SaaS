import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../../app.js";
import { storageService } from "../../services/storage.service.js";

const app = createApp();

describe("Production Smoke Test Suite", () => {
  it("1. API process starts and responds to /health liveness check", async () => {
    const res = await request(app).get("/health");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      status: "ok",
      service: "api",
    });
  });

  it("2. Operational readiness endpoint /ready executes without crashing", async () => {
    const res = await request(app).get("/ready");

    expect([200, 503]).toContain(res.status);
    expect(res.body).toHaveProperty("status");
    expect(res.body).toHaveProperty("checks");
  });

  it("3. Metrics endpoint /metrics responds with operational counters", async () => {
    const res = await request(app).get("/metrics");

    expect(res.status).toBe(200);
    expect(res.text).toContain("process_uptime_seconds");
  });

  it("4. Express security headers are properly attached via Helmet", async () => {
    const res = await request(app).get("/health");

    expect(res.headers).toHaveProperty("x-content-type-options", "nosniff");
    expect(res.headers).toHaveProperty("x-frame-options");
  });

  it("5. Storage abstraction provider handles file lifecycle safely", async () => {
    const testKey = "smoke_test_tenant/test_file.txt";
    const testBuffer = Buffer.from("Phase 14 Smoke Test Content", "utf-8");

    await storageService.saveFile(testKey, testBuffer);
    expect(await storageService.fileExists(testKey)).toBe(true);

    await storageService.deleteFile(testKey);
    expect(await storageService.fileExists(testKey)).toBe(false);
  });
});
