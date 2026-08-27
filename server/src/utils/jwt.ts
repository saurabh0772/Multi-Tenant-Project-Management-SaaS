import crypto from "crypto";
import jwt, { SignOptions } from "jsonwebtoken";
import { env } from "../config/env.js";
import { AppError } from "./AppError.js";

export interface AccessTokenPayload {
  sub: string;
  sessionId: string;
  type: "access";
  iat?: number;
  exp?: number;
}

/**
 * Signs a short-lived access JWT
 */
export const generateAccessToken = (
  userId: string,
  sessionId: string
): string => {
  const payload: AccessTokenPayload = {
    sub: userId,
    sessionId,
    type: "access",
  };
  const options: SignOptions = {
    expiresIn: env.ACCESS_TOKEN_EXPIRES_IN as unknown as SignOptions["expiresIn"],
  };
  return jwt.sign(payload, env.ACCESS_TOKEN_SECRET, options);
};

/**
 * Verifies an access JWT and enforces type === "access"
 */
export const verifyAccessToken = (token: string): AccessTokenPayload => {
  try {
    const decoded = jwt.verify(
      token,
      env.ACCESS_TOKEN_SECRET
    ) as AccessTokenPayload;
    if (decoded.type !== "access") {
      throw new AppError("Invalid access token type", 401, "INVALID_ACCESS_TOKEN");
    }
    return decoded;
  } catch (error) {
    if (error instanceof AppError) throw error;
    if (error instanceof jwt.TokenExpiredError) {
      throw new AppError("Access token has expired", 401, "EXPIRED_ACCESS_TOKEN");
    }
    throw new AppError("Invalid access token", 401, "INVALID_ACCESS_TOKEN");
  }
};

/**
 * Computes SHA-256 hash of an opaque refresh token
 */
export const hashRefreshToken = (rawToken: string): string => {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
};

/**
 * Generates a cryptographically random opaque refresh token and its SHA-256 hash
 */
export const generateOpaqueRefreshToken = (): {
  rawToken: string;
  tokenHash: string;
} => {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashRefreshToken(rawToken);
  return { rawToken, tokenHash };
};
