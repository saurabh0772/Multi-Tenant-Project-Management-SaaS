import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { GlobalSearch } from "../../features/search/GlobalSearch.js";
import { searchApi } from "../../api/search.api.js";

vi.mock("../../api/search.api.js", () => ({
  searchApi: {
    search: vi.fn(),
  },
}));

vi.mock("../../hooks/useOrganization.js", () => ({
  useOrganization: () => ({
    activeOrg: { _id: "org-test-123", name: "Test Workspace", slug: "test-workspace" },
    activeRole: "ADMIN",
    hasPermission: () => true,
  }),
}));

describe("Global Search & Command Palette UI Test Suite", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  });

  it("should render global search trigger button", () => {
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <GlobalSearch />
        </BrowserRouter>
      </QueryClientProvider>
    );

    expect(screen.getByText("Search workspace...")).toBeDefined();
  });

  it("should open command palette modal when search button is clicked", () => {
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <GlobalSearch />
        </BrowserRouter>
      </QueryClientProvider>
    );

    const triggerBtn = screen.getByTitle("Search workspace (Cmd+K)");
    fireEvent.click(triggerBtn);

    expect(
      screen.getByPlaceholderText("Search projects, tasks, comments, or members...")
    ).toBeDefined();
  });

  it("should execute debounced search and render grouped results", async () => {
    (searchApi.search as ReturnType<typeof vi.fn>).mockResolvedValue({
      projects: [
        {
          id: "proj1",
          type: "project",
          name: "Alpha Project",
          slug: "alpha-project",
          status: "ACTIVE",
          score: 100,
        },
      ],
      tasks: [
        {
          id: "task1",
          type: "task",
          title: "Alpha Task",
          status: "TODO",
          priority: "HIGH",
          projectId: "proj1",
          score: 75,
        },
      ],
      comments: [],
      members: [],
      pagination: { page: 1, limit: 20, total: 2 },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <GlobalSearch />
        </BrowserRouter>
      </QueryClientProvider>
    );

    // Open modal
    fireEvent.click(screen.getByTitle("Search workspace (Cmd+K)"));

    // Type query "Alpha"
    const input = screen.getByPlaceholderText(
      "Search projects, tasks, comments, or members..."
    );
    fireEvent.change(input, { target: { value: "Alpha" } });

    // Wait for debounced search API trigger
    await waitFor(() => {
      expect(searchApi.search).toHaveBeenCalledWith("org-test-123", {
        q: "Alpha",
        type: "all",
      });
      expect(screen.getByText("Alpha Project")).toBeDefined();
      expect(screen.getByText("Alpha Task")).toBeDefined();
    });
  });
});
