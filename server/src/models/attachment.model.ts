import { Schema, model, Document, Types } from "mongoose";

export interface IAttachment {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  taskId?: Types.ObjectId | null;
  commentId?: Types.ObjectId | null;
  uploadedBy: Types.ObjectId;
  fileName: string;
  fileUrl: string;
  storageKey: string;
  mimeType: string;
  fileSize: number;
  createdAt: Date;
}

export type IAttachmentDocument = IAttachment & Document<Types.ObjectId>;

const attachmentSchema = new Schema<IAttachmentDocument>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: [true, "Organization ID is required"],
    },
    taskId: {
      type: Schema.Types.ObjectId,
      ref: "Task",
      default: null,
    },
    commentId: {
      type: Schema.Types.ObjectId,
      ref: "Comment",
      default: null,
    },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Uploader User ID is required"],
    },
    fileName: {
      type: String,
      required: [true, "File name is required"],
      trim: true,
    },
    fileUrl: {
      type: String,
      required: [true, "File URL is required"],
      trim: true,
    },
    storageKey: {
      type: String,
      required: [true, "Storage key is required"],
      trim: true,
    },
    mimeType: {
      type: String,
      required: [true, "MIME type is required"],
      trim: true,
    },
    fileSize: {
      type: Number,
      required: [true, "File size is required"],
      min: [1, "File size must be greater than 0"],
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: "attachments",
    toJSON: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      transform(_doc, ret: Record<string, any>) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Pre-validate hook enforcing parent relationship (must have either taskId or commentId)
attachmentSchema.pre("validate", function (next) {
  if (!this.taskId && !this.commentId) {
    next(new Error("Attachment must belong to either a Task or a Comment"));
  } else {
    next();
  }
});

attachmentSchema.index({ organizationId: 1, taskId: 1 });
attachmentSchema.index({ organizationId: 1, commentId: 1 });

export const Attachment = model<IAttachmentDocument>(
  "Attachment",
  attachmentSchema
);
