import { describe, it, expect } from "vitest";
import { ROLES, OrganizationRole } from "../../constants/roles.js";
import {
  PERMISSIONS,
  Permission,
  ROLE_PERMISSIONS,
} from "../../constants/permissions.js";
import { authorizationService } from "../../services/authorization.service.js";

describe("Role-Permission Matrix Specification", () => {
  const allPermissions: Permission[] = Object.values(PERMISSIONS);
  const allRoles: OrganizationRole[] = Object.values(ROLES);

  it("should have explicit role-permission definitions for all 4 roles", () => {
    allRoles.forEach((role) => {
      expect(ROLE_PERMISSIONS[role]).toBeDefined();
      expect(Array.isArray(ROLE_PERMISSIONS[role])).toBe(true);
    });
  });

  it("should restrict ORGANIZATION_DELETE strictly to OWNER", () => {
    expect(
      authorizationService.hasPermission(
        ROLES.OWNER,
        PERMISSIONS.ORGANIZATION_DELETE
      )
    ).toBe(true);

    expect(
      authorizationService.hasPermission(
        ROLES.ADMIN,
        PERMISSIONS.ORGANIZATION_DELETE
      )
    ).toBe(false);

    expect(
      authorizationService.hasPermission(
        ROLES.MANAGER,
        PERMISSIONS.ORGANIZATION_DELETE
      )
    ).toBe(false);

    expect(
      authorizationService.hasPermission(
        ROLES.MEMBER,
        PERMISSIONS.ORGANIZATION_DELETE
      )
    ).toBe(false);
  });

  it("should grant ADMIN all permissions except ORGANIZATION_DELETE", () => {
    const adminPermissions = ROLE_PERMISSIONS[ROLES.ADMIN];
    expect(adminPermissions).not.toContain(PERMISSIONS.ORGANIZATION_DELETE);

    const expectedAdminCount = allPermissions.length - 1;
    expect(adminPermissions.length).toBe(expectedAdminCount);
  });

  it("should enforce correct permissions for MANAGER role", () => {
    expect(
      authorizationService.hasPermission(
        ROLES.MANAGER,
        PERMISSIONS.PROJECT_CREATE
      )
    ).toBe(true);
    expect(
      authorizationService.hasPermission(
        ROLES.MANAGER,
        PERMISSIONS.TASK_ASSIGN
      )
    ).toBe(true);
    expect(
      authorizationService.hasPermission(
        ROLES.MANAGER,
        PERMISSIONS.MEMBER_INVITE
      )
    ).toBe(false);
    expect(
      authorizationService.hasPermission(
        ROLES.MANAGER,
        PERMISSIONS.ORGANIZATION_UPDATE
      )
    ).toBe(false);
  });

  it("should enforce correct read/collaboration permissions for MEMBER role", () => {
    expect(
      authorizationService.hasPermission(
        ROLES.MEMBER,
        PERMISSIONS.ORGANIZATION_READ
      )
    ).toBe(true);
    expect(
      authorizationService.hasPermission(
        ROLES.MEMBER,
        PERMISSIONS.PROJECT_READ
      )
    ).toBe(true);
    expect(
      authorizationService.hasPermission(
        ROLES.MEMBER,
        PERMISSIONS.TASK_READ
      )
    ).toBe(true);
    expect(
      authorizationService.hasPermission(
        ROLES.MEMBER,
        PERMISSIONS.COMMENT_CREATE
      )
    ).toBe(true);

    // Write/management exclusions for MEMBER
    expect(
      authorizationService.hasPermission(
        ROLES.MEMBER,
        PERMISSIONS.PROJECT_CREATE
      )
    ).toBe(false);
    expect(
      authorizationService.hasPermission(
        ROLES.MEMBER,
        PERMISSIONS.TASK_ASSIGN
      )
    ).toBe(false);
    expect(
      authorizationService.hasPermission(
        ROLES.MEMBER,
        PERMISSIONS.PROJECT_DELETE
      )
    ).toBe(false);
    expect(
      authorizationService.hasPermission(
        ROLES.MEMBER,
        PERMISSIONS.MEMBER_INVITE
      )
    ).toBe(false);
  });

  it("should test every permission against all roles explicitly", () => {
    allPermissions.forEach((permission) => {
      // OWNER has all permissions
      expect(
        authorizationService.hasPermission(ROLES.OWNER, permission)
      ).toBe(true);

      // ADMIN has all permissions except ORGANIZATION_DELETE
      if (permission === PERMISSIONS.ORGANIZATION_DELETE) {
        expect(
          authorizationService.hasPermission(ROLES.ADMIN, permission)
        ).toBe(false);
      } else {
        expect(
          authorizationService.hasPermission(ROLES.ADMIN, permission)
        ).toBe(true);
      }
    });
  });
});
