import { Router } from "express";
import { authenticate } from "../middlewares/authenticate.js";
import { requireOrganizationMember } from "../middlewares/requireOrganizationMember.js";
import { requirePermission } from "../middlewares/requirePermission.js";
import { uploadSingleFile } from "../middlewares/upload.middleware.js";
import { PERMISSIONS } from "../constants/permissions.js";
import { attachmentController } from "../controllers/attachment.controller.js";

const router = Router({ mergeParams: true });

// --- Organization Level Attachments (/organizations/:orgId/attachments) ---
router.post(
  "/attachments",
  authenticate,
  requireOrganizationMember,
  requirePermission(PERMISSIONS.ATTACHMENT_UPLOAD),
  uploadSingleFile,
  attachmentController.uploadAttachment
);

router.get(
  "/attachments",
  authenticate,
  requireOrganizationMember,
  requirePermission(PERMISSIONS.ATTACHMENT_READ),
  attachmentController.getAttachments
);

router.get(
  "/attachments/:attachmentId/download",
  authenticate,
  requireOrganizationMember,
  requirePermission(PERMISSIONS.ATTACHMENT_READ),
  attachmentController.downloadAttachment
);

router.delete(
  "/attachments/:attachmentId",
  authenticate,
  requireOrganizationMember,
  attachmentController.deleteAttachment
);

// --- Task Attachment Legacy Routes ---
router.post(
  "/tasks/:taskId/attachments",
  authenticate,
  requireOrganizationMember,
  requirePermission(PERMISSIONS.ATTACHMENT_UPLOAD),
  uploadSingleFile,
  attachmentController.uploadTaskAttachment
);

router.get(
  "/tasks/:taskId/attachments",
  authenticate,
  requireOrganizationMember,
  requirePermission(PERMISSIONS.ATTACHMENT_READ),
  attachmentController.getTaskAttachments
);

// --- Comment Attachment Legacy Routes ---
router.post(
  "/comments/:commentId/attachments",
  authenticate,
  requireOrganizationMember,
  requirePermission(PERMISSIONS.ATTACHMENT_UPLOAD),
  uploadSingleFile,
  attachmentController.uploadCommentAttachment
);

router.get(
  "/comments/:commentId/attachments",
  authenticate,
  requireOrganizationMember,
  requirePermission(PERMISSIONS.ATTACHMENT_READ),
  attachmentController.getCommentAttachments
);

export default router;
