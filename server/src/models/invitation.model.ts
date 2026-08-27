import { Schema, model, Document, Types } from "mongoose";

export type InvitationRole = "ADMIN" | "MANAGER" | "MEMBER";
export type InvitationStatus = "PENDING" | "ACCEPTED" | "EXPIRED" | "REVOKED";

export interface IInvitation {
  _id: Types.ObjectId;
  email: string;
  organizationId: Types.ObjectId;
  invitedBy: Types.ObjectId;
  role: InvitationRole;
  tokenHash: string;
  status: InvitationStatus;
  expiresAt: Date;
  acceptedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type IInvitationDocument = IInvitation & Document<Types.ObjectId>;

const invitationSchema = new Schema<IInvitationDocument>(
  {
    email: {
      type: String,
      required: [true, "Email is required"],
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email address"],
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: [true, "Organization ID is required"],
    },
    invitedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "InvitedBy User ID is required"],
    },
    role: {
      type: String,
      enum: ["ADMIN", "MANAGER", "MEMBER"],
      default: "MEMBER",
    },
    tokenHash: {
      type: String,
      required: [true, "Token hash is required"],
      select: false,
    },
    status: {
      type: String,
      enum: ["PENDING", "ACCEPTED", "EXPIRED", "REVOKED"],
      default: "PENDING",
    },
    expiresAt: {
      type: Date,
      required: [true, "Expiration date is required"],
    },
    acceptedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: "invitations",
    toJSON: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      transform(_doc, ret: Record<string, any>) {
        delete ret.__v;
        delete ret.tokenHash;
        return ret;
      },
    },
  }
);

invitationSchema.index({ organizationId: 1, email: 1 });
invitationSchema.index({ tokenHash: 1 }, { unique: true });
invitationSchema.index({ expiresAt: 1 });

export const Invitation = model<IInvitationDocument>(
  "Invitation",
  invitationSchema
);
