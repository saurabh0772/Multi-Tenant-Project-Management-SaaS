import { Types } from "mongoose";
import { BaseRepository } from "./base.repository.js";
import { Comment, ICommentDocument } from "../models/comment.model.js";

export interface FindCommentsOptions {
  page?: number;
  limit?: number;
  sortOrder?: "asc" | "desc";
}

export class CommentRepository extends BaseRepository<ICommentDocument> {
  constructor() {
    super(Comment);
  }

  /**
   * Tenant-scoped active comment lookup by ID
   */
  public async getCommentByIdInOrg(
    commentId: Types.ObjectId | string,
    organizationId: Types.ObjectId | string
  ): Promise<ICommentDocument | null> {
    return await this.model
      .findOne({
        _id: commentId,
        organizationId,
        $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
      })
      .populate("authorId", "name email avatarUrl status")
      .exec();
  }

  /**
   * Tenant-scoped retrieval of non-deleted task comments
   */
  public async findTaskComments(
    taskId: Types.ObjectId | string,
    organizationId: Types.ObjectId | string
  ): Promise<ICommentDocument[]> {
    return await this.findMany(
      {
        taskId,
        organizationId,
        $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
      },
      undefined,
      { sort: { createdAt: 1 } }
    );
  }

  /**
   * Tenant-scoped paginated task comments
   */
  public async findTaskCommentsPaginated(
    taskId: Types.ObjectId | string,
    organizationId: Types.ObjectId | string,
    options: FindCommentsOptions = {}
  ): Promise<{ comments: ICommentDocument[]; total: number; page: number; limit: number }> {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 20));
    const skip = (page - 1) * limit;

    const filter = {
      taskId,
      organizationId,
      $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
    };

    const sortDirection = options.sortOrder === "desc" ? -1 : 1;

    const [comments, total] = await Promise.all([
      this.model
        .find(filter)
        .populate("authorId", "name email avatarUrl status")
        .sort({ createdAt: sortDirection })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.model.countDocuments(filter).exec(),
    ]);

    return {
      comments,
      total,
      page,
      limit,
    };
  }

  /**
   * Tenant-scoped comment update
   */
  public async updateCommentInOrg(
    commentId: Types.ObjectId | string,
    organizationId: Types.ObjectId | string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    updateData: Record<string, any>
  ): Promise<ICommentDocument | null> {
    return await this.model
      .findOneAndUpdate(
        {
          _id: commentId,
          organizationId,
          $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
        },
        updateData,
        { new: true, runValidators: true }
      )
      .populate("authorId", "name email avatarUrl status")
      .exec();
  }

  /**
   * Tenant-scoped soft deletion of a comment
   */
  public async softDeleteCommentInOrg(
    commentId: Types.ObjectId | string,
    organizationId: Types.ObjectId | string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    options: Record<string, any> = {}
  ): Promise<ICommentDocument | null> {
    return await this.model
      .findOneAndUpdate(
        {
          _id: commentId,
          organizationId,
          $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
        },
        { deletedAt: new Date() },
        { new: true, ...options }
      )
      .exec();
  }
}

export const commentRepository = new CommentRepository();
