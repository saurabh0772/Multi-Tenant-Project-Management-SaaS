import { Types } from "mongoose";
import { BaseRepository } from "./base.repository.js";
import { Session, ISessionDocument } from "../models/session.model.js";

export class SessionRepository extends BaseRepository<ISessionDocument> {
  constructor() {
    super(Session);
  }

  public async findSessionById(
    sessionId: Types.ObjectId | string
  ): Promise<ISessionDocument | null> {
    return await this.findById(sessionId);
  }

  public async findByTokenHash(tokenHash: string): Promise<ISessionDocument | null> {
    return await this.model.findOne({ tokenHash }).select("+tokenHash").exec();
  }

  public async findActiveUserSessions(
    userId: Types.ObjectId | string
  ): Promise<ISessionDocument[]> {
    return await this.findMany({
      userId,
      revokedAt: null,
      expiresAt: { $gt: new Date() },
    });
  }

  /**
   * Atomically rotates session tokenHash enforcing presented tokenHash, non-revoked status, and active expiration.
   */
  public async rotateTokenHashAtomically(
    sessionId: Types.ObjectId | string,
    oldTokenHash: string,
    newTokenHash: string,
    newExpiresAt: Date
  ): Promise<ISessionDocument | null> {
    return await this.model
      .findOneAndUpdate(
        {
          _id: sessionId,
          tokenHash: oldTokenHash,
          revokedAt: null,
          expiresAt: { $gt: new Date() },
        },
        {
          tokenHash: newTokenHash,
          expiresAt: newExpiresAt,
        },
        { new: true, runValidators: true }
      )
      .exec();
  }

  public async revokeSession(sessionId: Types.ObjectId | string): Promise<boolean> {
    const session = await this.update(
      { _id: sessionId },
      { revokedAt: new Date() }
    );
    return session !== null;
  }

  public async revokeSessionByTokenHash(tokenHash: string): Promise<boolean> {
    const session = await this.model
      .findOneAndUpdate(
        { tokenHash, revokedAt: null },
        { revokedAt: new Date() },
        { new: true }
      )
      .exec();
    return session !== null;
  }

  public async revokeAllUserSessions(
    userId: Types.ObjectId | string
  ): Promise<number> {
    const result = await this.model
      .updateMany(
        { userId, revokedAt: null },
        { revokedAt: new Date() }
      )
      .exec();
    return result.modifiedCount;
  }
}

export const sessionRepository = new SessionRepository();
