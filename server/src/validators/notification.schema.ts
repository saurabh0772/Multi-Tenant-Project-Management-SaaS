import { z } from "zod";

export const notificationQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  unread: z
    .string()
    .transform((val) => val === "true")
    .optional(),
});

export type NotificationQueryInput = z.infer<typeof notificationQuerySchema>;
