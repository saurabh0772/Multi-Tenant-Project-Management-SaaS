import mongoose from "mongoose";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";
import { hashPassword } from "../utils/password.js";
import { User } from "../models/user.model.js";
import { Organization } from "../models/organization.model.js";
import { Membership } from "../models/membership.model.js";
import { Project } from "../models/project.model.js";
import { Task } from "../models/task.model.js";
import { Comment } from "../models/comment.model.js";
import { ActivityLog } from "../models/activity.model.js";
import { Notification } from "../models/notification.model.js";

const seedDatabase = async () => {
  if (env.NODE_ENV === "production") {
    logger.error("❌ CRITICAL: Seed script execution aborted in PRODUCTION environment!");
    process.exit(1);
  }

  logger.info("🌱 Starting Development Database Seed...");

  try {
    await mongoose.connect(env.MONGODB_URI);

    // Clean existing development collections
    logger.info("Clearing existing development collections...");
    await User.deleteMany({});
    await Organization.deleteMany({});
    await Membership.deleteMany({});
    await Project.deleteMany({});
    await Task.deleteMany({});
    await Comment.deleteMany({});
    await ActivityLog.deleteMany({});
    await Notification.deleteMany({});

    // Default password for all demo users
    const defaultPassword = "Password123!";
    const passwordHash = await hashPassword(defaultPassword);

    // 1. Seed Users
    logger.info("Seeding Users...");
    const alex = await User.create({
      name: "Alex Mercer",
      email: "alex@example.com",
      passwordHash,
      emailVerified: true,
      status: "ACTIVE",
    });

    const alice = await User.create({
      name: "Alice",
      email: "alice@test.com",
      passwordHash,
      emailVerified: true,
      status: "ACTIVE",
    });

    const bob = await User.create({
      name: "Bob",
      email: "bob@test.com",
      passwordHash,
      emailVerified: true,
      status: "ACTIVE",
    });

    const charlie = await User.create({
      name: "Charlie",
      email: "charlie@test.com",
      passwordHash,
      emailVerified: true,
      status: "ACTIVE",
    });

    const david = await User.create({
      name: "David",
      email: "david@test.com",
      passwordHash,
      emailVerified: true,
      status: "ACTIVE",
    });

    const sarah = await User.create({
      name: "Sarah Connor",
      email: "sarah@example.com",
      passwordHash,
      emailVerified: true,
      status: "ACTIVE",
    });

    const devin = await User.create({
      name: "Devin Vance",
      email: "devin@example.com",
      passwordHash,
      emailVerified: true,
      status: "ACTIVE",
    });

    const john = await User.create({
      name: "John Doe",
      email: "john@example.com",
      passwordHash,
      emailVerified: true,
      status: "ACTIVE",
    });

    // 2. Seed Organizations
    logger.info("Seeding Organizations...");
    const acmeOrg = await Organization.create({
      name: "Acme Corp",
      slug: "acme-corp",
      ownerId: alice._id,
      settings: { timezone: "UTC", dateFormat: "YYYY-MM-DD" },
      status: "ACTIVE",
    });

    const starkOrg = await Organization.create({
      name: "Stark Enterprises",
      slug: "stark-enterprises",
      ownerId: devin._id,
      settings: { timezone: "UTC", dateFormat: "DD/MM/YYYY" },
      status: "ACTIVE",
    });

    // 3. Seed Memberships
    logger.info("Seeding Memberships...");
    await Membership.create({
      userId: alice._id,
      organizationId: acmeOrg._id,
      role: "OWNER",
      status: "ACTIVE",
    });

    await Membership.create({
      userId: bob._id,
      organizationId: acmeOrg._id,
      role: "ADMIN",
      status: "ACTIVE",
    });

    await Membership.create({
      userId: alex._id,
      organizationId: acmeOrg._id,
      role: "ADMIN",
      status: "ACTIVE",
    });

    await Membership.create({
      userId: charlie._id,
      organizationId: acmeOrg._id,
      role: "MANAGER",
      status: "ACTIVE",
    });

    await Membership.create({
      userId: david._id,
      organizationId: acmeOrg._id,
      role: "MEMBER",
      status: "ACTIVE",
    });

    await Membership.create({
      userId: sarah._id,
      organizationId: acmeOrg._id,
      role: "ADMIN",
      status: "ACTIVE",
    });

    await Membership.create({
      userId: devin._id,
      organizationId: acmeOrg._id,
      role: "MANAGER",
      status: "ACTIVE",
    });

    await Membership.create({
      userId: john._id,
      organizationId: acmeOrg._id,
      role: "MEMBER",
      status: "ACTIVE",
    });

    await Membership.create({
      userId: devin._id,
      organizationId: starkOrg._id,
      role: "OWNER",
      status: "ACTIVE",
    });

    await Membership.create({
      userId: alex._id,
      organizationId: starkOrg._id,
      role: "MEMBER",
      status: "ACTIVE",
    });

    // 4. Seed Projects
    logger.info("Seeding Projects...");
    const backendProject = await Project.create({
      organizationId: acmeOrg._id,
      name: "Backend SaaS Gateway",
      slug: "backend-saas-gateway",
      description: "Core Express & TypeScript REST API with MongoDB & Redis",
      ownerId: alex._id,
      createdBy: alex._id,
      status: "ACTIVE",
    });

    const frontendProject = await Project.create({
      organizationId: acmeOrg._id,
      name: "Frontend Web Application",
      slug: "frontend-web-application",
      description: "React, Vite, TanStack Query, and Tailwind CSS SPA",
      ownerId: sarah._id,
      createdBy: sarah._id,
      status: "ACTIVE",
    });

    const starkProject = await Project.create({
      organizationId: starkOrg._id,
      name: "Arc Reactor Analytics",
      slug: "arc-reactor-analytics",
      description: "Real-time energy distribution and metrics processing engine",
      ownerId: devin._id,
      createdBy: devin._id,
      status: "ACTIVE",
    });

    // 5. Seed Tasks
    logger.info("Seeding Tasks...");
    await Task.create({
      organizationId: acmeOrg._id,
      projectId: backendProject._id,
      title: "Setup JWT Auth & Session Architecture",
      description: "Implement access token rotation, HTTP-only refresh cookies, and session revocation in Redis/Mongo",
      createdBy: alex._id,
      assignedTo: alex._id,
      status: "DONE",
      priority: "HIGH",
      labels: ["security", "auth", "backend"],
      position: 1000,
      completedAt: new Date(),
    });

    const task2 = await Task.create({
      organizationId: acmeOrg._id,
      projectId: backendProject._id,
      title: "Implement Realtime Socket.IO Presence & Rooms",
      description: "Broadcast online presence state and room-level task events across active client connections",
      createdBy: alex._id,
      assignedTo: devin._id,
      status: "IN_PROGRESS",
      priority: "URGENT",
      labels: ["realtime", "websocket", "socket.io"],
      position: 2000,
      dueDate: new Date(Date.now() + 86400000 * 3), // 3 days from now
    });

    await Task.create({
      organizationId: acmeOrg._id,
      projectId: backendProject._id,
      title: "Configure BullMQ Notification Queue Workers",
      description: "Process asynchronous email/in-app notifications with database-level idempotency",
      createdBy: sarah._id,
      assignedTo: sarah._id,
      status: "IN_REVIEW",
      priority: "HIGH",
      labels: ["bullmq", "redis", "worker"],
      position: 3000,
      dueDate: new Date(Date.now() + 86400000 * 5),
    });

    await Task.create({
      organizationId: acmeOrg._id,
      projectId: frontendProject._id,
      title: "Design Global Search Command Palette (Ctrl+K)",
      description: "Build tenant-scoped live search with keyboard shortcuts and debounced API requests",
      createdBy: sarah._id,
      assignedTo: john._id,
      status: "TODO",
      priority: "MEDIUM",
      labels: ["ui", "search", "frontend"],
      position: 1000,
      dueDate: new Date(Date.now() + 86400000 * 7),
    });

    await Task.create({
      organizationId: starkOrg._id,
      projectId: starkProject._id,
      title: "Setup Core Analytics Pipeline",
      description: "Design metrics database schemas and aggregation queries",
      createdBy: devin._id,
      assignedTo: devin._id,
      status: "TODO",
      priority: "MEDIUM",
      labels: ["analytics", "metrics"],
      position: 1000,
    });

    // 6. Seed Comments
    logger.info("Seeding Comments...");
    const comment1 = await Comment.create({
      organizationId: acmeOrg._id,
      taskId: task2._id,
      authorId: sarah._id,
      content: "Hey @Alex Mercer, socket rooms are emitting correctly for Org A tenant events!",
      mentions: [alex._id],
    });

    await Comment.create({
      organizationId: acmeOrg._id,
      taskId: task2._id,
      authorId: alex._id,
      content: "Awesome work! Let's ensure the adapter handles Redis reconnection gracefully.",
      mentions: [sarah._id],
    });

    // 7. Seed Activity Logs
    logger.info("Seeding Activity Logs...");
    await ActivityLog.create({
      organizationId: acmeOrg._id,
      actorId: alex._id,
      action: "PROJECT_CREATE",
      entityType: "Project",
      entityId: backendProject._id,
      metadata: { name: backendProject.name, slug: backendProject.slug },
    });

    await ActivityLog.create({
      organizationId: acmeOrg._id,
      actorId: alex._id,
      action: "TASK_CREATE",
      entityType: "Task",
      entityId: task2._id,
      metadata: { title: task2.title, priority: task2.priority },
    });

    await ActivityLog.create({
      organizationId: acmeOrg._id,
      actorId: sarah._id,
      action: "COMMENT_CREATE",
      entityType: "Comment",
      entityId: comment1._id,
      metadata: { taskId: task2._id },
    });

    // 8. Seed Notifications
    logger.info("Seeding Notifications...");
    await Notification.create({
      organizationId: acmeOrg._id,
      recipientId: alex._id,
      type: "TASK_MENTIONED",
      title: "You were mentioned in a comment",
      message: "Sarah Connor mentioned you in task 'Implement Realtime Socket.IO Presence & Rooms'",
      entityType: "Task",
      entityId: task2._id,
      eventId: `evt-mention-${Date.now()}`,
    });

    await Notification.create({
      organizationId: acmeOrg._id,
      recipientId: devin._id,
      type: "TASK_ASSIGNED",
      title: "Task Assigned",
      message: "Alex Mercer assigned you to 'Implement Realtime Socket.IO Presence & Rooms'",
      entityType: "Task",
      entityId: task2._id,
      eventId: `evt-assign-${Date.now()}`,
    });

    logger.info("✅ Database seed completed successfully!");
    console.log("\n========================================================");
    console.log("🎉 DEMO SEED DATA & CREDENTIALS");
    console.log("========================================================");
    console.log(`Default Password for all users:  ${defaultPassword}`);
    console.log("--------------------------------------------------------");
    console.log("Organization 1: Acme Technologies (acme-technologies)");
    console.log(`  • Owner:   alex@example.com    | Role: OWNER`);
    console.log(`  • Admin:   sarah@example.com   | Role: ADMIN`);
    console.log(`  • Manager: devin@example.com   | Role: MANAGER`);
    console.log(`  • Member:  john@example.com    | Role: MEMBER`);
    console.log("--------------------------------------------------------");
    console.log("Organization 2: Stark Enterprises (stark-enterprises)");
    console.log(`  • Owner:   devin@example.com   | Role: OWNER`);
    console.log(`  • Member:  alex@example.com    | Role: MEMBER`);
    console.log("========================================================\n");

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    logger.error({ err: error }, "❌ Seed database failed");
    process.exit(1);
  }
};

seedDatabase();

