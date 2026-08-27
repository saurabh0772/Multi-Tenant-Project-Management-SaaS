import { Server } from "socket.io";
import {
  AuthenticatedSocket,
  getOrgRoomName,
} from "./socket.types.js";
import { socketRoomManager } from "./socket.rooms.js";
import { presenceHeartbeatSchema } from "../validators/socket.schema.js";
import { logger } from "../utils/logger.js";

// Maps orgUserKey (`${orgId}:${userId}`) to Set of connected socket.id strings
const userSocketsMap = new Map<string, Set<string>>();

export const registerSocketEventHandlers = (
  io: Server,
  socket: AuthenticatedSocket
) => {
  const userId = socket.user!.userId;

  // 1. Room Subscriptions
  socket.on("organization:join", (data, callback) =>
    socketRoomManager.handleJoinOrganization(socket, data, callback)
  );

  socket.on("project:join", (data, callback) =>
    socketRoomManager.handleJoinProject(socket, data, callback)
  );

  socket.on("task:join", (data, callback) =>
    socketRoomManager.handleJoinTask(socket, data, callback)
  );

  socket.on("room:leave", (data, callback) =>
    socketRoomManager.handleLeaveRoom(socket, data, callback)
  );

  // 2. Presence Heartbeat
  socket.on("presence:heartbeat", (data) => {
    try {
      const parsed = presenceHeartbeatSchema.parse(data);
      const { organizationId } = parsed;
      const orgUserKey = `${organizationId}:${userId}`;

      let sockets = userSocketsMap.get(orgUserKey);
      if (!sockets) {
        sockets = new Set<string>();
        userSocketsMap.set(orgUserKey, sockets);
      }

      const wasAlreadyOnline = sockets.size > 0;
      sockets.add(socket.id);

      if (!wasAlreadyOnline) {
        io.to(getOrgRoomName(organizationId)).emit("presence:online", {
          organizationId,
          userId,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      // Ignore invalid heartbeat payload
    }
  });

  // 3. Disconnect & Cleanup
  socket.on("disconnecting", () => {
    logger.debug(
      { socketId: socket.id, userId },
      "Socket disconnecting, cleaning up rooms and presence"
    );

    // Clean up presence in all organizations the socket joined
    for (const [orgUserKey, socketsSet] of userSocketsMap.entries()) {
      if (socketsSet.has(socket.id)) {
        socketsSet.delete(socket.id);

        if (socketsSet.size === 0) {
          userSocketsMap.delete(orgUserKey);
          const [orgId] = orgUserKey.split(":");

          io.to(getOrgRoomName(orgId)).emit("presence:offline", {
            organizationId: orgId,
            userId,
            timestamp: new Date().toISOString(),
          });
        }
      }
    }
  });

  socket.on("disconnect", (reason) => {
    logger.info(
      { socketId: socket.id, userId, reason },
      "Socket disconnected"
    );
  });
};
