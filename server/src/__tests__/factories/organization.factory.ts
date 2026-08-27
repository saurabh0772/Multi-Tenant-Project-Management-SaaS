import { Types } from "mongoose";
import { Organization, IOrganization } from "../../models/organization.model.js";

export class OrganizationFactory {
  public static build(overrides: Partial<IOrganization> = {}): Partial<IOrganization> {
    const id = new Types.ObjectId().toString().slice(-6);
    return {
      name: `Test Org ${id}`,
      slug: `test-org-${id}`,
      ownerId: new Types.ObjectId(),
      status: "ACTIVE",
      settings: {
        timezone: "UTC",
        dateFormat: "YYYY-MM-DD",
      },
      ...overrides,
    };
  }

  public static async create(overrides: Partial<IOrganization> = {}): Promise<IOrganization> {
    const data = this.build(overrides);
    return await Organization.create(data);
  }
}
