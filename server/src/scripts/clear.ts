import mongoose from "mongoose";
import Redis from "ioredis";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";
import { User } from "../models/user.model.js";
import { Organization } from "../models/organization.model.js";
import { Membership } from "../models/membership.model.js";
import { Project } from "../models/project.model.js";
import { Task } from "../models/task.model.js";
import { Comment } from "../models/comment.model.js";
import { Attachment } from "../models/attachment.model.js";
import { ActivityLog } from "../models/activity.model.js";
import { Notification } from "../models/notification.model.js";
import { Session } from "../models/session.model.js";
import { Invitation } from "../models/invitation.model.js";

const clearDatabase = async () => {
  if (env.NODE_ENV === "production") {
    logger.error("❌ CRITICAL: Clear script execution aborted in PRODUCTION environment!");
    process.exit(1);
  }

  logger.info("🧹 Wiping Development Database...");

  try {
    await mongoose.connect(env.MONGODB_URI);

    await User.deleteMany({});
    await Organization.deleteMany({});
    await Membership.deleteMany({});
    await Project.deleteMany({});
    await Task.deleteMany({});
    await Comment.deleteMany({});
    await Attachment.deleteMany({});
    await ActivityLog.deleteMany({});
    await Notification.deleteMany({});
    await Session.deleteMany({});
    await Invitation.deleteMany({});

    if (mongoose.connection.db) {
      await mongoose.connection.db.dropDatabase();
    }

    logger.info("✅ All development collections and database dropped successfully!");

    try {
      const redis = new Redis(env.REDIS_URL);
      await redis.flushdb();
      logger.info("✅ Redis cache & active sessions flushed successfully!");
      redis.disconnect();
    } catch {
      // Redis optional notice
    }

    await mongoose.disconnect();
    console.log("\n========================================================");
    console.log("✨ DATABASE CLEANED & READY FOR FRESH REGISTRATION");
    console.log("========================================================\n");
    process.exit(0);
  } catch (error) {
    logger.error({ err: error }, "❌ Failed to clear database");
    process.exit(1);
  }
};

clearDatabase();
