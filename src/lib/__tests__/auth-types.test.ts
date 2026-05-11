jest.mock("next-auth", () => ({}));
jest.mock("next-auth/jwt", () => ({}));

import { 
  ROLE_PERMISSIONS, 
  ROLE_LABELS,
  SYSTEM_ROLE_LABELS,
  DEFAULT_PERMISSIONS,
  aggregatePermissions,
  hasRole,
  hasAnyRole,
  isAdmin,
  canManageRoles,
  type Permissions,
} from "../auth-types";
import type { UserRole, SystemRoleName } from "../auth-types";

// ── Legacy ROLE_LABELS tests ─────────────────────────────────────

describe("ROLE_LABELS (legacy)", () => {
  it("has labels for all legacy roles", () => {
    expect(ROLE_LABELS.admin).toBe("Administrator");
    expect(ROLE_LABELS.manager).toBe("Change Manager");
    expect(ROLE_LABELS.approver).toBe("Approver");
    expect(ROLE_LABELS.implementer).toBe("Implementer");
    expect(ROLE_LABELS.requester).toBe("Requester");
    expect(ROLE_LABELS.viewer).toBe("Viewer");
  });
});

// ── System role labels ───────────────────────────────────────────

describe("SYSTEM_ROLE_LABELS", () => {
  it("has labels for all system roles", () => {
    const expectedRoles: SystemRoleName[] = [
      "admin", "change_manager", "approver", "implementer", 
      "requester", "viewer", "cab_member", "security_reviewer"
    ];
    
    expectedRoles.forEach(role => {
      expect(SYSTEM_ROLE_LABELS[role]).toBeDefined();
      expect(typeof SYSTEM_ROLE_LABELS[role]).toBe("string");
    });
  });

  it("has correct display names", () => {
    expect(SYSTEM_ROLE_LABELS.admin).toBe("Administrator");
    expect(SYSTEM_ROLE_LABELS.change_manager).toBe("Change Manager");
    expect(SYSTEM_ROLE_LABELS.cab_member).toBe("CAB Member");
    expect(SYSTEM_ROLE_LABELS.security_reviewer).toBe("Security Reviewer");
  });
});

// ── Legacy ROLE_PERMISSIONS tests ────────────────────────────────

describe("ROLE_PERMISSIONS (legacy)", () => {
  it("admin has all permissions", () => {
    const perms = ROLE_PERMISSIONS.admin;
    expect(perms.canManageUsers).toBe(true);
    expect(perms.canManageRoles).toBe(true);
    expect(perms.canManageChanges).toBe(true);
    expect(perms.canApproveChanges).toBe(true);
    expect(perms.canManageReleases).toBe(true);
    expect(perms.canEditSettings).toBe(true);
    expect(perms.canViewMetrics).toBe(true);
    expect(perms.canViewAllData).toBe(true);
  });

  it("manager cannot manage users or edit settings", () => {
    const perms = ROLE_PERMISSIONS.manager;
    expect(perms.canManageUsers).toBe(false);
    expect(perms.canManageRoles).toBe(false);
    expect(perms.canEditSettings).toBe(false);
    expect(perms.canManageChanges).toBe(true);
    expect(perms.canApproveChanges).toBe(true);
    expect(perms.canManageReleases).toBe(true);
  });

  it("covers all defined legacy roles", () => {
    const roles: UserRole[] = ["admin", "manager", "approver", "implementer", "requester", "viewer"];
    roles.forEach((role) => {
      expect(ROLE_PERMISSIONS[role]).toBeDefined();
      expect(typeof ROLE_PERMISSIONS[role].canViewMetrics).toBe("boolean");
    });
  });
});

// ── DEFAULT_PERMISSIONS ──────────────────────────────────────────

describe("DEFAULT_PERMISSIONS", () => {
  it("has all permissions set to false", () => {
    expect(DEFAULT_PERMISSIONS.canManageUsers).toBe(false);
    expect(DEFAULT_PERMISSIONS.canManageRoles).toBe(false);
    expect(DEFAULT_PERMISSIONS.canManageChanges).toBe(false);
    expect(DEFAULT_PERMISSIONS.canApproveChanges).toBe(false);
    expect(DEFAULT_PERMISSIONS.canImplementChanges).toBe(false);
    expect(DEFAULT_PERMISSIONS.canManageReleases).toBe(false);
    expect(DEFAULT_PERMISSIONS.canEditSettings).toBe(false);
    expect(DEFAULT_PERMISSIONS.canViewMetrics).toBe(false);
    expect(DEFAULT_PERMISSIONS.canViewAllData).toBe(false);
  });

  it("has all 9 permission keys", () => {
    expect(Object.keys(DEFAULT_PERMISSIONS)).toHaveLength(9);
  });
});

// ── aggregatePermissions ─────────────────────────────────────────

describe("aggregatePermissions", () => {
  it("returns default permissions for empty array", () => {
    const result = aggregatePermissions([]);
    expect(result).toEqual(DEFAULT_PERMISSIONS);
  });

  it("returns single role permissions unchanged", () => {
    const singleRole: Partial<Permissions> = {
      canManageChanges: true,
      canViewMetrics: true,
    };
    const result = aggregatePermissions([singleRole]);
    expect(result.canManageChanges).toBe(true);
    expect(result.canViewMetrics).toBe(true);
    expect(result.canManageUsers).toBe(false);
  });

  it("uses OR logic to combine permissions from multiple roles", () => {
    const approverRole: Partial<Permissions> = {
      canApproveChanges: true,
      canViewMetrics: true,
    };
    const implementerRole: Partial<Permissions> = {
      canImplementChanges: true,
      canViewMetrics: true,
    };
    
    const result = aggregatePermissions([approverRole, implementerRole]);
    
    expect(result.canApproveChanges).toBe(true);
    expect(result.canImplementChanges).toBe(true);
    expect(result.canViewMetrics).toBe(true);
    expect(result.canManageUsers).toBe(false);
    expect(result.canManageChanges).toBe(false);
  });

  it("combines all permissions when one role has all", () => {
    const limitedRole: Partial<Permissions> = {
      canViewMetrics: true,
    };
    const adminRole: Partial<Permissions> = {
      canManageUsers: true,
      canManageRoles: true,
      canManageChanges: true,
      canApproveChanges: true,
      canImplementChanges: true,
      canManageReleases: true,
      canEditSettings: true,
      canViewMetrics: true,
      canViewAllData: true,
    };
    
    const result = aggregatePermissions([limitedRole, adminRole]);
    
    // All should be true because admin has all
    Object.values(result).forEach(v => expect(v).toBe(true));
  });

  it("handles undefined permission values as false", () => {
    const partialRole: Partial<Permissions> = {
      canViewMetrics: true,
      // other permissions are undefined
    };
    
    const result = aggregatePermissions([partialRole]);
    
    expect(result.canViewMetrics).toBe(true);
    expect(result.canManageUsers).toBe(false);
    expect(result.canApproveChanges).toBe(false);
  });
});

// ── hasRole ──────────────────────────────────────────────────────

describe("hasRole", () => {
  it("returns true when user has the role", () => {
    expect(hasRole(["admin", "approver"], "admin")).toBe(true);
    expect(hasRole(["approver"], "approver")).toBe(true);
  });

  it("returns false when user does not have the role", () => {
    expect(hasRole(["approver"], "admin")).toBe(false);
    expect(hasRole([], "admin")).toBe(false);
  });

  it("handles empty roles array", () => {
    expect(hasRole([], "admin")).toBe(false);
  });
});

// ── hasAnyRole ───────────────────────────────────────────────────

describe("hasAnyRole", () => {
  it("returns true when user has at least one of the roles", () => {
    expect(hasAnyRole(["approver", "viewer"], ["admin", "approver"])).toBe(true);
    expect(hasAnyRole(["admin"], ["admin", "change_manager"])).toBe(true);
  });

  it("returns false when user has none of the roles", () => {
    expect(hasAnyRole(["viewer"], ["admin", "change_manager"])).toBe(false);
    expect(hasAnyRole([], ["admin"])).toBe(false);
  });

  it("handles empty check array", () => {
    expect(hasAnyRole(["admin"], [])).toBe(false);
  });

  it("handles both empty arrays", () => {
    expect(hasAnyRole([], [])).toBe(false);
  });
});

// ── isAdmin ──────────────────────────────────────────────────────

describe("isAdmin", () => {
  it("returns true when user has admin role", () => {
    expect(isAdmin(["admin"])).toBe(true);
    expect(isAdmin(["admin", "approver"])).toBe(true);
  });

  it("returns false when user does not have admin role", () => {
    expect(isAdmin(["change_manager"])).toBe(false);
    expect(isAdmin(["approver", "implementer"])).toBe(false);
    expect(isAdmin([])).toBe(false);
  });
});

// ── canManageRoles ───────────────────────────────────────────────

describe("canManageRoles", () => {
  it("returns true for admin users", () => {
    const permissions: Permissions = { ...DEFAULT_PERMISSIONS };
    expect(canManageRoles(["admin"], permissions)).toBe(true);
  });

  it("returns true when user has canManageRoles permission", () => {
    const permissions: Permissions = { ...DEFAULT_PERMISSIONS, canManageRoles: true };
    expect(canManageRoles(["change_manager"], permissions)).toBe(true);
  });

  it("returns false for non-admin without canManageRoles permission", () => {
    const permissions: Permissions = { ...DEFAULT_PERMISSIONS };
    expect(canManageRoles(["approver"], permissions)).toBe(false);
    expect(canManageRoles([], permissions)).toBe(false);
  });
});
