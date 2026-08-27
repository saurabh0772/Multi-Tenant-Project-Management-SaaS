import { Types } from "mongoose";
import { BaseRepository } from "./base.repository.js";
import { Attachment, IAttachmentDocument } from "../models/attachment.model.js";

export class AttachmentRepository extends BaseRepository<IAttachmentDocument> {
  constructor() {
    super(Attachment);
  }

  /**
   * Tenant-scoped attachment lookup by ID
   */
  public async findAttachmentByIdInOrg(
    attachmentId: Types.ObjectId | string,
    organizationId: Types.ObjectId | string
  ): Promise<IAttachmentDocument | null> {
    return await this.model
      .findOne({ _id: attachmentId, organizationId })
      .populate("uploadedBy", "name email avatarUrl status")
      .exec();
  }

  /**
   * Tenant-scoped retrieval of task attachments
   */
  public async findTaskAttachments(
    taskId: Types.ObjectId | string,
    organizationId: Types.ObjectId | string
  ): Promise<IAttachmentDocument[]> {
    return await this.model
      .find({ taskId, organizationId })
      .populate("uploadedBy", "name email avatarUrl status")
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Tenant-scoped retrieval of comment attachments
   */
  public async findCommentAttachments(
    commentId: Types.ObjectId | string,
    organizationId: Types.ObjectId | string
  ): Promise<IAttachmentDocument[]> {
    return await this.model
      .find({ commentId, organizationId })
      .populate("uploadedBy", "name email avatarUrl status")
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Tenant-scoped metadata deletion of an attachment
   */
  public async deleteAttachmentInOrg(
    attachmentId: Types.ObjectId | string,
    organizationId: Types.ObjectId | string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    options: Record<string, any> = {}
  ): Promise<IAttachmentDocument | null> {
    return await this.model
      .findOneAndDelete({ _id: attachmentId, organizationId }, options)
      .exec();
  }
}

export const attachmentRepository = new AttachmentRepository();
