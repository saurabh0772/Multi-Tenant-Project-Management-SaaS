import { Router } from "express";
import { authenticate } from "../middlewares/authenticate.js";
import { requireOrganizationMember } from "../middlewares/requireOrganizationMember.js";
import { activityController } from "../controllers/activity.controller.js";

const router = Router({ mergeParams: true });

// 1. Organization Activity Feed
router.get(
  "/activities",
  authenticate,
  requireOrganizationMember,
  activityController.getOrganizationActivities
);

// 2. Project Activity Feed
router.get(
  "/projects/:projectId/activities",
  authenticate,
  requireOrganizationMember,
  activityController.getProjectActivities
);

// 3. Task Activity Feed
router.get(
  "/tasks/:taskId/activities",
  authenticate,
  requireOrganizationMember,
  activityController.getTaskActivities
);

export default router;
