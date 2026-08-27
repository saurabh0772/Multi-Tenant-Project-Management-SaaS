import { Router } from "express";
import { authenticate } from "../middlewares/authenticate.js";
import { requireOrganizationMember } from "../middlewares/requireOrganizationMember.js";
import { requirePermission } from "../middlewares/requirePermission.js";
import { PERMISSIONS } from "../constants/permissions.js";
import { commentController } from "../controllers/comment.controller.js";

const router = Router({ mergeParams: true });

// --- Task-Scoped Comments ---
router.post(
  "/tasks/:taskId/comments",
  authenticate,
  requireOrganizationMember,
  requirePermission(PERMISSIONS.COMMENT_CREATE),
  commentController.createComment
);

router.get(
  "/tasks/:taskId/comments",
  authenticate,
  requireOrganizationMember,
  requirePermission(PERMISSIONS.COMMENT_READ),
  commentController.getTaskComments
);

// --- Comment-Level Routes ---
router.get(
  "/comments/:commentId",
  authenticate,
  requireOrganizationMember,
  requirePermission(PERMISSIONS.COMMENT_READ),
  commentController.getComment
);

router.patch(
  "/comments/:commentId",
  authenticate,
  requireOrganizationMember,
  requirePermission(PERMISSIONS.COMMENT_CREATE),
  commentController.updateComment
);

router.delete(
  "/comments/:commentId",
  authenticate,
  requireOrganizationMember,
  commentController.deleteComment
);

export default router;
