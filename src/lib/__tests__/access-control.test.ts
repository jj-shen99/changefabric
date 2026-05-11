/**
 * Access control & role-based permission tests.
 * Covers boundary cases, negative cases, and role permission matrices.
 * Updated for multi-role system.
 */

jest.mock("next-auth", () => ({}));
jest.mock("next-auth/jwt", () => ({}));

import { 
  ROLE_PERMISSIONS, 
  ROLE_LABELS, 
  SYSTEM_ROLE_LABELS,
  aggregatePermissions,
  type UserRole,
  type SystemRoleName,
  type Permissions,
} from "../auth-types";

// ── Legacy UserRole type coverage ─────────────────────────────────

describe("Legacy UserRole type coverage", () => {
  const ALL_LEGACY_ROLES: UserRole[] = ["admin", "manager", "approver", "implementer", "requester", "viewer"];

  it("every legacy role has a label", () => {
    ALL_LEGACY_ROLES.forEach((role) => {
      expect(ROLE_LABELS[role]).toBeDefined();
      expect(typeof ROLE_LABELS[role]).toBe("string");
      expect(ROLE_LABELS[role].length).toBeGreaterThan(0);
    });
  });

  it("every legacy role has a permission object", () => {
    ALL_LEGACY_ROLES.forEach((role) => {
      expect(ROLE_PERMISSIONS[role]).toBeDefined();
    });
  });
});

// ── System role coverage ──────────────────────────────────────────

describe("System role coverage", () => {
  const ALL_SYSTEM_ROLES: SystemRoleName[] = [
    "admin", "change_manager", "approver", "implementer", 
    "requester", "viewer", "cab_member", "security_reviewer"
  ];

  it("every system role has a label", () => {
    ALL_SYSTEM_ROLES.forEach((role) => {
      expect(SYSTEM_ROLE_LABELS[role]).toBeDefined();
      expect(typeof SYSTEM_ROLE_LABELS[role]).toBe("string");
      expect(SYSTEM_ROLE_LABELS[role].length).toBeGreaterThan(0);
    });
  });

  it("has exactly 8 system roles", () => {
    expect(Object.keys(SYSTEM_ROLE_LABELS)).toHaveLength(8);
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
  it("can manage roles", () => expect(perms.canManageRoles).toBe(true));
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
  it("cannot manage roles", () => expect(perms.canManageRoles).toBe(false));
  it("cannot edit settings", () => expect(perms.canEditSettings).toBe(false));
  it("can manage changes", () => expect(perms.canManageChanges).toBe(true));
  it("can approve changes", () => expect(perms.canApproveChanges).toBe(true));
  it("can manage releases", () => expect(perms.canManageReleases).toBe(true));
  it("can view metrics", () => expect(perms.canViewMetrics).toBe(true));
  it("can view all data", () => expect(perms.canViewAllData).toBe(true));
});

// ── Approver permissions ──────────────────────────────────────────

describe("Approver permissions", () => {
  const perms = ROLE_PERMISSIONS.approver;

  it("can approve changes", () => expect(perms.canApproveChanges).toBe(true));
  it("can view metrics", () => expect(perms.canViewMetrics).toBe(true));
  it("cannot manage users", () => expect(perms.canManageUsers).toBe(false));
  it("cannot manage changes", () => expect(perms.canManageChanges).toBe(false));
  it("cannot implement changes", () => expect(perms.canImplementChanges).toBe(false));
});

// ── Implementer permissions ───────────────────────────────────────

describe("Implementer permissions", () => {
  const perms = ROLE_PERMISSIONS.implementer;

  it("can implement changes", () => expect(perms.canImplementChanges).toBe(true));
  it("can view metrics", () => expect(perms.canViewMetrics).toBe(true));
  it("cannot approve changes", () => expect(perms.canApproveChanges).toBe(false));
  it("cannot manage changes", () => expect(perms.canManageChanges).toBe(false));
});

// ── Requester permissions ─────────────────────────────────────────

describe("Requester permissions", () => {
  const perms = ROLE_PERMISSIONS.requester;

  it("can manage changes (create/edit own)", () => expect(perms.canManageChanges).toBe(true));
  it("cannot approve changes", () => expect(perms.canApproveChanges).toBe(false));
  it("cannot implement changes", () => expect(perms.canImplementChanges).toBe(false));
  it("cannot view metrics", () => expect(perms.canViewMetrics).toBe(false));
});

// ── Viewer permissions ────────────────────────────────────────────

describe("Viewer permissions", () => {
  const perms = ROLE_PERMISSIONS.viewer;

  it("can view metrics", () => expect(perms.canViewMetrics).toBe(true));
  it("cannot manage changes", () => expect(perms.canManageChanges).toBe(false));
  it("cannot approve changes", () => expect(perms.canApproveChanges).toBe(false));
  it("cannot implement changes", () => expect(perms.canImplementChanges).toBe(false));
});

// ── Permission boundaries ─────────────────────────────────────────

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

  it("canManageUsers is admin-only in legacy roles", () => {
    expect(ROLE_PERMISSIONS.admin.canManageUsers).toBe(true);
    expect(ROLE_PERMISSIONS.manager.canManageUsers).toBe(false);
    expect(ROLE_PERMISSIONS.approver.canManageUsers).toBe(false);
    expect(ROLE_PERMISSIONS.implementer.canManageUsers).toBe(false);
    expect(ROLE_PERMISSIONS.requester.canManageUsers).toBe(false);
    expect(ROLE_PERMISSIONS.viewer.canManageUsers).toBe(false);
  });

  it("canEditSettings is admin-only in legacy roles", () => {
    expect(ROLE_PERMISSIONS.admin.canEditSettings).toBe(true);
    expect(ROLE_PERMISSIONS.manager.canEditSettings).toBe(false);
    expect(ROLE_PERMISSIONS.approver.canEditSettings).toBe(false);
  });
});

// ── Multi-role permission aggregation ─────────────────────────────

describe("Multi-role permission aggregation", () => {
  it("combining approver + implementer gives both permissions", () => {
    const approverPerms: Partial<Permissions> = {
      canApproveChanges: true,
      canViewMetrics: true,
    };
    const implementerPerms: Partial<Permissions> = {
      canImplementChanges: true,
      canViewMetrics: true,
    };

    const combined = aggregatePermissions([approverPerms, implementerPerms]);

    expect(combined.canApproveChanges).toBe(true);
    expect(combined.canImplementChanges).toBe(true);
    expect(combined.canViewMetrics).toBe(true);
    expect(combined.canManageUsers).toBe(false);
  });

  it("combining requester + viewer gives create + view permissions", () => {
    const requesterPerms: Partial<Permissions> = {
      canManageChanges: true,
    };
    const viewerPerms: Partial<Permissions> = {
      canViewMetrics: true,
    };

    const combined = aggregatePermissions([requesterPerms, viewerPerms]);

    expect(combined.canManageChanges).toBe(true);
    expect(combined.canViewMetrics).toBe(true);
    expect(combined.canApproveChanges).toBe(false);
  });

  it("adding admin role grants all permissions", () => {
    const limitedPerms: Partial<Permissions> = {
      canViewMetrics: true,
    };
    const adminPerms: Partial<Permissions> = {
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

    const combined = aggregatePermissions([limitedPerms, adminPerms]);

    // All permissions should be true
    Object.values(combined).forEach(v => expect(v).toBe(true));
  });

  it("order of roles does not affect result", () => {
    const role1: Partial<Permissions> = { canApproveChanges: true };
    const role2: Partial<Permissions> = { canImplementChanges: true };

    const combined1 = aggregatePermissions([role1, role2]);
    const combined2 = aggregatePermissions([role2, role1]);

    expect(combined1).toEqual(combined2);
  });
});

// ── Permission object shape ───────────────────────────────────────

describe("Permission object shape consistency", () => {
  const allPermKeys = Object.keys(ROLE_PERMISSIONS.admin);

  it("all legacy roles have the same permission keys", () => {
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

  it("has 9 permission keys", () => {
    expect(allPermKeys).toHaveLength(9);
    expect(allPermKeys).toContain("canManageUsers");
    expect(allPermKeys).toContain("canManageRoles");
    expect(allPermKeys).toContain("canManageChanges");
    expect(allPermKeys).toContain("canApproveChanges");
    expect(allPermKeys).toContain("canImplementChanges");
    expect(allPermKeys).toContain("canManageReleases");
    expect(allPermKeys).toContain("canEditSettings");
    expect(allPermKeys).toContain("canViewMetrics");
    expect(allPermKeys).toContain("canViewAllData");
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

  it("manager can see all data", () => {
    expect(canSeeAllData("manager")).toBe(true);
  });

  it("approver cannot see all data", () => {
    expect(canSeeAllData("approver")).toBe(false);
  });

  it("implementer cannot see all data", () => {
    expect(canSeeAllData("implementer")).toBe(false);
  });

  it("requester cannot see all data", () => {
    expect(canSeeAllData("requester")).toBe(false);
  });

  it("viewer cannot see all data", () => {
    expect(canSeeAllData("viewer")).toBe(false);
  });
});

// ── Role hierarchy scenarios ──────────────────────────────────────

describe("Role hierarchy scenarios", () => {
  it("CAB member + security reviewer can approve all types of changes", () => {
    const cabPerms: Partial<Permissions> = {
      canApproveChanges: true,
      canViewAllData: true,
      canViewMetrics: true,
    };
    const securityPerms: Partial<Permissions> = {
      canApproveChanges: true,
      canViewMetrics: true,
    };

    const combined = aggregatePermissions([cabPerms, securityPerms]);

    expect(combined.canApproveChanges).toBe(true);
    expect(combined.canViewAllData).toBe(true);
    expect(combined.canViewMetrics).toBe(true);
  });

  it("change manager + implementer can manage and execute changes", () => {
    const managerPerms: Partial<Permissions> = {
      canManageChanges: true,
      canApproveChanges: true,
      canManageReleases: true,
      canViewMetrics: true,
      canViewAllData: true,
    };
    const implementerPerms: Partial<Permissions> = {
      canImplementChanges: true,
      canViewMetrics: true,
    };

    const combined = aggregatePermissions([managerPerms, implementerPerms]);

    expect(combined.canManageChanges).toBe(true);
    expect(combined.canApproveChanges).toBe(true);
    expect(combined.canImplementChanges).toBe(true);
    expect(combined.canManageReleases).toBe(true);
    expect(combined.canViewAllData).toBe(true);
  });
});
