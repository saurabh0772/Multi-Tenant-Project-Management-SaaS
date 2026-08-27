import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import { createApp } from "../../app.js";
import { User } from "../../models/user.model.js";
import { Organization } from "../../models/organization.model.js";
import { Membership as Member } from "../../models/membership.model.js";
import { Project } from "../../models/project.model.js";
import { Task } from "../../models/task.model.js";
import { generateAccessToken } from "../../utils/jwt.js";
import { env } from "../../config/env.js";

const app = createApp();

describe("Phase 12 — Analytics & Reporting Security and Integration Suite", () => {
  let adminUser: InstanceType<typeof User>;
  let managerUser: InstanceType<typeof User>;
  let memberUser: InstanceType<typeof User>;
  let nonMemberUser: InstanceType<typeof User>;

  let adminToken: string;
  let managerToken: string;
  let memberToken: string;
  let nonMemberToken: string;

  let orgA: InstanceType<typeof Organization>;
  let orgB: InstanceType<typeof Organization>;

  let projectA1: InstanceType<typeof Project>;
  let projectB1: InstanceType<typeof Project>;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(env.MONGODB_TEST_URI);
    }
  });

  afterAll(async () => {
    await User.deleteMany({});
    await Organization.deleteMany({});
    await Member.deleteMany({});
    await Project.deleteMany({});
    await Task.deleteMany({});
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await Organization.deleteMany({});
    await Member.deleteMany({});
    await Project.deleteMany({});
    await Task.deleteMany({});

    // Create Users
    adminUser = await User.create({
      name: "Admin User",
      email: "admin@analytics.com",
      passwordHash: "hash123",
      status: "ACTIVE",
    });

    managerUser = await User.create({
      name: "Manager User",
      email: "manager@analytics.com",
      passwordHash: "hash123",
      status: "ACTIVE",
    });

    memberUser = await User.create({
      name: "Regular Member",
      email: "member@analytics.com",
      passwordHash: "hash123",
      status: "ACTIVE",
    });

    nonMemberUser = await User.create({
      name: "Non Member",
      email: "nonmember@analytics.com",
      passwordHash: "hash123",
      status: "ACTIVE",
    });

    adminToken = generateAccessToken(adminUser._id.toString(), "session1");
    managerToken = generateAccessToken(managerUser._id.toString(), "session2");
    memberToken = generateAccessToken(memberUser._id.toString(), "session3");
    nonMemberToken = generateAccessToken(nonMemberUser._id.toString(), "session4");

    // Create Organizations
    orgA = await Organization.create({
      name: "Analytics Org A",
      slug: "analytics-org-a",
      ownerId: adminUser._id,
    });

    orgB = await Organization.create({
      name: "Analytics Org B",
      slug: "analytics-org-b",
      ownerId: nonMemberUser._id,
    });

    // Create Memberships for Org A
    await Member.create({
      organizationId: orgA._id,
      userId: adminUser._id,
      role: "ADMIN",
      status: "ACTIVE",
      joinedAt: new Date(),
    });

    await Member.create({
      organizationId: orgA._id,
      userId: managerUser._id,
      role: "MANAGER",
      status: "ACTIVE",
      joinedAt: new Date(),
    });

    await Member.create({
      organizationId: orgA._id,
      userId: memberUser._id,
      role: "MEMBER",
      status: "ACTIVE",
      joinedAt: new Date(),
    });

    // Projects
    projectA1 = await Project.create({
      organizationId: orgA._id,
      name: "Org A Project 1",
      slug: "org-a-project-1",
      ownerId: adminUser._id,
      createdBy: adminUser._id,
      status: "ACTIVE",
    });

    projectB1 = await Project.create({
      organizationId: orgB._id,
      name: "Org B Project 1",
      slug: "org-b-project-1",
      ownerId: nonMemberUser._id,
      createdBy: nonMemberUser._id,
      status: "ACTIVE",
    });

    // Tasks for Org A
    const pastDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);

    await Task.create({
      organizationId: orgA._id,
      projectId: projectA1._id,
      title: "Task 1 TODO",
      status: "TODO",
      priority: "HIGH",
      createdBy: adminUser._id,
      assignedTo: memberUser._id,
      dueDate: pastDate, // Overdue
    });

    await Task.create({
      organizationId: orgA._id,
      projectId: projectA1._id,
      title: "Task 2 DONE",
      status: "DONE",
      priority: "MEDIUM",
      createdBy: adminUser._id,
      assignedTo: memberUser._id,
      dueDate: pastDate, // Completed, so not overdue
      completedAt: new Date(),
    });

    // Task for Org B
    await Task.create({
      organizationId: orgB._id,
      projectId: projectB1._id,
      title: "Org B Secret Task",
      status: "TODO",
      priority: "URGENT",
      createdBy: nonMemberUser._id,
    });
  });

  describe("1. RBAC & Permission Enforcement", () => {
    it("should allow ADMIN to access organization overview analytics", async () => {
      const res = await request(app)
        .get(`/api/v1/organizations/${orgA._id}/analytics/overview`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.projects.total).toBe(1);
      expect(res.body.data.tasks.total).toBe(2);
      expect(res.body.data.tasks.overdue).toBe(1);
    });

    it("should allow MANAGER to access dashboard analytics", async () => {
      const res = await request(app)
        .get(`/api/v1/organizations/${orgA._id}/analytics/dashboard`)
        .set("Authorization", `Bearer ${managerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.summary.projects.total).toBe(1);
    });

    it("should deny MEMBER without ANALYTICS_READ with 403 FORBIDDEN", async () => {
      const res = await request(app)
        .get(`/api/v1/organizations/${orgA._id}/analytics/overview`)
        .set("Authorization", `Bearer ${memberToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("FORBIDDEN");
    });

    it("should deny non-organization member with 403 FORBIDDEN", async () => {
      const res = await request(app)
        .get(`/api/v1/organizations/${orgA._id}/analytics/overview`)
        .set("Authorization", `Bearer ${nonMemberToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe("2. Tenant Isolation & Security Boundary", () => {
    it("should strictly return only Org A analytics and never expose Org B tasks", async () => {
      const res = await request(app)
        .get(`/api/v1/organizations/${orgA._id}/analytics/tasks`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);

      // Org A has 2 tasks (TODO: 1, DONE: 1). Priority: HIGH: 1, MEDIUM: 1, URGENT: 0
      const priorityDist = res.body.data.priorityDistribution;
      const urgentItem = priorityDist.find((p: { priority: string }) => p.priority === "URGENT");
      expect(urgentItem?.count || 0).toBe(0); // Org B task was URGENT, so count must be 0
    });

    it("should return 404 RESOURCE_NOT_FOUND when requesting analytics for cross-tenant project", async () => {
      const res = await request(app)
        .get(`/api/v1/organizations/${orgA._id}/analytics/projects/${projectB1._id}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe("RESOURCE_NOT_FOUND");
    });
  });

  describe("3. Validation & Date Range Filtering", () => {
    it("should support 7d date range filter", async () => {
      const res = await request(app)
        .get(`/api/v1/organizations/${orgA._id}/analytics/dashboard?range=7d`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("should reject custom date range when startDate > endDate with 400 VALIDATION_ERROR", async () => {
      const res = await request(app)
        .get(
          `/api/v1/organizations/${orgA._id}/analytics/tasks?range=custom&startDate=2026-08-10&endDate=2026-08-01`
        )
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("4. Task, Member Workload & Project Health Analytics", () => {
    it("should return overdue task metrics correctly excluding completed tasks", async () => {
      const res = await request(app)
        .get(`/api/v1/organizations/${orgA._id}/analytics/tasks/overdue`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.total).toBe(1); // Task 1 is TODO & overdue; Task 2 is DONE so excluded
    });

    it("should calculate member workload metrics", async () => {
      const res = await request(app)
        .get(`/api/v1/organizations/${orgA._id}/analytics/members/workload`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const memberEntry = res.body.data.members.find(
        (m: { userId: string }) => m.userId === memberUser._id.toString()
      );
      expect(memberEntry).toBeDefined();
      expect(memberEntry.assignedTasks).toBe(2);
      expect(memberEntry.completedTasks).toBe(1);
      expect(memberEntry.pendingTasks).toBe(1);
      expect(memberEntry.overdueTasks).toBe(1);
    });

    it("should calculate project completion rates without NaN or Infinity", async () => {
      const res = await request(app)
        .get(`/api/v1/organizations/${orgA._id}/analytics/projects`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const proj = res.body.data.projects[0];
      expect(proj.completionRate).toBe(50); // 1 of 2 completed = 50%
    });
  });
});
