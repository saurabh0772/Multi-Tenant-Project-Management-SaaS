import { Router, Request, Response } from "express";
import authRouter from "./auth.routes.js";
import organizationRouter from "./organization.routes.js";
import invitationRouter from "./invitation.routes.js";

const router = Router();

// Root API v1 router
router.get("/", (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: "Multi-Tenant Project Management SaaS API v1",
  });
});

// Auth Router
router.use("/auth", authRouter);

// Organization Router (handles /organizations, /organizations/:orgId/members, /organizations/:orgId/invitations)
router.use("/organizations", organizationRouter);

// Invitation Global Router (handles /invitations/:token/accept)
router.use("/invitations", invitationRouter);

export default router;
