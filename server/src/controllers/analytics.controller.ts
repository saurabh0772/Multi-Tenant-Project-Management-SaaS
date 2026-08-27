import { Request, Response, NextFunction } from "express";
import { analyticsService } from "../services/analytics.service.js";
import { analyticsQuerySchema } from "../validators/analytics.schema.js";

export class AnalyticsController {
  async getOverview(req: Request, res: Response, next: NextFunction) {
    try {
      const { organizationId } = req.params;
      const overview = await analyticsService.getOverview(organizationId);

      res.status(200).json({
        success: true,
        data: overview,
      });
    } catch (err) {
      next(err);
    }
  }

  async getDashboard(req: Request, res: Response, next: NextFunction) {
    try {
      const { organizationId } = req.params;
      const validatedQuery = analyticsQuerySchema.parse(req.query);
      const dashboard = await analyticsService.getDashboard(organizationId, validatedQuery);

      res.status(200).json({
        success: true,
        data: dashboard,
      });
    } catch (err) {
      next(err);
    }
  }

  async getTasks(req: Request, res: Response, next: NextFunction) {
    try {
      const { organizationId } = req.params;
      const validatedQuery = analyticsQuerySchema.parse(req.query);
      const taskAnalytics = await analyticsService.getTasks(organizationId, validatedQuery);

      res.status(200).json({
        success: true,
        data: taskAnalytics,
      });
    } catch (err) {
      next(err);
    }
  }

  async getTaskTrends(req: Request, res: Response, next: NextFunction) {
    try {
      const { organizationId } = req.params;
      const validatedQuery = analyticsQuerySchema.parse(req.query);
      const trends = await analyticsService.getTaskTrends(organizationId, validatedQuery);

      res.status(200).json({
        success: true,
        data: trends,
      });
    } catch (err) {
      next(err);
    }
  }

  async getOverdueTasks(req: Request, res: Response, next: NextFunction) {
    try {
      const { organizationId } = req.params;
      const validatedQuery = analyticsQuerySchema.parse(req.query);
      const overdue = await analyticsService.getOverdueTasks(organizationId, validatedQuery);

      res.status(200).json({
        success: true,
        data: overdue,
      });
    } catch (err) {
      next(err);
    }
  }

  async getMemberWorkload(req: Request, res: Response, next: NextFunction) {
    try {
      const { organizationId } = req.params;
      const workload = await analyticsService.getMemberWorkload(organizationId);

      res.status(200).json({
        success: true,
        data: workload,
      });
    } catch (err) {
      next(err);
    }
  }

  async getProjects(req: Request, res: Response, next: NextFunction) {
    try {
      const { organizationId } = req.params;
      const projectHealth = await analyticsService.getProjects(organizationId);

      res.status(200).json({
        success: true,
        data: projectHealth,
      });
    } catch (err) {
      next(err);
    }
  }

  async getActivity(req: Request, res: Response, next: NextFunction) {
    try {
      const { organizationId } = req.params;
      const validatedQuery = analyticsQuerySchema.parse(req.query);
      const activity = await analyticsService.getActivity(organizationId, validatedQuery);

      res.status(200).json({
        success: true,
        data: activity,
      });
    } catch (err) {
      next(err);
    }
  }

  async getProjectAnalytics(req: Request, res: Response, next: NextFunction) {
    try {
      const { organizationId, projectId } = req.params;
      const validatedQuery = analyticsQuerySchema.parse(req.query);
      const analytics = await analyticsService.getProjectAnalytics(
        organizationId,
        projectId,
        validatedQuery
      );

      res.status(200).json({
        success: true,
        data: analytics,
      });
    } catch (err) {
      next(err);
    }
  }
}

export const analyticsController = new AnalyticsController();
