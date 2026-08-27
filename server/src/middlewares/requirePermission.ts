import { Request, Response, NextFunction } from "express";
import { Permission } from "../constants/permissions.js";
import { authorizationService } from "../services/authorization.service.js";
import { AppError } from "../utils/AppError.js";

export const requirePermission = (...permissions: Permission[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.organization) {
      throw new AppError(
        "Active organization membership required",
        403,
        "MEMBERSHIP_REQUIRED"
      );
    }

    // AND semantics: ALL required permissions must be granted to the user's role
    const hasAllPermissions = permissions.every((permission) =>
      authorizationService.hasPermission(req.organization!.role, permission)
    );

    if (!hasAllPermissions) {
      throw new AppError(
        "You do not have permission to perform this action",
        403,
        "FORBIDDEN"
      );
    }

    next();
  };
};
