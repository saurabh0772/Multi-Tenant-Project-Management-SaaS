import { Types } from "mongoose";
import { BaseRepository } from "./base.repository.js";
import { User, IUserDocument } from "../models/user.model.js";

export class UserRepository extends BaseRepository<IUserDocument> {
  constructor() {
    super(User);
  }

  public async findByEmail(
    email: string,
    selectPasswordHash: boolean = false
  ): Promise<IUserDocument | null> {
    const query = this.model.findOne({ email: email.toLowerCase().trim() });
    if (selectPasswordHash) {
      query.select("+passwordHash");
    }
    return await query.exec();
  }

  public async findActiveById(id: Types.ObjectId | string): Promise<IUserDocument | null> {
    return await this.findOne({ _id: id, status: "ACTIVE" });
  }

  public async updateLastLogin(id: Types.ObjectId | string): Promise<void> {
    await this.update({ _id: id }, { lastLoginAt: new Date() });
  }
}

export const userRepository = new UserRepository();
