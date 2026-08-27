import { Types } from "mongoose";
import { BaseRepository } from "./base.repository.js";
import { Membership, IMembershipDocument } from "../models/membership.model.js";

export interface FindOrgMembersOptions {
  role?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export class MembershipRepository extends BaseRepository<IMembershipDocument> {
  constructor() {
    super(Membership);
  }

  public async findByUserAndOrg(
    userId: Types.ObjectId | string,
    organizationId: Types.ObjectId | string
  ): Promise<IMembershipDocument | null> {
    return await this.findOne({ userId, organizationId });
  }

  /**
   * Membership lookup uses an indexed compound query ({ userId: 1, organizationId: 1 })
   */
  public async findActiveMembership(
    userId: Types.ObjectId | string,
    organizationId: Types.ObjectId | string
  ): Promise<IMembershipDocument | null> {
    return await this.findOne({ userId, organizationId, status: "ACTIVE" });
  }

  /**
   * Tenant-scoped lookup of specific member document by ID and Organization ID
   */
  public async findMemberInOrg(
    memberId: Types.ObjectId | string,
    organizationId: Types.ObjectId | string
  ): Promise<IMembershipDocument | null> {
    return await this.model
      .findOne({ _id: memberId, organizationId })
      .populate("userId", "name email avatarUrl status")
      .exec();
  }

  /**
   * Counts active OWNER memberships in an organization (for owner protection invariant)
   */
  public async countOrgOwners(
    organizationId: Types.ObjectId | string
  ): Promise<number> {
    return await this.count({
      organizationId,
      role: "OWNER",
      status: "ACTIVE",
    });
  }

  /**
   * Paginated listing of organization members
   */
  public async findOrgMembers(
    organizationId: Types.ObjectId | string,
    options: FindOrgMembersOptions = {}
  ): Promise<{ members: IMembershipDocument[]; total: number; page: number; limit: number }> {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 20));
    const skip = (page - 1) * limit;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: Record<string, any> = { organizationId };

    if (options.role) {
      filter.role = options.role;
    }

    if (options.status) {
      filter.status = options.status;
    } else {
      filter.status = { $ne: "REMOVED" };
    }

    const [members, total] = await Promise.all([
      this.model
        .find(filter)
        .populate("userId", "name email avatarUrl status")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.model.countDocuments(filter).exec(),
    ]);

    return {
      members,
      total,
      page,
      limit,
    };
  }

  public async findUserMemberships(
    userId: Types.ObjectId | string
  ): Promise<IMembershipDocument[]> {
    return await this.findMany({ userId, status: "ACTIVE" });
  }
}

export const membershipRepository = new MembershipRepository();
