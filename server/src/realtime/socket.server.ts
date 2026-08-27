import { Server as HttpServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import Redis from "ioredis";
import { env } from "../config/env.js";
import { getRedisOptions } from "../config/redis.js";
import { authenticateSocket } from "./socket.auth.js";
import { registerSocketEventHandlers } from "./socket.events.js";
import { realtimeEventPublisher } from "./socket.publisher.js";
import { logger } from "../utils/logger.js";

let ioServer: SocketIOServer | null = null;
let pubClient: Redis | null = null;
let subClient: Redis | null = null;

export const initSocketServer = (httpServer: HttpServer): SocketIOServer => {
  if (!ioServer) {
    ioServer = new SocketIOServer(httpServer, {
      cors: {
        origin: env.CLIENT_URL,
        credentials: true,
      },
      pingTimeout: 30000,
      pingInterval: 25000,
    });

    // Redis Adapter Setup for Horizontal Scaling
    try {
      pubClient = new Redis(env.REDIS_URL, getRedisOptions());
      subClient = pubClient.duplicate();

      ioServer.adapter(createAdapter(pubClient, subClient));
      logger.info("Socket.IO Redis Adapter initialized successfully");
    } catch (redisAdapterErr) {
      logger.warn(
        { err: redisAdapterErr },
        "Socket.IO Redis Adapter initialization failed; falling back to single-instance memory adapter"
      );
    }

    // Middleware & Handlers
    ioServer.use(authenticateSocket);

    ioServer.on("connection", (socket) => {
      logger.info(
        { socketId: socket.id, userId: socket.user?.userId },
        "Socket client connected"
      );
      registerSocketEventHandlers(ioServer!, socket);
    });

    // Connect publisher to IO instance
    realtimeEventPublisher.setIO(ioServer);
  }

  return ioServer;
};

export const closeSocketServer = async (): Promise<void> => {
  if (ioServer) {
    logger.info("Closing Socket.IO Server...");
    await ioServer.close();
    ioServer = null;
  }

  if (pubClient) {
    await pubClient.quit().catch(() => {});
    pubClient = null;
  }

  if (subClient) {
    await subClient.quit().catch(() => {});
    subClient = null;
  }
};
