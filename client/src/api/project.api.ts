import { apiClient } from "./axios.js";
import { Project, ProjectStatus, ApiResponse } from "../types/index.js";

export interface ListProjectsParams {
  search?: string;
  status?: ProjectStatus;
  page?: number;
  limit?: number;
}

export interface CreateProjectParams {
  name: string;
  slug?: string;
  description?: string;
  ownerId?: string;
  memberIds?: string[];
  status?: ProjectStatus;
  startDate?: string;
  dueDate?: string;
}

export interface UpdateProjectParams {
  name?: string;
  slug?: string;
  description?: string;
  ownerId?: string;
  memberIds?: string[];
  status?: ProjectStatus;
  startDate?: string;
  dueDate?: string;
}

export const projectApi = {
  listProjects: async (
    orgId: string,
    params?: ListProjectsParams
  ): Promise<{ projects: Project[]; meta: ApiResponse<unknown>["meta"] }> => {
    const res = await apiClient.get<ApiResponse<Project[]>>(
      `/organizations/${orgId}/projects`,
      { params }
    );
    return {
      projects: res.data.data,
      meta: res.data.meta,
    };
  },

  createProject: async (
    orgId: string,
    params: CreateProjectParams
  ): Promise<Project> => {
    const res = await apiClient.post<ApiResponse<Project>>(
      `/organizations/${orgId}/projects`,
      params
    );
    return res.data.data;
  },

  getProject: async (orgId: string, projectId: string): Promise<Project> => {
    const res = await apiClient.get<ApiResponse<Project>>(
      `/organizations/${orgId}/projects/${projectId}`
    );
    return res.data.data;
  },

  updateProject: async (
    orgId: string,
    projectId: string,
    params: UpdateProjectParams
  ): Promise<Project> => {
    const res = await apiClient.patch<ApiResponse<Project>>(
      `/organizations/${orgId}/projects/${projectId}`,
      params
    );
    return res.data.data;
  },

  archiveProject: async (orgId: string, projectId: string): Promise<Project> => {
    const res = await apiClient.post<ApiResponse<Project>>(
      `/organizations/${orgId}/projects/${projectId}/archive`
    );
    return res.data.data;
  },

  restoreProject: async (orgId: string, projectId: string): Promise<Project> => {
    const res = await apiClient.post<ApiResponse<Project>>(
      `/organizations/${orgId}/projects/${projectId}/restore`
    );
    return res.data.data;
  },

  deleteProject: async (orgId: string, projectId: string): Promise<void> => {
    await apiClient.delete(
      `/organizations/${orgId}/projects/${projectId}`
    );
  },
};
