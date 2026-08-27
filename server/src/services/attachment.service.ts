import path from "path";
import crypto from "crypto";
import { Types } from "mongoose";
import { attachmentRepository } from "../repositories/attachment.repository.js";
import { taskRepository } from "../repositories/task.repository.js";
import { commentRepository } from "../repositories/comment.repository.js";
import { activityLogRepository } from "../repositories/activity.repository.js";
import { realtimeEventPublisher } from "../realtime/socket.publisher.js";
import { storageService } from "./storage.service.js";
import { AppError } from "../utils/AppError.js";
import { runInTransaction } from "../utils/transaction.js";
import { IAttachmentDocument } from "../models/attachment.model.js";

export class AttachmentService {
  /**
   * Helper to safely extract string ID from potentially populated reference
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private getRefIdString(ref: any): string {
    if (!ref) return "";
    if (ref._id) return ref._id.toString();
    return ref.toString();
  }

  /**
   * Safe DTO formatting for attachment response
   */
  private formatAttachmentResponse(attachment: IAttachmentDocument) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const uploader = attachment.uploadedBy as any;

    return {
      id: attachment._id.toString(),
      organizationId: attachment.organizationId.toString(),
      taskId: attachment.taskId ? attachment.taskId.toString() : null,
      commentId: attachment.commentId ? attachment.commentId.toString() : null,
      fileName: attachment.fileName,
      fileUrl: attachment.fileUrl,
      mimeType: attachment.mimeType,
      fileSize: attachment.fileSize,
      uploadedBy: uploader?._id
        ? {
            id: uploader._id.toString(),
            name: uploader.name,
            email: uploader.email,
            avatarUrl: uploader.avatarUrl || null,
          }
        : attachment.uploadedBy.toString(),
      createdAt: attachment.createdAt,
    };
  }

  /**
   * Uploads an attachment for a task or comment with filesystem cleanup on DB failure.
   */
  public async uploadAttachment(
    organizationId: string,
    parentId: string,
    parentType: "TASK" | "COMMENT",
    file: Express.Multer.File,
    actorUserId: string
  ) {
    if (!file || !file.buffer) {
      throw new AppError("No file provided for upload", 400, "VALIDATION_ERROR");
    }

    const orgObjId = new Types.ObjectId(organizationId);
    const parentObjId = new Types.ObjectId(parentId);
    const actorObjId = new Types.ObjectId(actorUserId);

    let taskObjId: Types.ObjectId | null = null;
    let commentObjId: Types.ObjectId | null = null;

    // 1. Parent relationship & tenant isolation check
    if (parentType === "TASK") {
      const task = await taskRepository.getTaskById(parentObjId, orgObjId);
      if (!task) {
        throw new AppError(
          "Target task not found in this organization",
          404,
          "RESOURCE_NOT_FOUND"
        );
      }
      taskObjId = parentObjId;
    } else {
      const comment = await commentRepository.getCommentByIdInOrg(
        parentObjId,
        orgObjId
      );
      if (!comment) {
        throw new AppError(
          "Target comment not found in this organization",
          404,
          "RESOURCE_NOT_FOUND"
        );
      }
      commentObjId = parentObjId;
    }

    // 2. Path traversal protection & server-generated storage key
    const safeFileName = path
      .basename(file.originalname)
      .replace(/[^a-zA-Z0-9._-]/g, "_");
    const uniqueKey = `${Date.now()}_${crypto.randomBytes(8).toString("hex")}_${safeFileName}`;
    const relativeKey = path.join(organizationId, uniqueKey);

    // 3. Write file bytes via storage service
    await storageService.saveFile(relativeKey, file.buffer);

    // 4. Try MongoDB transaction. If DB fails, execute compensating disk cleanup
    try {
      return await runInTransaction(async (session) => {
        const options = session ? { session } : {};

        const newId = new Types.ObjectId();
        const downloadUrl = `/api/v1/organizations/${organizationId}/attachments/${newId.toString()}/download`;

        const attachments = await attachmentRepository["model"].create(
          [
            {
              _id: newId,
              organizationId: orgObjId,
              taskId: taskObjId,
              commentId: commentObjId,
              uploadedBy: actorObjId,
              fileName: safeFileName,
              fileUrl: downloadUrl,
              storageKey: relativeKey,
              mimeType: file.mimetype,
              fileSize: file.size,
            },
          ],
          options
        );

        const createdAttachment = attachments[0];

        await activityLogRepository["model"].create(
          [
            {
              organizationId: orgObjId,
              actorId: actorObjId,
              action: "ATTACHMENT_UPLOADED",
              entityType: "Attachment",
              entityId: createdAttachment._id,
              metadata: {
                fileName: safeFileName,
                fileSize: file.size,
                mimeType: file.mimetype,
                parentType,
                parentId,
              },
            },
          ],
          options
        );

        const populated = await attachmentRepository.findAttachmentByIdInOrg(
          createdAttachment._id,
          orgObjId
        );

        const result = {
          attachment: this.formatAttachmentResponse(
            populated || createdAttachment
          ),
        };

        realtimeEventPublisher.publishAttachmentEvent(
          "attachment:uploaded",
          organizationId,
          createdAttachment._id.toString(),
          { attachment: result.attachment, actorId: actorUserId }
        );

        return result;
      });
    } catch (dbError) {
      // Compensating file cleanup via storage service
      await storageService.deleteFile(relativeKey);
      throw dbError;
    }
  }

  /**
   * Retrieves task attachments
   */
  public async getTaskAttachments(organizationId: string, taskId: string) {
    const orgObjId = new Types.ObjectId(organizationId);
    const taskObjId = new Types.ObjectId(taskId);

    const task = await taskRepository.getTaskById(taskObjId, orgObjId);
    if (!task) {
      throw new AppError("Task not found", 404, "RESOURCE_NOT_FOUND");
    }

    const attachments = await attachmentRepository.findTaskAttachments(
      taskObjId,
      orgObjId
    );

    return {
      attachments: attachments.map((a) => this.formatAttachmentResponse(a)),
    };
  }

  /**
   * Retrieves comment attachments
   */
  public async getCommentAttachments(
    organizationId: string,
    commentId: string
  ) {
    const orgObjId = new Types.ObjectId(organizationId);
    const commentObjId = new Types.ObjectId(commentId);

    const comment = await commentRepository.getCommentByIdInOrg(
      commentObjId,
      orgObjId
    );
    if (!comment) {
      throw new AppError("Comment not found", 404, "RESOURCE_NOT_FOUND");
    }

    const attachments = await attachmentRepository.findCommentAttachments(
      commentObjId,
      orgObjId
    );

    return {
      attachments: attachments.map((a) => this.formatAttachmentResponse(a)),
    };
  }

  /**
   * Resolves attachment details and server file path for secure download
   */
  public async getAttachmentFile(
    organizationId: string,
    attachmentId: string
  ) {
    const orgObjId = new Types.ObjectId(organizationId);

    const attachment = await attachmentRepository.findAttachmentByIdInOrg(
      attachmentId,
      orgObjId
    );

    if (!attachment) {
      throw new AppError("Attachment not found", 404, "RESOURCE_NOT_FOUND");
    }

    const exists = await storageService.fileExists(attachment.storageKey);
    if (!exists) {
      throw new AppError(
        "Attachment file not found on server",
        404,
        "RESOURCE_NOT_FOUND"
      );
    }

    const absoluteFilePath = storageService.getAbsoluteFilePath(
      attachment.storageKey
    );

    return {
      attachment: this.formatAttachmentResponse(attachment),
      filePath: absoluteFilePath,
    };
  }

  /**
   * Deletes attachment metadata and unlinks physical file via storage service.
   */
  public async deleteAttachment(
    organizationId: string,
    attachmentId: string,
    actorUserId: string,
    actorRole: string
  ) {
    const orgObjId = new Types.ObjectId(organizationId);
    const actorObjId = new Types.ObjectId(actorUserId);

    const attachment = await attachmentRepository.findAttachmentByIdInOrg(
      attachmentId,
      orgObjId
    );

    if (!attachment) {
      throw new AppError("Attachment not found", 404, "RESOURCE_NOT_FOUND");
    }

    const uploaderIdStr = this.getRefIdString(attachment.uploadedBy);

    // MEMBER role can only delete their own attachments
    if (
      actorRole === "MEMBER" &&
      uploaderIdStr !== actorUserId
    ) {
      throw new AppError(
        "Members can only delete their own attachments",
        403,
        "FORBIDDEN"
      );
    }

    // Run DB deletion transaction first
    await runInTransaction(async (session) => {
      const options = session ? { session } : {};

      await attachmentRepository.deleteAttachmentInOrg(
        attachmentId,
        orgObjId,
        options
      );

      await activityLogRepository["model"].create(
        [
          {
            organizationId: orgObjId,
            actorId: actorObjId,
            action: "ATTACHMENT_DELETED",
            entityType: "Attachment",
            entityId: attachment._id,
            metadata: { fileName: attachment.fileName },
          },
        ],
        options
      );

      return true;
    });

    // Unlink physical file after DB succeeds via storage service
    await storageService.deleteFile(attachment.storageKey);

    realtimeEventPublisher.publishAttachmentEvent(
      "attachment:deleted",
      organizationId,
      attachmentId,
      { attachmentId, actorId: actorUserId }
    );

    return {
      message: "Attachment deleted successfully",
    };
  }
}

export const attachmentService = new AttachmentService();
