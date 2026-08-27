import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ProjectDetailsPage } from "../../pages/projects/ProjectDetailsPage.js";
import { projectApi } from "../../api/project.api.js";
import { taskApi } from "../../api/task.api.js";

vi.mock("../../api/project.api.js", () => ({
  projectApi: {
    getProject: vi.fn(),
  },
}));

vi.mock("../../api/task.api.js", () => ({
  taskApi: {
    listTasks: vi.fn(),
    createTask: vi.fn(),
    moveTaskPosition: vi.fn(),
  },
}));

vi.mock("../../api/org.api.js", () => ({
  orgApi: {
    listMembers: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock("../../hooks/useOrganization.js", () => ({
  useOrganization: () => ({
    activeOrg: { _id: "org1", name: "Test Org", slug: "test-org" },
    activeRole: "ADMIN",
    hasPermission: () => true,
  }),
}));

describe("Kanban Task Board Test Suite", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  });

  it("should render 4 Kanban columns (To Do, In Progress, In Review, Done)", async () => {
    (projectApi.getProject as ReturnType<typeof vi.fn>).mockResolvedValue({
      _id: "p1",
      name: "Kanban Project",
      status: "ACTIVE",
    });

    (taskApi.listTasks as ReturnType<typeof vi.fn>).mockResolvedValue({
      tasks: [
        {
          _id: "t1",
          organizationId: "org1",
          projectId: "p1",
          title: "Build Kanban Board",
          status: "TODO",
          priority: "HIGH",
          position: 1,
          createdBy: "u1",
          createdAt: "2026-01-01",
        },
      ],
      meta: {},
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/projects/p1"]}>
          <Routes>
            <Route path="/projects/:projectId" element={<ProjectDetailsPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("To Do")).toBeDefined();
      expect(screen.getByText("In Progress")).toBeDefined();
      expect(screen.getByText("In Review")).toBeDefined();
      expect(screen.getByText("Done")).toBeDefined();
      expect(screen.getByText("Build Kanban Board")).toBeDefined();
    });
  });
});
