import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import http from "http";
import mongoose from "mongoose";
import request from "supertest";
import { io as Client, Socket as ClientSocket } from "socket.io-client";
import { createApp } from "../../app.js";
import { env } from "../../config/env.js";
import { initSocketServer, closeSocketServer } from "../../realtime/socket.server.js";
import { User } from "../../models/user.model.js";
import { Organization } from "../../models/organization.model.js";
import { Membership } from "../../models/membership.model.js";
import { Session } from "../../models/session.model.js";
import { hashPassword } from "../../utils/password.js";

let server: http.Server;
let port: number;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let app: any;

describe("Socket Presence Foundation Test Suite", () => {
  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(env.MONGODB_TEST_URI);
    }
    app = createApp();
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
    await Organization.deleteMany({});
    await Membership.deleteMany({});
    await Session.deleteMany({});
    await User.createIndexes();
    await Organization.createIndexes();
    await Membership.createIndexes();
    await Session.createIndexes();
  });

  it("should handle presence online and offline events across multi-tab user connections", async () => {
    const passwordHash = await hashPassword("ValidPassword123!");
    const user = await User.create({
      name: "Presence User",
      email: "presence@example.com",
      passwordHash,
      status: "ACTIVE",
    });

    const org = await Organization.create({
      name: "Presence Org",
      slug: "presence-org",
      ownerId: user._id,
    });

    await Membership.create({
      userId: user._id,
      organizationId: org._id,
      role: "OWNER",
      status: "ACTIVE",
    });

    const loginRes = await request(app).post("/api/v1/auth/login").send({
      email: "presence@example.com",
      password: "ValidPassword123!",
    });
    const token = loginRes.body.data.accessToken;

    const socketClient: ClientSocket = Client(`http://localhost:${port}`, {
      auth: { token },
      transports: ["websocket"],
    });

    await new Promise<void>((resolve) => {
      socketClient.on("connect", () => {
        socketClient.emit(
          "organization:join",
          { organizationId: org._id.toString() },
          () => {
            socketClient.on("presence:online", (onlineData) => {
              expect(onlineData.userId).toBe(user._id.toString());
              expect(onlineData.organizationId).toBe(org._id.toString());

              socketClient.disconnect();
              resolve();
            });

            // Emit heartbeat to trigger online status
            socketClient.emit("presence:heartbeat", {
              organizationId: org._id.toString(),
            });
          }
        );
      });
    });
  });
});
