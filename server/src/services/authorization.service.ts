import { Types } from "mongoose";
import { membershipRepository } from "../repositories/membership.repository.js";
import { OrganizationRole } from "../constants/roles.js";
import { Permission, ROLE_PERMISSIONS } from "../constants/permissions.js";
import { AppError } from "../utils/AppError.js";
import { IMembershipDocument } from "../models/membership.model.js";

export class AuthorizationService {
  /**
   * Retrieves user membership record in an organization (regardless of status)
   */
  public async getMembership(
    userId: Types.ObjectId | string,
    organizationId: Types.ObjectId | string
  ): Promise<IMembershipDocument | null> {
    return await membershipRepository.findByUserAndOrg(userId, organizationId);
  }

  /**
   * Evaluates if user role matches allowed roles
   */
  public hasRole(
    userRole: OrganizationRole,
    allowedRoles: OrganizationRole[]
  ): boolean {
    return allowedRoles.includes(userRole);
  }

  /**
   * Evaluates if user role possesses a specific permission
   */
  public hasPermission(
    userRole: OrganizationRole,
    permission: Permission
  ): boolean {
    const permissions = ROLE_PERMISSIONS[userRole];
    return permissions ? permissions.includes(permission) : false;
  }

  /**
   * Asserts user has an active membership in the target organization
   */
  public async assertOrganizationMember(
    userId: Types.ObjectId | string,
    organizationId: Types.ObjectId | string
  ): Promise<IMembershipDocument> {
    const membership = await this.getMembership(userId, organizationId);

    if (!membership) {
      throw new AppError(
        "Active organization membership required",
        403,
        "MEMBERSHIP_REQUIRED"
      );
    }

    if (membership.status === "SUSPENDED") {
      throw new AppError(
        "Organization membership is suspended",
        403,
        "MEMBERSHIP_SUSPENDED"
      );
    }

    if (membership.status === "REMOVED") {
      throw new AppError(
        "Active organization membership required",
        403,
        "MEMBERSHIP_REQUIRED"
      );
    }

    return membership;
  }

  /**
   * Asserts user role has requested permission
   */
  public assertPermission(
    userRole: OrganizationRole,
    permission: Permission
  ): void {
    if (!this.hasPermission(userRole, permission)) {
      throw new AppError(
        "You do not have permission to perform this action",
        403,
        "FORBIDDEN"
      );
    }
  }
}

export const authorizationService = new AuthorizationService();
