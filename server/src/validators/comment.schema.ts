import { z } from "zod";

export const createCommentSchema = z
  .object({
    content: z
      .string()
      .trim()
      .min(1, "Comment content cannot be empty")
      .max(5000, "Comment content cannot exceed 5000 characters"),
  })
  .strict();

export const updateCommentSchema = z
  .object({
    content: z
      .string()
      .trim()
      .min(1, "Comment content cannot be empty")
      .max(5000, "Comment content cannot exceed 5000 characters"),
  })
  .strict();

export const commentQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
});

export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type UpdateCommentInput = z.infer<typeof updateCommentSchema>;
export type CommentQueryInput = z.infer<typeof commentQuerySchema>;
