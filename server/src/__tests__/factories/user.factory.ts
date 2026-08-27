import { Types } from "mongoose";
import { User, IUser } from "../../models/user.model.js";

export class UserFactory {
  public static build(overrides: Partial<IUser> = {}): Partial<IUser> {
    const id = new Types.ObjectId().toString().slice(-6);
    return {
      name: `Test User ${id}`,
      email: `user_${id}@example.com`,
      passwordHash: "$argon2id$v=19$m=65536,t=3,p=4$dummyhashvalue",
      emailVerified: false,
      status: "ACTIVE",
      ...overrides,
    };
  }

  public static async create(overrides: Partial<IUser> = {}): Promise<IUser> {
    const data = this.build(overrides);
    return await User.create(data);
  }
}
