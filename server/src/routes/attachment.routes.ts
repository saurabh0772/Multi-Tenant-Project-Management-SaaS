import { Router } from "express";
import { authenticate } from "../middlewares/authenticate.js";
import { requireOrganizationMember } from "../middlewares/requireOrganizationMember.js";
import { requirePermission } from "../middlewares/requirePermission.js";
import { uploadSingleFile } from "../middlewares/upload.middleware.js";
import { PERMISSIONS } from "../constants/permissions.js";
import { attachmentController } from "../controllers/attachment.controller.js";

const router = Router({ mergeParams: true });

// --- Task Attachment Upload & Listing ---
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

// --- Comment Attachment Upload & Listing ---
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

// --- Attachment Level Access & Deletion ---
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

export default router;
