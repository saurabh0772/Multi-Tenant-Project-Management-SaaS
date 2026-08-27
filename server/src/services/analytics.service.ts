import { Types } from "mongoose";
import { analyticsRepository } from "../repositories/analytics.repository.js";
import { Project } from "../models/project.model.js";
import { AppError } from "../utils/AppError.js";
import { AnalyticsQueryInput } from "../validators/analytics.schema.js";

export class AnalyticsService {
  private parseDateRange(input: AnalyticsQueryInput) {
    const now = new Date();

    if (input.range === "7d") {
      const startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return { startDate, endDate: now };
    }

    if (input.range === "90d") {
      const startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      return { startDate, endDate: now };
    }

    if (input.range === "custom" && input.startDate && input.endDate) {
      return {
        startDate: new Date(input.startDate),
        endDate: new Date(input.endDate),
      };
    }

    // Default 30d
    const startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    return { startDate, endDate: now };
  }

  private async verifyProjectBelongsToOrg(
    organizationId: Types.ObjectId,
    projectId: Types.ObjectId
  ) {
    const project = await Project.findOne({
      _id: projectId,
      organizationId,
    });

    if (!project) {
      throw new AppError("Project not found within this organization", 404, "RESOURCE_NOT_FOUND");
    }

    return project;
  }

  async getOverview(organizationId: string) {
    const orgId = new Types.ObjectId(organizationId);
    return analyticsRepository.getOrganizationOverview(orgId);
  }

  async getDashboard(organizationId: string, queryInput: AnalyticsQueryInput) {
    const orgId = new Types.ObjectId(organizationId);
    const { startDate, endDate } = this.parseDateRange(queryInput);
    return analyticsRepository.getDashboardAnalytics(orgId, startDate, endDate);
  }

  async getTasks(organizationId: string, queryInput: AnalyticsQueryInput) {
    const orgId = new Types.ObjectId(organizationId);
    const { startDate, endDate } = this.parseDateRange(queryInput);

    let projObjectId: Types.ObjectId | undefined;
    if (queryInput.projectId) {
      projObjectId = new Types.ObjectId(queryInput.projectId);
      await this.verifyProjectBelongsToOrg(orgId, projObjectId);
    }

    return analyticsRepository.getTaskAnalytics(orgId, startDate, endDate, projObjectId);
  }

  async getTaskTrends(organizationId: string, queryInput: AnalyticsQueryInput) {
    const orgId = new Types.ObjectId(organizationId);
    const { startDate, endDate } = this.parseDateRange(queryInput);

    let projObjectId: Types.ObjectId | undefined;
    if (queryInput.projectId) {
      projObjectId = new Types.ObjectId(queryInput.projectId);
      await this.verifyProjectBelongsToOrg(orgId, projObjectId);
    }

    return analyticsRepository.getTaskTrends(
      orgId,
      startDate,
      endDate,
      queryInput.interval || "day",
      projObjectId
    );
  }

  async getOverdueTasks(organizationId: string, queryInput: AnalyticsQueryInput) {
    const orgId = new Types.ObjectId(organizationId);

    let projObjectId: Types.ObjectId | undefined;
    if (queryInput.projectId) {
      projObjectId = new Types.ObjectId(queryInput.projectId);
      await this.verifyProjectBelongsToOrg(orgId, projObjectId);
    }

    return analyticsRepository.getOverdueTaskAnalytics(orgId, projObjectId);
  }

  async getMemberWorkload(organizationId: string) {
    const orgId = new Types.ObjectId(organizationId);
    return analyticsRepository.getMemberWorkload(orgId);
  }

  async getProjects(organizationId: string) {
    const orgId = new Types.ObjectId(organizationId);
    return analyticsRepository.getProjectHealth(orgId);
  }

  async getActivity(organizationId: string, queryInput: AnalyticsQueryInput) {
    const orgId = new Types.ObjectId(organizationId);
    const { startDate, endDate } = this.parseDateRange(queryInput);

    const filters: { action?: string; actorId?: Types.ObjectId; entityType?: string } = {};
    if (queryInput.action) filters.action = queryInput.action;
    if (queryInput.entityType) filters.entityType = queryInput.entityType;
    if (queryInput.actorId) filters.actorId = new Types.ObjectId(queryInput.actorId);

    return analyticsRepository.getActivityAnalytics(orgId, startDate, endDate, filters);
  }

  async getProjectAnalytics(
    organizationId: string,
    projectId: string,
    queryInput: AnalyticsQueryInput
  ) {
    const orgId = new Types.ObjectId(organizationId);
    const projId = new Types.ObjectId(projectId);

    const project = await this.verifyProjectBelongsToOrg(orgId, projId);
    const { startDate, endDate } = this.parseDateRange(queryInput);

    const [taskAnalytics, taskTrends, overdueTasks, activity] = await Promise.all([
      analyticsRepository.getTaskAnalytics(orgId, startDate, endDate, projId),
      analyticsRepository.getTaskTrends(orgId, startDate, endDate, "day", projId),
      analyticsRepository.getOverdueTaskAnalytics(orgId, projId),
      analyticsRepository.getActivityAnalytics(orgId, startDate, endDate, {
        entityType: "Project",
      }),
    ]);

    return {
      project: {
        _id: project._id,
        name: project.name,
        status: project.status,
        startDate: project.startDate,
        dueDate: project.dueDate,
      },
      taskStatus: taskAnalytics.statusDistribution,
      taskPriority: taskAnalytics.priorityDistribution,
      completionTrend: taskTrends.data,
      overdueTasks,
      recentActivity: activity.trend,
    };
  }
}

export const analyticsService = new AnalyticsService();
