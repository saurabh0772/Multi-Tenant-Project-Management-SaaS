import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../app.js";

const app = createApp();

describe("GET /health", () => {
  it("should return HTTP 200 OK with success and message", async () => {
    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      message: "API is healthy",
    });
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
