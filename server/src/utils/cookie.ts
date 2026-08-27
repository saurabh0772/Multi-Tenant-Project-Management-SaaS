import { Response } from "express";
import { env } from "../config/env.js";

const COOKIE_NAME = "refreshToken";

export const setRefreshTokenCookie = (
  res: Response,
  rawRefreshToken: string
): void => {
  const maxAgeMs = env.REFRESH_TOKEN_EXPIRES_IN_DAYS * 24 * 60 * 60 * 1000;
  res.cookie(COOKIE_NAME, rawRefreshToken, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/v1/auth",
    maxAge: maxAgeMs,
  });
};

export const clearRefreshTokenCookie = (res: Response): void => {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/v1/auth",
  });
};
