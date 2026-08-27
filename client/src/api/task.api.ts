import { apiClient } from "./axios.js";
import { Task, TaskStatus, TaskPriority, ApiResponse } from "../types/index.js";

export interface ListTasksParams {
  search?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigneeId?: string;
  page?: number;
  limit?: number;
}

export interface CreateTaskParams {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigneeId?: string;
  dueDate?: string;
  labels?: string[];
}

export interface UpdateTaskParams {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigneeId?: string | null;
  dueDate?: string | null;
  labels?: string[];
}

export const taskApi = {
  listTasks: async (
    orgId: string,
    projectId: string,
    params?: ListTasksParams
  ): Promise<{ tasks: Task[]; meta: ApiResponse<unknown>["meta"] }> => {
    const res = await apiClient.get<ApiResponse<Task[]>>(
      `/api/v1/organizations/${orgId}/projects/${projectId}/tasks`,
      { params }
    );
    return {
      tasks: res.data.data,
      meta: res.data.meta,
    };
  },

  createTask: async (
    orgId: string,
    projectId: string,
    params: CreateTaskParams
  ): Promise<Task> => {
    const res = await apiClient.post<ApiResponse<Task>>(
      `/api/v1/organizations/${orgId}/projects/${projectId}/tasks`,
      params
    );
    return res.data.data;
  },

  getTask: async (orgId: string, taskId: string): Promise<Task> => {
    const res = await apiClient.get<ApiResponse<Task>>(
      `/api/v1/organizations/${orgId}/tasks/${taskId}`
    );
    return res.data.data;
  },

  updateTask: async (
    orgId: string,
    taskId: string,
    params: UpdateTaskParams
  ): Promise<Task> => {
    const res = await apiClient.patch<ApiResponse<Task>>(
      `/api/v1/organizations/${orgId}/tasks/${taskId}`,
      params
    );
    return res.data.data;
  },

  moveTaskPosition: async (
    orgId: string,
    taskId: string,
    params: { status: TaskStatus; position: number }
  ): Promise<Task> => {
    const res = await apiClient.patch<ApiResponse<Task>>(
      `/api/v1/organizations/${orgId}/tasks/${taskId}/position`,
      params
    );
    return res.data.data;
  },

  assignTask: async (
    orgId: string,
    taskId: string,
    assigneeId: string
  ): Promise<Task> => {
    const res = await apiClient.post<ApiResponse<Task>>(
      `/api/v1/organizations/${orgId}/tasks/${taskId}/assign`,
      { assigneeId }
    );
    return res.data.data;
  },

  unassignTask: async (orgId: string, taskId: string): Promise<Task> => {
    const res = await apiClient.post<ApiResponse<Task>>(
      `/api/v1/organizations/${orgId}/tasks/${taskId}/unassign`
    );
    return res.data.data;
  },

  deleteTask: async (orgId: string, taskId: string): Promise<void> => {
    await apiClient.delete(`/api/v1/organizations/${orgId}/tasks/${taskId}`);
  },

  restoreTask: async (orgId: string, taskId: string): Promise<Task> => {
    const res = await apiClient.post<ApiResponse<Task>>(
      `/api/v1/organizations/${orgId}/tasks/${taskId}/restore`
    );
    return res.data.data;
  },
};
