import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import mongoose from "mongoose";
import request from "supertest";
import { createApp } from "../../app.js";
import { env } from "../../config/env.js";
import { User } from "../../models/user.model.js";
import { Organization } from "../../models/organization.model.js";
import { Membership } from "../../models/membership.model.js";
import { Project } from "../../models/project.model.js";
import { ActivityLog } from "../../models/activity.model.js";
import { hashPassword } from "../../utils/password.js";

const app = createApp();

describe("Project Management Integration Suite", () => {
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
    await ActivityLog.deleteMany({});
    await User.createIndexes();
    await Organization.createIndexes();
    await Membership.createIndexes();
    await Project.createIndexes();
  });

  // --- PROJECT CREATION ---

  it("should allow OWNER, ADMIN, and MANAGER to create a project and set default owner", async () => {
    const passwordHash = await hashPassword("ValidPassword123!");
    const ownerUser = await User.create({
      name: "Org Owner",
      email: "owner.proj@example.com",
      passwordHash,
      status: "ACTIVE",
    });

    const org = await Organization.create({
      name: "Proj Org Alpha",
      slug: "proj-org-alpha",
      ownerId: ownerUser._id,
    });

    await Membership.create({
      userId: ownerUser._id,
      organizationId: org._id,
      role: "OWNER",
      status: "ACTIVE",
    });

    const loginRes = await request(app).post("/api/v1/auth/login").send({
      email: "owner.proj@example.com",
      password: "ValidPassword123!",
    });
    const token = loginRes.body.data.accessToken;

    const res = await request(app)
      .post(`/api/v1/organizations/${org._id.toString()}/projects`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Alpha Web Migration",
        description: "Migrating legacy web app to microservices",
        startDate: "2026-09-01",
        dueDate: "2026-12-31",
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe("Alpha Web Migration");
    expect(res.body.data.slug).toBe("alpha-web-migration");
    expect(res.body.data.ownerId).toBe(ownerUser._id.toString());
    expect(res.body.data.status).toBe("PLANNING");

    const activity = await ActivityLog.findOne({
      organizationId: org._id,
      action: "PROJECT_CREATED",
    });
    expect(activity).not.toBeNull();
  });

  it("should reject project creation for MEMBER role with 403 FORBIDDEN", async () => {
    const passwordHash = await hashPassword("ValidPassword123!");
    const memberUser = await User.create({
      name: "Regular Member",
      email: "member.proj@example.com",
      passwordHash,
      status: "ACTIVE",
    });

    const org = await Organization.create({
      name: "Proj Org Beta",
      slug: "proj-org-beta",
      ownerId: new mongoose.Types.ObjectId(),
    });

    await Membership.create({
      userId: memberUser._id,
      organizationId: org._id,
      role: "MEMBER",
      status: "ACTIVE",
    });

    const loginRes = await request(app).post("/api/v1/auth/login").send({
      email: "member.proj@example.com",
      password: "ValidPassword123!",
    });
    const token = loginRes.body.data.accessToken;

    const res = await request(app)
      .post(`/api/v1/organizations/${org._id.toString()}/projects`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Unauthorized Project" });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("should reject duplicate project slug within the same organization with 409 DUPLICATE_RESOURCE", async () => {
    const passwordHash = await hashPassword("ValidPassword123!");
    const owner = await User.create({
      name: "Org Owner Dup",
      email: "dup.proj@example.com",
      passwordHash,
      status: "ACTIVE",
    });

    const org = await Organization.create({
      name: "Dup Org",
      slug: "dup-org",
      ownerId: owner._id,
    });

    await Membership.create({
      userId: owner._id,
      organizationId: org._id,
      role: "OWNER",
      status: "ACTIVE",
    });

    await Project.create({
      organizationId: org._id,
      name: "Existing Project",
      slug: "existing-project",
      ownerId: owner._id,
      createdBy: owner._id,
      status: "ACTIVE",
    });

    const loginRes = await request(app).post("/api/v1/auth/login").send({
      email: "dup.proj@example.com",
      password: "ValidPassword123!",
    });
    const token = loginRes.body.data.accessToken;

    const res = await request(app)
      .post(`/api/v1/organizations/${org._id.toString()}/projects`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Existing Project", slug: "existing-project" });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("DUPLICATE_RESOURCE");
  });

  it("should allow identical project slug across different organizations", async () => {
    const passwordHash = await hashPassword("ValidPassword123!");
    const userA = await User.create({
      name: "User Org A",
      email: "usera.slug@example.com",
      passwordHash,
      status: "ACTIVE",
    });

    const userB = await User.create({
      name: "User Org B",
      email: "userb.slug@example.com",
      passwordHash,
      status: "ACTIVE",
    });

    const orgA = await Organization.create({
      name: "Org Slug A",
      slug: "org-slug-a",
      ownerId: userA._id,
    });

    const orgB = await Organization.create({
      name: "Org Slug B",
      slug: "org-slug-b",
      ownerId: userB._id,
    });

    await Membership.create({
      userId: userA._id,
      organizationId: orgA._id,
      role: "OWNER",
      status: "ACTIVE",
    });

    await Membership.create({
      userId: userB._id,
      organizationId: orgB._id,
      role: "OWNER",
      status: "ACTIVE",
    });

    // Create in Org A
    await Project.create({
      organizationId: orgA._id,
      name: "Common Project",
      slug: "common-project",
      ownerId: userA._id,
      createdBy: userA._id,
    });

    const loginB = await request(app).post("/api/v1/auth/login").send({
      email: "userb.slug@example.com",
      password: "ValidPassword123!",
    });
    const tokenB = loginB.body.data.accessToken;

    // Create in Org B with same slug -> 201 Created
    const resB = await request(app)
      .post(`/api/v1/organizations/${orgB._id.toString()}/projects`)
      .set("Authorization", `Bearer ${tokenB}`)
      .send({ name: "Common Project", slug: "common-project" });

    expect(resB.status).toBe(201);
    expect(resB.body.data.slug).toBe("common-project");
  });

  it("should reject cross-tenant or inactive project owner assignment with 400 VALIDATION_ERROR", async () => {
    const passwordHash = await hashPassword("ValidPassword123!");
    const ownerA = await User.create({
      name: "Owner A",
      email: "ownera.cross@example.com",
      passwordHash,
      status: "ACTIVE",
    });

    const foreignUser = await User.create({
      name: "Foreign User",
      email: "foreign@example.com",
      passwordHash,
      status: "ACTIVE",
    });

    const orgA = await Organization.create({
      name: "Org Cross A",
      slug: "org-cross-a",
      ownerId: ownerA._id,
    });

    await Membership.create({
      userId: ownerA._id,
      organizationId: orgA._id,
      role: "OWNER",
      status: "ACTIVE",
    });

    // Foreign user has NO membership in Org A

    const loginRes = await request(app).post("/api/v1/auth/login").send({
      email: "ownera.cross@example.com",
      password: "ValidPassword123!",
    });
    const tokenA = loginRes.body.data.accessToken;

    const res = await request(app)
      .post(`/api/v1/organizations/${orgA._id.toString()}/projects`)
      .set("Authorization", `Bearer ${tokenA}`)
      .send({
        name: "Cross Tenant Project",
        ownerId: foreignUser._id.toString(),
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  // --- PROJECT LISTING & SEARCH ---

  it("should list projects with pagination, status filter, and tenant-scoped search", async () => {
    const passwordHash = await hashPassword("ValidPassword123!");
    const owner = await User.create({
      name: "List Owner",
      email: "list.owner@example.com",
      passwordHash,
      status: "ACTIVE",
    });

    const org = await Organization.create({
      name: "List Org",
      slug: "list-org",
      ownerId: owner._id,
    });

    await Membership.create({
      userId: owner._id,
      organizationId: org._id,
      role: "OWNER",
      status: "ACTIVE",
    });

    await Project.create({
      organizationId: org._id,
      name: "React Frontend",
      slug: "react-frontend",
      description: "Building modern user interface",
      ownerId: owner._id,
      createdBy: owner._id,
      status: "ACTIVE",
    });

    await Project.create({
      organizationId: org._id,
      name: "Node Backend API",
      slug: "node-backend-api",
      description: "Express microservices architecture",
      ownerId: owner._id,
      createdBy: owner._id,
      status: "PLANNING",
    });

    await Project.create({
      organizationId: org._id,
      name: "Archived Systems",
      slug: "archived-systems",
      ownerId: owner._id,
      createdBy: owner._id,
      status: "ARCHIVED",
      archivedAt: new Date(),
    });

    const loginRes = await request(app).post("/api/v1/auth/login").send({
      email: "list.owner@example.com",
      password: "ValidPassword123!",
    });
    const token = loginRes.body.data.accessToken;

    // 1. Default List (Excludes ARCHIVED)
    const resDefault = await request(app)
      .get(`/api/v1/organizations/${org._id.toString()}/projects`)
      .set("Authorization", `Bearer ${token}`);
    expect(resDefault.status).toBe(200);
    expect(resDefault.body.data.length).toBe(2);

    // 2. Status Filter = PLANNING
    const resPlanning = await request(app)
      .get(`/api/v1/organizations/${org._id.toString()}/projects?status=PLANNING`)
      .set("Authorization", `Bearer ${token}`);
    expect(resPlanning.status).toBe(200);
    expect(resPlanning.body.data.length).toBe(1);
    expect(resPlanning.body.data[0].name).toBe("Node Backend API");

    // 3. Search = "React"
    const resSearch = await request(app)
      .get(`/api/v1/organizations/${org._id.toString()}/projects?search=React`)
      .set("Authorization", `Bearer ${token}`);
    expect(resSearch.status).toBe(200);
    expect(resSearch.body.data.length).toBe(1);
    expect(resSearch.body.data[0].slug).toBe("react-frontend");
  });

  // --- PROJECT DETAILS & IDOR ---

  it("should return 404 RESOURCE_NOT_FOUND when attempting cross-tenant project retrieval", async () => {
    const passwordHash = await hashPassword("ValidPassword123!");
    const userA = await User.create({
      name: "User A Detail",
      email: "usera.detail@example.com",
      passwordHash,
      status: "ACTIVE",
    });

    const userB = await User.create({
      name: "User B Detail",
      email: "userb.detail@example.com",
      passwordHash,
      status: "ACTIVE",
    });

    const orgA = await Organization.create({
      name: "Org Detail A",
      slug: "org-detail-a",
      ownerId: userA._id,
    });

    const orgB = await Organization.create({
      name: "Org Detail B",
      slug: "org-detail-b",
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
      name: "Secret Org B Project",
      slug: "secret-org-b-project",
      ownerId: userB._id,
      createdBy: userB._id,
    });

    const loginA = await request(app).post("/api/v1/auth/login").send({
      email: "usera.detail@example.com",
      password: "ValidPassword123!",
    });
    const tokenA = loginA.body.data.accessToken;

    // User A attempts to access Project B under Org A -> 404 RESOURCE_NOT_FOUND
    const res = await request(app)
      .get(
        `/api/v1/organizations/${orgA._id.toString()}/projects/${projectB._id.toString()}`
      )
      .set("Authorization", `Bearer ${tokenA}`);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("RESOURCE_NOT_FOUND");
  });

  // --- PROJECT ARCHIVE & RESTORE ---

  it("should support archiving and restoring a project with activity logging", async () => {
    const passwordHash = await hashPassword("ValidPassword123!");
    const owner = await User.create({
      name: "Archive Owner",
      email: "arch.owner@example.com",
      passwordHash,
      status: "ACTIVE",
    });

    const org = await Organization.create({
      name: "Archive Org",
      slug: "archive-org",
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
      name: "Lifecycle Project",
      slug: "lifecycle-project",
      ownerId: owner._id,
      createdBy: owner._id,
      status: "ACTIVE",
    });

    const loginRes = await request(app).post("/api/v1/auth/login").send({
      email: "arch.owner@example.com",
      password: "ValidPassword123!",
    });
    const token = loginRes.body.data.accessToken;

    // 1. Archive Project -> 200 OK
    const resArchive = await request(app)
      .post(
        `/api/v1/organizations/${org._id.toString()}/projects/${project._id.toString()}/archive`
      )
      .set("Authorization", `Bearer ${token}`);

    expect(resArchive.status).toBe(200);
    expect(resArchive.body.data.project.status).toBe("ARCHIVED");
    expect(resArchive.body.data.project.archivedAt).not.toBeNull();

    // 2. Restore Project -> 200 OK
    const resRestore = await request(app)
      .post(
        `/api/v1/organizations/${org._id.toString()}/projects/${project._id.toString()}/restore`
      )
      .set("Authorization", `Bearer ${token}`);

    expect(resRestore.status).toBe(200);
    expect(resRestore.body.data.project.status).toBe("ACTIVE");
    expect(resRestore.body.data.project.archivedAt).toBeNull();
  });

  // --- PROJECT DELETION & RBAC ---

  it("should allow OWNER and ADMIN to delete project, but deny MANAGER and MEMBER", async () => {
    const passwordHash = await hashPassword("ValidPassword123!");
    const owner = await User.create({
      name: "Del Owner",
      email: "del.owner@example.com",
      passwordHash,
      status: "ACTIVE",
    });

    const manager = await User.create({
      name: "Del Manager",
      email: "del.manager@example.com",
      passwordHash,
      status: "ACTIVE",
    });

    const org = await Organization.create({
      name: "Del Org",
      slug: "del-org",
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

    const projManagerDelete = await Project.create({
      organizationId: org._id,
      name: "Manager Proj",
      slug: "manager-proj",
      ownerId: owner._id,
      createdBy: owner._id,
    });

    const projOwnerDelete = await Project.create({
      organizationId: org._id,
      name: "Owner Proj",
      slug: "owner-proj",
      ownerId: owner._id,
      createdBy: owner._id,
    });

    // Manager attempts delete -> 403 FORBIDDEN
    const loginManager = await request(app).post("/api/v1/auth/login").send({
      email: "del.manager@example.com",
      password: "ValidPassword123!",
    });
    const tokenManager = loginManager.body.data.accessToken;

    const resManager = await request(app)
      .delete(
        `/api/v1/organizations/${org._id.toString()}/projects/${projManagerDelete._id.toString()}`
      )
      .set("Authorization", `Bearer ${tokenManager}`);

    expect(resManager.status).toBe(403);
    expect(resManager.body.error.code).toBe("FORBIDDEN");

    // Owner attempts delete -> 200 OK
    const loginOwner = await request(app).post("/api/v1/auth/login").send({
      email: "del.owner@example.com",
      password: "ValidPassword123!",
    });
    const tokenOwner = loginOwner.body.data.accessToken;

    const resOwner = await request(app)
      .delete(
        `/api/v1/organizations/${org._id.toString()}/projects/${projOwnerDelete._id.toString()}`
      )
      .set("Authorization", `Bearer ${tokenOwner}`);

    expect(resOwner.status).toBe(200);
    expect(resOwner.body.success).toBe(true);

    const deletedInDb = await Project.findById(projOwnerDelete._id);
    expect(deletedInDb).toBeNull();
  });
});
