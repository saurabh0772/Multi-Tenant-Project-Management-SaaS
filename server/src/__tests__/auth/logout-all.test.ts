import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import mongoose from "mongoose";
import request from "supertest";
import { env } from "../../config/env.js";
import { createApp } from "../../app.js";
import { User } from "../../models/user.model.js";
import { Session } from "../../models/session.model.js";
import { hashPassword } from "../../utils/password.js";

const app = createApp();

describe("POST /api/v1/auth/logout-all", () => {
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

  it("should revoke all active sessions for authenticated user without affecting other users", async () => {
    const passwordHash = await hashPassword("ValidPassword123!");

    const userA = await User.create({
      name: "User A",
      email: "usera@example.com",
      passwordHash,
      status: "ACTIVE",
    });

    const userB = await User.create({
      name: "User B",
      email: "userb@example.com",
      passwordHash,
      status: "ACTIVE",
    });

    // Login User A twice (2 sessions)
    const loginA1 = await request(app).post("/api/v1/auth/login").send({
      email: "usera@example.com",
      password: "ValidPassword123!",
    });
    await request(app).post("/api/v1/auth/login").send({
      email: "usera@example.com",
      password: "ValidPassword123!",
    });

    // Login User B (1 session)
    await request(app).post("/api/v1/auth/login").send({
      email: "userb@example.com",
      password: "ValidPassword123!",
    });

    const accessTokenA = loginA1.body.data.accessToken;

    // Call logout-all for User A
    const res = await request(app)
      .post("/api/v1/auth/logout-all")
      .set("Authorization", `Bearer ${accessTokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Verify all User A sessions are revoked
    const activeUserASessions = await Session.find({ userId: userA._id, revokedAt: null });
    expect(activeUserASessions.length).toBe(0);

    // Verify User B session remains active
    const activeUserBSessions = await Session.find({ userId: userB._id, revokedAt: null });
    expect(activeUserBSessions.length).toBe(1);
  });
});
