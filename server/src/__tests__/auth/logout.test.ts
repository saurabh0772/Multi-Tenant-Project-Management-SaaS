import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import mongoose from "mongoose";
import request from "supertest";
import { env } from "../../config/env.js";
import { createApp } from "../../app.js";
import { User } from "../../models/user.model.js";
import { Session } from "../../models/session.model.js";
import { hashPassword } from "../../utils/password.js";

const app = createApp();

describe("POST /api/v1/auth/logout", () => {
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

  it("should revoke current session and clear refresh cookie", async () => {
    const passwordHash = await hashPassword("ValidPassword123!");
    const user = await User.create({
      name: "Dave Miller",
      email: "dave@example.com",
      passwordHash,
      status: "ACTIVE",
    });

    const loginRes = await request(app).post("/api/v1/auth/login").send({
      email: "dave@example.com",
      password: "ValidPassword123!",
    });

    const cookie = loginRes.get("Set-Cookie")![0];

    const logoutRes = await request(app)
      .post("/api/v1/auth/logout")
      .set("Cookie", [cookie]);

    expect(logoutRes.status).toBe(200);
    expect(logoutRes.body.success).toBe(true);

    // Verify session revoked in DB
    const session = await Session.findOne({ userId: user._id });
    expect(session?.revokedAt).not.toBeNull();

    // Verify cookie cleared
    const clearCookies = logoutRes.get("Set-Cookie");
    expect(clearCookies![0]).toContain("refreshToken=;");
  });
});
