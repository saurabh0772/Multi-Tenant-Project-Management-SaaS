import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import mongoose from "mongoose";
import request from "supertest";
import { createApp } from "../../app.js";
import { env } from "../../config/env.js";
import { User } from "../../models/user.model.js";
import { Organization } from "../../models/organization.model.js";
import { Membership } from "../../models/membership.model.js";
import { hashPassword } from "../../utils/password.js";

const app = createApp();

describe("Membership Management Suite", () => {
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
    await User.createIndexes();
    await Organization.createIndexes();
    await Membership.createIndexes();
  });

  it("should list organization members with pagination and populated user details", async () => {
    const passwordHash = await hashPassword("ValidPassword123!");
    const owner = await User.create({
      name: "Owner Member",
      email: "owner.mem@example.com",
      passwordHash,
      status: "ACTIVE",
    });

    const memberUser = await User.create({
      name: "Standard Member",
      email: "std.mem@example.com",
      passwordHash,
      status: "ACTIVE",
    });

    const org = await Organization.create({
      name: "Member List Org",
      slug: "member-list-org",
      ownerId: owner._id,
    });

    await Membership.create({
      userId: owner._id,
      organizationId: org._id,
      role: "OWNER",
      status: "ACTIVE",
    });

    await Membership.create({
      userId: memberUser._id,
      organizationId: org._id,
      role: "MEMBER",
      status: "ACTIVE",
    });

    const loginRes = await request(app).post("/api/v1/auth/login").send({
      email: "owner.mem@example.com",
      password: "ValidPassword123!",
    });
    const token = loginRes.body.data.accessToken;

    const res = await request(app)
      .get(`/api/v1/organizations/${org._id.toString()}/members`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBe(2);
    expect(res.body.pagination.total).toBe(2);
  });

  it("should allow ADMIN/OWNER to update member role but prevent modifying OWNER role", async () => {
    const passwordHash = await hashPassword("ValidPassword123!");
    const owner = await User.create({
      name: "Owner RoleTest",
      email: "owner.roletest@example.com",
      passwordHash,
      status: "ACTIVE",
    });

    const targetUser = await User.create({
      name: "Target User",
      email: "target.user@example.com",
      passwordHash,
      status: "ACTIVE",
    });

    const org = await Organization.create({
      name: "Role Test Org",
      slug: "role-test-org",
      ownerId: owner._id,
    });

    const ownerMembership = await Membership.create({
      userId: owner._id,
      organizationId: org._id,
      role: "OWNER",
      status: "ACTIVE",
    });

    const targetMembership = await Membership.create({
      userId: targetUser._id,
      organizationId: org._id,
      role: "MEMBER",
      status: "ACTIVE",
    });

    const loginRes = await request(app).post("/api/v1/auth/login").send({
      email: "owner.roletest@example.com",
      password: "ValidPassword123!",
    });
    const token = loginRes.body.data.accessToken;

    // Update target member from MEMBER -> MANAGER
    const resUpdate = await request(app)
      .patch(
        `/api/v1/organizations/${org._id.toString()}/members/${targetMembership._id.toString()}`
      )
      .set("Authorization", `Bearer ${token}`)
      .send({ role: "MANAGER" });

    expect(resUpdate.status).toBe(200);
    expect(resUpdate.body.data.role).toBe("MANAGER");

    // Attempting to modify OWNER role -> 403 FORBIDDEN
    const resOwnerModify = await request(app)
      .patch(
        `/api/v1/organizations/${org._id.toString()}/members/${ownerMembership._id.toString()}`
      )
      .set("Authorization", `Bearer ${token}`)
      .send({ role: "ADMIN" });

    expect(resOwnerModify.status).toBe(403);
    expect(resOwnerModify.body.error.code).toBe("FORBIDDEN");
  });

  it("should enforce owner protection invariant when suspending or removing members", async () => {
    const passwordHash = await hashPassword("ValidPassword123!");
    const owner = await User.create({
      name: "Protected Owner",
      email: "prot.owner@example.com",
      passwordHash,
      status: "ACTIVE",
    });

    const org = await Organization.create({
      name: "Protection Org",
      slug: "protection-org",
      ownerId: owner._id,
    });

    const ownerMembership = await Membership.create({
      userId: owner._id,
      organizationId: org._id,
      role: "OWNER",
      status: "ACTIVE",
    });

    const loginRes = await request(app).post("/api/v1/auth/login").send({
      email: "prot.owner@example.com",
      password: "ValidPassword123!",
    });
    const token = loginRes.body.data.accessToken;

    // Attempting to suspend OWNER -> 403 FORBIDDEN
    const resSuspend = await request(app)
      .patch(
        `/api/v1/organizations/${org._id.toString()}/members/${ownerMembership._id.toString()}`
      )
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "SUSPENDED" });

    expect(resSuspend.status).toBe(403);
    expect(resSuspend.body.error.code).toBe("FORBIDDEN");

    // Attempting to remove OWNER -> 403 FORBIDDEN
    const resRemove = await request(app)
      .delete(
        `/api/v1/organizations/${org._id.toString()}/members/${ownerMembership._id.toString()}`
      )
      .set("Authorization", `Bearer ${token}`);

    expect(resRemove.status).toBe(403);
    expect(resRemove.body.error.code).toBe("FORBIDDEN");
  });

  it("should prevent cross-tenant member retrieval and return 404 RESOURCE_NOT_FOUND", async () => {
    const passwordHash = await hashPassword("ValidPassword123!");
    const userA = await User.create({
      name: "User Org A",
      email: "user.orga@example.com",
      passwordHash,
      status: "ACTIVE",
    });

    const userB = await User.create({
      name: "User Org B",
      email: "user.orgb@example.com",
      passwordHash,
      status: "ACTIVE",
    });

    const orgA = await Organization.create({
      name: "Org A Mem",
      slug: "org-a-mem",
      ownerId: userA._id,
    });

    const orgB = await Organization.create({
      name: "Org B Mem",
      slug: "org-b-mem",
      ownerId: userB._id,
    });

    await Membership.create({
      userId: userA._id,
      organizationId: orgA._id,
      role: "OWNER",
      status: "ACTIVE",
    });

    const membershipB = await Membership.create({
      userId: userB._id,
      organizationId: orgB._id,
      role: "OWNER",
      status: "ACTIVE",
    });

    const loginRes = await request(app).post("/api/v1/auth/login").send({
      email: "user.orga@example.com",
      password: "ValidPassword123!",
    });
    const tokenA = loginRes.body.data.accessToken;

    // User A attempts to lookup Member B under Org A -> 404 RESOURCE_NOT_FOUND
    const res = await request(app)
      .get(
        `/api/v1/organizations/${orgA._id.toString()}/members/${membershipB._id.toString()}`
      )
      .set("Authorization", `Bearer ${tokenA}`);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("RESOURCE_NOT_FOUND");
  });
});
