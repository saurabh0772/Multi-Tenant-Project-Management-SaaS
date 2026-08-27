import { env } from "../config/env.js";
import { userRepository } from "../repositories/user.repository.js";
import { sessionRepository } from "../repositories/session.repository.js";
import { hashPassword, verifyPassword } from "../utils/password.js";
import {
  generateAccessToken,
  generateOpaqueRefreshToken,
  hashRefreshToken,
} from "../utils/jwt.js";
import { AppError } from "../utils/AppError.js";
import { RegisterInput, LoginInput } from "../validators/auth.schema.js";

export interface RequestMeta {
  userAgent?: string;
  ipAddress?: string;
}

export class AuthService {
  public async register(input: RegisterInput, meta: RequestMeta) {
    const email = input.email.toLowerCase().trim();

    const existingUser = await userRepository.findByEmail(email);
    if (existingUser) {
      throw new AppError("Email is already registered", 409, "DUPLICATE_RESOURCE");
    }

    const passwordHash = await hashPassword(input.password);
    const user = await userRepository.create({
      name: input.name,
      email,
      passwordHash,
      emailVerified: false,
      status: "ACTIVE",
    });

    const { rawToken, tokenHash } = generateOpaqueRefreshToken();
    const expiresAt = new Date(
      Date.now() + env.REFRESH_TOKEN_EXPIRES_IN_DAYS * 24 * 60 * 60 * 1000
    );

    const session = await sessionRepository.create({
      userId: user._id,
      tokenHash,
      userAgent: meta.userAgent || null,
      ipAddress: meta.ipAddress || null,
      expiresAt,
    });

    const accessToken = generateAccessToken(
      user._id.toString(),
      session._id.toString()
    );

    return {
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
      },
      accessToken,
      rawRefreshToken: rawToken,
    };
  }

  public async login(input: LoginInput, meta: RequestMeta) {
    const email = input.email.toLowerCase().trim();

    const user = await userRepository.findByEmail(email, true);
    if (!user) {
      throw new AppError("Invalid email or password", 401, "INVALID_CREDENTIALS");
    }

    const isPasswordValid = await verifyPassword(input.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new AppError("Invalid email or password", 401, "INVALID_CREDENTIALS");
    }

    if (user.status === "SUSPENDED") {
      throw new AppError("Account is suspended", 403, "ACCOUNT_SUSPENDED");
    }
    if (user.status === "DELETED") {
      throw new AppError("Account is deleted", 403, "ACCOUNT_DELETED");
    }

    await userRepository.updateLastLogin(user._id);

    const { rawToken, tokenHash } = generateOpaqueRefreshToken();
    const expiresAt = new Date(
      Date.now() + env.REFRESH_TOKEN_EXPIRES_IN_DAYS * 24 * 60 * 60 * 1000
    );

    const session = await sessionRepository.create({
      userId: user._id,
      tokenHash,
      userAgent: meta.userAgent || null,
      ipAddress: meta.ipAddress || null,
      expiresAt,
    });

    const accessToken = generateAccessToken(
      user._id.toString(),
      session._id.toString()
    );

    return {
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
      },
      accessToken,
      rawRefreshToken: rawToken,
    };
  }

  public async refresh(rawRefreshToken: string | undefined) {
    if (!rawRefreshToken) {
      throw new AppError("Refresh token missing", 401, "INVALID_REFRESH_TOKEN");
    }

    const presentedHash = hashRefreshToken(rawRefreshToken);
    const session = await sessionRepository.findByTokenHash(presentedHash);

    if (!session) {
      throw new AppError("Invalid refresh token", 401, "INVALID_REFRESH_TOKEN");
    }

    if (session.revokedAt) {
      throw new AppError("Session has been revoked", 401, "SESSION_REVOKED");
    }

    if (session.expiresAt.getTime() < Date.now()) {
      throw new AppError("Session has expired", 401, "SESSION_EXPIRED");
    }

    const user = await userRepository.findActiveById(session.userId);
    if (!user) {
      throw new AppError("User is inactive or deleted", 401, "UNAUTHORIZED");
    }

    const { rawToken: newRawToken, tokenHash: newTokenHash } =
      generateOpaqueRefreshToken();
    const newExpiresAt = new Date(
      Date.now() + env.REFRESH_TOKEN_EXPIRES_IN_DAYS * 24 * 60 * 60 * 1000
    );

    // Atomic rotation enforcing old token hash match
    const updatedSession = await sessionRepository.rotateTokenHashAtomically(
      session._id,
      presentedHash,
      newTokenHash,
      newExpiresAt
    );

    if (!updatedSession) {
      // Re-use attempt or race condition: revoke token family session
      await sessionRepository.revokeSession(session._id);
      throw new AppError(
        "Refresh token reuse detected or session modified",
        401,
        "INVALID_REFRESH_TOKEN"
      );
    }

    const accessToken = generateAccessToken(
      user._id.toString(),
      session._id.toString()
    );

    return {
      accessToken,
      newRawRefreshToken: newRawToken,
    };
  }

  public async logout(rawRefreshToken: string | undefined): Promise<void> {
    if (rawRefreshToken) {
      const tokenHash = hashRefreshToken(rawRefreshToken);
      await sessionRepository.revokeSessionByTokenHash(tokenHash);
    }
  }

  public async logoutAll(userId: string): Promise<void> {
    await sessionRepository.revokeAllUserSessions(userId);
  }

  public async getCurrentUser(userId: string) {
    const user = await userRepository.findActiveById(userId);
    if (!user) {
      throw new AppError("User not found", 404, "USER_NOT_FOUND");
    }

    return {
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl || null,
        emailVerified: user.emailVerified,
      },
    };
  }
}

export const authService = new AuthService();
