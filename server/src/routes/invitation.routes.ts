import { Router } from "express";
import { authenticate } from "../middlewares/authenticate.js";
import { invitationController } from "../controllers/invitation.controller.js";

const router = Router();

// Public lookup of invitation details by token
router.get("/:token", invitationController.getInvitationDetails);

// Accept Invitation via raw token
router.post("/:token/accept", authenticate, invitationController.acceptInvitation);

export default router;
