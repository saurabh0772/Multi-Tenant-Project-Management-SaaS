import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import mongoose from "mongoose";
import { env } from "../../config/env.js";
import { User } from "../../models/user.model.js";
import { Organization } from "../../models/organization.model.js";
import { Membership } from "../../models/membership.model.js";
import { Notification } from "../../models/notification.model.js";
import { processNotificationJob } from "../../workers/notification.worker.js";
import { Job } from "bullmq";

describe("Queue & Worker Idempotency Test Suite", () => {
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

  it("should process notification job and create Notification document in database", async () => {
    const recipient = await User.create({
      name: "Queue Recipient",
      email: "queue.rec@example.com",
      passwordHash: "hash123",
      status: "ACTIVE",
    });

    const org = await Organization.create({
      name: "Queue Org",
      slug: "queue-org",
      ownerId: recipient._id,
    });

    await Membership.create({
      userId: recipient._id,
      organizationId: org._id,
      role: "OWNER",
      status: "ACTIVE",
    });

    const mockJob = {
      id: "job_123",
      data: {
        eventId: "event_1001",
        organizationId: org._id.toString(),
        recipientId: recipient._id.toString(),
        type: "TASK_ASSIGNED",
        title: "Task Assigned",
        message: "You were assigned to task 1",
        entityType: "Task",
        entityId: new mongoose.Types.ObjectId().toString(),
      },
    } as unknown as Job;

    await processNotificationJob(mockJob);

    const notif = await Notification.findOne({
      organizationId: org._id,
      recipientId: recipient._id,
      eventId: "event_1001",
    });

    expect(notif).not.toBeNull();
    expect(notif?.title).toBe("Task Assigned");
    expect(notif?.readAt).toBeNull();
  });

  it("should enforce database-level idempotency and prevent duplicate notifications on job retries", async () => {
    const recipient = await User.create({
      name: "Retry Recipient",
      email: "retry.rec@example.com",
      passwordHash: "hash123",
      status: "ACTIVE",
    });

    const org = await Organization.create({
      name: "Retry Org",
      slug: "retry-org",
      ownerId: recipient._id,
    });

    await Membership.create({
      userId: recipient._id,
      organizationId: org._id,
      role: "OWNER",
      status: "ACTIVE",
    });

    const mockJob = {
      id: "job_retry_99",
      data: {
        eventId: "unique_event_retry_99",
        organizationId: org._id.toString(),
        recipientId: recipient._id.toString(),
        type: "COMMENT_ADDED",
        title: "Comment Added",
        message: "Comment on task",
        entityType: "Comment",
        entityId: new mongoose.Types.ObjectId().toString(),
      },
    } as unknown as Job;

    // First processing run
    await processNotificationJob(mockJob);

    // Second processing run (simulating BullMQ job retry)
    await processNotificationJob(mockJob);

    const notifications = await Notification.find({
      organizationId: org._id,
      recipientId: recipient._id,
      eventId: "unique_event_retry_99",
    });

    // Exact count MUST be 1
    expect(notifications).toHaveLength(1);
  });

  it("should skip notification creation if recipient is suspended or not an active member", async () => {
    const recipient = await User.create({
      name: "Suspended Member",
      email: "suspended.rec@example.com",
      passwordHash: "hash123",
      status: "ACTIVE",
    });

    const org = await Organization.create({
      name: "Suspended Org",
      slug: "suspended-org",
      ownerId: recipient._id,
    });

    await Membership.create({
      userId: recipient._id,
      organizationId: org._id,
      role: "MEMBER",
      status: "SUSPENDED",
    });

    const mockJob = {
      id: "job_suspended",
      data: {
        eventId: "event_suspended",
        organizationId: org._id.toString(),
        recipientId: recipient._id.toString(),
        type: "TASK_ASSIGNED",
        title: "Task Assigned",
        message: "Assigned task",
        entityType: "Task",
        entityId: new mongoose.Types.ObjectId().toString(),
      },
    } as unknown as Job;

    await processNotificationJob(mockJob);

    const notif = await Notification.findOne({
      organizationId: org._id,
      recipientId: recipient._id,
    });

    expect(notif).toBeNull();
  });
});
