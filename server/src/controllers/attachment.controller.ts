import { Request, Response, NextFunction } from "express";
import { attachmentService } from "../services/attachment.service.js";

export class AttachmentController {
  public uploadTaskAttachment = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const organizationId = req.organization!.id;
      const { taskId } = req.params;

      const result = await attachmentService.uploadAttachment(
        organizationId,
        taskId,
        "TASK",
        req.file!,
        req.user!.id
      );

      res.status(201).json({
        success: true,
        data: result.attachment,
      });
    } catch (error) {
      next(error);
    }
  };

  public uploadCommentAttachment = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const organizationId = req.organization!.id;
      const { commentId } = req.params;

      const result = await attachmentService.uploadAttachment(
        organizationId,
        commentId,
        "COMMENT",
        req.file!,
        req.user!.id
      );

      res.status(201).json({
        success: true,
        data: result.attachment,
      });
    } catch (error) {
      next(error);
    }
  };

  public getTaskAttachments = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const organizationId = req.organization!.id;
      const { taskId } = req.params;

      const result = await attachmentService.getTaskAttachments(
        organizationId,
        taskId
      );

      res.status(200).json({
        success: true,
        data: result.attachments,
      });
    } catch (error) {
      next(error);
    }
  };

  public getCommentAttachments = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const organizationId = req.organization!.id;
      const { commentId } = req.params;

      const result = await attachmentService.getCommentAttachments(
        organizationId,
        commentId
      );

      res.status(200).json({
        success: true,
        data: result.attachments,
      });
    } catch (error) {
      next(error);
    }
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
          attachmentId
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
