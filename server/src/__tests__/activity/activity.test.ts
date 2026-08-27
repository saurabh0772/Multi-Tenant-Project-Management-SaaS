import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import mongoose from "mongoose";
import request from "supertest";
import { createApp } from "../../app.js";
import { env } from "../../config/env.js";
import { User } from "../../models/user.model.js";
import { Organization } from "../../models/organization.model.js";
import { Membership } from "../../models/membership.model.js";
import { Project } from "../../models/project.model.js";
import { Task } from "../../models/task.model.js";
import { ActivityLog } from "../../models/activity.model.js";
import { hashPassword } from "../../utils/password.js";

const app = createApp();

describe("Activity Feed Integration Suite", () => {
  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(env.MONGODB_TEST_URI);
    }
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await Organization.deleteMany({});
    await Membership.deleteMany({});
    await Project.deleteMany({});
    await Task.deleteMany({});
    await ActivityLog.deleteMany({});
    await User.createIndexes();
    await Organization.createIndexes();
    await Membership.createIndexes();
    await Project.createIndexes();
    await Task.createIndexes();
    await ActivityLog.createIndexes();
  });

  it("should retrieve organization activity feed with safe actor population", async () => {
    const passwordHash = await hashPassword("ValidPassword123!");
    const owner = await User.create({
      name: "Activity Owner",
      email: "activity.owner@example.com",
      passwordHash,
      status: "ACTIVE",
    });

    const org = await Organization.create({
      name: "Activity Org",
      slug: "activity-org",
      ownerId: owner._id,
    });

    await Membership.create({
      userId: owner._id,
      organizationId: org._id,
      role: "OWNER",
      status: "ACTIVE",
    });

    await ActivityLog.create({
      organizationId: org._id,
      actorId: owner._id,
      action: "PROJECT_CREATED",
      entityType: "Project",
      entityId: new mongoose.Types.ObjectId(),
      metadata: { name: "Sprint Project" },
    });

    const loginRes = await request(app).post("/api/v1/auth/login").send({
      email: "activity.owner@example.com",
      password: "ValidPassword123!",
    });
    const token = loginRes.body.data.accessToken;

    const res = await request(app)
      .get(`/api/v1/organizations/${org._id.toString()}/activities`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].action).toBe("PROJECT_CREATED");
    expect(res.body.data[0].actor.name).toBe("Activity Owner");
    expect(res.body.data[0].actor.passwordHash).toBeUndefined();
  });

  it("should retrieve project activity feed and validate project-tenant relationship", async () => {
    const passwordHash = await hashPassword("ValidPassword123!");
    const owner = await User.create({
      name: "Proj Activity Owner",
      email: "proj.act@example.com",
      passwordHash,
      status: "ACTIVE",
    });

    const org = await Organization.create({
      name: "Proj Activity Org",
      slug: "proj-act-org",
      ownerId: owner._id,
    });

    await Membership.create({
      userId: owner._id,
      organizationId: org._id,
      role: "OWNER",
      status: "ACTIVE",
    });

    const project = await Project.create({
      organizationId: org._id,
      name: "Activity Project",
      slug: "activity-project",
      ownerId: owner._id,
      createdBy: owner._id,
    });

    await ActivityLog.create({
      organizationId: org._id,
      actorId: owner._id,
      action: "PROJECT_UPDATED",
      entityType: "Project",
      entityId: project._id,
      metadata: { name: "Updated Activity Project" },
    });

    const loginRes = await request(app).post("/api/v1/auth/login").send({
      email: "proj.act@example.com",
      password: "ValidPassword123!",
    });
    const token = loginRes.body.data.accessToken;

    const res = await request(app)
      .get(
        `/api/v1/organizations/${org._id.toString()}/projects/${project._id.toString()}/activities`
      )
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].action).toBe("PROJECT_UPDATED");
  });

  it("should retrieve task activity feed and validate task-tenant relationship", async () => {
    const passwordHash = await hashPassword("ValidPassword123!");
    const owner = await User.create({
      name: "Task Activity Owner",
      email: "task.act@example.com",
      passwordHash,
      status: "ACTIVE",
    });

    const org = await Organization.create({
      name: "Task Activity Org",
      slug: "task-act-org",
      ownerId: owner._id,
    });

    await Membership.create({
      userId: owner._id,
      organizationId: org._id,
      role: "OWNER",
      status: "ACTIVE",
    });

    const project = await Project.create({
      organizationId: org._id,
      name: "Task Activity Project",
      slug: "task-act-project",
      ownerId: owner._id,
      createdBy: owner._id,
    });

    const task = await Task.create({
      organizationId: org._id,
      projectId: project._id,
      title: "Activity Task",
      createdBy: owner._id,
    });

    await ActivityLog.create({
      organizationId: org._id,
      actorId: owner._id,
      action: "TASK_STATUS_CHANGED",
      entityType: "Task",
      entityId: task._id,
      metadata: { previousStatus: "TODO", newStatus: "IN_PROGRESS" },
    });

    const loginRes = await request(app).post("/api/v1/auth/login").send({
      email: "task.act@example.com",
      password: "ValidPassword123!",
    });
    const token = loginRes.body.data.accessToken;

    const res = await request(app)
      .get(
        `/api/v1/organizations/${org._id.toString()}/tasks/${task._id.toString()}/activities`
      )
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].action).toBe("TASK_STATUS_CHANGED");
  });
});
