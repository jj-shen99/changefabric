jest.mock("next-auth", () => ({}));
jest.mock("next-auth/jwt", () => ({}));

import { ROLE_PERMISSIONS, ROLE_LABELS } from "../auth-types";
import type { UserRole } from "../auth-types";

describe("ROLE_LABELS", () => {
  it("has labels for all roles", () => {
    expect(ROLE_LABELS.admin).toBe("Administrator");
    expect(ROLE_LABELS.manager).toBe("Release Manager");
  });
});

describe("ROLE_PERMISSIONS", () => {
  it("admin has all permissions", () => {
    const perms = ROLE_PERMISSIONS.admin;
    expect(perms.canManageUsers).toBe(true);
    expect(perms.canManageChanges).toBe(true);
    expect(perms.canApproveChanges).toBe(true);
    expect(perms.canManageReleases).toBe(true);
    expect(perms.canEditSettings).toBe(true);
    expect(perms.canViewMetrics).toBe(true);
  });

  it("manager cannot manage users or edit settings", () => {
    const perms = ROLE_PERMISSIONS.manager;
    expect(perms.canManageUsers).toBe(false);
    expect(perms.canEditSettings).toBe(false);
    expect(perms.canManageChanges).toBe(true);
    expect(perms.canApproveChanges).toBe(true);
    expect(perms.canManageReleases).toBe(true);
  });

  it("covers all defined roles", () => {
    const roles: UserRole[] = ["admin", "manager"];
    roles.forEach((role) => {
      expect(ROLE_PERMISSIONS[role]).toBeDefined();
      expect(typeof ROLE_PERMISSIONS[role].canViewMetrics).toBe("boolean");
    });
  });
});
