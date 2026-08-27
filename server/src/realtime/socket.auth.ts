import { verifyAccessToken } from "../utils/jwt.js";
import { sessionRepository } from "../repositories/session.repository.js";
import { AuthenticatedSocket, SocketErrorPayload } from "./socket.types.js";
import { logger } from "../utils/logger.js";

export const authenticateSocket = async (
  socket: AuthenticatedSocket,
  next: (err?: Error) => void
): Promise<void> => {
  try {
    // 1. Extract Bearer token from auth payload or authorization header
    let token = socket.handshake.auth?.token;
    if (!token && socket.handshake.headers?.authorization) {
      const authHeader = socket.handshake.headers.authorization;
      if (authHeader.startsWith("Bearer ")) {
        token = authHeader.substring(7);
      }
    }

    if (!token) {
      const errorPayload: SocketErrorPayload = {
        code: "UNAUTHORIZED",
        message: "Authentication token required",
      };
      return next(new Error(JSON.stringify(errorPayload)));
    }

    // 2. Verify JWT signature & expiration using Phase 03 helper
    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (jwtErr) {
      const errorPayload: SocketErrorPayload = {
        code: "INVALID_TOKEN",
        message: "Invalid or expired access token",
      };
      return next(new Error(JSON.stringify(errorPayload)));
    }

    // 3. Verify session state in database (Phase 03 compatibility)
    const session = await sessionRepository.findSessionById(decoded.sessionId);
    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      const errorPayload: SocketErrorPayload = {
        code: "SESSION_INVALID",
        message: "Session is invalid, expired, or revoked",
      };
      return next(new Error(JSON.stringify(errorPayload)));
    }

    // 4. Attach verified user context to socket
    socket.user = {
      userId: decoded.sub,
      sessionId: decoded.sessionId,
    };

    logger.debug(
      { socketId: socket.id, userId: decoded.sub },
      "Socket connection authenticated successfully"
    );

    next();
  } catch (error) {
    logger.error({ error }, "Socket authentication failed unexpected error");
    const errorPayload: SocketErrorPayload = {
      code: "UNAUTHORIZED",
      message: "Socket authentication failed",
    };
    next(new Error(JSON.stringify(errorPayload)));
  }
};
