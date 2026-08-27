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
import { Session } from "../../models/session.model.js";
import { hashPassword } from "../../utils/password.js";

let server: http.Server;
let port: number;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let app: any;

describe("Socket Tenant Isolation Test Suite", () => {
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
    await Session.deleteMany({});
    await User.createIndexes();
    await Organization.createIndexes();
    await Membership.createIndexes();
    await Project.createIndexes();
    await Task.createIndexes();
    await Session.createIndexes();
  });

  it("should never emit Org A domain events to Org B connected socket clients", async () => {
    const passwordHash = await hashPassword("ValidPassword123!");

    // User A in Org A
    const userA = await User.create({
      name: "User A",
      email: "usera.iso@example.com",
      passwordHash,
      status: "ACTIVE",
    });
    const orgA = await Organization.create({
      name: "Org A",
      slug: "org-a-iso",
      ownerId: userA._id,
    });
    await Membership.create({
      userId: userA._id,
      organizationId: orgA._id,
      role: "OWNER",
      status: "ACTIVE",
    });
    const projA = await Project.create({
      organizationId: orgA._id,
      name: "Proj A",
      slug: "proj-a-iso",
      ownerId: userA._id,
      createdBy: userA._id,
    });

    // User B in Org B
    const userB = await User.create({
      name: "User B",
      email: "userb.iso@example.com",
      passwordHash,
      status: "ACTIVE",
    });
    const orgB = await Organization.create({
      name: "Org B",
      slug: "org-b-iso",
      ownerId: userB._id,
    });
    await Membership.create({
      userId: userB._id,
      organizationId: orgB._id,
      role: "OWNER",
      status: "ACTIVE",
    });

    // Login both users
    const loginA = await request(app).post("/api/v1/auth/login").send({
      email: "usera.iso@example.com",
      password: "ValidPassword123!",
    });
    const tokenA = loginA.body.data.accessToken;

    const loginB = await request(app).post("/api/v1/auth/login").send({
      email: "userb.iso@example.com",
      password: "ValidPassword123!",
    });
    const tokenB = loginB.body.data.accessToken;

    const socketA: ClientSocket = Client(`http://localhost:${port}`, {
      auth: { token: tokenA },
      transports: ["websocket"],
    });

    const socketB: ClientSocket = Client(`http://localhost:${port}`, {
      auth: { token: tokenB },
      transports: ["websocket"],
    });

    // Wait for both sockets to connect
    await Promise.all([
      new Promise<void>((resolve) => socketA.on("connect", () => resolve())),
      new Promise<void>((resolve) => socketB.on("connect", () => resolve())),
    ]);

    // Join organization rooms
    await Promise.all([
      new Promise<void>((resolve) =>
        socketA.emit("organization:join", { organizationId: orgA._id.toString() }, resolve)
      ),
      new Promise<void>((resolve) =>
        socketB.emit("organization:join", { organizationId: orgB._id.toString() }, resolve)
      ),
    ]);

    let userBReceivedAnyEvent = false;
    socketB.on("task:created", () => {
      userBReceivedAnyEvent = true;
    });

    await new Promise<void>((resolve) => {
      socketA.on("task:created", (payload) => {
        expect(payload.organizationId).toBe(orgA._id.toString());
        expect(userBReceivedAnyEvent).toBe(false);

        socketA.disconnect();
        socketB.disconnect();
        resolve();
      });

      // Mutate task in Org A via REST
      request(app)
        .post(
          `/api/v1/organizations/${orgA._id.toString()}/projects/${projA._id.toString()}/tasks`
        )
        .set("Authorization", `Bearer ${tokenA}`)
        .send({
          title: "Isolated Task Org A",
        })
        .then(() => {});
    });
  }, 15000);
});
