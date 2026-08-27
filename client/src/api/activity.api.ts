import { apiClient } from "./axios.js";
import { Activity, ApiResponse } from "../types/index.js";

export interface ListActivitiesParams {
  projectId?: string;
  taskId?: string;
  page?: number;
  limit?: number;
}

export const activityApi = {
  listActivities: async (
    orgId: string,
    params?: ListActivitiesParams
  ): Promise<{ activities: Activity[]; meta: ApiResponse<unknown>["meta"] }> => {
    const res = await apiClient.get<ApiResponse<Activity[]>>(
      `/api/v1/organizations/${orgId}/activities`,
      { params }
    );
    return {
      activities: res.data.data,
      meta: res.data.meta,
    };
  },
};
