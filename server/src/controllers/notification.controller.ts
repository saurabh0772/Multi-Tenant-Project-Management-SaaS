import { Request, Response, NextFunction } from "express";
import { notificationService } from "../services/notification.service.js";
import { notificationQuerySchema } from "../validators/notification.schema.js";

export class NotificationController {
  public getUserNotifications = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const organizationId = req.organization!.id;
      const recipientId = req.user!.id;
      const queryParams = notificationQuerySchema.parse(req.query);

      const options = {
        page: queryParams.page ? parseInt(queryParams.page, 10) : undefined,
        limit: queryParams.limit ? parseInt(queryParams.limit, 10) : undefined,
        unreadOnly: queryParams.unread,
      };

      const result = await notificationService.getUserNotifications(
        organizationId,
        recipientId,
        options
      );

      res.status(200).json({
        success: true,
        data: result.notifications,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  };

  public getUnreadCount = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const organizationId = req.organization!.id;
      const recipientId = req.user!.id;

      const result = await notificationService.getUnreadCount(
        organizationId,
        recipientId
      );

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  public markAsRead = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const organizationId = req.organization!.id;
      const recipientId = req.user!.id;
      const { notificationId } = req.params;

      const result = await notificationService.markAsRead(
        organizationId,
        recipientId,
        notificationId
      );

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  public markAllAsRead = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const organizationId = req.organization!.id;
      const recipientId = req.user!.id;

      const result = await notificationService.markAllAsRead(
        organizationId,
        recipientId
      );

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };
}

export const notificationController = new NotificationController();
