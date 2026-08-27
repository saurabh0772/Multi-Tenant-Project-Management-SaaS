import { Request, Response, NextFunction } from "express";
import { activityService } from "../services/activity.service.js";
import { activityQuerySchema } from "../validators/activity.schema.js";

export class ActivityController {
  public getOrganizationActivities = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const organizationId = req.organization!.id;
      const queryParams = activityQuerySchema.parse(req.query);

      const options = {
        page: queryParams.page ? parseInt(queryParams.page, 10) : undefined,
        limit: queryParams.limit ? parseInt(queryParams.limit, 10) : undefined,
        entityType: queryParams.entityType,
        entityId: queryParams.entityId,
        action: queryParams.action,
        actorId: queryParams.actorId,
      };

      const result = await activityService.getOrganizationActivities(
        organizationId,
        options
      );

      res.status(200).json({
        success: true,
        data: result.activities,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  };

  public getProjectActivities = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const organizationId = req.organization!.id;
      const { projectId } = req.params;
      const queryParams = activityQuerySchema.parse(req.query);

      const options = {
        page: queryParams.page ? parseInt(queryParams.page, 10) : undefined,
        limit: queryParams.limit ? parseInt(queryParams.limit, 10) : undefined,
        action: queryParams.action,
        actorId: queryParams.actorId,
      };

      const result = await activityService.getProjectActivities(
        organizationId,
        projectId,
        options
      );

      res.status(200).json({
        success: true,
        data: result.activities,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  };

  public getTaskActivities = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const organizationId = req.organization!.id;
      const { taskId } = req.params;
      const queryParams = activityQuerySchema.parse(req.query);

      const options = {
        page: queryParams.page ? parseInt(queryParams.page, 10) : undefined,
        limit: queryParams.limit ? parseInt(queryParams.limit, 10) : undefined,
        action: queryParams.action,
        actorId: queryParams.actorId,
      };

      const result = await activityService.getTaskActivities(
        organizationId,
        taskId,
        options
      );

      res.status(200).json({
        success: true,
        data: result.activities,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  };
}

export const activityController = new ActivityController();
