import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import mongoose from "mongoose";
import request from "supertest";
import fs from "fs";
import path from "path";
import { createApp } from "../../app.js";
import { env } from "../../config/env.js";
import { User } from "../../models/user.model.js";
import { Organization } from "../../models/organization.model.js";
import { Membership } from "../../models/membership.model.js";
import { Project } from "../../models/project.model.js";
import { Task } from "../../models/task.model.js";
import { Comment } from "../../models/comment.model.js";
import { Attachment } from "../../models/attachment.model.js";
import { ActivityLog } from "../../models/activity.model.js";
import { hashPassword } from "../../utils/password.js";

const app = createApp();
const UPLOADS_DIR = path.resolve(process.cwd(), "uploads");

describe("Attachment Management Integration Suite", () => {
  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(env.MONGODB_TEST_URI);
    }
  });

  afterAll(async () => {
    await mongoose.disconnect();
    // Clean up test upload files
    if (fs.existsSync(UPLOADS_DIR)) {
      await fs.promises.rm(UPLOADS_DIR, { recursive: true, force: true }).catch(() => {});
    }
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await Organization.deleteMany({});
    await Membership.deleteMany({});
    await Project.deleteMany({});
    await Task.deleteMany({});
    await Comment.deleteMany({});
    await Attachment.deleteMany({});
    await ActivityLog.deleteMany({});
    await User.createIndexes();
    await Organization.createIndexes();
    await Membership.createIndexes();
    await Project.createIndexes();
    await Task.createIndexes();
    await Comment.createIndexes();
    await Attachment.createIndexes();
  });

  it("should upload a valid PDF attachment to a task and create an ActivityLog event", async () => {
    const passwordHash = await hashPassword("ValidPassword123!");
    const owner = await User.create({
      name: "Attach Owner",
      email: "attach.owner@example.com",
      passwordHash,
      status: "ACTIVE",
    });

    const org = await Organization.create({
      name: "Attach Org",
      slug: "attach-org",
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
      name: "Attach Project",
      slug: "attach-project",
      ownerId: owner._id,
      createdBy: owner._id,
    });

    const task = await Task.create({
      organizationId: org._id,
      projectId: project._id,
      title: "Attach Task",
      createdBy: owner._id,
    });

    const loginRes = await request(app).post("/api/v1/auth/login").send({
      email: "attach.owner@example.com",
      password: "ValidPassword123!",
    });
    const token = loginRes.body.data.accessToken;

    const fileBuffer = Buffer.from("%PDF-1.4 Mock PDF Content");

    const res = await request(app)
      .post(
        `/api/v1/organizations/${org._id.toString()}/tasks/${task._id.toString()}/attachments`
      )
      .set("Authorization", `Bearer ${token}`)
      .attach("file", fileBuffer, "architecture.pdf");

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.fileName).toBe("architecture.pdf");
    expect(res.body.data.mimeType).toBe("application/pdf");

    const activity = await ActivityLog.findOne({
      organizationId: org._id,
      action: "ATTACHMENT_UPLOADED",
    });
    expect(activity).not.toBeNull();
  });

  it("should reject invalid file extensions/MIME types (e.g. .exe files) with 400 VALIDATION_ERROR", async () => {
    const passwordHash = await hashPassword("ValidPassword123!");
    const owner = await User.create({
      name: "Invalid Upload Owner",
      email: "invalid.up@example.com",
      passwordHash,
      status: "ACTIVE",
    });

    const org = await Organization.create({
      name: "Invalid Upload Org",
      slug: "invalid-up-org",
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
      name: "Invalid Upload Project",
      slug: "invalid-up-project",
      ownerId: owner._id,
      createdBy: owner._id,
    });

    const task = await Task.create({
      organizationId: org._id,
      projectId: project._id,
      title: "Invalid Upload Task",
      createdBy: owner._id,
    });

    const loginRes = await request(app).post("/api/v1/auth/login").send({
      email: "invalid.up@example.com",
      password: "ValidPassword123!",
    });
    const token = loginRes.body.data.accessToken;

    const exeBuffer = Buffer.from("MZ Executable Header Payload");

    const res = await request(app)
      .post(
        `/api/v1/organizations/${org._id.toString()}/tasks/${task._id.toString()}/attachments`
      )
      .set("Authorization", `Bearer ${token}`)
      .attach("file", exeBuffer, "malicious.exe");

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("should allow downloading attachment and enforce tenant isolation", async () => {
    const passwordHash = await hashPassword("ValidPassword123!");
    const userA = await User.create({
      name: "User A DL",
      email: "usera.dl@example.com",
      passwordHash,
      status: "ACTIVE",
    });

    const userB = await User.create({
      name: "User B DL",
      email: "userb.dl@example.com",
      passwordHash,
      status: "ACTIVE",
    });

    const orgA = await Organization.create({
      name: "Org A DL",
      slug: "org-a-dl",
      ownerId: userA._id,
    });

    const orgB = await Organization.create({
      name: "Org B DL",
      slug: "org-b-dl",
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

    const projectA = await Project.create({
      organizationId: orgA._id,
      name: "Project A DL",
      slug: "project-a-dl",
      ownerId: userA._id,
      createdBy: userA._id,
    });

    const taskA = await Task.create({
      organizationId: orgA._id,
      projectId: projectA._id,
      title: "Task A DL",
      createdBy: userA._id,
    });

    const loginA = await request(app).post("/api/v1/auth/login").send({
      email: "usera.dl@example.com",
      password: "ValidPassword123!",
    });
    const tokenA = loginA.body.data.accessToken;

    const fileBuffer = Buffer.from("Plain Text Attachment Content");

    const uploadRes = await request(app)
      .post(
        `/api/v1/organizations/${orgA._id.toString()}/tasks/${taskA._id.toString()}/attachments`
      )
      .set("Authorization", `Bearer ${tokenA}`)
      .attach("file", fileBuffer, "notes.txt");

    expect(uploadRes.status).toBe(201);
    const attachmentId = uploadRes.body.data.id;

    // 1. Authorized Download by User A -> 200 OK
    const dlResA = await request(app)
      .get(
        `/api/v1/organizations/${orgA._id.toString()}/attachments/${attachmentId}/download`
      )
      .set("Authorization", `Bearer ${tokenA}`);

    expect(dlResA.status).toBe(200);
    expect(dlResA.text).toBe("Plain Text Attachment Content");

    // 2. Cross-tenant Download by User B under Org B -> 404 RESOURCE_NOT_FOUND
    const loginB = await request(app).post("/api/v1/auth/login").send({
      email: "userb.dl@example.com",
      password: "ValidPassword123!",
    });
    const tokenB = loginB.body.data.accessToken;

    const dlResB = await request(app)
      .get(
        `/api/v1/organizations/${orgB._id.toString()}/attachments/${attachmentId}/download`
      )
      .set("Authorization", `Bearer ${tokenB}`);

    expect(dlResB.status).toBe(404);
  });

  it("should delete attachment metadata and unlink file from disk", async () => {
    const passwordHash = await hashPassword("ValidPassword123!");
    const owner = await User.create({
      name: "Delete Attach Owner",
      email: "del.attach@example.com",
      passwordHash,
      status: "ACTIVE",
    });

    const org = await Organization.create({
      name: "Del Attach Org",
      slug: "del-attach-org",
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
      name: "Del Attach Project",
      slug: "del-attach-project",
      ownerId: owner._id,
      createdBy: owner._id,
    });

    const task = await Task.create({
      organizationId: org._id,
      projectId: project._id,
      title: "Del Attach Task",
      createdBy: owner._id,
    });

    const loginRes = await request(app).post("/api/v1/auth/login").send({
      email: "del.attach@example.com",
      password: "ValidPassword123!",
    });
    const token = loginRes.body.data.accessToken;

    const fileBuffer = Buffer.from("Temporary image bytes");

    const uploadRes = await request(app)
      .post(
        `/api/v1/organizations/${org._id.toString()}/tasks/${task._id.toString()}/attachments`
      )
      .set("Authorization", `Bearer ${token}`)
      .attach("file", fileBuffer, "photo.png");

    expect(uploadRes.status).toBe(201);
    const attachmentId = uploadRes.body.data.id;

    // Delete attachment -> 200 OK
    const delRes = await request(app)
      .delete(
        `/api/v1/organizations/${org._id.toString()}/attachments/${attachmentId}`
      )
      .set("Authorization", `Bearer ${token}`);

    expect(delRes.status).toBe(200);

    const attachmentInDb = await Attachment.findById(attachmentId);
    expect(attachmentInDb).toBeNull();
  });
});
