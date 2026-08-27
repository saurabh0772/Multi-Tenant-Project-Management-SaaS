import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useSocket } from "../../hooks/useSocket.js";
import { socketClientManager } from "../../lib/socket-client.js";

const mockSocketOn = vi.fn();
const mockSocketOff = vi.fn();

vi.mock("../../lib/socket-client.js", () => ({
  socketClientManager: {
    connect: vi.fn().mockReturnValue({
      on: (...args: unknown[]) => mockSocketOn(...args),
      off: (...args: unknown[]) => mockSocketOff(...args),
      connected: true,
    }),
    disconnect: vi.fn(),
    joinOrganization: vi.fn(),
    sendHeartbeat: vi.fn(),
    getSocket: vi.fn().mockReturnValue({ connected: true }),
  },
}));

vi.mock("../../store/authStore.js", () => ({
  useAuthStore: () => ({
    isAuthenticated: true,
    activeOrgId: "org123",
  }),
}));

describe("Real-Time Socket.IO Hook Test Suite", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient();
  });

  it("should subscribe to domain events on mount and join organization room", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    renderHook(() => useSocket(), { wrapper });

    expect(socketClientManager.connect).toHaveBeenCalled();
    expect(socketClientManager.joinOrganization).toHaveBeenCalledWith("org123");
    expect(mockSocketOn).toHaveBeenCalledWith("task:created", expect.any(Function));
    expect(mockSocketOn).toHaveBeenCalledWith("comment:created", expect.any(Function));
    expect(mockSocketOn).toHaveBeenCalledWith("notification:created", expect.any(Function));
  });
});
