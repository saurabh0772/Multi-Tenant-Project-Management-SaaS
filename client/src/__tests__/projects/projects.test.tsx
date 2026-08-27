import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { ProjectsPage } from "../../pages/projects/ProjectsPage.js";
import { projectApi } from "../../api/project.api.js";

vi.mock("../../api/project.api.js", () => ({
  projectApi: {
    listProjects: vi.fn(),
    createProject: vi.fn(),
    archiveProject: vi.fn(),
    restoreProject: vi.fn(),
    deleteProject: vi.fn(),
  },
}));

vi.mock("../../hooks/useOrganization.js", () => ({
  useOrganization: () => ({
    activeOrg: { _id: "org1", name: "Test Org", slug: "test-org" },
    activeRole: "ADMIN",
    hasPermission: () => true,
  }),
}));

describe("Projects UI Test Suite", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  });

  it("should render projects list returned from API", async () => {
    (projectApi.listProjects as ReturnType<typeof vi.fn>).mockResolvedValue({
      projects: [
        {
          _id: "p1",
          organizationId: "org1",
          name: "Mobile App",
          slug: "mobile-app",
          description: "Mobile design",
          status: "ACTIVE",
          ownerId: "u1",
          createdBy: "u1",
          createdAt: "2026-01-01",
        },
      ],
      meta: {},
    });

    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <ProjectsPage />
        </BrowserRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("Mobile App")).toBeDefined();
    });
  });
});
