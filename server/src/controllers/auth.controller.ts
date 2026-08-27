import { Request, Response, NextFunction } from "express";
import { authService } from "../services/auth.service.js";
import { registerSchema, loginSchema } from "../validators/auth.schema.js";
import {
  setRefreshTokenCookie,
  clearRefreshTokenCookie,
} from "../utils/cookie.js";

export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const input = registerSchema.parse(req.body);
    const meta = {
      userAgent: req.headers["user-agent"],
      ipAddress: req.ip,
    };

    const result = await authService.register(input, meta);
    setRefreshTokenCookie(res, result.rawRefreshToken);

    res.status(201).json({
      success: true,
      data: {
        user: result.user,
        accessToken: result.accessToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const input = loginSchema.parse(req.body);
    const meta = {
      userAgent: req.headers["user-agent"],
      ipAddress: req.ip,
    };

    const result = await authService.login(input, meta);
    setRefreshTokenCookie(res, result.rawRefreshToken);

    res.status(200).json({
      success: true,
      data: {
        user: result.user,
        accessToken: result.accessToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const refresh = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const rawRefreshToken =
      req.cookies?.refreshToken || req.body?.refreshToken;

    const result = await authService.refresh(rawRefreshToken);
    setRefreshTokenCookie(res, result.newRawRefreshToken);

    res.status(200).json({
      success: true,
      data: {
        accessToken: result.accessToken,
        message: "Access token refreshed",
      },
    });
  } catch (error) {
    clearRefreshTokenCookie(res);
    next(error);
  }
};

export const logout = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const rawRefreshToken =
      req.cookies?.refreshToken || req.body?.refreshToken;

    await authService.logout(rawRefreshToken);
    clearRefreshTokenCookie(res);

    res.status(200).json({
      success: true,
      data: {
        message: "Logged out successfully",
      },
    });
  } catch (error) {
    clearRefreshTokenCookie(res);
    next(error);
  }
};

export const logoutAll = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;

    await authService.logoutAll(userId);
    clearRefreshTokenCookie(res);

    res.status(200).json({
      success: true,
      data: {
        message: "Logged out from all devices successfully",
      },
    });
  } catch (error) {
    clearRefreshTokenCookie(res);
    next(error);
  }
};

export const me = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;

    const result = await authService.getCurrentUser(userId);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
