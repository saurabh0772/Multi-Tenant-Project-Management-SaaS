import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AnalyticsPage } from "../../pages/analytics/AnalyticsPage.js";
import { analyticsApi } from "../../api/analytics.api.js";
import { projectApi } from "../../api/project.api.js";
import { useOrganization } from "../../hooks/useOrganization.js";

vi.mock("../../api/analytics.api.js", () => ({
  analyticsApi: {
    getDashboard: vi.fn(),
    getOverview: vi.fn(),
  },
}));

vi.mock("../../api/project.api.js", () => ({
  projectApi: {
    listProjects: vi.fn(),
  },
}));

vi.mock("../../hooks/useOrganization.js", () => ({
  useOrganization: vi.fn(),
}));

describe("Phase 12 — Frontend Analytics & Dashboard Test Suite", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    (useOrganization as ReturnType<typeof vi.fn>).mockReturnValue({
      activeOrg: { _id: "org1", name: "Test Org", slug: "test-org" },
      activeRole: "ADMIN",
      hasPermission: (perm: string) => perm === "ANALYTICS_READ",
    });

    (projectApi.listProjects as ReturnType<typeof vi.fn>).mockResolvedValue({
      projects: [{ _id: "p1", name: "Project Alpha" }],
    });
  });

  it("should render Analytics summary cards, charts, project health, and member workload", async () => {
    (analyticsApi.getDashboard as ReturnType<typeof vi.fn>).mockResolvedValue({
      summary: {
        projects: { total: 5, active: 3, completed: 1, archived: 1 },
        tasks: { total: 20, completed: 10, pending: 8, overdue: 2 },
        members: { total: 4, active: 4, suspended: 0 },
        comments: 15,
        attachments: 3,
      },
      taskStatus: [
        { status: "TODO", count: 4 },
        { status: "IN_PROGRESS", count: 4 },
        { status: "IN_REVIEW", count: 2 },
        { status: "DONE", count: 10 },
      ],
      taskPriority: [
        { priority: "LOW", count: 5 },
        { priority: "MEDIUM", count: 10 },
        { priority: "HIGH", count: 4 },
        { priority: "URGENT", count: 1 },
      ],
      completionTrend: [{ date: "2026-08-01", created: 5, completed: 3 }],
      projectHealth: [
        {
          projectId: "p1",
          name: "Project Alpha",
          status: "ACTIVE",
          totalTasks: 10,
          completedTasks: 5,
          pendingTasks: 5,
          overdueTasks: 1,
          completionRate: 50,
        },
      ],
      overdueTasks: { total: 2, byProject: [], byAssignee: [], byPriority: [] },
      memberWorkload: [
        {
          userId: "u1",
          name: "Alice",
          email: "alice@example.com",
          role: "ADMIN",
          assignedTasks: 5,
          completedTasks: 3,
          pendingTasks: 2,
          overdueTasks: 1,
        },
      ],
    });

    render(
      <QueryClientProvider client={queryClient}>
        <AnalyticsPage />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("Analytics & SaaS Insights")).toBeDefined();
      expect(screen.getAllByText("Project Alpha").length).toBeGreaterThan(0);
      expect(screen.getByText("Alice")).toBeDefined();
      expect(screen.getByText("50%")).toBeDefined();
    });
  });

  it("should update query parameters when preset filter buttons are clicked", async () => {
    (analyticsApi.getDashboard as ReturnType<typeof vi.fn>).mockResolvedValue({
      summary: {
        projects: { total: 0, active: 0, completed: 0, archived: 0 },
        tasks: { total: 0, completed: 0, pending: 0, overdue: 0 },
        members: { total: 0, active: 0, suspended: 0 },
        comments: 0,
        attachments: 0,
      },
      taskStatus: [],
      taskPriority: [],
      completionTrend: [],
      projectHealth: [],
      overdueTasks: { total: 0, byProject: [], byAssignee: [], byPriority: [] },
      memberWorkload: [],
    });

    render(
      <QueryClientProvider client={queryClient}>
        <AnalyticsPage />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("7d")).toBeDefined();
    });

    fireEvent.click(screen.getByText("7d"));

    await waitFor(() => {
      expect(analyticsApi.getDashboard).toHaveBeenCalledWith(
        "org1",
        expect.objectContaining({ range: "7d" })
      );
    });
  });

  it("should render Access Restricted alert when user lacks ANALYTICS_READ permission", () => {
    (useOrganization as ReturnType<typeof vi.fn>).mockReturnValue({
      activeOrg: { _id: "org1", name: "Test Org", slug: "test-org" },
      activeRole: "MEMBER",
      hasPermission: () => false,
    });

    render(
      <QueryClientProvider client={queryClient}>
        <AnalyticsPage />
      </QueryClientProvider>
    );

    expect(screen.getByText("Access Restricted")).toBeDefined();
  });
});
