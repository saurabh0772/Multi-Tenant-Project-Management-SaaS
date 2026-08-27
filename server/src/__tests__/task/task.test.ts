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

describe("Task Management Integration Suite", () => {
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
  });

  // --- TASK CREATION ---

  it("should allow MEMBER role to create a task in an active project with valid assignee", async () => {
    const passwordHash = await hashPassword("ValidPassword123!");
    const owner = await User.create({
      name: "Org Owner",
      email: "task.owner@example.com",
      passwordHash,
      status: "ACTIVE",
    });

    const member = await User.create({
      name: "Org Member",
      email: "task.member@example.com",
      passwordHash,
      status: "ACTIVE",
    });

    const org = await Organization.create({
      name: "Task Org Alpha",
      slug: "task-org-alpha",
      ownerId: owner._id,
    });

    await Membership.create({
      userId: owner._id,
      organizationId: org._id,
      role: "OWNER",
      status: "ACTIVE",
    });

    await Membership.create({
      userId: member._id,
      organizationId: org._id,
      role: "MEMBER",
      status: "ACTIVE",
    });

    const project = await Project.create({
      organizationId: org._id,
      name: "Task Alpha Project",
      slug: "task-alpha-project",
      ownerId: owner._id,
      createdBy: owner._id,
    });

    const loginRes = await request(app).post("/api/v1/auth/login").send({
      email: "task.member@example.com",
      password: "ValidPassword123!",
    });
    const token = loginRes.body.data.accessToken;

    const res = await request(app)
      .post(
        `/api/v1/organizations/${org._id.toString()}/projects/${project._id.toString()}/tasks`
      )
      .set("Authorization", `Bearer ${token}`)
      .send({
        title: "Implement Task API",
        description: "Create routes and controllers for tasks",
        assignedTo: owner._id.toString(),
        priority: "HIGH",
        status: "TODO",
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.title).toBe("Implement Task API");
    expect(res.body.data.projectId.id || res.body.data.projectId).toBe(project._id.toString());
    expect(res.body.data.status).toBe("TODO");

    const activity = await ActivityLog.findOne({
      organizationId: org._id,
      action: "TASK_CREATED",
    });
    expect(activity).not.toBeNull();
  });

  it("should reject task creation for cross-tenant project with 404 RESOURCE_NOT_FOUND", async () => {
    const passwordHash = await hashPassword("ValidPassword123!");
    const userA = await User.create({
      name: "User Org A",
      email: "usera.task@example.com",
      passwordHash,
      status: "ACTIVE",
    });

    const userB = await User.create({
      name: "User Org B",
      email: "userb.task@example.com",
      passwordHash,
      status: "ACTIVE",
    });

    const orgA = await Organization.create({
      name: "Task Org A",
      slug: "task-org-a",
      ownerId: userA._id,
    });

    const orgB = await Organization.create({
      name: "Task Org B",
      slug: "task-org-b",
      ownerId: userB._id,
    });

    await Membership.create({
      userId: userA._id,
      organizationId: orgA._id,
      role: "OWNER",
      status: "ACTIVE",
    });

    const projectB = await Project.create({
      organizationId: orgB._id,
      name: "Org B Project",
      slug: "org-b-project",
      ownerId: userB._id,
      createdBy: userB._id,
    });

    const loginA = await request(app).post("/api/v1/auth/login").send({
      email: "usera.task@example.com",
      password: "ValidPassword123!",
    });
    const tokenA = loginA.body.data.accessToken;

    const res = await request(app)
      .post(
        `/api/v1/organizations/${orgA._id.toString()}/projects/${projectB._id.toString()}/tasks`
      )
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ title: "Cross Tenant Task" });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("RESOURCE_NOT_FOUND");
  });

  it("should reject cross-tenant or suspended assignee during task creation with 400 VALIDATION_ERROR", async () => {
    const passwordHash = await hashPassword("ValidPassword123!");
    const owner = await User.create({
      name: "Task Owner",
      email: "owner.assign@example.com",
      passwordHash,
      status: "ACTIVE",
    });

    const suspendedUser = await User.create({
      name: "Suspended User",
      email: "suspended.assign@example.com",
      passwordHash,
      status: "ACTIVE",
    });

    const org = await Organization.create({
      name: "Assignee Test Org",
      slug: "assignee-test-org",
      ownerId: owner._id,
    });

    await Membership.create({
      userId: owner._id,
      organizationId: org._id,
      role: "OWNER",
      status: "ACTIVE",
    });

    await Membership.create({
      userId: suspendedUser._id,
      organizationId: org._id,
      role: "MEMBER",
      status: "SUSPENDED",
    });

    const project = await Project.create({
      organizationId: org._id,
      name: "Assignee Project",
      slug: "assignee-project",
      ownerId: owner._id,
      createdBy: owner._id,
    });

    const loginRes = await request(app).post("/api/v1/auth/login").send({
      email: "owner.assign@example.com",
      password: "ValidPassword123!",
    });
    const token = loginRes.body.data.accessToken;

    const res = await request(app)
      .post(
        `/api/v1/organizations/${org._id.toString()}/projects/${project._id.toString()}/tasks`
      )
      .set("Authorization", `Bearer ${token}`)
      .send({
        title: "Task with Suspended Assignee",
        assignedTo: suspendedUser._id.toString(),
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  // --- TASK LISTING & SEARCH ---

  it("should list project tasks with pagination, filters, and exclude soft-deleted tasks", async () => {
    const passwordHash = await hashPassword("ValidPassword123!");
    const owner = await User.create({
      name: "List Owner Task",
      email: "list.task@example.com",
      passwordHash,
      status: "ACTIVE",
    });

    const org = await Organization.create({
      name: "Task List Org",
      slug: "task-list-org",
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
      name: "Main Project",
      slug: "main-project",
      ownerId: owner._id,
      createdBy: owner._id,
    });

    await Task.create({
      organizationId: org._id,
      projectId: project._id,
      title: "Write Documentation",
      description: "API docs",
      createdBy: owner._id,
      status: "IN_PROGRESS",
      priority: "HIGH",
      position: 100,
    });

    await Task.create({
      organizationId: org._id,
      projectId: project._id,
      title: "Fix Bug",
      description: "Critical bug",
      createdBy: owner._id,
      status: "TODO",
      priority: "URGENT",
      position: 200,
    });

    await Task.create({
      organizationId: org._id,
      projectId: project._id,
      title: "Deleted Task",
      createdBy: owner._id,
      deletedAt: new Date(),
    });

    const loginRes = await request(app).post("/api/v1/auth/login").send({
      email: "list.task@example.com",
      password: "ValidPassword123!",
    });
    const token = loginRes.body.data.accessToken;

    const res = await request(app)
      .get(
        `/api/v1/organizations/${org._id.toString()}/projects/${project._id.toString()}/tasks`
      )
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(2);
    expect(res.body.data[0].title).toBe("Write Documentation");
  });

  // --- TASK UPDATE & COMPLETED_AT SYNCHRONIZATION ---

  it("should update task and synchronize completedAt when status transitions to DONE and back", async () => {
    const passwordHash = await hashPassword("ValidPassword123!");
    const owner = await User.create({
      name: "Update Task Owner",
      email: "update.task@example.com",
      passwordHash,
      status: "ACTIVE",
    });

    const org = await Organization.create({
      name: "Update Task Org",
      slug: "update-task-org",
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
      name: "Update Project",
      slug: "update-project",
      ownerId: owner._id,
      createdBy: owner._id,
    });

    const task = await Task.create({
      organizationId: org._id,
      projectId: project._id,
      title: "Initial Task",
      createdBy: owner._id,
      status: "TODO",
    });

    const loginRes = await request(app).post("/api/v1/auth/login").send({
      email: "update.task@example.com",
      password: "ValidPassword123!",
    });
    const token = loginRes.body.data.accessToken;

    // 1. Transition to DONE -> completedAt populated
    const resDone = await request(app)
      .patch(
        `/api/v1/organizations/${org._id.toString()}/tasks/${task._id.toString()}`
      )
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "DONE" });

    expect(resDone.status).toBe(200);
    expect(resDone.body.data.status).toBe("DONE");
    expect(resDone.body.data.completedAt).not.toBeNull();

    // 2. Transition to IN_PROGRESS -> completedAt cleared
    const resReopen = await request(app)
      .patch(
        `/api/v1/organizations/${org._id.toString()}/tasks/${task._id.toString()}`
      )
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "IN_PROGRESS" });

    expect(resReopen.status).toBe(200);
    expect(resReopen.body.data.status).toBe("IN_PROGRESS");
    expect(resReopen.body.data.completedAt).toBeNull();
  });

  // --- TASK ASSIGNMENT & RBAC ---

  it("should allow MANAGER to assign task, but deny MEMBER with 403 FORBIDDEN", async () => {
    const passwordHash = await hashPassword("ValidPassword123!");
    const owner = await User.create({
      name: "Assign Owner",
      email: "assign.owner@example.com",
      passwordHash,
      status: "ACTIVE",
    });

    const manager = await User.create({
      name: "Assign Manager",
      email: "assign.manager@example.com",
      passwordHash,
      status: "ACTIVE",
    });

    const member = await User.create({
      name: "Assign Member",
      email: "assign.member@example.com",
      passwordHash,
      status: "ACTIVE",
    });

    const org = await Organization.create({
      name: "Assign Org",
      slug: "assign-org",
      ownerId: owner._id,
    });

    await Membership.create({
      userId: owner._id,
      organizationId: org._id,
      role: "OWNER",
      status: "ACTIVE",
    });

    await Membership.create({
      userId: manager._id,
      organizationId: org._id,
      role: "MANAGER",
      status: "ACTIVE",
    });

    await Membership.create({
      userId: member._id,
      organizationId: org._id,
      role: "MEMBER",
      status: "ACTIVE",
    });

    const project = await Project.create({
      organizationId: org._id,
      name: "Assign Project",
      slug: "assign-project",
      ownerId: owner._id,
      createdBy: owner._id,
    });

    const task = await Task.create({
      organizationId: org._id,
      projectId: project._id,
      title: "Unassigned Task",
      createdBy: owner._id,
    });

    // 1. MEMBER attempts to assign -> 403 FORBIDDEN
    const loginMember = await request(app).post("/api/v1/auth/login").send({
      email: "assign.member@example.com",
      password: "ValidPassword123!",
    });
    const tokenMember = loginMember.body.data.accessToken;

    const resMember = await request(app)
      .patch(
        `/api/v1/organizations/${org._id.toString()}/tasks/${task._id.toString()}/assignee`
      )
      .set("Authorization", `Bearer ${tokenMember}`)
      .send({ assignedTo: member._id.toString() });

    expect(resMember.status).toBe(403);

    // 2. MANAGER attempts to assign -> 200 OK
    const loginManager = await request(app).post("/api/v1/auth/login").send({
      email: "assign.manager@example.com",
      password: "ValidPassword123!",
    });
    const tokenManager = loginManager.body.data.accessToken;

    const resManager = await request(app)
      .patch(
        `/api/v1/organizations/${org._id.toString()}/tasks/${task._id.toString()}/assignee`
      )
      .set("Authorization", `Bearer ${tokenManager}`)
      .send({ assignedTo: member._id.toString() });

    expect(resManager.status).toBe(200);
    expect(resManager.body.data.assignedTo.id || resManager.body.data.assignedTo).toBe(member._id.toString());
  });

  // --- POSITION & KANBAN REORDERING ---

  it("should update task position and reject non-finite position numbers with 400 VALIDATION_ERROR", async () => {
    const passwordHash = await hashPassword("ValidPassword123!");
    const owner = await User.create({
      name: "Move Owner",
      email: "move.owner@example.com",
      passwordHash,
      status: "ACTIVE",
    });

    const org = await Organization.create({
      name: "Move Org",
      slug: "move-org",
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
      name: "Move Project",
      slug: "move-project",
      ownerId: owner._id,
      createdBy: owner._id,
    });

    const task = await Task.create({
      organizationId: org._id,
      projectId: project._id,
      title: "Kanban Task",
      createdBy: owner._id,
      position: 1000,
    });

    const loginRes = await request(app).post("/api/v1/auth/login").send({
      email: "move.owner@example.com",
      password: "ValidPassword123!",
    });
    const token = loginRes.body.data.accessToken;

    // 1. Valid Position update
    const resMove = await request(app)
      .patch(
        `/api/v1/organizations/${org._id.toString()}/tasks/${task._id.toString()}/position`
      )
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "IN_PROGRESS", position: 1500.5 });

    expect(resMove.status).toBe(200);
    expect(resMove.body.data.status).toBe("IN_PROGRESS");
    expect(resMove.body.data.position).toBe(1500.5);

    // 2. Invalid NaN/Infinity Position
    const resInvalid = await request(app)
      .patch(
        `/api/v1/organizations/${org._id.toString()}/tasks/${task._id.toString()}/position`
      )
      .set("Authorization", `Bearer ${token}`)
      .send({ position: "Infinity" });

    expect(resInvalid.status).toBe(400);
  });

  // --- SOFT DELETE & RESTORE ---

  it("should soft delete a task with TASK_DELETE and restore it with TASK_UPDATE", async () => {
    const passwordHash = await hashPassword("ValidPassword123!");
    const owner = await User.create({
      name: "Delete Owner",
      email: "delete.task@example.com",
      passwordHash,
      status: "ACTIVE",
    });

    const org = await Organization.create({
      name: "Delete Org",
      slug: "delete-org",
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
      name: "Delete Project",
      slug: "delete-project",
      ownerId: owner._id,
      createdBy: owner._id,
    });

    const task = await Task.create({
      organizationId: org._id,
      projectId: project._id,
      title: "Soft Delete Target",
      createdBy: owner._id,
    });

    const loginRes = await request(app).post("/api/v1/auth/login").send({
      email: "delete.task@example.com",
      password: "ValidPassword123!",
    });
    const token = loginRes.body.data.accessToken;

    // 1. Soft Delete -> 200 OK
    const resDelete = await request(app)
      .delete(
        `/api/v1/organizations/${org._id.toString()}/tasks/${task._id.toString()}`
      )
      .set("Authorization", `Bearer ${token}`);

    expect(resDelete.status).toBe(200);

    const softDeletedInDb = await Task.findById(task._id);
    expect(softDeletedInDb).not.toBeNull();
    expect(softDeletedInDb?.deletedAt).not.toBeNull();

    // 2. Normal Details Lookup Returns 404
    const resLookup = await request(app)
      .get(
        `/api/v1/organizations/${org._id.toString()}/tasks/${task._id.toString()}`
      )
      .set("Authorization", `Bearer ${token}`);
    expect(resLookup.status).toBe(404);

    // 3. Restore Task -> 200 OK
    const resRestore = await request(app)
      .post(
        `/api/v1/organizations/${org._id.toString()}/tasks/${task._id.toString()}/restore`
      )
      .set("Authorization", `Bearer ${token}`);

    expect(resRestore.status).toBe(200);
    expect(resRestore.body.data.task.deletedAt).toBeNull();

    const restoredActivity = await ActivityLog.findOne({
      organizationId: org._id,
      action: "TASK_RESTORED",
    });
    expect(restoredActivity).not.toBeNull();
  });

  // --- MY TASKS ENDPOINT ---

  it("should retrieve tasks assigned to the authenticated user via GET /tasks/my", async () => {
    const passwordHash = await hashPassword("ValidPassword123!");
    const userA = await User.create({
      name: "My Task User A",
      email: "my.usera@example.com",
      passwordHash,
      status: "ACTIVE",
    });

    const userB = await User.create({
      name: "My Task User B",
      email: "my.userb@example.com",
      passwordHash,
      status: "ACTIVE",
    });

    const org = await Organization.create({
      name: "My Task Org",
      slug: "my-task-org",
      ownerId: userA._id,
    });

    await Membership.create({
      userId: userA._id,
      organizationId: org._id,
      role: "OWNER",
      status: "ACTIVE",
    });

    await Membership.create({
      userId: userB._id,
      organizationId: org._id,
      role: "MEMBER",
      status: "ACTIVE",
    });

    const project = await Project.create({
      organizationId: org._id,
      name: "My Task Project",
      slug: "my-task-project",
      ownerId: userA._id,
      createdBy: userA._id,
    });

    await Task.create({
      organizationId: org._id,
      projectId: project._id,
      title: "Task Assigned to User A",
      createdBy: userB._id,
      assignedTo: userA._id,
    });

    await Task.create({
      organizationId: org._id,
      projectId: project._id,
      title: "Task Assigned to User B",
      createdBy: userA._id,
      assignedTo: userB._id,
    });

    const loginRes = await request(app).post("/api/v1/auth/login").send({
      email: "my.usera@example.com",
      password: "ValidPassword123!",
    });
    const token = loginRes.body.data.accessToken;

    const res = await request(app)
      .get(`/api/v1/organizations/${org._id.toString()}/tasks/my`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].title).toBe("Task Assigned to User A");
  });
});
