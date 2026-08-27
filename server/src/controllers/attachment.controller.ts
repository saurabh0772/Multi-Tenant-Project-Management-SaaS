import { Request, Response, NextFunction } from "express";
import { attachmentService } from "../services/attachment.service.js";

export class AttachmentController {
  public uploadAttachment = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const organizationId = req.organization!.id;
      const taskId = req.body?.taskId || req.params?.taskId;
      const commentId = req.body?.commentId || req.params?.commentId;

      const parentId = taskId || commentId || "";
      const parentType: "TASK" | "COMMENT" = taskId ? "TASK" : "COMMENT";

      const result = await attachmentService.uploadAttachment(
        organizationId,
        parentId,
        parentType,
        req.file!,
        req.user!.id,
        req.organization!.role
      );

      res.status(201).json({
        success: true,
        data: result.attachment,
      });
    } catch (error) {
      next(error);
    }
  };

  public getAttachments = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const organizationId = req.organization!.id;
      const taskId = (req.query.taskId || req.params.taskId) as string;
      const commentId = (req.query.commentId || req.params.commentId) as string;

      let result;
      if (taskId) {
        result = await attachmentService.getTaskAttachments(
          organizationId,
          taskId,
          req.user!.id,
          req.organization!.role
        );
      } else if (commentId) {
        result = await attachmentService.getCommentAttachments(
          organizationId,
          commentId,
          req.user!.id,
          req.organization!.role
        );
      } else {
        result = { attachments: [] };
      }

      res.status(200).json({
        success: true,
        data: result.attachments,
      });
    } catch (error) {
      next(error);
    }
  };

  public uploadTaskAttachment = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    return this.uploadAttachment(req, res, next);
  };

  public uploadCommentAttachment = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    return this.uploadAttachment(req, res, next);
  };

  public getTaskAttachments = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    return this.getAttachments(req, res, next);
  };

  public getCommentAttachments = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    return this.getAttachments(req, res, next);
  };

  public downloadAttachment = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const organizationId = req.organization!.id;
      const { attachmentId } = req.params;

      const { attachment, filePath } =
        await attachmentService.getAttachmentFile(
          organizationId,
          attachmentId,
          req.user!.id,
          req.organization!.role
        );

      res.download(filePath, attachment.fileName);
    } catch (error) {
      next(error);
    }
  };

  public deleteAttachment = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const organizationId = req.organization!.id;
      const { attachmentId } = req.params;

      const result = await attachmentService.deleteAttachment(
        organizationId,
        attachmentId,
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

export const attachmentController = new AttachmentController();
