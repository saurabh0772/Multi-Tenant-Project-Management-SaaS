import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MembersPage } from "../../pages/members/MembersPage.js";
import { OrganizationSettingsPage } from "../../pages/settings/OrganizationSettingsPage.js";
import { orgApi } from "../../api/org.api.js";

vi.mock("../../api/org.api.js", () => ({
  orgApi: {
    listMembers: vi.fn(),
    listInvitations: vi.fn().mockResolvedValue([]),
    updateOrganization: vi.fn(),
    transferOwnership: vi.fn(),
  },
}));

vi.mock("../../hooks/useOrganization.js", () => ({
  useOrganization: () => ({
    activeOrg: { _id: "org1", name: "Test Org", slug: "test-org" },
    activeRole: "ADMIN",
    hasPermission: (perm: string) => perm !== "ORGANIZATION_DELETE",
  }),
}));

describe("Frontend RBAC & Role Consistency Test Suite", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  });

  it("should enforce that VIEWER role is absent from members role update dropdown", async () => {
    (orgApi.listMembers as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        _id: "mem1",
        userId: { _id: "u1", name: "Bob", email: "bob@example.com" },
        organizationId: "org1",
        role: "MEMBER",
        status: "ACTIVE",
        joinedAt: "2026-01-01",
      },
    ]);

    render(
      <QueryClientProvider client={queryClient}>
        <MembersPage />
      </QueryClientProvider>
    );

    const selects = await screen.findAllByRole("combobox");
    const roleSelect = selects[0]; // First combobox is Role
    const options = Array.from(roleSelect.querySelectorAll("option")).map(
      (opt) => opt.value
    );

    expect(options).toContain("ADMIN");
    expect(options).toContain("MANAGER");
    expect(options).toContain("MEMBER");
    expect(options).not.toContain("VIEWER");
    expect(options).not.toContain("OWNER");
  });

  it("should hide ownership transfer controls for non-OWNER users", () => {
    render(
      <QueryClientProvider client={queryClient}>
        <OrganizationSettingsPage />
      </QueryClientProvider>
    );

    expect(screen.queryByText("Transfer Ownership")).toBeNull();
  });
});
