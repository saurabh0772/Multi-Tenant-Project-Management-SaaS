import { z } from "zod";

export const attachmentQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
});

export type AttachmentQueryInput = z.infer<typeof attachmentQuerySchema>;
