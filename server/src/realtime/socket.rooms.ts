import { Types } from "mongoose";
import {
  AuthenticatedSocket,
  getOrgRoomName,
  getProjectRoomName,
  getTaskRoomName,
  getUserRoomName,
  SocketErrorPayload,
} from "./socket.types.js";
import { membershipRepository } from "../repositories/membership.repository.js";
import { projectRepository } from "../repositories/project.repository.js";
import { taskRepository } from "../repositories/task.repository.js";
import { logger } from "../utils/logger.js";
import {
  joinOrganizationSchema,
  joinProjectSchema,
  joinTaskSchema,
  leaveRoomSchema,
} from "../validators/socket.schema.js";

export class SocketRoomManager {
  /**
   * Safe helper to emit standardized socket errors
   */
  public emitError(socket: AuthenticatedSocket, error: SocketErrorPayload) {
    socket.emit("socket:error", error);
  }

  /**
   * Joins organization room after verifying ACTIVE membership
   */
  public handleJoinOrganization = async (
    socket: AuthenticatedSocket,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: any,
    callback?: (response: unknown) => void
  ) => {
    try {
      const parsed = joinOrganizationSchema.parse(data);
      const userId = socket.user!.userId;
      const { organizationId } = parsed;

      const userObjId = new Types.ObjectId(userId);
      const orgObjId = new Types.ObjectId(organizationId);

      const membership = await membershipRepository.findActiveMembership(
        userObjId,
        orgObjId
      );

      if (!membership) {
        const err: SocketErrorPayload = {
          code: "MEMBERSHIP_REQUIRED",
          message: "Active organization membership required to join room",
        };
        this.emitError(socket, err);
        if (callback) callback({ success: false, error: err });
        return;
      }

      if (membership.status !== "ACTIVE") {
        const err: SocketErrorPayload = {
          code: "MEMBERSHIP_SUSPENDED",
          message: "Membership is suspended or inactive",
        };
        this.emitError(socket, err);
        if (callback) callback({ success: false, error: err });
        return;
      }

      const orgRoom = getOrgRoomName(organizationId);
      const userRoom = getUserRoomName(organizationId, userId);

      await socket.join(orgRoom);
      await socket.join(userRoom);

      logger.info(
        { socketId: socket.id, userId, organizationId, orgRoom },
        "Socket joined organization room"
      );

      socket.emit("organization:joined", { organizationId, room: orgRoom });
      if (callback) callback({ success: true, room: orgRoom });
    } catch (error) {
      const err: SocketErrorPayload = {
        code: "VALIDATION_ERROR",
        message: "Invalid payload for join organization",
      };
      this.emitError(socket, err);
      if (callback) callback({ success: false, error: err });
    }
  };

  /**
   * Joins project room after verifying tenant membership and project tenant boundary
   */
  public handleJoinProject = async (
    socket: AuthenticatedSocket,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: any,
    callback?: (response: unknown) => void
  ) => {
    try {
      const parsed = joinProjectSchema.parse(data);
      const userId = socket.user!.userId;
      const { organizationId, projectId } = parsed;

      const userObjId = new Types.ObjectId(userId);
      const orgObjId = new Types.ObjectId(organizationId);
      const projObjId = new Types.ObjectId(projectId);

      // Verify active membership
      const membership = await membershipRepository.findActiveMembership(
        userObjId,
        orgObjId
      );

      if (!membership || membership.status !== "ACTIVE") {
        const err: SocketErrorPayload = {
          code: "MEMBERSHIP_REQUIRED",
          message: "Active organization membership required to join project room",
        };
        this.emitError(socket, err);
        if (callback) callback({ success: false, error: err });
        return;
      }

      // Verify project exists in the same organization
      const project = await projectRepository.getProjectById(
        projObjId,
        orgObjId
      );

      if (!project) {
        const err: SocketErrorPayload = {
          code: "RESOURCE_NOT_FOUND",
          message: "Project not found in this organization",
        };
        this.emitError(socket, err);
        if (callback) callback({ success: false, error: err });
        return;
      }

      const projectRoom = getProjectRoomName(organizationId, projectId);
      await socket.join(projectRoom);

      logger.info(
        { socketId: socket.id, userId, organizationId, projectId },
        "Socket joined project room"
      );

      socket.emit("project:joined", { organizationId, projectId, room: projectRoom });
      if (callback) callback({ success: true, room: projectRoom });
    } catch (error) {
      const err: SocketErrorPayload = {
        code: "VALIDATION_ERROR",
        message: "Invalid payload for join project",
      };
      this.emitError(socket, err);
      if (callback) callback({ success: false, error: err });
    }
  };

  /**
   * Joins task room after verifying tenant membership and task tenant boundary
   */
  public handleJoinTask = async (
    socket: AuthenticatedSocket,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: any,
    callback?: (response: unknown) => void
  ) => {
    try {
      const parsed = joinTaskSchema.parse(data);
      const userId = socket.user!.userId;
      const { organizationId, taskId } = parsed;

      const userObjId = new Types.ObjectId(userId);
      const orgObjId = new Types.ObjectId(organizationId);

      const membership = await membershipRepository.findActiveMembership(
        userObjId,
        orgObjId
      );

      if (!membership || membership.status !== "ACTIVE") {
        const err: SocketErrorPayload = {
          code: "MEMBERSHIP_REQUIRED",
          message: "Active organization membership required to join task room",
        };
        this.emitError(socket, err);
        if (callback) callback({ success: false, error: err });
        return;
      }

      const task = await taskRepository.getTaskById(taskId, orgObjId);
      if (!task) {
        const err: SocketErrorPayload = {
          code: "RESOURCE_NOT_FOUND",
          message: "Task not found in this organization",
        };
        this.emitError(socket, err);
        if (callback) callback({ success: false, error: err });
        return;
      }

      const taskRoom = getTaskRoomName(organizationId, taskId);
      await socket.join(taskRoom);

      logger.info(
        { socketId: socket.id, userId, organizationId, taskId },
        "Socket joined task room"
      );

      socket.emit("task:joined", { organizationId, taskId, room: taskRoom });
      if (callback) callback({ success: true, room: taskRoom });
    } catch (error) {
      const err: SocketErrorPayload = {
        code: "VALIDATION_ERROR",
        message: "Invalid payload for join task",
      };
      this.emitError(socket, err);
      if (callback) callback({ success: false, error: err });
    }
  };

  /**
   * Leaves specified room
   */
  public handleLeaveRoom = async (
    socket: AuthenticatedSocket,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: any,
    callback?: (response: unknown) => void
  ) => {
    try {
      const parsed = leaveRoomSchema.parse(data);
      await socket.leave(parsed.room);

      socket.emit("room:left", { room: parsed.room });
      if (callback) callback({ success: true, room: parsed.room });
    } catch (error) {
      const err: SocketErrorPayload = {
        code: "VALIDATION_ERROR",
        message: "Invalid room payload for leave room",
      };
      this.emitError(socket, err);
      if (callback) callback({ success: false, error: err });
    }
  };
}

export const socketRoomManager = new SocketRoomManager();
