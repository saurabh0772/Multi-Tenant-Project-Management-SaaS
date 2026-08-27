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
import { Project } from "../../models/project.model.js";
import { Task } from "../../models/task.model.js";
import { Comment } from "../../models/comment.model.js";
import { Session } from "../../models/session.model.js";
import { hashPassword } from "../../utils/password.js";

let server: http.Server;
let port: number;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let app: any;

describe("Socket Realtime Event Integration Suite", () => {
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
    await Project.deleteMany({});
    await Task.deleteMany({});
    await Comment.deleteMany({});
    await Session.deleteMany({});
    await User.createIndexes();
    await Organization.createIndexes();
    await Membership.createIndexes();
    await Project.createIndexes();
    await Task.createIndexes();
    await Comment.createIndexes();
    await Session.createIndexes();
  });

  it("should receive real-time task:created event when task is created via REST API", async () => {
    const passwordHash = await hashPassword("ValidPassword123!");
    const user = await User.create({
      name: "Event User",
      email: "event.user@example.com",
      passwordHash,
      status: "ACTIVE",
    });

    const org = await Organization.create({
      name: "Event Org",
      slug: "event-org",
      ownerId: user._id,
    });

    await Membership.create({
      userId: user._id,
      organizationId: org._id,
      role: "OWNER",
      status: "ACTIVE",
    });

    const project = await Project.create({
      organizationId: org._id,
      name: "Event Project",
      slug: "event-proj",
      ownerId: user._id,
      createdBy: user._id,
    });

    // Login via REST to get JWT
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const loginRes = await (request(app) as any).post("/api/v1/auth/login").send({
      email: "event.user@example.com",
      password: "ValidPassword123!",
    });
    const token = loginRes.body.data.accessToken;

    const clientSocket: ClientSocket = Client(`http://localhost:${port}`, {
      auth: { token },
      transports: ["websocket"],
    });

    await new Promise<void>((resolve) => {
      clientSocket.on("connect", () => {
        // Join org room
        clientSocket.emit(
          "organization:join",
          { organizationId: org._id.toString() },
          async () => {
            // Listen for task:created
            clientSocket.on("task:created", (payload) => {
              expect(payload.organizationId).toBe(org._id.toString());
              expect(payload.projectId).toBe(project._id.toString());
              expect(payload.task.title).toBe("Realtime Task");

              // Payload security check
              const serialized = JSON.stringify(payload);
              expect(serialized).not.toContain("passwordHash");
              expect(serialized).not.toContain("refreshToken");
              expect(serialized).not.toContain("accessToken");

              clientSocket.disconnect();
              resolve();
            });

            // Perform REST mutation
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (request(app) as any)
              .post(
                `/api/v1/organizations/${org._id.toString()}/projects/${project._id.toString()}/tasks`
              )
              .set("Authorization", `Bearer ${token}`)
              .send({
                title: "Realtime Task",
                priority: "HIGH",
              });
          }
        );
      });
    });
  });

  it("should receive real-time comment:created event when comment is created via REST API", async () => {
    const passwordHash = await hashPassword("ValidPassword123!");
    const user = await User.create({
      name: "Comment User",
      email: "comment.socket@example.com",
      passwordHash,
      status: "ACTIVE",
    });

    const org = await Organization.create({
      name: "Comment Org",
      slug: "comment-org",
      ownerId: user._id,
    });

    await Membership.create({
      userId: user._id,
      organizationId: org._id,
      role: "OWNER",
      status: "ACTIVE",
    });

    const project = await Project.create({
      organizationId: org._id,
      name: "Comment Proj",
      slug: "comment-proj",
      ownerId: user._id,
      createdBy: user._id,
    });

    const task = await Task.create({
      organizationId: org._id,
      projectId: project._id,
      title: "Comment Task",
      createdBy: user._id,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const loginRes = await (request(app) as any).post("/api/v1/auth/login").send({
      email: "comment.socket@example.com",
      password: "ValidPassword123!",
    });
    const token = loginRes.body.data.accessToken;

    const clientSocket: ClientSocket = Client(`http://localhost:${port}`, {
      auth: { token },
      transports: ["websocket"],
    });

    await new Promise<void>((resolve) => {
      clientSocket.on("connect", () => {
        clientSocket.emit(
          "organization:join",
          { organizationId: org._id.toString() },
          async () => {
            clientSocket.on("comment:created", (payload) => {
              expect(payload.organizationId).toBe(org._id.toString());
              expect(payload.taskId).toBe(task._id.toString());
              expect(payload.comment.content).toBe("Socket comment test");

              clientSocket.disconnect();
              resolve();
            });

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (request(app) as any)
              .post(
                `/api/v1/organizations/${org._id.toString()}/tasks/${task._id.toString()}/comments`
              )
              .set("Authorization", `Bearer ${token}`)
              .send({
                content: "Socket comment test",
              });
          }
        );
      });
    });
  });
});
