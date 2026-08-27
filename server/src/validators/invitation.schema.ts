import { z } from "zod";

export const createInvitationSchema = z
  .object({
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email("Please provide a valid email address"),
    role: z.enum(["ADMIN", "MANAGER", "MEMBER"], {
      errorMap: () => ({
        message: "Role must be one of: ADMIN, MANAGER, MEMBER",
      }),
    }),
  })
  .strict();

export type CreateInvitationInput = z.infer<typeof createInvitationSchema>;
