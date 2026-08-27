import { Router } from "express";
import { authenticate } from "../middlewares/authenticate.js";
import { invitationController } from "../controllers/invitation.controller.js";

const router = Router();

// Accept Invitation via raw token
router.post("/:token/accept", authenticate, invitationController.acceptInvitation);

export default router;
