import { Schema, model, Document, Types } from "mongoose";

export type NotificationType =
  | "TASK_ASSIGNED"
  | "TASK_MENTIONED"
  | "COMMENT_ADDED"
  | "PROJECT_INVITATION"
  | "TASK_DUE_SOON"
  | "PROJECT_UPDATED"
  | "MEMBER_JOINED";

export interface INotification {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  recipientId: Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  entityType: string;
  entityId?: Types.ObjectId | null;
  eventId?: string | null;
  readAt?: Date | null;
  createdAt: Date;
}

export type INotificationDocument = INotification & Document<Types.ObjectId>;

const notificationSchema = new Schema<INotificationDocument>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: [true, "Organization ID is required"],
    },
    recipientId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Recipient User ID is required"],
    },
    type: {
      type: String,
      enum: [
        "TASK_ASSIGNED",
        "TASK_MENTIONED",
        "COMMENT_ADDED",
        "PROJECT_INVITATION",
        "TASK_DUE_SOON",
        "PROJECT_UPDATED",
        "MEMBER_JOINED",
      ],
      required: [true, "Notification type is required"],
    },
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
    },
    message: {
      type: String,
      required: [true, "Message is required"],
      trim: true,
    },
    entityType: {
      type: String,
      required: [true, "Entity type is required"],
      trim: true,
    },
    entityId: {
      type: Schema.Types.ObjectId,
      default: null,
    },
    eventId: {
      type: String,
      default: null,
      trim: true,
    },
    readAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: "notifications",
    toJSON: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      transform(_doc, ret: Record<string, any>) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

notificationSchema.index({ organizationId: 1, recipientId: 1, createdAt: -1 });
notificationSchema.index({ recipientId: 1, readAt: 1, createdAt: -1 });
// Database-level idempotency index: unique eventId per recipient in tenant when eventId is a string
notificationSchema.index(
  { organizationId: 1, recipientId: 1, eventId: 1 },
  { unique: true, partialFilterExpression: { eventId: { $type: "string" } } }
);

export const Notification = model<INotificationDocument>(
  "Notification",
  notificationSchema
);
