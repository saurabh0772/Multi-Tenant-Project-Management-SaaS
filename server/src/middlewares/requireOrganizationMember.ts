import { Request, Response, NextFunction } from "express";
import { authorizationService } from "../services/authorization.service.js";
import { AppError } from "../utils/AppError.js";

export const requireOrganizationMember = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError("Authentication required", 401, "UNAUTHORIZED");
    }

    const organizationId =
      req.params.organizationId ||
      (req.headers["x-organization-id"] as string);

    if (!organizationId) {
      throw new AppError(
        "Organization ID required",
        400,
        "VALIDATION_ERROR"
      );
    }

    // Protect against conflicting tenant claims in request body
    if (
      req.body &&
      req.body.organizationId &&
      req.body.organizationId !== organizationId
    ) {
      throw new AppError(
        "Conflicting organization ID in request body",
        400,
        "VALIDATION_ERROR"
      );
    }

    const membership = await authorizationService.assertOrganizationMember(
      req.user.id,
      organizationId
    );

    req.organization = {
      id: organizationId,
      membershipId: membership._id.toString(),
      role: membership.role,
    };

    next();
  } catch (error) {
    next(error);
  }
};
