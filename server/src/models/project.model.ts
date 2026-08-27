import { Schema, model, Document, Types } from "mongoose";

export type ProjectStatus =
  | "PLANNING"
  | "ACTIVE"
  | "ON_HOLD"
  | "COMPLETED"
  | "ARCHIVED";

export interface IProject {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  name: string;
  slug: string;
  description?: string;
  ownerId: Types.ObjectId; // User responsible for current project ownership
  createdBy: Types.ObjectId; // User who originally created the project document
  members: Types.ObjectId[]; // List of user IDs assigned as project members
  status: ProjectStatus;
  startDate?: Date | null;
  dueDate?: Date | null;
  archivedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type IProjectDocument = IProject & Document<Types.ObjectId>;

const projectSchema = new Schema<IProjectDocument>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: [true, "Organization ID is required"],
    },
    name: {
      type: String,
      required: [true, "Project name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [150, "Name cannot exceed 150 characters"],
    },
    slug: {
      type: String,
      required: [true, "Project slug is required"],
      lowercase: true,
      trim: true,
      match: [
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        "Slug must contain only lowercase alphanumeric characters and hyphens",
      ],
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Project Owner ID is required"],
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "CreatedBy User ID is required"],
    },
    members: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    status: {
      type: String,
      enum: ["PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED", "ARCHIVED"],
      default: "PLANNING",
    },
    startDate: {
      type: Date,
      default: null,
    },
    dueDate: {
      type: Date,
      default: null,
    },
    archivedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: "projects",
    toJSON: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      transform(_doc, ret: Record<string, any>) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Tenant-scoped slug uniqueness (Allows same slug across different orgs)
projectSchema.index({ organizationId: 1, slug: 1 }, { unique: true });
projectSchema.index({ organizationId: 1, status: 1 });
projectSchema.index({ organizationId: 1, ownerId: 1 });
projectSchema.index({ organizationId: 1, members: 1 });

export const Project = model<IProjectDocument>("Project", projectSchema);
