import { Types } from "mongoose";
import { Membership, IMembership } from "../../models/membership.model.js";

export class MembershipFactory {
  public static build(overrides: Partial<IMembership> = {}): Partial<IMembership> {
    return {
      userId: new Types.ObjectId(),
      organizationId: new Types.ObjectId(),
      role: "MEMBER",
      status: "ACTIVE",
      joinedAt: new Date(),
      ...overrides,
    };
  }

  public static async create(overrides: Partial<IMembership> = {}): Promise<IMembership> {
    const data = this.build(overrides);
    return await Membership.create(data);
  }
}
