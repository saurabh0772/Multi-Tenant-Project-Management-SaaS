import mongoose from "mongoose";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";
import { User } from "../models/user.model.js";
import { Organization } from "../models/organization.model.js";
import { Membership } from "../models/membership.model.js";
import { Project } from "../models/project.model.js";
import { Task } from "../models/task.model.js";

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

    // 1. Seed Users
    logger.info("Seeding Users...");
    const alex = await User.create({
      name: "Alex Mercer",
      email: "alex@example.com",
      passwordHash: "$argon2id$v=19$m=65536,t=3,p=4$dummyhashval1",
      emailVerified: true,
      status: "ACTIVE",
    });

    const devin = await User.create({
      name: "Devin Vance",
      email: "devin@example.com",
      passwordHash: "$argon2id$v=19$m=65536,t=3,p=4$dummyhashval2",
      emailVerified: true,
      status: "ACTIVE",
    });

    // 2. Seed Organizations
    logger.info("Seeding Organizations...");
    const acmeOrg = await Organization.create({
      name: "Acme Technologies",
      slug: "acme-technologies",
      ownerId: alex._id,
      settings: { timezone: "America/New_York", dateFormat: "YYYY-MM-DD" },
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
      userId: alex._id,
      organizationId: acmeOrg._id,
      role: "OWNER",
      status: "ACTIVE",
    });

    await Membership.create({
      userId: devin._id,
      organizationId: starkOrg._id,
      role: "OWNER",
      status: "ACTIVE",
    });

    // 4. Seed Projects
    logger.info("Seeding Projects...");
    const acmeProject = await Project.create({
      organizationId: acmeOrg._id,
      name: "Backend SaaS Gateway",
      slug: "backend-saas-gateway",
      description: "Core MERN stack REST API gateway",
      ownerId: alex._id,
      createdBy: alex._id,
      status: "ACTIVE",
    });

    const starkProject = await Project.create({
      organizationId: starkOrg._id,
      name: "Arc Reactor Analytics",
      slug: "arc-reactor-analytics",
      description: "Realtime metrics system",
      ownerId: devin._id,
      createdBy: devin._id,
      status: "ACTIVE",
    });

    // 5. Seed Tasks
    logger.info("Seeding Tasks...");
    await Task.create({
      organizationId: acmeOrg._id,
      projectId: acmeProject._id,
      title: "Establish Mongoose Data Layer",
      description: "Create all schemas, models, and repositories for Phase 02",
      createdBy: alex._id,
      assignedTo: alex._id,
      status: "IN_PROGRESS",
      priority: "HIGH",
      labels: ["backend", "database"],
      position: 1000,
    });

    await Task.create({
      organizationId: starkOrg._id,
      projectId: starkProject._id,
      title: "Setup Analytics Schema",
      description: "Design metrics database schemas",
      createdBy: devin._id,
      assignedTo: devin._id,
      status: "TODO",
      priority: "MEDIUM",
      labels: ["analytics"],
      position: 1000,
    });

    logger.info("✅ Database seed completed successfully!");
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    logger.error({ err: error }, "❌ Seed database failed");
    process.exit(1);
  }
};

seedDatabase();
