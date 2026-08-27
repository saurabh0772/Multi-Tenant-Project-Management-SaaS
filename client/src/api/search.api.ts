import { apiClient } from "./axios.js";

export interface SearchFilters {
  q?: string;
  type?: "all" | "projects" | "tasks" | "comments" | "members";
  projectId?: string;
  status?: string;
  priority?: string;
  assignedTo?: string;
  createdBy?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
}

export interface ProjectSearchResult {
  id: string;
  type: "project";
  name: string;
  slug: string;
  status: string;
  description?: string;
  score?: number;
}

export interface TaskSearchResult {
  id: string;
  type: "task";
  title: string;
  status: string;
  priority: string;
  projectId: string;
  description?: string;
  score?: number;
}

export interface CommentSearchResult {
  id: string;
  type: "comment";
  content: string;
  taskId: string;
  score?: number;
}

export interface MemberSearchResult {
  id: string;
  type: "member";
  name: string;
  email: string;
  avatarUrl: string | null;
  score?: number;
}

export interface SearchResponse {
  projects: ProjectSearchResult[];
  tasks: TaskSearchResult[];
  comments: CommentSearchResult[];
  members: MemberSearchResult[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

export const searchApi = {
  search: async (
    orgId: string,
    params?: SearchFilters
  ): Promise<SearchResponse> => {
    const res = await apiClient.get<{ success: boolean; data: SearchResponse }>(
      `/organizations/${orgId}/search`,
      { params }
    );
    return res.data.data;
  },
};
