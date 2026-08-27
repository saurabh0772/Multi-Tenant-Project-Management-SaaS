import { Schema, model, Document, Types } from "mongoose";

export type OrganizationStatus = "ACTIVE" | "SUSPENDED" | "DELETED";

export interface IOrganizationSettings {
  timezone: string;
  dateFormat: string;
}

export interface IOrganization {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  ownerId: Types.ObjectId;
  logoUrl?: string | null;
  settings: IOrganizationSettings;
  status: OrganizationStatus;
  createdAt: Date;
  updatedAt: Date;
}

export type IOrganizationDocument = IOrganization & Document<Types.ObjectId>;

const organizationSettingsSchema = new Schema<IOrganizationSettings>(
  {
    timezone: {
      type: String,
      default: "UTC",
      trim: true,
    },
    dateFormat: {
      type: String,
      default: "YYYY-MM-DD",
      trim: true,
    },
  },
  { _id: false }
);

const organizationSchema = new Schema<IOrganizationDocument>(
  {
    name: {
      type: String,
      required: [true, "Organization name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [100, "Name cannot exceed 100 characters"],
    },
    slug: {
      type: String,
      required: [true, "Organization slug is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        "Slug must contain only lowercase alphanumeric characters and hyphens",
      ],
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Owner ID is required"],
    },
    logoUrl: {
      type: String,
      default: null,
    },
    settings: {
      type: organizationSettingsSchema,
      default: () => ({ timezone: "UTC", dateFormat: "YYYY-MM-DD" }),
    },
    status: {
      type: String,
      enum: ["ACTIVE", "SUSPENDED", "DELETED"],
      default: "ACTIVE",
    },
  },
  {
    timestamps: true,
    collection: "organizations",
    toJSON: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      transform(_doc, ret: Record<string, any>) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

organizationSchema.index({ ownerId: 1 });

export const Organization = model<IOrganizationDocument>(
  "Organization",
  organizationSchema
);
