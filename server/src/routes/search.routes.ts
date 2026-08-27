import { Router } from "express";
import { authenticate } from "../middlewares/authenticate.js";
import { requireOrganizationMember } from "../middlewares/requireOrganizationMember.js";
import { createRateLimiter } from "../middlewares/rate-limit.middleware.js";
import { searchController } from "../controllers/search.controller.js";

const router = Router({ mergeParams: true });

const searchRateLimiter = createRateLimiter({
  keyPrefix: "search",
  max: 60, // 60 search requests per minute per user/IP
});

/**
 * GET /api/v1/organizations/:organizationId/search
 * Tenant-scoped global search across projects, tasks, comments, and members
 */
router.get(
  "/",
  authenticate,
  requireOrganizationMember,
  searchRateLimiter,
  searchController.search
);

export default router;
