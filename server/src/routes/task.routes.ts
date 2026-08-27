import { Router } from "express";
import { authenticate } from "../middlewares/authenticate.js";
import { requireOrganizationMember } from "../middlewares/requireOrganizationMember.js";
import { requirePermission } from "../middlewares/requirePermission.js";
import { PERMISSIONS } from "../constants/permissions.js";
import { taskController } from "../controllers/task.controller.js";

const router = Router({ mergeParams: true });

// --- My Tasks (Organization Scoped) ---
router.get(
  "/my",
  authenticate,
  requireOrganizationMember,
  requirePermission(PERMISSIONS.TASK_READ),
  taskController.getMyTasks
);

// --- Project-Scoped Task Routes ---
router.post(
  "/",
  authenticate,
  requireOrganizationMember,
  requirePermission(PERMISSIONS.TASK_CREATE),
  taskController.createTask
);

router.get(
  "/",
  authenticate,
  requireOrganizationMember,
  requirePermission(PERMISSIONS.TASK_READ),
  taskController.getProjectTasks
);

// --- Task-Level Routes ---
router.get(
  "/:taskId",
  authenticate,
  requireOrganizationMember,
  requirePermission(PERMISSIONS.TASK_READ),
  taskController.getTask
);

router.patch(
  "/:taskId",
  authenticate,
  requireOrganizationMember,
  requirePermission(PERMISSIONS.TASK_UPDATE),
  taskController.updateTask
);

router.patch(
  "/:taskId/position",
  authenticate,
  requireOrganizationMember,
  requirePermission(PERMISSIONS.TASK_UPDATE),
  taskController.moveTask
);

router.patch(
  "/:taskId/assignee",
  authenticate,
  requireOrganizationMember,
  requirePermission(PERMISSIONS.TASK_ASSIGN),
  taskController.assignTask
);

router.delete(
  "/:taskId",
  authenticate,
  requireOrganizationMember,
  requirePermission(PERMISSIONS.TASK_DELETE),
  taskController.deleteTask
);

router.post(
  "/:taskId/restore",
  authenticate,
  requireOrganizationMember,
  requirePermission(PERMISSIONS.TASK_UPDATE),
  taskController.restoreTask
);

export default router;
