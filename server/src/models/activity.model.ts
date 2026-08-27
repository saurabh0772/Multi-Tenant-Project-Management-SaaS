import { Schema, model, Document, Types } from "mongoose";

export interface IActivityLog {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  actorId: Types.ObjectId;
  action: string;
  entityType: string;
  entityId: Types.ObjectId;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export type IActivityLogDocument = IActivityLog & Document<Types.ObjectId>;

const activityLogSchema = new Schema<IActivityLogDocument>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: [true, "Organization ID is required"],
    },
    actorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Actor User ID is required"],
    },
    action: {
      type: String,
      required: [true, "Action name is required"],
      trim: true,
    },
    entityType: {
      type: String,
      required: [true, "Entity type is required"],
      trim: true,
    },
    entityId: {
      type: Schema.Types.ObjectId,
      required: [true, "Entity ID is required"],
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: "activities",
    toJSON: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      transform(_doc, ret: Record<string, any>) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

activityLogSchema.index({ organizationId: 1, createdAt: -1 });
activityLogSchema.index({
  organizationId: 1,
  entityType: 1,
  entityId: 1,
  createdAt: -1,
});
activityLogSchema.index({ organizationId: 1, action: 1, createdAt: -1 });

export const ActivityLog = model<IActivityLogDocument>(
  "ActivityLog",
  activityLogSchema
);
