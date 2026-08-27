import { Types } from "mongoose";
import {
  commentRepository,
  FindCommentsOptions,
} from "../repositories/comment.repository.js";
import { taskRepository } from "../repositories/task.repository.js";
import { activityLogRepository } from "../repositories/activity.repository.js";
import { notificationDispatcher } from "./notification-dispatcher.service.js";
import { realtimeEventPublisher } from "../realtime/socket.publisher.js";
import { AppError } from "../utils/AppError.js";
import { runInTransaction } from "../utils/transaction.js";
import {
  CreateCommentInput,
  UpdateCommentInput,
} from "../validators/comment.schema.js";
import { ICommentDocument } from "../models/comment.model.js";

export class CommentService {
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
   * Safe DTO formatting for comments
   */
  private formatCommentResponse(comment: ICommentDocument) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const author = comment.authorId as any;

    return {
      id: comment._id.toString(),
      organizationId: comment.organizationId.toString(),
      taskId: comment.taskId.toString(),
      content: comment.content,
      authorId: this.getRefIdString(comment.authorId),
      author: author?._id
        ? {
            id: author._id.toString(),
            name: author.name,
            email: author.email,
            avatarUrl: author.avatarUrl || null,
          }
        : null,
      editedAt: comment.editedAt || null,
      deletedAt: comment.deletedAt || null,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
    };
  }

  /**
   * Creates a comment on a task with tenant and parent task verification.
   */
  public async createComment(
    organizationId: string,
    taskId: string,
    input: CreateCommentInput,
    actorUserId: string
  ) {
    const orgObjId = new Types.ObjectId(organizationId);
    const taskObjId = new Types.ObjectId(taskId);
    const actorObjId = new Types.ObjectId(actorUserId);

    // Verify task exists in the same organization
    const task = await taskRepository.getTaskById(taskObjId, orgObjId);
    if (!task) {
      throw new AppError("Task not found", 404, "RESOURCE_NOT_FOUND");
    }

    return await runInTransaction(async (session) => {
      const options = session ? { session } : {};

      const comments = await commentRepository["model"].create(
        [
          {
            organizationId: orgObjId,
            taskId: taskObjId,
            authorId: actorObjId,
            content: input.content,
          },
        ],
        options
      );

      const createdComment = comments[0];

      await activityLogRepository["model"].create(
        [
          {
            organizationId: orgObjId,
            actorId: actorObjId,
            action: "COMMENT_CREATED",
            entityType: "Comment",
            entityId: createdComment._id,
            metadata: {
              taskId: taskId,
              snippet: input.content.substring(0, 100),
            },
          },
        ],
        options
      );

      const populatedComment = await commentRepository.getCommentByIdInOrg(
        createdComment._id,
        orgObjId
      );

      const result = {
        comment: this.formatCommentResponse(populatedComment || createdComment),
      };

      if (task.assignedTo) {
        const assignedToStr = task.assignedTo._id
          ? task.assignedTo._id.toString()
          : task.assignedTo.toString();

        await notificationDispatcher.dispatchCommentAdded({
          organizationId,
          recipientId: assignedToStr,
          taskId: task._id.toString(),
          commentId: createdComment._id.toString(),
          commentSnippet: input.content,
          actorUserId,
        });
      }

      realtimeEventPublisher.publishCommentEvent(
        "comment:created",
        organizationId,
        taskId,
        createdComment._id.toString(),
        { comment: result.comment, actorId: actorUserId }
      );

      return result;
    });
  }

  /**
   * Lists comments for a task with stable pagination.
   */
  public async listTaskComments(
    organizationId: string,
    taskId: string,
    options: FindCommentsOptions
  ) {
    const orgObjId = new Types.ObjectId(organizationId);
    const taskObjId = new Types.ObjectId(taskId);

    const task = await taskRepository.getTaskById(taskObjId, orgObjId);
    if (!task) {
      throw new AppError("Task not found", 404, "RESOURCE_NOT_FOUND");
    }

    const { comments, total, page, limit } =
      await commentRepository.findTaskCommentsPaginated(
        taskObjId,
        orgObjId,
        options
      );

    return {
      comments: comments.map((c) => this.formatCommentResponse(c)),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Gets details for a specific comment.
   */
  public async getCommentDetails(organizationId: string, commentId: string) {
    const orgObjId = new Types.ObjectId(organizationId);

    const comment = await commentRepository.getCommentByIdInOrg(
      commentId,
      orgObjId
    );

    if (!comment) {
      throw new AppError("Comment not found", 404, "RESOURCE_NOT_FOUND");
    }

    return {
      comment: this.formatCommentResponse(comment),
    };
  }

  /**
   * Updates a comment (Author only).
   */
  public async updateComment(
    organizationId: string,
    commentId: string,
    input: UpdateCommentInput,
    actorUserId: string
  ) {
    const orgObjId = new Types.ObjectId(organizationId);
    const actorObjId = new Types.ObjectId(actorUserId);

    const comment = await commentRepository.getCommentByIdInOrg(
      commentId,
      orgObjId
    );

    if (!comment) {
      throw new AppError("Comment not found", 404, "RESOURCE_NOT_FOUND");
    }

    const authorIdStr = this.getRefIdString(comment.authorId);

    // Author-only check
    if (authorIdStr !== actorUserId) {
      throw new AppError(
        "Only the comment author can edit this comment",
        403,
        "FORBIDDEN"
      );
    }

    const updatedComment = await commentRepository.updateCommentInOrg(
      commentId,
      orgObjId,
      {
        content: input.content,
        editedAt: new Date(),
      }
    );

    if (!updatedComment) {
      throw new AppError("Comment not found", 404, "RESOURCE_NOT_FOUND");
    }

    await activityLogRepository.create({
      organizationId: orgObjId,
      actorId: actorObjId,
      action: "COMMENT_UPDATED",
      entityType: "Comment",
      entityId: updatedComment._id,
      metadata: { taskId: comment.taskId.toString() },
    });

    const formattedComment = this.formatCommentResponse(updatedComment);

    realtimeEventPublisher.publishCommentEvent(
      "comment:updated",
      organizationId,
      comment.taskId.toString(),
      commentId,
      { comment: formattedComment, actorId: actorUserId }
    );

    return {
      comment: formattedComment,
    };
  }

  /**
   * Soft deletes a comment with role & author ownership check.
   */
  public async deleteComment(
    organizationId: string,
    commentId: string,
    actorUserId: string,
    actorRole: string
  ) {
    const orgObjId = new Types.ObjectId(organizationId);
    const actorObjId = new Types.ObjectId(actorUserId);

    const comment = await commentRepository.getCommentByIdInOrg(
      commentId,
      orgObjId
    );

    if (!comment) {
      throw new AppError("Comment not found", 404, "RESOURCE_NOT_FOUND");
    }

    const authorIdStr = this.getRefIdString(comment.authorId);

    // MEMBER role can only delete their own comments
    if (actorRole === "MEMBER" && authorIdStr !== actorUserId) {
      throw new AppError(
        "Members can only delete their own comments",
        403,
        "FORBIDDEN"
      );
    }

    return await runInTransaction(async (session) => {
      const options = session ? { session } : {};

      await commentRepository.softDeleteCommentInOrg(
        commentId,
        orgObjId,
        options
      );

      await activityLogRepository["model"].create(
        [
          {
            organizationId: orgObjId,
            actorId: actorObjId,
            action: "COMMENT_DELETED",
            entityType: "Comment",
            entityId: comment._id,
            metadata: { taskId: comment.taskId.toString() },
          },
        ],
        options
      );

      const result = {
        message: "Comment deleted successfully",
      };

      realtimeEventPublisher.publishCommentEvent(
        "comment:deleted",
        organizationId,
        comment.taskId.toString(),
        commentId,
        { commentId, actorId: actorUserId }
      );

      return result;
    });
  }
}

export const commentService = new CommentService();
