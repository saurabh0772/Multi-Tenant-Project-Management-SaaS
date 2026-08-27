import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import express from "express";
import cookieParser from "cookie-parser";
import mongoose from "mongoose";
import request from "supertest";
import { env } from "../../config/env.js";
import { User } from "../../models/user.model.js";
import { Organization } from "../../models/organization.model.js";
import { Membership } from "../../models/membership.model.js";
import { Project } from "../../models/project.model.js";
import { hashPassword } from "../../utils/password.js";
import { authenticate } from "../../middlewares/authenticate.js";
import { requireOrganizationMember } from "../../middlewares/requireOrganizationMember.js";
import { requireRole } from "../../middlewares/requireRole.js";
import { requirePermission } from "../../middlewares/requirePermission.js";
import { PERMISSIONS } from "../../constants/permissions.js";
import { projectRepository } from "../../repositories/project.repository.js";
import authRouter from "../../routes/auth.routes.js";
import { errorHandler } from "../../middlewares/errorHandler.js";

const createTestApp = () => {
  const testApp = express();
  testApp.use(express.json());
  testApp.use(cookieParser());

  // Mount auth routes for login
  testApp.use("/api/v1/auth", authRouter);

  // Mount test protected routes
  const router = express.Router({ mergeParams: true });

  router.get(
    "/organizations/:organizationId/test-protected",
    authenticate,
    requireOrganizationMember,
    requirePermission(PERMISSIONS.PROJECT_CREATE),
    (req, res) => {
      res.status(200).json({
        success: true,
        data: {
          organization: req.organization,
        },
      });
    }
  );

  router.post(
    "/organizations/:organizationId/test-body-conflict",
    authenticate,
    requireOrganizationMember,
    (req, res) => {
      res.status(200).json({
        success: true,
        data: {
          organization: req.organization,
        },
      });
    }
  );

  router.get(
    "/organizations/:organizationId/test-admin-only",
    authenticate,
    requireOrganizationMember,
    requireRole("ADMIN", "OWNER"),
    (req, res) => {
      res.status(200).json({
        success: true,
        data: {
          organization: req.organization,
        },
      });
    }
  );

  testApp.use("/api/v1", router);
  testApp.use(errorHandler);

  return testApp;
};

const app = createTestApp();

describe("Multi-Tenancy & Authorization Security Suite", () => {
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
    await User.createIndexes();
    await Organization.createIndexes();
    await Membership.createIndexes();
    await Project.createIndexes();
  });

  it("should allow active organization member with required permissions", async () => {
    const passwordHash = await hashPassword("ValidPassword123!");
    const user = await User.create({
      name: "Alice Owner",
      email: "alice.owner@example.com",
      passwordHash,
      status: "ACTIVE",
    });

    const org = await Organization.create({
      name: "Org Alpha",
      slug: "org-alpha",
      ownerId: user._id,
    });

    await Membership.create({
      userId: user._id,
      organizationId: org._id,
      role: "OWNER",
      status: "ACTIVE",
    });

    const loginRes = await request(app).post("/api/v1/auth/login").send({
      email: "alice.owner@example.com",
      password: "ValidPassword123!",
    });
    const token = loginRes.body.data.accessToken;

    const res = await request(app)
      .get(`/api/v1/organizations/${org._id.toString()}/test-protected`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.organization.id).toBe(org._id.toString());
    expect(res.body.data.organization.role).toBe("OWNER");
  });

  it("should reject cross-tenant access when user is not a member of target organization", async () => {
    const passwordHash = await hashPassword("ValidPassword123!");
    const userA = await User.create({
      name: "User A",
      email: "usera.isolation@example.com",
      passwordHash,
      status: "ACTIVE",
    });

    const orgA = await Organization.create({
      name: "Org A",
      slug: "org-a-isolation",
      ownerId: userA._id,
    });

    const orgB = await Organization.create({
      name: "Org B",
      slug: "org-b-isolation",
      ownerId: new mongoose.Types.ObjectId(),
    });

    await Membership.create({
      userId: userA._id,
      organizationId: orgA._id,
      role: "OWNER",
      status: "ACTIVE",
    });

    const loginRes = await request(app).post("/api/v1/auth/login").send({
      email: "usera.isolation@example.com",
      password: "ValidPassword123!",
    });
    const tokenA = loginRes.body.data.accessToken;

    // User A attempts to access Org B -> 403 FORBIDDEN
    const res = await request(app)
      .get(`/api/v1/organizations/${orgB._id.toString()}/test-protected`)
      .set("Authorization", `Bearer ${tokenA}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("MEMBERSHIP_REQUIRED");
  });

  it("should evaluate dynamic roles per organization for multi-organization users", async () => {
    const passwordHash = await hashPassword("ValidPassword123!");
    const userMulti = await User.create({
      name: "Multi User",
      email: "multi@example.com",
      passwordHash,
      status: "ACTIVE",
    });

    const org1 = await Organization.create({
      name: "Org One",
      slug: "org-one",
      ownerId: new mongoose.Types.ObjectId(),
    });

    const org2 = await Organization.create({
      name: "Org Two",
      slug: "org-two",
      ownerId: new mongoose.Types.ObjectId(),
    });

    // User is MEMBER in Org 1 and ADMIN in Org 2
    await Membership.create({
      userId: userMulti._id,
      organizationId: org1._id,
      role: "MEMBER",
      status: "ACTIVE",
    });

    await Membership.create({
      userId: userMulti._id,
      organizationId: org2._id,
      role: "ADMIN",
      status: "ACTIVE",
    });

    const loginRes = await request(app).post("/api/v1/auth/login").send({
      email: "multi@example.com",
      password: "ValidPassword123!",
    });
    const token = loginRes.body.data.accessToken;

    // Request to Org 1 (MEMBER) -> MEMBER role prevents PROJECT_CREATE permission -> 403
    const resOrg1 = await request(app)
      .get(`/api/v1/organizations/${org1._id.toString()}/test-protected`)
      .set("Authorization", `Bearer ${token}`);
    expect(resOrg1.status).toBe(403);
    expect(resOrg1.body.error.code).toBe("FORBIDDEN");

    // Request to Org 2 (ADMIN) -> ADMIN role allows PROJECT_CREATE permission -> 200 OK
    const resOrg2 = await request(app)
      .get(`/api/v1/organizations/${org2._id.toString()}/test-protected`)
      .set("Authorization", `Bearer ${token}`);
    expect(resOrg2.status).toBe(200);
    expect(resOrg2.body.data.organization.role).toBe("ADMIN");
  });

  it("should immediately reject access when membership status changes to SUSPENDED or REMOVED", async () => {
    const passwordHash = await hashPassword("ValidPassword123!");
    const user = await User.create({
      name: "Status User",
      email: "status.user@example.com",
      passwordHash,
      status: "ACTIVE",
    });

    const org = await Organization.create({
      name: "Org Status",
      slug: "org-status",
      ownerId: user._id,
    });

    const membership = await Membership.create({
      userId: user._id,
      organizationId: org._id,
      role: "MEMBER",
      status: "ACTIVE",
    });

    const loginRes = await request(app).post("/api/v1/auth/login").send({
      email: "status.user@example.com",
      password: "ValidPassword123!",
    });
    const token = loginRes.body.data.accessToken;

    // Change status to SUSPENDED in DB
    membership.status = "SUSPENDED";
    await membership.save();

    const resSuspended = await request(app)
      .get(`/api/v1/organizations/${org._id.toString()}/test-protected`)
      .set("Authorization", `Bearer ${token}`);
    expect(resSuspended.status).toBe(403);
    expect(resSuspended.body.error.code).toBe("MEMBERSHIP_SUSPENDED");

    // Change status to REMOVED in DB
    membership.status = "REMOVED";
    await membership.save();

    const resRemoved = await request(app)
      .get(`/api/v1/organizations/${org._id.toString()}/test-protected`)
      .set("Authorization", `Bearer ${token}`);
    expect(resRemoved.status).toBe(403);
    expect(resRemoved.body.error.code).toBe("MEMBERSHIP_REQUIRED");
  });

  it("should ignore client spoofed role and permission claims in request body or headers", async () => {
    const passwordHash = await hashPassword("ValidPassword123!");
    const user = await User.create({
      name: "Spoofer User",
      email: "spoofer@example.com",
      passwordHash,
      status: "ACTIVE",
    });

    const org = await Organization.create({
      name: "Org Spoof",
      slug: "org-spoof",
      ownerId: new mongoose.Types.ObjectId(),
    });

    await Membership.create({
      userId: user._id,
      organizationId: org._id,
      role: "MEMBER",
      status: "ACTIVE",
    });

    const loginRes = await request(app).post("/api/v1/auth/login").send({
      email: "spoofer@example.com",
      password: "ValidPassword123!",
    });
    const token = loginRes.body.data.accessToken;

    // Client attempts to spoof role: OWNER
    const res = await request(app)
      .get(`/api/v1/organizations/${org._id.toString()}/test-admin-only`)
      .set("Authorization", `Bearer ${token}`)
      .set("x-user-role", "OWNER")
      .send({ role: "OWNER", permissions: ["*"] });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("should reject request when body organizationId conflicts with route organizationId", async () => {
    const passwordHash = await hashPassword("ValidPassword123!");
    const user = await User.create({
      name: "Conflict User",
      email: "conflict@example.com",
      passwordHash,
      status: "ACTIVE",
    });

    const orgA = await Organization.create({
      name: "Org Conflict A",
      slug: "org-conflict-a",
      ownerId: user._id,
    });

    const orgB = await Organization.create({
      name: "Org Conflict B",
      slug: "org-conflict-b",
      ownerId: user._id,
    });

    await Membership.create({
      userId: user._id,
      organizationId: orgA._id,
      role: "OWNER",
      status: "ACTIVE",
    });

    const loginRes = await request(app).post("/api/v1/auth/login").send({
      email: "conflict@example.com",
      password: "ValidPassword123!",
    });
    const token = loginRes.body.data.accessToken;

    const res = await request(app)
      .post(`/api/v1/organizations/${orgA._id.toString()}/test-body-conflict`)
      .set("Authorization", `Bearer ${token}`)
      .send({ organizationId: orgB._id.toString() });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(res.body.error.message).toContain("Conflicting organization ID");
  });

  it("should enforce IDOR foundation by isolating tenant repository queries", async () => {
    const orgAId = new mongoose.Types.ObjectId();
    const orgBId = new mongoose.Types.ObjectId();
    const ownerId = new mongoose.Types.ObjectId();

    const projectOrgB = await Project.create({
      name: "Project Org B",
      slug: "project-org-b",
      organizationId: orgBId,
      ownerId,
      createdBy: ownerId,
    });

    // Querying Org B's project with Org A's organizationId must return null
    const foundProject = await projectRepository.getProjectById(
      projectOrgB._id,
      orgAId
    );

    expect(foundProject).toBeNull();
  });
});
