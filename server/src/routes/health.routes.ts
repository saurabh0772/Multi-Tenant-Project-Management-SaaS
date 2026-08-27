import { Router } from "express";
import { healthController } from "../controllers/health.controller.js";

const router = Router();

/**
 * GET /health
 * Public process liveness check endpoint
 */
router.get("/", healthController.getLiveness);

export default router;
