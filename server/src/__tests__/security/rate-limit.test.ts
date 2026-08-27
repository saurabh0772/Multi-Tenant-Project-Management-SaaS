import { describe, it, expect } from "vitest";
import request from "supertest";
import express, { Request, Response } from "express";
import { createRateLimiter } from "../../middlewares/rate-limit.middleware.js";
import { errorHandler } from "../../middlewares/errorHandler.js";

describe("Rate Limiting Middleware Suite", () => {
  it("should allow requests under rate limit threshold", async () => {
    const testApp = express();
    const limiter = createRateLimiter({ max: 5, windowMs: 60000, keyPrefix: "test-under" });

    testApp.use(limiter);
    testApp.get("/test", (_req: Request, res: Response) => {
      res.status(200).json({ success: true });
    });

    for (let i = 0; i < 3; i++) {
      const res = await request(testApp).get("/test");
      expect(res.status).toBe(200);
    }
  });

  it("should return HTTP 429 when rate limit is exceeded", async () => {
    const testApp = express();
    const limiter = createRateLimiter({ max: 2, windowMs: 60000, keyPrefix: "test-over" });

    testApp.use(limiter);
    testApp.get("/test", (_req: Request, res: Response) => {
      res.status(200).json({ success: true });
    });
    testApp.use(errorHandler);

    const res1 = await request(testApp).get("/test");
    expect(res1.status).toBe(200);

    const res2 = await request(testApp).get("/test");
    expect(res2.status).toBe(200);

    const res3 = await request(testApp).get("/test");
    expect(res3.status).toBe(429);
    expect(res3.body.success).toBe(false);
    expect(res3.body.error.code).toBe("RATE_LIMIT_EXCEEDED");
  });
});
