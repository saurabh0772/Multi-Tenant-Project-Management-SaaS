import { Router } from "express";
import { authenticate } from "../middlewares/authenticate.js";
import { requireOrganizationMember } from "../middlewares/requireOrganizationMember.js";
import { requirePermission } from "../middlewares/requirePermission.js";
import { analyticsController } from "../controllers/analytics.controller.js";
import { PERMISSIONS } from "../constants/permissions.js";

export const analyticsRouter = Router({ mergeParams: true });

analyticsRouter.use(
  authenticate,
  requireOrganizationMember,
  requirePermission(PERMISSIONS.ANALYTICS_READ)
);

analyticsRouter.get("/overview", (req, res, next) =>
  analyticsController.getOverview(req, res, next)
);

analyticsRouter.get("/dashboard", (req, res, next) =>
  analyticsController.getDashboard(req, res, next)
);

analyticsRouter.get("/tasks", (req, res, next) =>
  analyticsController.getTasks(req, res, next)
);

analyticsRouter.get("/tasks/trends", (req, res, next) =>
  analyticsController.getTaskTrends(req, res, next)
);

analyticsRouter.get("/tasks/overdue", (req, res, next) =>
  analyticsController.getOverdueTasks(req, res, next)
);

analyticsRouter.get("/members/workload", (req, res, next) =>
  analyticsController.getMemberWorkload(req, res, next)
);

analyticsRouter.get("/projects", (req, res, next) =>
  analyticsController.getProjects(req, res, next)
);

analyticsRouter.get("/activity", (req, res, next) =>
  analyticsController.getActivity(req, res, next)
);

analyticsRouter.get("/projects/:projectId", (req, res, next) =>
  analyticsController.getProjectAnalytics(req, res, next)
);
