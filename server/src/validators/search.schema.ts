import { z } from "zod";

/**
 * Escapes special regex metacharacters to ensure safe regex construction
 */
export const escapeRegex = (str: string): string => {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

/**
 * Detects malicious MongoDB query operator injection attempts
 */
const FORBIDDEN_OPERATORS = [
  "$where",
  "$expr",
  "$function",
  "$regex",
  "$or",
  "$and",
  "$gt",
  "$gte",
  "$lt",
  "$lte",
  "$ne",
  "$in",
  "$nin",
  "$exists",
  "$mod",
  "$text",
  "$jsonSchema",
];

export const isOperatorInjection = (val: string): boolean => {
  const lower = val.toLowerCase().trim();
  if (lower.startsWith("$")) return true;
  return FORBIDDEN_OPERATORS.some((op) => lower.includes(op));
};

const safeString = (fieldName: string) =>
  z
    .string()
    .optional()
    .refine(
      (val) => !val || !isOperatorInjection(val),
      { message: `Invalid character sequence or operator injection attempt in ${fieldName}` }
    );

export const searchQuerySchema = z.object({
  q: safeString("q").transform((val) => (val ? val.trim() : "")),
  type: z
    .enum(["all", "projects", "tasks", "comments", "members"])
    .default("all"),
  projectId: safeString("projectId"),
  status: safeString("status"),
  priority: safeString("priority"),
  assignedTo: safeString("assignedTo"),
  createdBy: safeString("createdBy"),
  sortBy: safeString("sortBy"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  page: z.coerce.number().int().min(1, "Page must be at least 1").default(1),
  limit: z.coerce
    .number()
    .int()
    .min(1, "Limit must be at least 1")
    .max(100, "Limit cannot exceed 100")
    .default(20),
});

export type SearchQueryParams = z.infer<typeof searchQuerySchema>;
