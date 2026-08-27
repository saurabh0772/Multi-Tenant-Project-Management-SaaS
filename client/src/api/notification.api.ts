import { apiClient } from "./axios.js";
import { Notification, ApiResponse } from "../types/index.js";

export interface ListNotificationsParams {
  unreadOnly?: boolean;
  page?: number;
  limit?: number;
}

export const notificationApi = {
  listNotifications: async (
    orgId: string,
    params?: ListNotificationsParams
  ): Promise<{ notifications: Notification[]; meta: ApiResponse<unknown>["meta"] }> => {
    const res = await apiClient.get<ApiResponse<Notification[]>>(
      `/api/v1/organizations/${orgId}/notifications`,
      { params }
    );
    return {
      notifications: res.data.data,
      meta: res.data.meta,
    };
  },

  getUnreadCount: async (orgId: string): Promise<number> => {
    const res = await apiClient.get<ApiResponse<{ unreadCount: number }>>(
      `/api/v1/organizations/${orgId}/notifications/unread-count`
    );
    return res.data.data.unreadCount;
  },

  markRead: async (
    orgId: string,
    notificationId: string
  ): Promise<Notification> => {
    const res = await apiClient.patch<ApiResponse<Notification>>(
      `/api/v1/organizations/${orgId}/notifications/${notificationId}/read`
    );
    return res.data.data;
  },

  markAllRead: async (orgId: string): Promise<{ count: number }> => {
    const res = await apiClient.patch<ApiResponse<{ count: number }>>(
      `/api/v1/organizations/${orgId}/notifications/read-all`
    );
    return res.data.data;
  },
};
