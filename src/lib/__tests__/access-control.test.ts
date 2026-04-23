/**
 * Access control & role-based permission tests.
 * Covers boundary cases, negative cases, and role permission matrices.
 */

jest.mock("next-auth", () => ({}));
jest.mock("next-auth/jwt", () => ({}));

import { ROLE_PERMISSIONS, ROLE_LABELS, type UserRole } from "../auth-types";

// ── Role definitions ──────────────────────────────────────────────

describe("UserRole type coverage", () => {
  const ALL_ROLES: UserRole[] = ["admin", "manager"];

  it("every role has a label", () => {
    ALL_ROLES.forEach((role) => {
      expect(ROLE_LABELS[role]).toBeDefined();
      expect(typeof ROLE_LABELS[role]).toBe("string");
      expect(ROLE_LABELS[role].length).toBeGreaterThan(0);
    });
  });

  it("every role has a permission object", () => {
    ALL_ROLES.forEach((role) => {
      expect(ROLE_PERMISSIONS[role]).toBeDefined();
    });
  });

  it("no extra roles exist in ROLE_PERMISSIONS", () => {
    const keys = Object.keys(ROLE_PERMISSIONS);
    expect(keys.sort()).toEqual(ALL_ROLES.sort());
  });

  it("no extra roles exist in ROLE_LABELS", () => {
    const keys = Object.keys(ROLE_LABELS);
    expect(keys.sort()).toEqual(ALL_ROLES.sort());
  });
});

// ── Admin permissions ─────────────────────────────────────────────

describe("Admin permissions", () => {
  const perms = ROLE_PERMISSIONS.admin;

  it("has all permissions set to true", () => {
    Object.values(perms).forEach((v) => {
      expect(v).toBe(true);
    });
  });

  it("can manage users", () => expect(perms.canManageUsers).toBe(true));
  it("can manage changes", () => expect(perms.canManageChanges).toBe(true));
  it("can approve changes", () => expect(perms.canApproveChanges).toBe(true));
  it("can manage releases", () => expect(perms.canManageReleases).toBe(true));
  it("can edit settings", () => expect(perms.canEditSettings).toBe(true));
  it("can view metrics", () => expect(perms.canViewMetrics).toBe(true));
  it("can view all data", () => expect(perms.canViewAllData).toBe(true));
});

// ── Manager permissions ───────────────────────────────────────────

describe("Manager permissions", () => {
  const perms = ROLE_PERMISSIONS.manager;

  it("cannot manage users", () => expect(perms.canManageUsers).toBe(false));
  it("cannot edit settings", () => expect(perms.canEditSettings).toBe(false));
  it("cannot view all data", () => expect(perms.canViewAllData).toBe(false));
  it("can manage changes", () => expect(perms.canManageChanges).toBe(true));
  it("can approve changes", () => expect(perms.canApproveChanges).toBe(true));
  it("can manage releases", () => expect(perms.canManageReleases).toBe(true));
  it("can view metrics", () => expect(perms.canViewMetrics).toBe(true));
});

// ── Permission boundary: admin vs manager ─────────────────────────

describe("Permission boundaries between roles", () => {
  it("admin has strictly more permissions than manager", () => {
    const adminPerms = ROLE_PERMISSIONS.admin;
    const managerPerms = ROLE_PERMISSIONS.manager;

    // Every permission manager has, admin also has
    (Object.keys(managerPerms) as (keyof typeof managerPerms)[]).forEach((key) => {
      if (managerPerms[key]) {
        expect(adminPerms[key]).toBe(true);
      }
    });

    // Admin has at least one permission manager doesn't
    const adminOnlyPerms = (Object.keys(adminPerms) as (keyof typeof adminPerms)[]).filter(
      (key) => adminPerms[key] && !managerPerms[key]
    );
    expect(adminOnlyPerms.length).toBeGreaterThan(0);
  });

  it("canManageUsers is admin-only", () => {
    expect(ROLE_PERMISSIONS.admin.canManageUsers).toBe(true);
    expect(ROLE_PERMISSIONS.manager.canManageUsers).toBe(false);
  });

  it("canEditSettings is admin-only", () => {
    expect(ROLE_PERMISSIONS.admin.canEditSettings).toBe(true);
    expect(ROLE_PERMISSIONS.manager.canEditSettings).toBe(false);
  });

  it("canViewAllData is admin-only", () => {
    expect(ROLE_PERMISSIONS.admin.canViewAllData).toBe(true);
    expect(ROLE_PERMISSIONS.manager.canViewAllData).toBe(false);
  });
});

// ── Negative: viewer role removed ─────────────────────────────────

describe("Removed viewer role", () => {
  it("viewer role does not exist in ROLE_PERMISSIONS", () => {
    expect((ROLE_PERMISSIONS as Record<string, unknown>)["viewer"]).toBeUndefined();
  });

  it("viewer role does not exist in ROLE_LABELS", () => {
    expect((ROLE_LABELS as Record<string, unknown>)["viewer"]).toBeUndefined();
  });
});

// ── Permission object shape ───────────────────────────────────────

describe("Permission object shape consistency", () => {
  const allPermKeys = Object.keys(ROLE_PERMISSIONS.admin);

  it("all roles have the same permission keys", () => {
    (Object.keys(ROLE_PERMISSIONS) as UserRole[]).forEach((role) => {
      const keys = Object.keys(ROLE_PERMISSIONS[role]);
      expect(keys.sort()).toEqual(allPermKeys.sort());
    });
  });

  it("all permission values are booleans", () => {
    (Object.keys(ROLE_PERMISSIONS) as UserRole[]).forEach((role) => {
      Object.values(ROLE_PERMISSIONS[role]).forEach((v) => {
        expect(typeof v).toBe("boolean");
      });
    });
  });
});

// ── Data visibility rules ─────────────────────────────────────────

describe("Data visibility rules", () => {
  function canSeeAllData(role: UserRole): boolean {
    return ROLE_PERMISSIONS[role].canViewAllData;
  }

  it("admin can see all data", () => {
    expect(canSeeAllData("admin")).toBe(true);
  });

  it("manager cannot see all data", () => {
    expect(canSeeAllData("manager")).toBe(false);
  });

  it("only admin role has canViewAllData=true", () => {
    (Object.keys(ROLE_PERMISSIONS) as UserRole[]).forEach((role) => {
      if (role === "admin") {
        expect(ROLE_PERMISSIONS[role].canViewAllData).toBe(true);
      } else {
        expect(ROLE_PERMISSIONS[role].canViewAllData).toBe(false);
      }
    });
  });
});
