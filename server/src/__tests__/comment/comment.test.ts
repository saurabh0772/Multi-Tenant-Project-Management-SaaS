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
import { Comment } from "../../models/comment.model.js";
import { ActivityLog } from "../../models/activity.model.js";
import { hashPassword } from "../../utils/password.js";

const app = createApp();

describe("Comment Management Integration Suite", () => {
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
    await ActivityLog.deleteMany({});
    await User.createIndexes();
    await Organization.createIndexes();
    await Membership.createIndexes();
    await Project.createIndexes();
    await Task.createIndexes();
    await Comment.createIndexes();
  });

  it("should allow MEMBER role to create a comment on an active task", async () => {
    const passwordHash = await hashPassword("ValidPassword123!");
    const owner = await User.create({
      name: "Org Owner",
      email: "comment.owner@example.com",
      passwordHash,
      status: "ACTIVE",
    });

    const member = await User.create({
      name: "Comment Author",
      email: "author.comment@example.com",
      passwordHash,
      status: "ACTIVE",
    });

    const org = await Organization.create({
      name: "Comment Org Alpha",
      slug: "comment-org-alpha",
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
      name: "Comment Project",
      slug: "comment-project",
      ownerId: owner._id,
      createdBy: owner._id,
    });

    const task = await Task.create({
      organizationId: org._id,
      projectId: project._id,
      title: "Task with Comments",
      createdBy: owner._id,
    });

    const loginRes = await request(app).post("/api/v1/auth/login").send({
      email: "author.comment@example.com",
      password: "ValidPassword123!",
    });
    const token = loginRes.body.data.accessToken;

    const res = await request(app)
      .post(
        `/api/v1/organizations/${org._id.toString()}/tasks/${task._id.toString()}/comments`
      )
      .set("Authorization", `Bearer ${token}`)
      .send({
        content: "This is a test comment on the task",
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.content).toBe("This is a test comment on the task");
    expect(res.body.data.authorId.id || res.body.data.authorId).toBe(member._id.toString());

    const activity = await ActivityLog.findOne({
      organizationId: org._id,
      action: "COMMENT_CREATED",
    });
    expect(activity).not.toBeNull();
  });

  it("should reject cross-tenant task comment creation with 404 RESOURCE_NOT_FOUND", async () => {
    const passwordHash = await hashPassword("ValidPassword123!");
    const userA = await User.create({
      name: "User Org A",
      email: "usera.comm@example.com",
      passwordHash,
      status: "ACTIVE",
    });

    const userB = await User.create({
      name: "User Org B",
      email: "userb.comm@example.com",
      passwordHash,
      status: "ACTIVE",
    });

    const orgA = await Organization.create({
      name: "Comment Org A",
      slug: "comment-org-a",
      ownerId: userA._id,
    });

    const orgB = await Organization.create({
      name: "Comment Org B",
      slug: "comment-org-b",
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

    const taskB = await Task.create({
      organizationId: orgB._id,
      projectId: projectB._id,
      title: "Org B Task",
      createdBy: userB._id,
    });

    const loginA = await request(app).post("/api/v1/auth/login").send({
      email: "usera.comm@example.com",
      password: "ValidPassword123!",
    });
    const tokenA = loginA.body.data.accessToken;

    const res = await request(app)
      .post(
        `/api/v1/organizations/${orgA._id.toString()}/tasks/${taskB._id.toString()}/comments`
      )
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ content: "Cross tenant comment attempt" });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("RESOURCE_NOT_FOUND");
  });

  it("should allow author to edit comment, but deny non-author with 403 FORBIDDEN", async () => {
    const passwordHash = await hashPassword("ValidPassword123!");
    const author = await User.create({
      name: "Original Author",
      email: "author.edit@example.com",
      passwordHash,
      status: "ACTIVE",
    });

    const otherUser = await User.create({
      name: "Other User",
      email: "other.edit@example.com",
      passwordHash,
      status: "ACTIVE",
    });

    const org = await Organization.create({
      name: "Edit Comment Org",
      slug: "edit-comment-org",
      ownerId: author._id,
    });

    await Membership.create({
      userId: author._id,
      organizationId: org._id,
      role: "MEMBER",
      status: "ACTIVE",
    });

    await Membership.create({
      userId: otherUser._id,
      organizationId: org._id,
      role: "MEMBER",
      status: "ACTIVE",
    });

    const project = await Project.create({
      organizationId: org._id,
      name: "Edit Project",
      slug: "edit-project",
      ownerId: author._id,
      createdBy: author._id,
    });

    const task = await Task.create({
      organizationId: org._id,
      projectId: project._id,
      title: "Edit Task",
      createdBy: author._id,
    });

    const comment = await Comment.create({
      organizationId: org._id,
      taskId: task._id,
      authorId: author._id,
      content: "Original text",
    });

    // 1. Non-author attempts edit -> 403 FORBIDDEN
    const loginOther = await request(app).post("/api/v1/auth/login").send({
      email: "other.edit@example.com",
      password: "ValidPassword123!",
    });
    const tokenOther = loginOther.body.data.accessToken;

    const resOther = await request(app)
      .patch(
        `/api/v1/organizations/${org._id.toString()}/comments/${comment._id.toString()}`
      )
      .set("Authorization", `Bearer ${tokenOther}`)
      .send({ content: "Hacked content" });

    expect(resOther.status).toBe(403);

    // 2. Author attempts edit -> 200 OK & editedAt set
    const loginAuthor = await request(app).post("/api/v1/auth/login").send({
      email: "author.edit@example.com",
      password: "ValidPassword123!",
    });
    const tokenAuthor = loginAuthor.body.data.accessToken;

    const resAuthor = await request(app)
      .patch(
        `/api/v1/organizations/${org._id.toString()}/comments/${comment._id.toString()}`
      )
      .set("Authorization", `Bearer ${tokenAuthor}`)
      .send({ content: "Updated author text" });

    expect(resAuthor.status).toBe(200);
    expect(resAuthor.body.data.content).toBe("Updated author text");
    expect(resAuthor.body.data.editedAt).not.toBeNull();
  });

  it("should allow MANAGER to delete any comment, and MEMBER to delete only their own comment", async () => {
    const passwordHash = await hashPassword("ValidPassword123!");
    const manager = await User.create({
      name: "Org Manager",
      email: "manager.del@example.com",
      passwordHash,
      status: "ACTIVE",
    });

    const memberA = await User.create({
      name: "Member A",
      email: "membera.del@example.com",
      passwordHash,
      status: "ACTIVE",
    });

    const memberB = await User.create({
      name: "Member B",
      email: "memberb.del@example.com",
      passwordHash,
      status: "ACTIVE",
    });

    const org = await Organization.create({
      name: "Delete Comment Org",
      slug: "del-comm-org",
      ownerId: manager._id,
    });

    await Membership.create({
      userId: manager._id,
      organizationId: org._id,
      role: "MANAGER",
      status: "ACTIVE",
    });

    await Membership.create({
      userId: memberA._id,
      organizationId: org._id,
      role: "MEMBER",
      status: "ACTIVE",
    });

    await Membership.create({
      userId: memberB._id,
      organizationId: org._id,
      role: "MEMBER",
      status: "ACTIVE",
    });

    const project = await Project.create({
      organizationId: org._id,
      name: "Del Comment Project",
      slug: "del-comm-project",
      ownerId: manager._id,
      createdBy: manager._id,
    });

    const task = await Task.create({
      organizationId: org._id,
      projectId: project._id,
      title: "Del Comment Task",
      createdBy: manager._id,
    });

    const commentA = await Comment.create({
      organizationId: org._id,
      taskId: task._id,
      authorId: memberA._id,
      content: "Comment A text",
    });

    const commentB = await Comment.create({
      organizationId: org._id,
      taskId: task._id,
      authorId: memberB._id,
      content: "Comment B text",
    });

    // 1. Member A attempts to delete Member B's comment -> 403 FORBIDDEN
    const loginA = await request(app).post("/api/v1/auth/login").send({
      email: "membera.del@example.com",
      password: "ValidPassword123!",
    });
    const tokenA = loginA.body.data.accessToken;

    const resA = await request(app)
      .delete(
        `/api/v1/organizations/${org._id.toString()}/comments/${commentB._id.toString()}`
      )
      .set("Authorization", `Bearer ${tokenA}`);

    expect(resA.status).toBe(403);

    // 2. Member A deletes their own comment -> 200 OK
    const resAOwn = await request(app)
      .delete(
        `/api/v1/organizations/${org._id.toString()}/comments/${commentA._id.toString()}`
      )
      .set("Authorization", `Bearer ${tokenA}`);

    expect(resAOwn.status).toBe(200);

    // 3. Manager deletes Member B's comment -> 200 OK
    const loginManager = await request(app).post("/api/v1/auth/login").send({
      email: "manager.del@example.com",
      password: "ValidPassword123!",
    });
    const tokenManager = loginManager.body.data.accessToken;

    const resManager = await request(app)
      .delete(
        `/api/v1/organizations/${org._id.toString()}/comments/${commentB._id.toString()}`
      )
      .set("Authorization", `Bearer ${tokenManager}`);

    expect(resManager.status).toBe(200);
  });
});
