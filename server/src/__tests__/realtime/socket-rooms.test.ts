import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import http from "http";
import mongoose from "mongoose";
import { io as Client, Socket as ClientSocket } from "socket.io-client";
import { createApp } from "../../app.js";
import { env } from "../../config/env.js";
import { initSocketServer, closeSocketServer } from "../../realtime/socket.server.js";
import { User } from "../../models/user.model.js";
import { Organization } from "../../models/organization.model.js";
import { Membership } from "../../models/membership.model.js";
import { Project } from "../../models/project.model.js";
import { Task } from "../../models/task.model.js";
import { Session } from "../../models/session.model.js";
import { hashPassword } from "../../utils/password.js";
import { generateAccessToken } from "../../utils/jwt.js";

let server: http.Server;
let port: number;

describe("Socket Room Authorization Test Suite", () => {
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
    await Organization.deleteMany({});
    await Membership.deleteMany({});
    await Project.deleteMany({});
    await Task.deleteMany({});
    await Session.deleteMany({});
    await User.createIndexes();
    await Organization.createIndexes();
    await Membership.createIndexes();
    await Project.createIndexes();
    await Task.createIndexes();
    await Session.createIndexes();
  });

  const createTestUser = async (email: string) => {
    const passwordHash = await hashPassword("ValidPassword123!");
    const user = await User.create({
      name: "Test User",
      email,
      passwordHash,
      status: "ACTIVE",
    });
    const session = await Session.create({
      userId: user._id,
      tokenHash: `hash_${Date.now()}_${Math.random()}`,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    const token = generateAccessToken(user._id.toString(), session._id.toString());
    return { user, session, token };
  };

  it("should allow active organization member to join organization room", async () => {
    const { user, token } = await createTestUser("room.user1@example.com");
    const org = await Organization.create({
      name: "Room Org",
      slug: "room-org",
      ownerId: user._id,
    });
    await Membership.create({
      userId: user._id,
      organizationId: org._id,
      role: "OWNER",
      status: "ACTIVE",
    });

    const clientSocket: ClientSocket = Client(`http://localhost:${port}`, {
      auth: { token },
      transports: ["websocket"],
    });

    await new Promise<void>((resolve) => {
      clientSocket.on("connect", () => {
        clientSocket.emit(
          "organization:join",
          { organizationId: org._id.toString() },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (res: any) => {
            expect(res.success).toBe(true);
            expect(res.room).toBe(`org:${org._id.toString()}`);
            clientSocket.disconnect();
            resolve();
          }
        );
      });
    });
  });

  it("should reject non-member from joining organization room", async () => {
    const { token } = await createTestUser("room.user2@example.com");
    const otherUser = await createTestUser("other@example.com");

    const org = await Organization.create({
      name: "Private Org",
      slug: "private-org",
      ownerId: otherUser.user._id,
    });

    const clientSocket: ClientSocket = Client(`http://localhost:${port}`, {
      auth: { token },
      transports: ["websocket"],
    });

    await new Promise<void>((resolve) => {
      clientSocket.on("connect", () => {
        clientSocket.emit(
          "organization:join",
          { organizationId: org._id.toString() },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (res: any) => {
            expect(res.success).toBe(false);
            expect(res.error.code).toBe("MEMBERSHIP_REQUIRED");
            clientSocket.disconnect();
            resolve();
          }
        );
      });
    });
  });

  it("should reject suspended member from joining organization room", async () => {
    const { user, token } = await createTestUser("suspended.socket@example.com");
    const org = await Organization.create({
      name: "Suspended Org",
      slug: "suspended-org",
      ownerId: new mongoose.Types.ObjectId(),
    });
    await Membership.create({
      userId: user._id,
      organizationId: org._id,
      role: "MEMBER",
      status: "SUSPENDED",
    });

    const clientSocket: ClientSocket = Client(`http://localhost:${port}`, {
      auth: { token },
      transports: ["websocket"],
    });

    await new Promise<void>((resolve) => {
      clientSocket.on("connect", () => {
        clientSocket.emit(
          "organization:join",
          { organizationId: org._id.toString() },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (res: any) => {
            expect(res.success).toBe(false);
            expect(res.error.code).toBe("MEMBERSHIP_REQUIRED");
            clientSocket.disconnect();
            resolve();
          }
        );
      });
    });
  });

  it("should allow project room join for valid project in tenant and reject cross-tenant project join", async () => {
    const { user, token } = await createTestUser("proj.room@example.com");
    const orgA = await Organization.create({
      name: "Org A",
      slug: "org-a",
      ownerId: user._id,
    });
    await Membership.create({
      userId: user._id,
      organizationId: orgA._id,
      role: "OWNER",
      status: "ACTIVE",
    });

    const projA = await Project.create({
      organizationId: orgA._id,
      name: "Proj A",
      slug: "proj-a",
      ownerId: user._id,
      createdBy: user._id,
    });

    const orgB = await Organization.create({
      name: "Org B",
      slug: "org-b",
      ownerId: new mongoose.Types.ObjectId(),
    });

    const projB = await Project.create({
      organizationId: orgB._id,
      name: "Proj B",
      slug: "proj-b",
      ownerId: new mongoose.Types.ObjectId(),
      createdBy: new mongoose.Types.ObjectId(),
    });

    const clientSocket: ClientSocket = Client(`http://localhost:${port}`, {
      auth: { token },
      transports: ["websocket"],
    });

    await new Promise<void>((resolve) => {
      clientSocket.on("connect", () => {
        // 1. Join project A in Org A -> Success
        clientSocket.emit(
          "project:join",
          {
            organizationId: orgA._id.toString(),
            projectId: projA._id.toString(),
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (resA: any) => {
            expect(resA.success).toBe(true);

            // 2. Attempt joining project B belonging to Org B using Org A context -> Rejected
            clientSocket.emit(
              "project:join",
              {
                organizationId: orgA._id.toString(),
                projectId: projB._id.toString(),
              },
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (resB: any) => {
                expect(resB.success).toBe(false);
                expect(resB.error.code).toBe("RESOURCE_NOT_FOUND");
                clientSocket.disconnect();
                resolve();
              }
            );
          }
        );
      });
    });
  });
});
