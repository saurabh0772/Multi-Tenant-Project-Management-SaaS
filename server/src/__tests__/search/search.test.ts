import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import mongoose from "mongoose";
import request from "supertest";
import { env } from "../../config/env.js";
import { createApp } from "../../app.js";
import { User } from "../../models/user.model.js";
import { Organization } from "../../models/organization.model.js";
import { Membership } from "../../models/membership.model.js";
import { Project } from "../../models/project.model.js";
import { Task } from "../../models/task.model.js";
import { Comment } from "../../models/comment.model.js";
import { hashPassword } from "../../utils/password.js";

const app = createApp();

describe("Phase 13 — Advanced Search & Tenant Isolation Test Suite", () => {
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
    await Comment.deleteMany({});
  });

  it("should return tenant-scoped search results across projects, tasks, comments, and members", async () => {
    const passwordHash = await hashPassword("Password123!");
    const user = await User.create({
      name: "Search User",
      email: "search.user@example.com",
      passwordHash,
      status: "ACTIVE",
    });

    const org = await Organization.create({
      name: "Acme Corp",
      slug: "acme-corp",
      ownerId: user._id,
    });

    await Membership.create({
      userId: user._id,
      organizationId: org._id,
      role: "OWNER",
      status: "ACTIVE",
    });

    const project = await Project.create({
      organizationId: org._id,
      name: "Backend Optimization",
      slug: "backend-opt",
      description: "Optimizing search indexes",
      ownerId: user._id,
      createdBy: user._id,
      status: "ACTIVE",
    });

    const task = await Task.create({
      organizationId: org._id,
      projectId: project._id,
      title: "Backend Index Tuning",
      description: "Add compound indexes",
      createdBy: user._id,
      status: "TODO",
      priority: "HIGH",
    });

    await Comment.create({
      organizationId: org._id,
      taskId: task._id,
      authorId: user._id,
      content: "Backend query performance is improved",
    });

    // Authenticate
    const loginRes = await request(app).post("/api/v1/auth/login").send({
      email: "search.user@example.com",
      password: "Password123!",
    });
    const token = loginRes.body.data.accessToken;

    // Search query "Backend"
    const res = await request(app)
      .get(`/api/v1/organizations/${org._id.toString()}/search?q=Backend`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty("projects");
    expect(res.body.data).toHaveProperty("tasks");
    expect(res.body.data).toHaveProperty("comments");
    expect(res.body.data).toHaveProperty("members");

    expect(res.body.data.projects.length).toBeGreaterThan(0);
    expect(res.body.data.projects[0].name).toContain("Backend");

    expect(res.body.data.tasks.length).toBeGreaterThan(0);
    expect(res.body.data.tasks[0].title).toContain("Backend");

    expect(res.body.data.comments.length).toBeGreaterThan(0);
    expect(res.body.data.comments[0].content).toContain("Backend");
  });

  it("should enforce strict tenant isolation during global search", async () => {
    const passwordHash = await hashPassword("Password123!");
    const userA = await User.create({
      name: "User Org A",
      email: "usera.search@example.com",
      passwordHash,
      status: "ACTIVE",
    });

    const orgA = await Organization.create({
      name: "Org A Search",
      slug: "org-a-search",
      ownerId: userA._id,
    });

    const orgB = await Organization.create({
      name: "Org B Confidential",
      slug: "org-b-confidential",
      ownerId: new mongoose.Types.ObjectId(),
    });

    await Membership.create({
      userId: userA._id,
      organizationId: orgA._id,
      role: "OWNER",
      status: "ACTIVE",
    });

    // Create confidential project in Org B
    await Project.create({
      organizationId: orgB._id,
      name: "Confidential Project Org B",
      slug: "confidential-b",
      ownerId: new mongoose.Types.ObjectId(),
      createdBy: new mongoose.Types.ObjectId(),
      status: "ACTIVE",
    });

    const loginRes = await request(app).post("/api/v1/auth/login").send({
      email: "usera.search@example.com",
      password: "Password123!",
    });
    const tokenA = loginRes.body.data.accessToken;

    // Search inside Org A for "Confidential"
    const res = await request(app)
      .get(`/api/v1/organizations/${orgA._id.toString()}/search?q=Confidential`)
      .set("Authorization", `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.data.projects.length).toBe(0);
    expect(res.body.data.tasks.length).toBe(0);
    expect(res.body.data.comments.length).toBe(0);
  });

  it("should safely handle regex metacharacters in search query", async () => {
    const passwordHash = await hashPassword("Password123!");
    const user = await User.create({
      name: "Regex User",
      email: "regex.user@example.com",
      passwordHash,
      status: "ACTIVE",
    });

    const org = await Organization.create({
      name: "Regex Org",
      slug: "regex-org",
      ownerId: user._id,
    });

    await Membership.create({
      userId: user._id,
      organizationId: org._id,
      role: "OWNER",
      status: "ACTIVE",
    });

    const loginRes = await request(app).post("/api/v1/auth/login").send({
      email: "regex.user@example.com",
      password: "Password123!",
    });
    const token = loginRes.body.data.accessToken;

    // Pass dangerous regex query string `.*+?^${}()|[\]\`
    const res = await request(app)
      .get(`/api/v1/organizations/${org._id.toString()}/search?q=.*+?^\${}()|[\\]\\`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("should reject MongoDB query operator injection attempts with 400 VALIDATION_ERROR", async () => {
    const passwordHash = await hashPassword("Password123!");
    const user = await User.create({
      name: "Injection User",
      email: "injection.user@example.com",
      passwordHash,
      status: "ACTIVE",
    });

    const org = await Organization.create({
      name: "Injection Org",
      slug: "injection-org",
      ownerId: user._id,
    });

    await Membership.create({
      userId: user._id,
      organizationId: org._id,
      role: "OWNER",
      status: "ACTIVE",
    });

    const loginRes = await request(app).post("/api/v1/auth/login").send({
      email: "injection.user@example.com",
      password: "Password123!",
    });
    const token = loginRes.body.data.accessToken;

    const forbiddenQueries = ["$where", "$expr", "$function", "$regex", "$or", "$and"];
    for (const q of forbiddenQueries) {
      const res = await request(app)
        .get(`/api/v1/organizations/${org._id.toString()}/search?q=${q}`)
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    }
  });

  it("should reject invalid pagination parameters", async () => {
    const passwordHash = await hashPassword("Password123!");
    const user = await User.create({
      name: "Pagination User",
      email: "pagination.user@example.com",
      passwordHash,
      status: "ACTIVE",
    });

    const org = await Organization.create({
      name: "Pagination Org",
      slug: "pagination-org",
      ownerId: user._id,
    });

    await Membership.create({
      userId: user._id,
      organizationId: org._id,
      role: "OWNER",
      status: "ACTIVE",
    });

    const loginRes = await request(app).post("/api/v1/auth/login").send({
      email: "pagination.user@example.com",
      password: "Password123!",
    });
    const token = loginRes.body.data.accessToken;

    // Test limit > 100
    const resLimitHigh = await request(app)
      .get(`/api/v1/organizations/${org._id.toString()}/search?limit=150`)
      .set("Authorization", `Bearer ${token}`);
    expect(resLimitHigh.status).toBe(400);

    // Test page <= 0
    const resPageZero = await request(app)
      .get(`/api/v1/organizations/${org._id.toString()}/search?page=0`)
      .set("Authorization", `Bearer ${token}`);
    expect(resPageZero.status).toBe(400);
  });
});
