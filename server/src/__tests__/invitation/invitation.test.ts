import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import mongoose from "mongoose";
import request from "supertest";
import { createApp } from "../../app.js";
import { env } from "../../config/env.js";
import { User } from "../../models/user.model.js";
import { Organization } from "../../models/organization.model.js";
import { Membership } from "../../models/membership.model.js";
import { Invitation } from "../../models/invitation.model.js";
import { hashPassword } from "../../utils/password.js";

const app = createApp();

describe("Invitation System Suite", () => {
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
    await Invitation.deleteMany({});
    await User.createIndexes();
    await Organization.createIndexes();
    await Membership.createIndexes();
    await Invitation.createIndexes();
  });

  it("should create invitation, store tokenHash in DB, and return raw token once in response", async () => {
    const passwordHash = await hashPassword("ValidPassword123!");
    const inviter = await User.create({
      name: "Inviter Owner",
      email: "inviter@example.com",
      passwordHash,
      status: "ACTIVE",
    });

    const org = await Organization.create({
      name: "Invite Org",
      slug: "invite-org",
      ownerId: inviter._id,
    });

    await Membership.create({
      userId: inviter._id,
      organizationId: org._id,
      role: "OWNER",
      status: "ACTIVE",
    });

    const loginRes = await request(app).post("/api/v1/auth/login").send({
      email: "inviter@example.com",
      password: "ValidPassword123!",
    });
    const token = loginRes.body.data.accessToken;

    const res = await request(app)
      .post(`/api/v1/organizations/${org._id.toString()}/invitations`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        email: "invitee@example.com",
        role: "MEMBER",
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(typeof res.body.data.token).toBe("string");

    const createdInvitation = await Invitation.findById(
      res.body.data.invitation.id
    ).select("+tokenHash");
    expect(createdInvitation).not.toBeNull();
    expect(createdInvitation!.tokenHash).toBeDefined();
    expect(createdInvitation!.tokenHash).not.toBe(res.body.data.token);
  });

  it("should reject duplicate pending invitation for the same email and organization", async () => {
    const passwordHash = await hashPassword("ValidPassword123!");
    const inviter = await User.create({
      name: "Dup Inviter",
      email: "dup.inviter@example.com",
      passwordHash,
      status: "ACTIVE",
    });

    const org = await Organization.create({
      name: "Dup Invite Org",
      slug: "dup-invite-org",
      ownerId: inviter._id,
    });

    await Membership.create({
      userId: inviter._id,
      organizationId: org._id,
      role: "OWNER",
      status: "ACTIVE",
    });

    const loginRes = await request(app).post("/api/v1/auth/login").send({
      email: "dup.inviter@example.com",
      password: "ValidPassword123!",
    });
    const token = loginRes.body.data.accessToken;

    // First invitation -> 201 Created
    await request(app)
      .post(`/api/v1/organizations/${org._id.toString()}/invitations`)
      .set("Authorization", `Bearer ${token}`)
      .send({ email: "target.invitee@example.com", role: "MEMBER" });

    // Second invitation -> 409 DUPLICATE_RESOURCE
    const resDup = await request(app)
      .post(`/api/v1/organizations/${org._id.toString()}/invitations`)
      .set("Authorization", `Bearer ${token}`)
      .send({ email: "target.invitee@example.com", role: "MEMBER" });

    expect(resDup.status).toBe(409);
    expect(resDup.body.error.code).toBe("DUPLICATE_RESOURCE");
  });

  it("should atomically accept invitation when email matches authenticated user", async () => {
    const passwordHash = await hashPassword("ValidPassword123!");
    const inviter = await User.create({
      name: "Accept Inviter",
      email: "accept.inviter@example.com",
      passwordHash,
      status: "ACTIVE",
    });

    const invitee = await User.create({
      name: "Accept Invitee",
      email: "invitee.matching@example.com",
      passwordHash,
      status: "ACTIVE",
    });

    const org = await Organization.create({
      name: "Accept Org",
      slug: "accept-org",
      ownerId: inviter._id,
    });

    await Membership.create({
      userId: inviter._id,
      organizationId: org._id,
      role: "OWNER",
      status: "ACTIVE",
    });

    const loginInviter = await request(app).post("/api/v1/auth/login").send({
      email: "accept.inviter@example.com",
      password: "ValidPassword123!",
    });
    const tokenInviter = loginInviter.body.data.accessToken;

    // Send Invitation
    const resSend = await request(app)
      .post(`/api/v1/organizations/${org._id.toString()}/invitations`)
      .set("Authorization", `Bearer ${tokenInviter}`)
      .send({ email: "invitee.matching@example.com", role: "MEMBER" });

    const rawToken = resSend.body.data.token;

    // Invitee logs in
    const loginInvitee = await request(app).post("/api/v1/auth/login").send({
      email: "invitee.matching@example.com",
      password: "ValidPassword123!",
    });
    const tokenInvitee = loginInvitee.body.data.accessToken;

    // Invitee accepts invitation -> 200 OK
    const resAccept = await request(app)
      .post(`/api/v1/invitations/${rawToken}/accept`)
      .set("Authorization", `Bearer ${tokenInvitee}`);

    expect(resAccept.status).toBe(200);
    expect(resAccept.body.success).toBe(true);
    expect(resAccept.body.data.organizationId).toBe(org._id.toString());

    // Verify membership created
    const createdMembership = await Membership.findOne({
      userId: invitee._id,
      organizationId: org._id,
    });
    expect(createdMembership).not.toBeNull();
    expect(createdMembership!.role).toBe("MEMBER");
    expect(createdMembership!.status).toBe("ACTIVE");

    // Replay attempt -> 400 VALIDATION_ERROR
    const resReplay = await request(app)
      .post(`/api/v1/invitations/${rawToken}/accept`)
      .set("Authorization", `Bearer ${tokenInvitee}`);
    expect(resReplay.status).toBe(400);
  });

  it("should reject invitation acceptance when authenticated user email does not match invitation email", async () => {
    const passwordHash = await hashPassword("ValidPassword123!");
    const inviter = await User.create({
      name: "Mismatch Inviter",
      email: "mismatch.inviter@example.com",
      passwordHash,
      status: "ACTIVE",
    });

    await User.create({
      name: "Other User",
      email: "other.user@example.com",
      passwordHash,
      status: "ACTIVE",
    });

    const org = await Organization.create({
      name: "Mismatch Org",
      slug: "mismatch-org",
      ownerId: inviter._id,
    });

    await Membership.create({
      userId: inviter._id,
      organizationId: org._id,
      role: "OWNER",
      status: "ACTIVE",
    });

    const loginInviter = await request(app).post("/api/v1/auth/login").send({
      email: "mismatch.inviter@example.com",
      password: "ValidPassword123!",
    });
    const tokenInviter = loginInviter.body.data.accessToken;

    // Send invitation for target@example.com
    const resSend = await request(app)
      .post(`/api/v1/organizations/${org._id.toString()}/invitations`)
      .set("Authorization", `Bearer ${tokenInviter}`)
      .send({ email: "target@example.com", role: "MEMBER" });

    const rawToken = resSend.body.data.token;

    // other.user@example.com tries to accept target@example.com's invitation -> 403 FORBIDDEN
    const loginOther = await request(app).post("/api/v1/auth/login").send({
      email: "other.user@example.com",
      password: "ValidPassword123!",
    });
    const tokenOther = loginOther.body.data.accessToken;

    const resAcceptMismatch = await request(app)
      .post(`/api/v1/invitations/${rawToken}/accept`)
      .set("Authorization", `Bearer ${tokenOther}`);

    expect(resAcceptMismatch.status).toBe(403);
    expect(resAcceptMismatch.body.error.code).toBe("FORBIDDEN");
  });
});
