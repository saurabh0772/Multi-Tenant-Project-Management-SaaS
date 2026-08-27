import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import mongoose from "mongoose";
import request from "supertest";
import { env } from "../../config/env.js";
import { createApp } from "../../app.js";
import { User } from "../../models/user.model.js";

const app = createApp();

describe("POST /api/v1/auth/register", () => {
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
    await User.createIndexes();
  });

  it("should register a new user successfully", async () => {
    const res = await request(app).post("/api/v1/auth/register").send({
      name: "Alice Smith",
      email: "alice@example.com",
      password: "StrongPassword123!",
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.name).toBe("Alice Smith");
    expect(res.body.data.user.email).toBe("alice@example.com");
    expect(res.body.data.accessToken).toBeDefined();

    // Verify HTTP-only cookie
    const cookies = res.get("Set-Cookie");
    expect(cookies).toBeDefined();
    expect(cookies![0]).toContain("refreshToken=");
    expect(cookies![0]).toContain("HttpOnly");

    // Verify DB password storage security
    const storedUser = await User.findOne({ email: "alice@example.com" }).select("+passwordHash");
    expect(storedUser).not.toBeNull();
    expect(storedUser?.passwordHash).toContain("$argon2id$");
    expect(storedUser?.passwordHash).not.toBe("StrongPassword123!");
    expect(res.body.data.user.passwordHash).toBeUndefined();
  });

  it("should reject duplicate email registration with 409 DUPLICATE_RESOURCE", async () => {
    await request(app).post("/api/v1/auth/register").send({
      name: "Alice Smith",
      email: "duplicate@example.com",
      password: "StrongPassword123!",
    });

    const res = await request(app).post("/api/v1/auth/register").send({
      name: "Alice Duplicate",
      email: "DUPLICATE@example.com", // testing normalization
      password: "StrongPassword123!",
    });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("DUPLICATE_RESOURCE");
  });

  it("should reject invalid/weak password with 400 validation error", async () => {
    const res = await request(app).post("/api/v1/auth/register").send({
      name: "Weak Pass User",
      email: "weak@example.com",
      password: "weak",
    });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});
