import { Router } from "express";
import { metricsController } from "../controllers/metrics.controller.js";

const router = Router();

router.get("/", metricsController.getMetrics);

export default router;
