import { io, Socket } from "socket.io-client";
import { getAccessToken } from "../api/axios.js";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

class SocketClientManager {
  private socket: Socket | null = null;
  private currentOrgId: string | null = null;

  public connect(): Socket {
    const token = getAccessToken();

    if (this.socket && this.socket.connected) {
      return this.socket;
    }

    if (this.socket) {
      this.socket.disconnect();
    }

    this.socket = io(SOCKET_URL, {
      auth: { token },
      transports: ["websocket"],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    this.socket.on("connect", () => {
      if (this.currentOrgId) {
        this.joinOrganization(this.currentOrgId);
      }
    });

    return this.socket;
  }

  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.currentOrgId = null;
  }

  public getSocket(): Socket | null {
    return this.socket;
  }

  public joinOrganization(organizationId: string): void {
    this.currentOrgId = organizationId;
    if (this.socket && this.socket.connected) {
      this.socket.emit("organization:join", { organizationId }, (res: { success: boolean; error?: unknown }) => {
        if (!res?.success) {
          // console.warn("Failed to join organization room:", res?.error);
        }
      });
      this.sendHeartbeat(organizationId);
    }
  }

  public joinProject(organizationId: string, projectId: string): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit("project:join", { organizationId, projectId });
    }
  }

  public joinTask(organizationId: string, taskId: string): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit("task:join", { organizationId, taskId });
    }
  }

  public leaveRoom(room: string): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit("room:leave", { room });
    }
  }

  public sendHeartbeat(organizationId: string): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit("presence:heartbeat", { organizationId });
    }
  }
}

export const socketClientManager = new SocketClientManager();
