import { Types } from "mongoose";
import { BaseRepository } from "./base.repository.js";
import { Organization, IOrganizationDocument } from "../models/organization.model.js";

export class OrganizationRepository extends BaseRepository<IOrganizationDocument> {
  constructor() {
    super(Organization);
  }

  public async findBySlug(slug: string): Promise<IOrganizationDocument | null> {
    return await this.findOne({ slug: slug.toLowerCase().trim() });
  }

  public async findByOwner(ownerId: Types.ObjectId | string): Promise<IOrganizationDocument[]> {
    return await this.findMany({ ownerId, status: "ACTIVE" });
  }
}

export const organizationRepository = new OrganizationRepository();
