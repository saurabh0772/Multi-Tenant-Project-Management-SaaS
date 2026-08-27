import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import mongoose from "mongoose";
import request from "supertest";
import { createApp } from "../../app.js";
import { env } from "../../config/env.js";
import { User } from "../../models/user.model.js";
import { Organization } from "../../models/organization.model.js";
import { Membership } from "../../models/membership.model.js";
import { ActivityLog } from "../../models/activity.model.js";
import { hashPassword } from "../../utils/password.js";

const app = createApp();

describe("Organization API Suite", () => {
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
    await ActivityLog.deleteMany({});
    await User.createIndexes();
    await Organization.createIndexes();
    await Membership.createIndexes();
  });

  it("should allow an authenticated user to create an organization and automatically assign them as OWNER", async () => {
    const passwordHash = await hashPassword("ValidPassword123!");
    await User.create({
      name: "Org Creator",
      email: "creator@example.com",
      passwordHash,
      status: "ACTIVE",
    });

    const loginRes = await request(app).post("/api/v1/auth/login").send({
      email: "creator@example.com",
      password: "ValidPassword123!",
    });
    const token = loginRes.body.data.accessToken;

    const res = await request(app)
      .post("/api/v1/organizations")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Acme Corp",
        settings: { timezone: "America/New_York", dateFormat: "YYYY-MM-DD" },
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.organization.name).toBe("Acme Corp");
    expect(res.body.data.organization.slug).toBe("acme-corp");
    expect(res.body.data.organization.role).toBe("OWNER");

    const createdOrg = await Organization.findById(
      res.body.data.organization.id
    );
    expect(createdOrg).not.toBeNull();

    const ownerMembership = await Membership.findOne({
      organizationId: createdOrg!._id,
      role: "OWNER",
    });
    expect(ownerMembership).not.toBeNull();
    expect(ownerMembership!.status).toBe("ACTIVE");
  });

  it("should reject organization creation when slug already exists", async () => {
    const passwordHash = await hashPassword("ValidPassword123!");
    const user = await User.create({
      name: "User Duplicate",
      email: "dup@example.com",
      passwordHash,
      status: "ACTIVE",
    });

    await Organization.create({
      name: "Existing Org",
      slug: "existing-org",
      ownerId: user._id,
    });

    const loginRes = await request(app).post("/api/v1/auth/login").send({
      email: "dup@example.com",
      password: "ValidPassword123!",
    });
    const token = loginRes.body.data.accessToken;

    const res = await request(app)
      .post("/api/v1/organizations")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Existing Org",
        slug: "existing-org",
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("DUPLICATE_RESOURCE");
  });

  it("should return all active organizations where the authenticated user holds a membership", async () => {
    const passwordHash = await hashPassword("ValidPassword123!");
    const user = await User.create({
      name: "Multi Org User",
      email: "multi.org@example.com",
      passwordHash,
      status: "ACTIVE",
    });

    const org1 = await Organization.create({
      name: "Org Alpha",
      slug: "org-alpha-list",
      ownerId: user._id,
    });

    const org2 = await Organization.create({
      name: "Org Beta",
      slug: "org-beta-list",
      ownerId: new mongoose.Types.ObjectId(),
    });

    await Membership.create({
      userId: user._id,
      organizationId: org1._id,
      role: "OWNER",
      status: "ACTIVE",
    });

    await Membership.create({
      userId: user._id,
      organizationId: org2._id,
      role: "MEMBER",
      status: "ACTIVE",
    });

    const loginRes = await request(app).post("/api/v1/auth/login").send({
      email: "multi.org@example.com",
      password: "ValidPassword123!",
    });
    const token = loginRes.body.data.accessToken;

    const res = await request(app)
      .get("/api/v1/organizations")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBe(2);
  });

  it("should allow organization owner to update organization details", async () => {
    const passwordHash = await hashPassword("ValidPassword123!");
    const user = await User.create({
      name: "Org Updater",
      email: "updater@example.com",
      passwordHash,
      status: "ACTIVE",
    });

    const org = await Organization.create({
      name: "Old Org Name",
      slug: "old-org-name",
      ownerId: user._id,
    });

    await Membership.create({
      userId: user._id,
      organizationId: org._id,
      role: "OWNER",
      status: "ACTIVE",
    });

    const loginRes = await request(app).post("/api/v1/auth/login").send({
      email: "updater@example.com",
      password: "ValidPassword123!",
    });
    const token = loginRes.body.data.accessToken;

    const res = await request(app)
      .patch(`/api/v1/organizations/${org._id.toString()}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Updated Org Name" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe("Updated Org Name");
  });

  it("should atomically transfer organization ownership to another active member", async () => {
    const passwordHash = await hashPassword("ValidPassword123!");
    const owner = await User.create({
      name: "Original Owner",
      email: "orig.owner@example.com",
      passwordHash,
      status: "ACTIVE",
    });

    const targetUser = await User.create({
      name: "New Owner Candidate",
      email: "new.owner@example.com",
      passwordHash,
      status: "ACTIVE",
    });

    const org = await Organization.create({
      name: "Transfer Org",
      slug: "transfer-org",
      ownerId: owner._id,
    });

    await Membership.create({
      userId: owner._id,
      organizationId: org._id,
      role: "OWNER",
      status: "ACTIVE",
    });

    await Membership.create({
      userId: targetUser._id,
      organizationId: org._id,
      role: "ADMIN",
      status: "ACTIVE",
    });

    const loginRes = await request(app).post("/api/v1/auth/login").send({
      email: "orig.owner@example.com",
      password: "ValidPassword123!",
    });
    const token = loginRes.body.data.accessToken;

    const res = await request(app)
      .post(`/api/v1/organizations/${org._id.toString()}/transfer-ownership`)
      .set("Authorization", `Bearer ${token}`)
      .send({ targetUserId: targetUser._id.toString() });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const updatedOrg = await Organization.findById(org._id);
    expect(updatedOrg!.ownerId.toString()).toBe(targetUser._id.toString());

    const oldOwnerMembership = await Membership.findOne({
      userId: owner._id,
      organizationId: org._id,
    });
    expect(oldOwnerMembership!.role).toBe("ADMIN");

    const newOwnerMembership = await Membership.findOne({
      userId: targetUser._id,
      organizationId: org._id,
    });
    expect(newOwnerMembership!.role).toBe("OWNER");
  });
});
