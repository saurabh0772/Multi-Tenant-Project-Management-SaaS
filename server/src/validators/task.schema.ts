import { z } from "zod";

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const taskStatusEnum = z.enum([
  "TODO",
  "IN_PROGRESS",
  "IN_REVIEW",
  "DONE",
]);

export const taskPriorityEnum = z.enum([
  "LOW",
  "MEDIUM",
  "HIGH",
  "URGENT",
]);

export const createTaskSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "Task title is required")
      .max(250, "Task title cannot exceed 250 characters"),
    description: z.string().trim().optional(),
    assignedTo: z
      .string()
      .trim()
      .regex(objectIdRegex, "Invalid Assignee User ID format")
      .nullable()
      .optional(),
    status: taskStatusEnum.optional(),
    priority: taskPriorityEnum.optional(),
    labels: z.array(z.string().trim()).optional(),
    dueDate: z
      .string()
      .datetime({ offset: true })
      .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/))
      .nullable()
      .optional(),
    position: z
      .number()
      .refine((val) => Number.isFinite(val), {
        message: "Position must be a finite number",
      })
      .optional(),
  })
  .strict();

export const updateTaskSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "Task title is required")
      .max(250, "Task title cannot exceed 250 characters")
      .optional(),
    description: z.string().trim().optional(),
    assignedTo: z
      .string()
      .trim()
      .regex(objectIdRegex, "Invalid Assignee User ID format")
      .nullable()
      .optional(),
    status: taskStatusEnum.optional(),
    priority: taskPriorityEnum.optional(),
    labels: z.array(z.string().trim()).optional(),
    dueDate: z
      .string()
      .datetime({ offset: true })
      .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/))
      .nullable()
      .optional(),
    position: z
      .number()
      .refine((val) => Number.isFinite(val), {
        message: "Position must be a finite number",
      })
      .optional(),
  })
  .strict();

export const moveTaskSchema = z
  .object({
    status: taskStatusEnum.optional(),
    position: z.number().refine((val) => Number.isFinite(val), {
      message: "Position must be a finite number",
    }),
  })
  .strict();

export const assignTaskSchema = z
  .object({
    assignedTo: z
      .string()
      .trim()
      .regex(objectIdRegex, "Invalid Assignee User ID format")
      .nullable(),
  })
  .strict();

export const taskQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  status: z.string().optional(),
  priority: z.string().optional(),
  assignedTo: z.string().optional(),
  dueDate: z.string().optional(),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type MoveTaskInput = z.infer<typeof moveTaskSchema>;
export type AssignTaskInput = z.infer<typeof assignTaskSchema>;
export type TaskQueryInput = z.infer<typeof taskQuerySchema>;
