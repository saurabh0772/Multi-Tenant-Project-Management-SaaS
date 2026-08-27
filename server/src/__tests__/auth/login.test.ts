import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import mongoose from "mongoose";
import request from "supertest";
import crypto from "crypto";
import { env } from "../../config/env.js";
import { createApp } from "../../app.js";
import { User } from "../../models/user.model.js";
import { Session } from "../../models/session.model.js";
import { hashPassword } from "../../utils/password.js";

const app = createApp();

describe("POST /api/v1/auth/login", () => {
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

  it("should successfully log in an active user and return credentials", async () => {
    const passwordHash = await hashPassword("ValidPassword123!");
    const user = await User.create({
      name: "Bob Builder",
      email: "bob@example.com",
      passwordHash,
      status: "ACTIVE",
    });

    const res = await request(app).post("/api/v1/auth/login").send({
      email: "BOB@example.com", // normalized email test
      password: "ValidPassword123!",
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.id).toBe(user._id.toString());
    expect(res.body.data.accessToken).toBeDefined();

    // Verify lastLoginAt update
    const updatedUser = await User.findById(user._id);
    expect(updatedUser?.lastLoginAt).not.toBeNull();

    // Verify Session in DB stores SHA-256 tokenHash, NOT raw refresh token
    const cookies = res.get("Set-Cookie");
    const rawCookieStr = cookies![0];
    const match = rawCookieStr.match(/refreshToken=([^;]+)/);
    expect(match).not.toBeNull();
    const rawRefreshToken = match![1];

    const sessionDoc = await Session.findOne({ userId: user._id }).select("+tokenHash");
    expect(sessionDoc).not.toBeNull();
    expect(sessionDoc?.tokenHash).not.toBe(rawRefreshToken);

    const expectedHash = crypto.createHash("sha256").update(rawRefreshToken).digest("hex");
    expect(sessionDoc?.tokenHash).toBe(expectedHash);
  });

  it("should prevent account enumeration on invalid credentials", async () => {
    const passwordHash = await hashPassword("ValidPassword123!");
    await User.create({
      name: "Bob Builder",
      email: "bob@example.com",
      passwordHash,
      status: "ACTIVE",
    });

    // Case 1: Unknown email
    const res1 = await request(app).post("/api/v1/auth/login").send({
      email: "unknown@example.com",
      password: "ValidPassword123!",
    });
    expect(res1.status).toBe(401);
    expect(res1.body.error.code).toBe("INVALID_CREDENTIALS");

    // Case 2: Wrong password
    const res2 = await request(app).post("/api/v1/auth/login").send({
      email: "bob@example.com",
      password: "WrongPassword123!",
    });
    expect(res2.status).toBe(401);
    expect(res2.body.error.code).toBe("INVALID_CREDENTIALS");
  });

  it("should reject login for suspended accounts", async () => {
    const passwordHash = await hashPassword("ValidPassword123!");
    await User.create({
      name: "Suspended User",
      email: "suspended@example.com",
      passwordHash,
      status: "SUSPENDED",
    });

    const res = await request(app).post("/api/v1/auth/login").send({
      email: "suspended@example.com",
      password: "ValidPassword123!",
    });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("ACCOUNT_SUSPENDED");
  });

  it("should reject login for deleted accounts", async () => {
    const passwordHash = await hashPassword("ValidPassword123!");
    await User.create({
      name: "Deleted User",
      email: "deleted@example.com",
      passwordHash,
      status: "DELETED",
    });

    const res = await request(app).post("/api/v1/auth/login").send({
      email: "deleted@example.com",
      password: "ValidPassword123!",
    });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("ACCOUNT_DELETED");
  });
});
