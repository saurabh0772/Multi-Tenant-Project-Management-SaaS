import { apiClient } from "./axios.js";
import { ApiResponse } from "../types/index.js";

export interface AnalyticsQueryFilter {
  range?: "7d" | "30d" | "90d" | "custom";
  interval?: "day" | "week" | "month";
  startDate?: string;
  endDate?: string;
  projectId?: string;
  actorId?: string;
  entityType?: string;
  action?: string;
}

export interface OrganizationOverviewDTO {
  projects: { total: number; active: number; completed: number; archived: number };
  tasks: { total: number; completed: number; pending: number; overdue: number };
  members: { total: number; active: number; suspended: number };
  comments: number;
  attachments: number;
}

export interface TaskDistributionDTO {
  statusDistribution: Array<{ status: string; count: number }>;
  priorityDistribution: Array<{ priority: string; count: number }>;
}

export interface TaskTrendDTO {
  interval: string;
  data: Array<{ date: string; created: number; completed: number }>;
}

export interface OverdueTasksDTO {
  total: number;
  byProject: Array<{ projectId: string; projectName: string; count: number }>;
  byAssignee: Array<{ userId: string; name?: string; count: number }>;
  byPriority: Array<{ priority: string; count: number }>;
}

export interface MemberWorkloadItem {
  userId: string;
  name: string;
  email: string;
  avatarUrl?: string;
  role: string;
  assignedTasks: number;
  completedTasks: number;
  pendingTasks: number;
  overdueTasks: number;
}

export interface ProjectHealthItem {
  projectId: string;
  name: string;
  status: string;
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  overdueTasks: number;
  completionRate: number;
}

export interface DashboardAnalyticsDTO {
  summary: OrganizationOverviewDTO;
  taskStatus: Array<{ status: string; count: number }>;
  taskPriority: Array<{ priority: string; count: number }>;
  completionTrend: Array<{ date: string; created: number; completed: number }>;
  projectHealth: ProjectHealthItem[];
  overdueTasks: OverdueTasksDTO;
  memberWorkload: MemberWorkloadItem[];
}

export const analyticsApi = {
  getOverview: async (orgId: string): Promise<OrganizationOverviewDTO> => {
    const { data } = await apiClient.get<ApiResponse<OrganizationOverviewDTO>>(
      `/api/v1/organizations/${orgId}/analytics/overview`
    );
    return data.data;
  },

  getDashboard: async (
    orgId: string,
    filters?: AnalyticsQueryFilter
  ): Promise<DashboardAnalyticsDTO> => {
    const { data } = await apiClient.get<ApiResponse<DashboardAnalyticsDTO>>(
      `/api/v1/organizations/${orgId}/analytics/dashboard`,
      { params: filters }
    );
    return data.data;
  },

  getTasks: async (
    orgId: string,
    filters?: AnalyticsQueryFilter
  ): Promise<TaskDistributionDTO> => {
    const { data } = await apiClient.get<ApiResponse<TaskDistributionDTO>>(
      `/api/v1/organizations/${orgId}/analytics/tasks`,
      { params: filters }
    );
    return data.data;
  },

  getTaskTrends: async (
    orgId: string,
    filters?: AnalyticsQueryFilter
  ): Promise<TaskTrendDTO> => {
    const { data } = await apiClient.get<ApiResponse<TaskTrendDTO>>(
      `/api/v1/organizations/${orgId}/analytics/tasks/trends`,
      { params: filters }
    );
    return data.data;
  },

  getOverdueTasks: async (
    orgId: string,
    filters?: AnalyticsQueryFilter
  ): Promise<OverdueTasksDTO> => {
    const { data } = await apiClient.get<ApiResponse<OverdueTasksDTO>>(
      `/api/v1/organizations/${orgId}/analytics/tasks/overdue`,
      { params: filters }
    );
    return data.data;
  },

  getMemberWorkload: async (orgId: string): Promise<{ members: MemberWorkloadItem[] }> => {
    const { data } = await apiClient.get<ApiResponse<{ members: MemberWorkloadItem[] }>>(
      `/api/v1/organizations/${orgId}/analytics/members/workload`
    );
    return data.data;
  },

  getProjects: async (orgId: string): Promise<{ projects: ProjectHealthItem[] }> => {
    const { data } = await apiClient.get<ApiResponse<{ projects: ProjectHealthItem[] }>>(
      `/api/v1/organizations/${orgId}/analytics/projects`
    );
    return data.data;
  },
};
