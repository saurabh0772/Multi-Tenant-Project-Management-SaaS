import { Router } from "express";
import { authenticate } from "../middlewares/authenticate.js";
import { requireOrganizationMember } from "../middlewares/requireOrganizationMember.js";
import { requireRole } from "../middlewares/requireRole.js";
import { requirePermission } from "../middlewares/requirePermission.js";
import { PERMISSIONS } from "../constants/permissions.js";
import { organizationController } from "../controllers/organization.controller.js";
import { membershipController } from "../controllers/membership.controller.js";
import { invitationController } from "../controllers/invitation.controller.js";
import projectRouter from "./project.routes.js";
import taskRouter from "./task.routes.js";
import commentRouter from "./comment.routes.js";
import attachmentRouter from "./attachment.routes.js";
import activityRouter from "./activity.routes.js";
import notificationRouter from "./notification.routes.js";
import { analyticsRouter } from "./analytics.routes.js";
import searchRouter from "./search.routes.js";

const router = Router({ mergeParams: true });

// --- Organization Core APIs ---

// 1. Create Organization (Does NOT use requireOrganizationMember because creator is not yet a member)
router.post("/", authenticate, organizationController.createOrganization);

// 2. Get User Organizations
router.get("/", authenticate, organizationController.getUserOrganizations);

// 3. Get Specific Organization
router.get(
  "/:organizationId",
  authenticate,
  requireOrganizationMember,
  requirePermission(PERMISSIONS.ORGANIZATION_READ),
  organizationController.getOrganization
);

// 4. Update Organization
router.patch(
  "/:organizationId",
  authenticate,
  requireOrganizationMember,
  requirePermission(PERMISSIONS.ORGANIZATION_UPDATE),
  organizationController.updateOrganization
);

// 5. Transfer Ownership (OWNER only)
router.post(
  "/:organizationId/transfer-ownership",
  authenticate,
  requireOrganizationMember,
  requireRole("OWNER"),
  organizationController.transferOwnership
);

// --- Member Sub-Routes ---

// 6. Get Organization Members
router.get(
  "/:organizationId/members",
  authenticate,
  requireOrganizationMember,
  requirePermission(PERMISSIONS.MEMBER_READ),
  membershipController.getMembers
);

// 7. Get Specific Member Details
router.get(
  "/:organizationId/members/:memberId",
  authenticate,
  requireOrganizationMember,
  requirePermission(PERMISSIONS.MEMBER_READ),
  membershipController.getMember
);

// 8. Update Member Role or Status
router.patch(
  "/:organizationId/members/:memberId",
  authenticate,
  requireOrganizationMember,
  requirePermission(PERMISSIONS.MEMBER_UPDATE_ROLE),
  membershipController.updateMember
);

// 9. Remove Member
router.delete(
  "/:organizationId/members/:memberId",
  authenticate,
  requireOrganizationMember,
  requirePermission(PERMISSIONS.MEMBER_REMOVE),
  membershipController.removeMember
);

// --- Invitation Organization Sub-Routes ---

// 10. Send Invitation
router.post(
  "/:organizationId/invitations",
  authenticate,
  requireOrganizationMember,
  requirePermission(PERMISSIONS.MEMBER_INVITE),
  invitationController.sendInvitation
);

// 11. List Invitations
router.get(
  "/:organizationId/invitations",
  authenticate,
  requireOrganizationMember,
  requirePermission(PERMISSIONS.MEMBER_INVITE),
  invitationController.getInvitations
);

// 12. Revoke Invitation
router.delete(
  "/:organizationId/invitations/:invitationId",
  authenticate,
  requireOrganizationMember,
  requirePermission(PERMISSIONS.MEMBER_INVITE),
  invitationController.revokeInvitation
);

// --- Notification Sub-Routes ---
router.use("/:organizationId/notifications", notificationRouter);

// --- Comment Sub-Routes ---
router.use("/:organizationId", commentRouter);

// --- Attachment Sub-Routes ---
router.use("/:organizationId", attachmentRouter);

// --- Activity Feed Sub-Routes ---
router.use("/:organizationId", activityRouter);

// --- Task Organization Sub-Routes ---
router.use("/:organizationId/tasks", taskRouter);
router.use("/:organizationId/projects/:projectId/tasks", taskRouter);

// --- Search Sub-Routes ---
router.use("/:organizationId/search", searchRouter);

// --- Analytics Sub-Routes ---
router.use("/:organizationId/analytics", analyticsRouter);

// --- Project Sub-Routes ---
router.use("/:organizationId/projects", projectRouter);

export default router;
