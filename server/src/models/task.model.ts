import { Schema, model, Document, Types } from "mongoose";

export type TaskStatus = "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export interface ITask {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  projectId: Types.ObjectId;
  title: string;
  description?: string;
  createdBy: Types.ObjectId;
  assignedTo?: Types.ObjectId | null;
  status: TaskStatus;
  priority: TaskPriority;
  labels: string[];
  dueDate?: Date | null;
  position: number; // Numeric position value supporting fractional Kanban drag-and-drop reordering
  completedAt?: Date | null;
  deletedAt?: Date | null; // Soft delete timestamp
  createdAt: Date;
  updatedAt: Date;
}

export type ITaskDocument = ITask & Document<Types.ObjectId>;

const taskSchema = new Schema<ITaskDocument>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: [true, "Organization ID is required"],
    },
    projectId: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: [true, "Project ID is required"],
    },
    title: {
      type: String,
      required: [true, "Task title is required"],
      trim: true,
      minlength: [1, "Title cannot be empty"],
      maxlength: [250, "Title cannot exceed 250 characters"],
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "CreatedBy User ID is required"],
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    status: {
      type: String,
      enum: ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"],
      default: "TODO",
    },
    priority: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH", "URGENT"],
      default: "MEDIUM",
    },
    labels: {
      type: [String],
      default: [],
    },
    dueDate: {
      type: Date,
      default: null,
    },
    position: {
      type: Number,
      default: 1000, // Fractional numeric ordering
    },
    completedAt: {
      type: Date,
      default: null,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: "tasks",
    toJSON: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      transform(_doc, ret: Record<string, any>) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

taskSchema.index({ organizationId: 1, projectId: 1, status: 1, position: 1 });
taskSchema.index({ organizationId: 1, assignedTo: 1, status: 1 });
taskSchema.index({ organizationId: 1, dueDate: 1 });
taskSchema.index({ organizationId: 1, deletedAt: 1 });

export const Task = model<ITaskDocument>("Task", taskSchema);
