import { Socket } from "socket.io";

export interface SocketUserData {
  userId: string;
  sessionId: string;
}

declare module "socket.io" {
  interface Socket {
    user?: SocketUserData;
  }
}

export interface AuthenticatedSocket extends Socket {
  user?: SocketUserData;
}

export interface SocketErrorPayload {
  code:
    | "UNAUTHORIZED"
    | "INVALID_TOKEN"
    | "SESSION_INVALID"
    | "MEMBERSHIP_REQUIRED"
    | "MEMBERSHIP_SUSPENDED"
    | "RESOURCE_NOT_FOUND"
    | "FORBIDDEN"
    | "VALIDATION_ERROR";
  message: string;
}

// Room Name Helper Functions
export const getOrgRoomName = (organizationId: string): string =>
  `org:${organizationId}`;

export const getProjectRoomName = (
  organizationId: string,
  projectId: string
): string => `project:${organizationId}:${projectId}`;

export const getTaskRoomName = (
  organizationId: string,
  taskId: string
): string => `task:${organizationId}:${taskId}`;

export const getUserRoomName = (
  organizationId: string,
  userId: string
): string => `user:${organizationId}:${userId}`;

// Event Payload Interfaces
export interface RealtimeProjectPayload {
  organizationId: string;
  projectId: string;
  project: Record<string, unknown>;
  actorId: string;
}

export interface RealtimeTaskPayload {
  organizationId: string;
  projectId: string;
  taskId: string;
  task: Record<string, unknown>;
  actorId: string;
}

export interface RealtimeCommentPayload {
  organizationId: string;
  taskId: string;
  commentId: string;
  comment: Record<string, unknown>;
  actorId: string;
}

export interface RealtimeAttachmentPayload {
  organizationId: string;
  parentId: string;
  attachmentId: string;
  attachment: Record<string, unknown>;
  actorId: string;
}

export interface RealtimeMemberPayload {
  organizationId: string;
  memberId: string;
  member: Record<string, unknown>;
  actorId: string;
}

export interface RealtimeNotificationPayload {
  organizationId: string;
  recipientId: string;
  notificationId?: string;
  notification: Record<string, unknown>;
}

export interface RealtimeActivityPayload {
  organizationId: string;
  activityId: string;
  activity: Record<string, unknown>;
}
