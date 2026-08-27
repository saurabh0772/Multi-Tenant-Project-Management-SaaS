import { Server } from "socket.io";
import {
  getOrgRoomName,
  getProjectRoomName,
  getTaskRoomName,
  getUserRoomName,
} from "./socket.types.js";
import { logger } from "../utils/logger.js";

export class RealtimeEventPublisher {
  private io: Server | null = null;

  public setIO(ioServer: Server) {
    this.io = ioServer;
  }

  public getIO(): Server | null {
    return this.io;
  }

  /**
   * Publishes project events to organization room & project room
   */
  public publishProjectEvent(
    eventName: string,
    organizationId: string,
    projectId: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    payload: Record<string, any>
  ): void {
    if (!this.io) return;

    const orgRoom = getOrgRoomName(organizationId);
    const projRoom = getProjectRoomName(organizationId, projectId);

    logger.debug(
      { eventName, organizationId, projectId },
      "Publishing project realtime event"
    );

    this.io.to(orgRoom).to(projRoom).emit(eventName, {
      organizationId,
      projectId,
      ...payload,
    });
  }

  /**
   * Publishes task events to organization, project, and task rooms
   */
  public publishTaskEvent(
    eventName: string,
    organizationId: string,
    projectId: string,
    taskId: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    payload: Record<string, any>
  ): void {
    if (!this.io) return;

    const orgRoom = getOrgRoomName(organizationId);
    const projRoom = getProjectRoomName(organizationId, projectId);
    const taskRoom = getTaskRoomName(organizationId, taskId);

    logger.debug(
      { eventName, organizationId, taskId },
      "Publishing task realtime event"
    );

    this.io.to(orgRoom).to(projRoom).to(taskRoom).emit(eventName, {
      organizationId,
      projectId,
      taskId,
      ...payload,
    });
  }

  /**
   * Publishes comment events to organization, task, and project rooms
   */
  public publishCommentEvent(
    eventName: string,
    organizationId: string,
    taskId: string,
    commentId: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    payload: Record<string, any>
  ): void {
    if (!this.io) return;

    const orgRoom = getOrgRoomName(organizationId);
    const taskRoom = getTaskRoomName(organizationId, taskId);

    logger.debug(
      { eventName, organizationId, taskId, commentId },
      "Publishing comment realtime event"
    );

    this.io.to(orgRoom).to(taskRoom).emit(eventName, {
      organizationId,
      taskId,
      commentId,
      ...payload,
    });
  }

  /**
   * Publishes attachment events
   */
  public publishAttachmentEvent(
    eventName: string,
    organizationId: string,
    attachmentId: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    payload: Record<string, any>
  ): void {
    if (!this.io) return;

    const orgRoom = getOrgRoomName(organizationId);

    logger.debug(
      { eventName, organizationId, attachmentId },
      "Publishing attachment realtime event"
    );

    this.io.to(orgRoom).emit(eventName, {
      organizationId,
      attachmentId,
      ...payload,
    });
  }

  /**
   * Publishes organization member management events
   */
  public publishMemberEvent(
    eventName: string,
    organizationId: string,
    memberId: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    payload: Record<string, any>
  ): void {
    if (!this.io) return;

    const orgRoom = getOrgRoomName(organizationId);

    logger.debug(
      { eventName, organizationId, memberId },
      "Publishing member realtime event"
    );

    this.io.to(orgRoom).emit(eventName, {
      organizationId,
      memberId,
      ...payload,
    });
  }

  /**
   * Publishes user-specific notification events to recipient's user room
   */
  public publishNotificationEvent(
    eventName: string,
    organizationId: string,
    recipientId: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    payload: Record<string, any>
  ): void {
    if (!this.io) return;

    const userRoom = getUserRoomName(organizationId, recipientId);

    logger.debug(
      { eventName, organizationId, recipientId },
      "Publishing recipient notification realtime event"
    );

    this.io.to(userRoom).emit(eventName, {
      organizationId,
      recipientId,
      ...payload,
    });
  }

  /**
   * Publishes live activity log events to organization room
   */
  public publishActivityEvent(
    eventName: string,
    organizationId: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    payload: Record<string, any>
  ): void {
    if (!this.io) return;

    const orgRoom = getOrgRoomName(organizationId);

    this.io.to(orgRoom).emit(eventName, {
      organizationId,
      ...payload,
    });
  }
}

export const realtimeEventPublisher = new RealtimeEventPublisher();
