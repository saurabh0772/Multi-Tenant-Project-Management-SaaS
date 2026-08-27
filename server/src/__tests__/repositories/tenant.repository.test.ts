import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import mongoose, { Types } from "mongoose";
import { env } from "../../config/env.js";
import { User } from "../../models/user.model.js";
import { Task } from "../../models/task.model.js";
import "../../models/project.model.js";
import "../../models/organization.model.js";
import { taskRepository } from "../../repositories/task.repository.js";
import { userRepository } from "../../repositories/user.repository.js";
import { UserFactory } from "../factories/user.factory.js";
import { TaskFactory } from "../factories/task.factory.js";
import { AppError } from "../../utils/AppError.js";

describe("Tenant-Aware Repository Isolation & Error Translation", () => {
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
    await Task.deleteMany({});
    await User.createIndexes();
    await Task.createIndexes();
  });

  it("should prevent cross-tenant access when querying tasks by ID and organizationId", async () => {
    const orgA = new Types.ObjectId();
    const orgB = new Types.ObjectId();

    const taskInOrgA = await TaskFactory.create({
      organizationId: orgA,
      title: "Task belonging to Org A",
    });

    // 1. Correct tenant query (Org A) -> returns task
    const foundByOrgA = await taskRepository.getTaskById(taskInOrgA._id, orgA);
    expect(foundByOrgA).not.toBeNull();
    expect(foundByOrgA?._id.toString()).toBe(taskInOrgA._id.toString());

    // 2. Cross-tenant query (Org B trying to access Org A task) -> returns null
    const foundByOrgB = await taskRepository.getTaskById(taskInOrgA._id, orgB);
    expect(foundByOrgB).toBeNull();
  });

  it("should translate duplicate key errors into 409 DUPLICATE_RESOURCE AppErrors", async () => {
    const email = "dup.repo@example.com";
    await userRepository.create(UserFactory.build({ email }));
    await User.createIndexes();

    // Creating second user with identical email must throw 409 AppError
    await expect(userRepository.create(UserFactory.build({ email }))).rejects.toThrowError(AppError);
    await expect(userRepository.create(UserFactory.build({ email }))).rejects.toMatchObject({
      statusCode: 409,
      code: "DUPLICATE_RESOURCE",
    });
  });

  it("should translate invalid ObjectId CastErrors into 400 INVALID_ID AppErrors", async () => {
    await expect(userRepository.findById("invalid-object-id-string")).rejects.toThrowError(AppError);
    await expect(userRepository.findById("invalid-object-id-string")).rejects.toMatchObject({
      statusCode: 400,
      code: "INVALID_ID",
    });
  });
});
