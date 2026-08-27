import { z } from "zod";

export const joinOrganizationSchema = z.object({
  organizationId: z.string().min(1, "organizationId is required"),
});

export const joinProjectSchema = z.object({
  organizationId: z.string().min(1, "organizationId is required"),
  projectId: z.string().min(1, "projectId is required"),
});

export const joinTaskSchema = z.object({
  organizationId: z.string().min(1, "organizationId is required"),
  taskId: z.string().min(1, "taskId is required"),
});

export const leaveRoomSchema = z.object({
  room: z.string().min(1, "room name is required"),
});

export const presenceHeartbeatSchema = z.object({
  organizationId: z.string().min(1, "organizationId is required"),
});
