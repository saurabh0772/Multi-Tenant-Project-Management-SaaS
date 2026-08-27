import { Router } from "express";
import { authenticate } from "../middlewares/authenticate.js";
import { requireOrganizationMember } from "../middlewares/requireOrganizationMember.js";
import { requirePermission } from "../middlewares/requirePermission.js";
import { PERMISSIONS } from "../constants/permissions.js";
import { projectController } from "../controllers/project.controller.js";

const router = Router({ mergeParams: true });

// 1. Create Project (OWNER, ADMIN, MANAGER)
router.post(
  "/",
  authenticate,
  requireOrganizationMember,
  requirePermission(PERMISSIONS.PROJECT_CREATE),
  projectController.createProject
);

// 2. List Projects (OWNER, ADMIN, MANAGER, MEMBER)
router.get(
  "/",
  authenticate,
  requireOrganizationMember,
  requirePermission(PERMISSIONS.PROJECT_READ),
  projectController.getProjects
);

// 3. Get Specific Project Details (OWNER, ADMIN, MANAGER, MEMBER)
router.get(
  "/:projectId",
  authenticate,
  requireOrganizationMember,
  requirePermission(PERMISSIONS.PROJECT_READ),
  projectController.getProject
);

// 4. Update Project (OWNER, ADMIN, MANAGER)
router.patch(
  "/:projectId",
  authenticate,
  requireOrganizationMember,
  requirePermission(PERMISSIONS.PROJECT_UPDATE),
  projectController.updateProject
);

// 5. Archive Project (OWNER, ADMIN, MANAGER)
router.post(
  "/:projectId/archive",
  authenticate,
  requireOrganizationMember,
  requirePermission(PERMISSIONS.PROJECT_UPDATE),
  projectController.archiveProject
);

// 6. Restore Project (OWNER, ADMIN, MANAGER)
router.post(
  "/:projectId/restore",
  authenticate,
  requireOrganizationMember,
  requirePermission(PERMISSIONS.PROJECT_UPDATE),
  projectController.restoreProject
);

// 7. Delete Project (OWNER, ADMIN only)
router.delete(
  "/:projectId",
  authenticate,
  requireOrganizationMember,
  requirePermission(PERMISSIONS.PROJECT_DELETE),
  projectController.deleteProject
);

export default router;
