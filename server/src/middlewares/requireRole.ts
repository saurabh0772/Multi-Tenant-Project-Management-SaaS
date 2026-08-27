import { Request, Response, NextFunction } from "express";
import { OrganizationRole } from "../constants/roles.js";
import { authorizationService } from "../services/authorization.service.js";
import { AppError } from "../utils/AppError.js";

export const requireRole = (...allowedRoles: OrganizationRole[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.organization) {
      throw new AppError(
        "Active organization membership required",
        403,
        "MEMBERSHIP_REQUIRED"
      );
    }

    const isAllowed = authorizationService.hasRole(
      req.organization.role,
      allowedRoles
    );

    if (!isAllowed) {
      throw new AppError(
        "You do not have the required role to perform this action",
        403,
        "FORBIDDEN"
      );
    }

    next();
  };
};
