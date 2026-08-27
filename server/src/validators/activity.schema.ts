import { z } from "zod";

export const activityQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  action: z.string().optional(),
  actorId: z.string().optional(),
});

export type ActivityQueryInput = z.infer<typeof activityQuerySchema>;
