import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/jwt.js";
import { AppError } from "../utils/AppError.js";
import { OrganizationRole } from "../constants/roles.js";

export interface OrganizationContext {
  id: string;
  membershipId: string;
  role: OrganizationRole;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: {
        id: string;
        sessionId: string;
      };
      organization?: OrganizationContext;
    }
  }
}

export const authenticate = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new AppError("Authentication token required", 401, "UNAUTHORIZED");
  }

  const token = authHeader.split(" ")[1];
  const payload = verifyAccessToken(token);

  req.user = {
    id: payload.sub,
    sessionId: payload.sessionId,
  };

  next();
};
