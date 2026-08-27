import { z } from "zod";

export const updateMemberRoleSchema = z
  .object({
    role: z.enum(["ADMIN", "MANAGER", "MEMBER"], {
      errorMap: () => ({
        message: "Role must be one of: ADMIN, MANAGER, MEMBER",
      }),
    }),
  })
  .strict();

export const updateMemberStatusSchema = z
  .object({
    status: z.enum(["ACTIVE", "SUSPENDED"], {
      errorMap: () => ({
        message: "Status must be one of: ACTIVE, SUSPENDED",
      }),
    }),
  })
  .strict();

export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;
export type UpdateMemberStatusInput = z.infer<typeof updateMemberStatusSchema>;
