import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import http from "http";
import mongoose from "mongoose";
import { io as Client, Socket as ClientSocket } from "socket.io-client";
import { createApp } from "../../app.js";
import { env } from "../../config/env.js";
import { initSocketServer, closeSocketServer } from "../../realtime/socket.server.js";
import { User } from "../../models/user.model.js";
import { Session } from "../../models/session.model.js";
import { hashPassword } from "../../utils/password.js";
import { generateAccessToken } from "../../utils/jwt.js";

let server: http.Server;
let port: number;

describe("Socket Authentication Test Suite", () => {
  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(env.MONGODB_TEST_URI);
    }
    const app = createApp();
    server = http.createServer(app);
    initSocketServer(server);

    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        port = (server.address() as any).port;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await closeSocketServer();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await mongoose.disconnect();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await Session.deleteMany({});
    await User.createIndexes();
    await Session.createIndexes();
  });

  it("should successfully authenticate socket with a valid JWT access token", async () => {
    const passwordHash = await hashPassword("ValidPassword123!");
    const user = await User.create({
      name: "Socket Auth User",
      email: "socket.auth@example.com",
      passwordHash,
      status: "ACTIVE",
    });

    const session = await Session.create({
      userId: user._id,
      tokenHash: "hash123_valid",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    const token = generateAccessToken(user._id.toString(), session._id.toString());

    const clientSocket: ClientSocket = Client(`http://localhost:${port}`, {
      auth: { token },
      transports: ["websocket"],
    });

    await new Promise<void>((resolve, reject) => {
      clientSocket.on("connect", () => {
        expect(clientSocket.connected).toBe(true);
        clientSocket.disconnect();
        resolve();
      });
      clientSocket.on("connect_error", (err) => reject(err));
    });
  });

  it("should reject connection when authentication token is missing", async () => {
    const clientSocket: ClientSocket = Client(`http://localhost:${port}`, {
      transports: ["websocket"],
    });

    await new Promise<void>((resolve) => {
      clientSocket.on("connect_error", (err) => {
        expect(err.message).toContain("UNAUTHORIZED");
        clientSocket.disconnect();
        resolve();
      });
    });
  });

  it("should reject connection when token is invalid or corrupted", async () => {
    const clientSocket: ClientSocket = Client(`http://localhost:${port}`, {
      auth: { token: "invalid.jwt.token" },
      transports: ["websocket"],
    });

    await new Promise<void>((resolve) => {
      clientSocket.on("connect_error", (err) => {
        expect(err.message).toContain("INVALID_TOKEN");
        clientSocket.disconnect();
        resolve();
      });
    });
  });

  it("should reject connection when session is revoked or expired in database", async () => {
    const passwordHash = await hashPassword("ValidPassword123!");
    const user = await User.create({
      name: "Revoked Session User",
      email: "revoked.session@example.com",
      passwordHash,
      status: "ACTIVE",
    });

    // Revoked session
    const session = await Session.create({
      userId: user._id,
      tokenHash: "hash123_revoked",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      revokedAt: new Date(),
    });

    const token = generateAccessToken(user._id.toString(), session._id.toString());

    const clientSocket: ClientSocket = Client(`http://localhost:${port}`, {
      auth: { token },
      transports: ["websocket"],
    });

    await new Promise<void>((resolve) => {
      clientSocket.on("connect_error", (err) => {
        expect(err.message).toContain("SESSION_INVALID");
        clientSocket.disconnect();
        resolve();
      });
    });
  });
});
