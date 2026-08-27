import { Router, Request, Response } from "express";

const router = Router();

/**
 * GET /health
 * Public process health check endpoint
 */
router.get("/", (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: "API is healthy",
  });
});

export default router;
