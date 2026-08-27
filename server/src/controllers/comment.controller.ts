import { Request, Response, NextFunction } from "express";
import { commentService } from "../services/comment.service.js";
import {
  createCommentSchema,
  updateCommentSchema,
  commentQuerySchema,
} from "../validators/comment.schema.js";

export class CommentController {
  public createComment = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const input = createCommentSchema.parse(req.body);
      const organizationId = req.organization!.id;
      const { taskId } = req.params;

      const result = await commentService.createComment(
        organizationId,
        taskId,
        input,
        req.user!.id
      );

      res.status(201).json({
        success: true,
        data: result.comment,
      });
    } catch (error) {
      next(error);
    }
  };

  public getTaskComments = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const organizationId = req.organization!.id;
      const { taskId } = req.params;
      const queryParams = commentQuerySchema.parse(req.query);

      const options = {
        page: queryParams.page ? parseInt(queryParams.page, 10) : undefined,
        limit: queryParams.limit ? parseInt(queryParams.limit, 10) : undefined,
        sortOrder: queryParams.sortOrder,
      };

      const result = await commentService.listTaskComments(
        organizationId,
        taskId,
        options
      );

      res.status(200).json({
        success: true,
        data: result.comments,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  };

  public getComment = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const organizationId = req.organization!.id;
      const { commentId } = req.params;

      const result = await commentService.getCommentDetails(
        organizationId,
        commentId
      );

      res.status(200).json({
        success: true,
        data: result.comment,
      });
    } catch (error) {
      next(error);
    }
  };

  public updateComment = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const organizationId = req.organization!.id;
      const { commentId } = req.params;
      const input = updateCommentSchema.parse(req.body);

      const result = await commentService.updateComment(
        organizationId,
        commentId,
        input,
        req.user!.id
      );

      res.status(200).json({
        success: true,
        data: result.comment,
      });
    } catch (error) {
      next(error);
    }
  };

  public deleteComment = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const organizationId = req.organization!.id;
      const { commentId } = req.params;

      const result = await commentService.deleteComment(
        organizationId,
        commentId,
        req.user!.id,
        req.organization!.role
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

export const commentController = new CommentController();
