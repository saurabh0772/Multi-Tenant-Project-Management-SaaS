import { apiClient } from "./axios.js";
import { Comment, ApiResponse } from "../types/index.js";

export const commentApi = {
  listComments: async (
    orgId: string,
    taskId: string,
    params?: { page?: number; limit?: number }
  ): Promise<{ comments: Comment[]; meta: ApiResponse<unknown>["meta"] }> => {
    const res = await apiClient.get<ApiResponse<Comment[]>>(
      `/organizations/${orgId}/tasks/${taskId}/comments`,
      { params }
    );
    return {
      comments: res.data.data,
      meta: res.data.meta,
    };
  },

  createComment: async (
    orgId: string,
    taskId: string,
    content: string
  ): Promise<Comment> => {
    const res = await apiClient.post<ApiResponse<Comment>>(
      `/organizations/${orgId}/tasks/${taskId}/comments`,
      { content }
    );
    return res.data.data;
  },

  updateComment: async (
    orgId: string,
    commentId: string,
    content: string
  ): Promise<Comment> => {
    const res = await apiClient.patch<ApiResponse<Comment>>(
      `/organizations/${orgId}/comments/${commentId}`,
      { content }
    );
    return res.data.data;
  },

  deleteComment: async (orgId: string, commentId: string): Promise<void> => {
    await apiClient.delete(
      `/organizations/${orgId}/comments/${commentId}`
    );
  },
};
