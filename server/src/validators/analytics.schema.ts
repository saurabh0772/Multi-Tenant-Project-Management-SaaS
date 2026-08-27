import { z } from "zod";

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const analyticsQuerySchema = z
  .object({
    range: z.enum(["7d", "30d", "90d", "custom"]).optional().default("30d"),
    interval: z.enum(["day", "week", "month"]).optional().default("day"),
    startDate: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
    endDate: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
    projectId: z
      .string()
      .refine((val) => objectIdRegex.test(val), { message: "Invalid projectId ObjectId" })
      .optional(),
    actorId: z
      .string()
      .refine((val) => objectIdRegex.test(val), { message: "Invalid actorId ObjectId" })
      .optional(),
    entityType: z.string().trim().max(50).optional(),
    action: z.string().trim().max(50).optional(),
  })
  .refine(
    (data) => {
      if (data.range === "custom" && data.startDate && data.endDate) {
        const start = new Date(data.startDate).getTime();
        const end = new Date(data.endDate).getTime();
        if (start > end) return false;
      }
      return true;
    },
    {
      message: "startDate must be less than or equal to endDate",
      path: ["startDate"],
    }
  )
  .refine(
    (data) => {
      if (data.range === "custom" && data.startDate && data.endDate) {
        const start = new Date(data.startDate).getTime();
        const end = new Date(data.endDate).getTime();
        const maxDiffMs = 365 * 24 * 60 * 60 * 1000;
        if (end - start > maxDiffMs) return false;
      }
      return true;
    },
    {
      message: "Custom date range cannot exceed 365 days",
      path: ["endDate"],
    }
  );

export type AnalyticsQueryInput = z.infer<typeof analyticsQuerySchema>;
