import { Router } from "express";
import { authenticate } from "../middlewares/authenticate.js";
import { requireOrganizationMember } from "../middlewares/requireOrganizationMember.js";
import { notificationController } from "../controllers/notification.controller.js";

const router = Router({ mergeParams: true });

// 1. Get User Notifications in Tenant
router.get(
  "/",
  authenticate,
  requireOrganizationMember,
  notificationController.getUserNotifications
);

// 2. Get Unread Notification Count
router.get(
  "/unread-count",
  authenticate,
  requireOrganizationMember,
  notificationController.getUnreadCount
);

// 3. Mark All Notifications as Read
router.patch(
  "/read-all",
  authenticate,
  requireOrganizationMember,
  notificationController.markAllAsRead
);

// 4. Mark Single Notification as Read
router.patch(
  "/:notificationId/read",
  authenticate,
  requireOrganizationMember,
  notificationController.markAsRead
);

export default router;
