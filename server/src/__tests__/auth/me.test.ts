import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import mongoose from "mongoose";
import request from "supertest";
import { env } from "../../config/env.js";
import { createApp } from "../../app.js";
import { User } from "../../models/user.model.js";
import { hashPassword } from "../../utils/password.js";

const app = createApp();

describe("GET /api/v1/auth/me", () => {
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

  it("should return safe user profile for authenticated user", async () => {
    const passwordHash = await hashPassword("ValidPassword123!");
    const user = await User.create({
      name: "Emma Watson",
      email: "emma@example.com",
      passwordHash,
      status: "ACTIVE",
    });

    const loginRes = await request(app).post("/api/v1/auth/login").send({
      email: "emma@example.com",
      password: "ValidPassword123!",
    });

    const accessToken = loginRes.body.data.accessToken;

    const meRes = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.success).toBe(true);
    expect(meRes.body.data.user.id).toBe(user._id.toString());
    expect(meRes.body.data.user.name).toBe("Emma Watson");
    expect(meRes.body.data.user.email).toBe("emma@example.com");
    expect(meRes.body.data.user.passwordHash).toBeUndefined();
  });

  it("should reject unauthenticated request with 401 UNAUTHORIZED", async () => {
    const res = await request(app).get("/api/v1/auth/me");

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });
});
