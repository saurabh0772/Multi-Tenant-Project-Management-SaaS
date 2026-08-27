import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useOrganization } from "../../hooks/useOrganization.js";
import { useAuthStore } from "../../store/authStore.js";
import { orgApi } from "../../api/org.api.js";

vi.mock("../../api/org.api.js", () => ({
  orgApi: {
    listOrganizations: vi.fn(),
    createOrganization: vi.fn(),
    updateOrganization: vi.fn(),
  },
}));

describe("Tenant Isolation & Organization Switching Test Suite", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient();
    useAuthStore.setState({
      user: { _id: "u1", name: "Alice", email: "alice@example.com", status: "ACTIVE", createdAt: "2026-01-01" },
      isAuthenticated: true,
      activeOrgId: "orgA",
      userMemberships: [
        { organizationId: "orgA", role: "ADMIN" },
        { organizationId: "orgB", role: "MEMBER" },
      ],
    });
  });

  it("should list available organizations and update activeOrgId when switching tenants", async () => {
    (orgApi.listOrganizations as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        organization: { _id: "orgA", name: "Org Alpha", slug: "org-alpha" },
        role: "ADMIN",
      },
      {
        organization: { _id: "orgB", name: "Org Beta", slug: "org-beta" },
        role: "MEMBER",
      },
    ]);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useOrganization(), { wrapper });

    expect(result.current.activeOrgId).toBe("orgA");

    act(() => {
      result.current.setActiveOrgId("orgB");
    });

    expect(useAuthStore.getState().activeOrgId).toBe("orgB");
  });
});
