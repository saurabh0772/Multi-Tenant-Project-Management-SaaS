import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import mongoose from "mongoose";
import request from "supertest";
import { env } from "../../config/env.js";
import { createApp } from "../../app.js";
import { User } from "../../models/user.model.js";
import { Session } from "../../models/session.model.js";
import { hashPassword } from "../../utils/password.js";

const app = createApp();

describe("POST /api/v1/auth/refresh", () => {
  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(env.MONGODB_TEST_URI);
    }
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await Session.deleteMany({});
    await User.createIndexes();
    await Session.createIndexes();
  });

  it("should refresh access token and rotate refresh token", async () => {
    const passwordHash = await hashPassword("ValidPassword123!");
    await User.create({
      name: "Charlie Brown",
      email: "charlie@example.com",
      passwordHash,
      status: "ACTIVE",
    });

    const loginRes = await request(app).post("/api/v1/auth/login").send({
      email: "charlie@example.com",
      password: "ValidPassword123!",
    });

    const oldCookie = loginRes.get("Set-Cookie")![0];

    // First refresh request
    const refreshRes1 = await request(app)
      .post("/api/v1/auth/refresh")
      .set("Cookie", [oldCookie]);

    expect(refreshRes1.status).toBe(200);
    expect(refreshRes1.body.success).toBe(true);
    expect(refreshRes1.body.data.accessToken).toBeDefined();

    const newCookie = refreshRes1.get("Set-Cookie")![0];
    expect(newCookie).not.toBe(oldCookie);

    // Old token attempt MUST fail (old refresh token rejection after rotation)
    const oldRefreshAttempt = await request(app)
      .post("/api/v1/auth/refresh")
      .set("Cookie", [oldCookie]);

    expect(oldRefreshAttempt.status).toBe(401);
  });

  it("should enforce atomic rotation during concurrent refresh requests", async () => {
    const passwordHash = await hashPassword("ValidPassword123!");
    await User.create({
      name: "Concurrent User",
      email: "concurrent@example.com",
      passwordHash,
      status: "ACTIVE",
    });

    const loginRes = await request(app).post("/api/v1/auth/login").send({
      email: "concurrent@example.com",
      password: "ValidPassword123!",
    });

    const cookie = loginRes.get("Set-Cookie")![0];

    // Fire 2 concurrent refresh requests using the exact same old cookie
    const [req1, req2] = await Promise.all([
      request(app).post("/api/v1/auth/refresh").set("Cookie", [cookie]),
      request(app).post("/api/v1/auth/refresh").set("Cookie", [cookie]),
    ]);

    const statuses = [req1.status, req2.status].sort();
    // Exactly 1 must succeed (200) and 1 must fail (401)
    expect(statuses).toEqual([200, 401]);
  });
});
