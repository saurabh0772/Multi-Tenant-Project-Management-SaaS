import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import { createApp } from "../app.js";
import { env } from "../config/env.js";

const app = createApp();

describe("Health & API System Suite", () => {
  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(env.MONGODB_TEST_URI);
    }
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });

  describe("GET /health", () => {
  it("should return HTTP 200 OK with liveness status", async () => {
    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: "ok",
      service: "api",
    });
  });
});

describe("GET /ready", () => {
  it("should return readiness status check", async () => {
    const response = await request(app).get("/ready");

    expect([200, 503]).toContain(response.status);
    expect(response.body).toHaveProperty("status");
    expect(response.body).toHaveProperty("checks");
  });
});

describe("GET /api/v1", () => {
  it("should return HTTP 200 OK for root API endpoint", async () => {
    const response = await request(app).get("/api/v1");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      message: "Multi-Tenant Project Management SaaS API v1",
    });
  });
});

describe("404 Not Found Handler", () => {
  it("should return HTTP 404 for unknown endpoints", async () => {
    const response = await request(app).get("/non-existent-route");

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe("NOT_FOUND");
  });
});
});
