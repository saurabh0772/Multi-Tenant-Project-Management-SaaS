import { apiClient } from "./axios.js";
import { Attachment, ApiResponse } from "../types/index.js";

export const attachmentApi = {
  uploadAttachment: async (
    orgId: string,
    file: File,
    parent: { taskId?: string; commentId?: string }
  ): Promise<Attachment> => {
    const formData = new FormData();
    formData.append("file", file);
    if (parent.taskId) formData.append("taskId", parent.taskId);
    if (parent.commentId) formData.append("commentId", parent.commentId);

    const res = await apiClient.post<ApiResponse<Attachment>>(
      `/api/v1/organizations/${orgId}/attachments`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return res.data.data;
  },

  getDownloadUrl: (orgId: string, attachmentId: string): string => {
    const baseURL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
    return `${baseURL}/api/v1/organizations/${orgId}/attachments/${attachmentId}/download`;
  },

  deleteAttachment: async (
    orgId: string,
    attachmentId: string
  ): Promise<void> => {
    await apiClient.delete(
      `/api/v1/organizations/${orgId}/attachments/${attachmentId}`
    );
  },
};
