import { z } from "zod";

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const createOrganizationSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Organization name must be at least 2 characters")
      .max(100, "Organization name cannot exceed 100 characters"),
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .regex(
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        "Slug must contain only lowercase alphanumeric characters and hyphens"
      )
      .optional(),
    logoUrl: z.string().url("Invalid logo URL").nullable().optional(),
    settings: z
      .object({
        timezone: z.string().trim().optional(),
        dateFormat: z.string().trim().optional(),
      })
      .optional(),
  })
  .strict();

export const updateOrganizationSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Organization name must be at least 2 characters")
      .max(100, "Organization name cannot exceed 100 characters")
      .optional(),
    logoUrl: z.string().url("Invalid logo URL").nullable().optional(),
    settings: z
      .object({
        timezone: z.string().trim().optional(),
        dateFormat: z.string().trim().optional(),
      })
      .optional(),
  })
  .strict();

export const transferOwnershipSchema = z
  .object({
    targetUserId: z
      .string()
      .trim()
      .regex(objectIdRegex, "Invalid Target User ID format"),
  })
  .strict();

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;
export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;
export type TransferOwnershipInput = z.infer<typeof transferOwnershipSchema>;
