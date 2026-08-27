import { Types } from "mongoose";
import { BaseRepository } from "./base.repository.js";
import { Invitation, IInvitationDocument } from "../models/invitation.model.js";

export interface FindOrgInvitationsOptions {
  status?: string;
  page?: number;
  limit?: number;
}

export class InvitationRepository extends BaseRepository<IInvitationDocument> {
  constructor() {
    super(Invitation);
  }

  public async findByTokenHash(tokenHash: string): Promise<IInvitationDocument | null> {
    return await this.model.findOne({ tokenHash }).select("+tokenHash").exec();
  }

  public async findPendingByOrgAndEmail(
    organizationId: Types.ObjectId | string,
    email: string
  ): Promise<IInvitationDocument | null> {
    return await this.findOne({
      organizationId,
      email: email.toLowerCase().trim(),
      status: "PENDING",
    });
  }

  public async findOrgInvitations(
    organizationId: Types.ObjectId | string,
    options: FindOrgInvitationsOptions = {}
  ): Promise<{ invitations: IInvitationDocument[]; total: number; page: number; limit: number }> {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 20));
    const skip = (page - 1) * limit;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: Record<string, any> = { organizationId };

    if (options.status) {
      filter.status = options.status;
    } else {
      filter.status = "PENDING";
    }

    const [invitations, total] = await Promise.all([
      this.model
        .find(filter)
        .populate("invitedBy", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.model.countDocuments(filter).exec(),
    ]);

    return {
      invitations,
      total,
      page,
      limit,
    };
  }
}

export const invitationRepository = new InvitationRepository();
