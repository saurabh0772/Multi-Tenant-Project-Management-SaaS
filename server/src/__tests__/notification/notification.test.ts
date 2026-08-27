import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import mongoose from "mongoose";
import request from "supertest";
import { createApp } from "../../app.js";
import { env } from "../../config/env.js";
import { User } from "../../models/user.model.js";
import { Organization } from "../../models/organization.model.js";
import { Membership } from "../../models/membership.model.js";
import { Notification } from "../../models/notification.model.js";
import { hashPassword } from "../../utils/password.js";

const app = createApp();

describe("Notification Management Integration Suite", () => {
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
    await Notification.deleteMany({});
    await User.createIndexes();
    await Organization.createIndexes();
    await Membership.createIndexes();
    await Notification.createIndexes();
  });

  it("should retrieve user notifications in tenant with pagination and unread filter", async () => {
    const passwordHash = await hashPassword("ValidPassword123!");
    const recipient = await User.create({
      name: "Notification Recipient",
      email: "notif.rec@example.com",
      passwordHash,
      status: "ACTIVE",
    });

    const org = await Organization.create({
      name: "Notif Org",
      slug: "notif-org",
      ownerId: recipient._id,
    });

    await Membership.create({
      userId: recipient._id,
      organizationId: org._id,
      role: "OWNER",
      status: "ACTIVE",
    });

    // Create 1 read, 2 unread notifications
    await Notification.create({
      organizationId: org._id,
      recipientId: recipient._id,
      type: "TASK_ASSIGNED",
      title: "Task Assigned",
      message: "Task 1 assigned to you",
      entityType: "Task",
      entityId: new mongoose.Types.ObjectId(),
      readAt: new Date(),
    });

    await Notification.create({
      organizationId: org._id,
      recipientId: recipient._id,
      type: "COMMENT_ADDED",
      title: "New Comment",
      message: "New comment on task 2",
      entityType: "Comment",
      entityId: new mongoose.Types.ObjectId(),
      readAt: null,
    });

    const loginRes = await request(app).post("/api/v1/auth/login").send({
      email: "notif.rec@example.com",
      password: "ValidPassword123!",
    });
    const token = loginRes.body.data.accessToken;

    // 1. Get all notifications -> 2 items
    const resAll = await request(app)
      .get(`/api/v1/organizations/${org._id.toString()}/notifications`)
      .set("Authorization", `Bearer ${token}`);

    expect(resAll.status).toBe(200);
    expect(resAll.body.success).toBe(true);
    expect(resAll.body.data).toHaveLength(2);

    // 2. Get unread only -> 1 item
    const resUnread = await request(app)
      .get(
        `/api/v1/organizations/${org._id.toString()}/notifications?unread=true`
      )
      .set("Authorization", `Bearer ${token}`);

    expect(resUnread.status).toBe(200);
    expect(resUnread.body.data).toHaveLength(1);
    expect(resUnread.body.data[0].type).toBe("COMMENT_ADDED");

    // 3. Get unread count -> 1
    const resCount = await request(app)
      .get(
        `/api/v1/organizations/${org._id.toString()}/notifications/unread-count`
      )
      .set("Authorization", `Bearer ${token}`);

    expect(resCount.status).toBe(200);
    expect(resCount.body.data.unreadCount).toBe(1);
  });

  it("should allow recipient to mark single notification as read and mark all as read", async () => {
    const passwordHash = await hashPassword("ValidPassword123!");
    const recipient = await User.create({
      name: "Mark Read Recipient",
      email: "mark.read@example.com",
      passwordHash,
      status: "ACTIVE",
    });

    const org = await Organization.create({
      name: "Mark Read Org",
      slug: "mark-read-org",
      ownerId: recipient._id,
    });

    await Membership.create({
      userId: recipient._id,
      organizationId: org._id,
      role: "OWNER",
      status: "ACTIVE",
    });

    const notif1 = await Notification.create({
      organizationId: org._id,
      recipientId: recipient._id,
      type: "TASK_ASSIGNED",
      title: "Notif 1",
      message: "Message 1",
      entityType: "Task",
      readAt: null,
    });

    const notif2 = await Notification.create({
      organizationId: org._id,
      recipientId: recipient._id,
      type: "TASK_ASSIGNED",
      title: "Notif 2",
      message: "Message 2",
      entityType: "Task",
      readAt: null,
    });

    const loginRes = await request(app).post("/api/v1/auth/login").send({
      email: "mark.read@example.com",
      password: "ValidPassword123!",
    });
    const token = loginRes.body.data.accessToken;

    // 1. Mark single notification as read -> 200 OK
    const resSingle = await request(app)
      .patch(
        `/api/v1/organizations/${org._id.toString()}/notifications/${notif1._id.toString()}/read`
      )
      .set("Authorization", `Bearer ${token}`);

    expect(resSingle.status).toBe(200);
    expect(resSingle.body.success).toBe(true);

    const updatedNotif1 = await Notification.findById(notif1._id);
    expect(updatedNotif1?.readAt).not.toBeNull();

    // 2. Mark all as read -> 200 OK
    const resAll = await request(app)
      .patch(
        `/api/v1/organizations/${org._id.toString()}/notifications/read-all`
      )
      .set("Authorization", `Bearer ${token}`);

    expect(resAll.status).toBe(200);
    expect(resAll.body.data.modifiedCount).toBe(1);

    const updatedNotif2 = await Notification.findById(notif2._id);
    expect(updatedNotif2?.readAt).not.toBeNull();
  });

  it("should enforce recipient and tenant isolation (deny User A accessing User B notifications)", async () => {
    const passwordHash = await hashPassword("ValidPassword123!");
    const userA = await User.create({
      name: "User A Notif",
      email: "usera.notif@example.com",
      passwordHash,
      status: "ACTIVE",
    });

    const userB = await User.create({
      name: "User B Notif",
      email: "userb.notif@example.com",
      passwordHash,
      status: "ACTIVE",
    });

    const org = await Organization.create({
      name: "Iso Notif Org",
      slug: "iso-notif-org",
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

    // Notification belonging to User B
    const notifB = await Notification.create({
      organizationId: org._id,
      recipientId: userB._id,
      type: "TASK_ASSIGNED",
      title: "User B Notif",
      message: "For User B",
      entityType: "Task",
      readAt: null,
    });

    // Login as User A
    const loginA = await request(app).post("/api/v1/auth/login").send({
      email: "usera.notif@example.com",
      password: "ValidPassword123!",
    });
    const tokenA = loginA.body.data.accessToken;

    // 1. User A lists notifications -> User B's notification is NOT returned
    const resA = await request(app)
      .get(`/api/v1/organizations/${org._id.toString()}/notifications`)
      .set("Authorization", `Bearer ${tokenA}`);

    expect(resA.status).toBe(200);
    expect(resA.body.data).toHaveLength(0);

    // 2. User A attempts to mark User B's notification as read -> 404 RESOURCE_NOT_FOUND
    const resMark = await request(app)
      .patch(
        `/api/v1/organizations/${org._id.toString()}/notifications/${notifB._id.toString()}/read`
      )
      .set("Authorization", `Bearer ${tokenA}`);

    expect(resMark.status).toBe(404);
  });
});
