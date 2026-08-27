import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import mongoose from "mongoose";
import { env } from "../../config/env.js";
import { User } from "../../models/user.model.js";
import { UserFactory } from "../factories/user.factory.js";

describe("User Model & Validation", () => {
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

  it("should successfully create a valid user", async () => {
    const userData = UserFactory.build({ email: "unique.user@example.com" });
    const user = await User.create(userData);

    expect(user._id).toBeDefined();
    expect(user.name).toBe(userData.name);
    expect(user.email).toBe("unique.user@example.com");
    expect(user.status).toBe("ACTIVE");
    expect(user.emailVerified).toBe(false);
  });

  it("should enforce email uniqueness", async () => {
    await User.create(UserFactory.build({ email: "duplicate@example.com" }));

    await expect(
      User.create(UserFactory.build({ email: "duplicate@example.com" }))
    ).rejects.toThrow();
  });

  it("should not include passwordHash by default in queries and toJSON", async () => {
    const userData = UserFactory.build({ email: "secure@example.com" });
    const user = await User.create(userData);

    const fetched = await User.findById(user._id);
    expect(fetched?.passwordHash).toBeUndefined();

    const json = user.toJSON();
    expect(json.passwordHash).toBeUndefined();
  });
});
