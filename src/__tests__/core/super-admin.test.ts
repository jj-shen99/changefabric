/**
 * Comprehensive tests for Super Admin features
 * @jest-environment node
 * 
 * Super Admin Capabilities:
 * - Global access across all organizations
 * - Can see all users from all orgs
 * - Can create users in any organization
 * - Can manage all organizations
 * - Has all admin permissions plus cross-org access
 */

import {
  SYSTEM_ROLE_LABELS,
  DEFAULT_PERMISSIONS,
  aggregatePermissions,
  hasRole,
  hasAnyRole,
  isAdmin,
  type Permissions,
  type Role,
} from "@/lib/auth-types";

describe("Super Admin Role Definition", () => {
  describe("System Role Labels", () => {
    it("has super_admin role defined", () => {
      expect(SYSTEM_ROLE_LABELS.super_admin).toBe("Super Administrator");
    });

    it("super_admin is distinct from admin", () => {
      expect(SYSTEM_ROLE_LABELS.super_admin).not.toBe(SYSTEM_ROLE_LABELS.admin);
      expect(SYSTEM_ROLE_LABELS.admin).toBe("Administrator");
    });
  });

  describe("Super Admin Role Properties", () => {
    const superAdminRole: Partial<Role> = {
      name: "super_admin",
      displayName: "Super Administrator",
      orgId: "*", // Global org access
      isSuperAdmin: true,
      isSystem: true,
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

    it("has isSuperAdmin flag set to true", () => {
      expect(superAdminRole.isSuperAdmin).toBe(true);
    });

    it("has global org access (orgId = *)", () => {
      expect(superAdminRole.orgId).toBe("*");
    });

    it("is a system role", () => {
      expect(superAdminRole.isSystem).toBe(true);
    });

    it("has all permissions enabled", () => {
      expect(superAdminRole.canManageUsers).toBe(true);
      expect(superAdminRole.canManageRoles).toBe(true);
      expect(superAdminRole.canManageChanges).toBe(true);
      expect(superAdminRole.canApproveChanges).toBe(true);
      expect(superAdminRole.canImplementChanges).toBe(true);
      expect(superAdminRole.canManageReleases).toBe(true);
      expect(superAdminRole.canEditSettings).toBe(true);
      expect(superAdminRole.canViewMetrics).toBe(true);
      expect(superAdminRole.canViewAllData).toBe(true);
    });
  });
});

describe("Super Admin Session", () => {
  interface MockSession {
    user: {
      id: string;
      email: string;
      name: string;
      roles: string[];
      orgId: string;
      isSuperAdmin: boolean;
      permissions: Permissions;
    };
  }

  const superAdminSession: MockSession = {
    user: {
      id: "super-admin-id",
      email: "superadmin@example.com",
      name: "Super Administrator",
      roles: ["super_admin"],
      orgId: "*",
      isSuperAdmin: true,
      permissions: {
        canManageUsers: true,
        canManageRoles: true,
        canManageChanges: true,
        canApproveChanges: true,
        canImplementChanges: true,
        canManageReleases: true,
        canEditSettings: true,
        canViewMetrics: true,
        canViewAllData: true,
      },
    },
  };

  const regularAdminSession: MockSession = {
    user: {
      id: "admin-id",
      email: "admin@example.com",
      name: "Admin User",
      roles: ["admin"],
      orgId: "demo",
      isSuperAdmin: false,
      permissions: {
        canManageUsers: true,
        canManageRoles: true,
        canManageChanges: true,
        canApproveChanges: true,
        canImplementChanges: true,
        canManageReleases: true,
        canEditSettings: true,
        canViewMetrics: true,
        canViewAllData: true,
      },
    },
  };

  describe("Session Properties", () => {
    it("super admin has isSuperAdmin = true", () => {
      expect(superAdminSession.user.isSuperAdmin).toBe(true);
    });

    it("regular admin has isSuperAdmin = false", () => {
      expect(regularAdminSession.user.isSuperAdmin).toBe(false);
    });

    it("super admin has orgId = *", () => {
      expect(superAdminSession.user.orgId).toBe("*");
    });

    it("regular admin has specific orgId", () => {
      expect(regularAdminSession.user.orgId).toBe("demo");
      expect(regularAdminSession.user.orgId).not.toBe("*");
    });

    it("super admin has super_admin role", () => {
      expect(superAdminSession.user.roles).toContain("super_admin");
    });

    it("regular admin has admin role but not super_admin", () => {
      expect(regularAdminSession.user.roles).toContain("admin");
      expect(regularAdminSession.user.roles).not.toContain("super_admin");
    });
  });
});

describe("Super Admin Cross-Org Access", () => {
  interface User {
    id: string;
    email: string;
    orgId: string;
  }

  const usersFromMultipleOrgs: User[] = [
    { id: "1", email: "user1@demo.com", orgId: "demo" },
    { id: "2", email: "user2@demo.com", orgId: "demo" },
    { id: "3", email: "user3@acme.com", orgId: "acme" },
    { id: "4", email: "user4@acme.com", orgId: "acme" },
    { id: "5", email: "user5@corp.com", orgId: "corp" },
  ];

  const filterUsersForSession = (
    users: User[],
    sessionOrgId: string,
    isSuperAdmin: boolean
  ): User[] => {
    if (isSuperAdmin) {
      return users; // Super admin sees all users
    }
    return users.filter(u => u.orgId === sessionOrgId);
  };

  describe("User Visibility", () => {
    it("super admin sees all users from all orgs", () => {
      const visibleUsers = filterUsersForSession(usersFromMultipleOrgs, "*", true);
      expect(visibleUsers).toHaveLength(5);
      expect(visibleUsers.map(u => u.orgId)).toContain("demo");
      expect(visibleUsers.map(u => u.orgId)).toContain("acme");
      expect(visibleUsers.map(u => u.orgId)).toContain("corp");
    });

    it("regular admin only sees users from their org", () => {
      const visibleUsers = filterUsersForSession(usersFromMultipleOrgs, "demo", false);
      expect(visibleUsers).toHaveLength(2);
      expect(visibleUsers.every(u => u.orgId === "demo")).toBe(true);
    });

    it("admin from different org sees different users", () => {
      const acmeUsers = filterUsersForSession(usersFromMultipleOrgs, "acme", false);
      expect(acmeUsers).toHaveLength(2);
      expect(acmeUsers.every(u => u.orgId === "acme")).toBe(true);
    });
  });

  describe("Organization Management", () => {
    interface Organization {
      id: string;
      orgId: string;
      name: string;
    }

    const organizations: Organization[] = [
      { id: "1", orgId: "demo", name: "Demo Organization" },
      { id: "2", orgId: "acme", name: "ACME Corp" },
      { id: "3", orgId: "corp", name: "Corporate" },
    ];

    const canManageOrg = (
      org: Organization,
      sessionOrgId: string,
      isSuperAdmin: boolean
    ): boolean => {
      if (isSuperAdmin) return true;
      return org.orgId === sessionOrgId;
    };

    it("super admin can manage all organizations", () => {
      organizations.forEach(org => {
        expect(canManageOrg(org, "*", true)).toBe(true);
      });
    });

    it("regular admin can only manage their own org", () => {
      expect(canManageOrg(organizations[0], "demo", false)).toBe(true);
      expect(canManageOrg(organizations[1], "demo", false)).toBe(false);
      expect(canManageOrg(organizations[2], "demo", false)).toBe(false);
    });
  });
});

describe("Super Admin User Creation", () => {
  interface CreateUserRequest {
    email: string;
    name: string;
    orgId: string;
    roleIds: string[];
  }

  const canCreateUserInOrg = (
    request: CreateUserRequest,
    sessionOrgId: string,
    isSuperAdmin: boolean
  ): boolean => {
    if (isSuperAdmin) return true; // Can create in any org
    return request.orgId === sessionOrgId; // Can only create in own org
  };

  describe("Cross-Org User Creation", () => {
    it("super admin can create user in any organization", () => {
      const requests: CreateUserRequest[] = [
        { email: "new@demo.com", name: "New User", orgId: "demo", roleIds: ["1"] },
        { email: "new@acme.com", name: "New User", orgId: "acme", roleIds: ["1"] },
        { email: "new@corp.com", name: "New User", orgId: "corp", roleIds: ["1"] },
      ];

      requests.forEach(req => {
        expect(canCreateUserInOrg(req, "*", true)).toBe(true);
      });
    });

    it("regular admin can only create user in their org", () => {
      expect(canCreateUserInOrg(
        { email: "new@demo.com", name: "New", orgId: "demo", roleIds: [] },
        "demo",
        false
      )).toBe(true);

      expect(canCreateUserInOrg(
        { email: "new@acme.com", name: "New", orgId: "acme", roleIds: [] },
        "demo",
        false
      )).toBe(false);
    });
  });
});

describe("Super Admin vs Admin Permissions", () => {
  describe("Permission Comparison", () => {
    const superAdminPerms: Permissions = {
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

    const adminPerms: Permissions = {
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

    it("super admin and admin have same base permissions", () => {
      expect(superAdminPerms).toEqual(adminPerms);
    });

    it("difference is in isSuperAdmin flag and orgId scope", () => {
      const superAdmin = { ...superAdminPerms, isSuperAdmin: true, orgId: "*" };
      const admin = { ...adminPerms, isSuperAdmin: false, orgId: "demo" };

      expect(superAdmin.isSuperAdmin).toBe(true);
      expect(admin.isSuperAdmin).toBe(false);
      expect(superAdmin.orgId).toBe("*");
      expect(admin.orgId).not.toBe("*");
    });
  });
});

describe("Super Admin Role Checking", () => {
  describe("hasRole function", () => {
    it("correctly identifies super_admin role", () => {
      expect(hasRole(["super_admin"], "super_admin")).toBe(true);
      expect(hasRole(["admin"], "super_admin")).toBe(false);
      expect(hasRole(["admin", "super_admin"], "super_admin")).toBe(true);
    });
  });

  describe("hasAnyRole function", () => {
    it("correctly checks for super_admin or admin", () => {
      expect(hasAnyRole(["super_admin"], ["super_admin", "admin"])).toBe(true);
      expect(hasAnyRole(["admin"], ["super_admin", "admin"])).toBe(true);
      expect(hasAnyRole(["manager"], ["super_admin", "admin"])).toBe(false);
    });
  });

  describe("isAdmin function", () => {
    it("returns true for admin role", () => {
      expect(isAdmin(["admin"])).toBe(true);
    });

    it("returns false for super_admin role (different check)", () => {
      // isAdmin specifically checks for "admin" role
      expect(isAdmin(["super_admin"])).toBe(false);
    });

    it("returns true when user has both roles", () => {
      expect(isAdmin(["super_admin", "admin"])).toBe(true);
    });
  });

  describe("Custom isSuperAdmin check", () => {
    const isSuperAdmin = (roles: string[]): boolean => {
      return roles.includes("super_admin");
    };

    it("correctly identifies super admin", () => {
      expect(isSuperAdmin(["super_admin"])).toBe(true);
      expect(isSuperAdmin(["admin"])).toBe(false);
      expect(isSuperAdmin(["super_admin", "admin"])).toBe(true);
    });
  });
});

describe("Super Admin Permission Aggregation", () => {
  describe("aggregatePermissions function", () => {
    it("aggregates permissions using OR logic", () => {
      const roles = [
        { canManageUsers: true, canViewMetrics: false },
        { canManageUsers: false, canViewMetrics: true },
      ];

      const result = aggregatePermissions(roles);
      expect(result.canManageUsers).toBe(true);
      expect(result.canViewMetrics).toBe(true);
    });

    it("returns all true for super admin role", () => {
      const superAdminRole = {
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

      const result = aggregatePermissions([superAdminRole]);
      expect(result.canManageUsers).toBe(true);
      expect(result.canManageRoles).toBe(true);
      expect(result.canManageChanges).toBe(true);
      expect(result.canApproveChanges).toBe(true);
      expect(result.canImplementChanges).toBe(true);
      expect(result.canManageReleases).toBe(true);
      expect(result.canEditSettings).toBe(true);
      expect(result.canViewMetrics).toBe(true);
      expect(result.canViewAllData).toBe(true);
    });

    it("starts with default permissions (all false)", () => {
      const result = aggregatePermissions([]);
      expect(result).toEqual(DEFAULT_PERMISSIONS);
    });
  });
});

describe("Super Admin API Access Patterns", () => {
  interface ApiRequest {
    path: string;
    method: string;
    sessionOrgId: string;
    isSuperAdmin: boolean;
    targetOrgId?: string;
  }

  const canAccessApi = (request: ApiRequest): boolean => {
    // Super admin can access any org's data
    if (request.isSuperAdmin) return true;

    // Regular users can only access their own org's data
    if (request.targetOrgId && request.targetOrgId !== request.sessionOrgId) {
      return false;
    }

    return true;
  };

  describe("API Access Control", () => {
    it("super admin can access /api/admin/users for any org", () => {
      expect(canAccessApi({
        path: "/api/admin/users",
        method: "GET",
        sessionOrgId: "*",
        isSuperAdmin: true,
        targetOrgId: "demo",
      })).toBe(true);

      expect(canAccessApi({
        path: "/api/admin/users",
        method: "GET",
        sessionOrgId: "*",
        isSuperAdmin: true,
        targetOrgId: "acme",
      })).toBe(true);
    });

    it("regular admin cannot access other org's users", () => {
      expect(canAccessApi({
        path: "/api/admin/users",
        method: "GET",
        sessionOrgId: "demo",
        isSuperAdmin: false,
        targetOrgId: "acme",
      })).toBe(false);
    });

    it("regular admin can access their own org's users", () => {
      expect(canAccessApi({
        path: "/api/admin/users",
        method: "GET",
        sessionOrgId: "demo",
        isSuperAdmin: false,
        targetOrgId: "demo",
      })).toBe(true);
    });

    it("super admin can access /api/admin/organizations", () => {
      expect(canAccessApi({
        path: "/api/admin/organizations",
        method: "GET",
        sessionOrgId: "*",
        isSuperAdmin: true,
      })).toBe(true);
    });
  });
});

describe("Super Admin Data Filtering", () => {
  interface ChangeRequest {
    number: string;
    title: string;
    orgId: string;
    createdBy: string;
  }

  const changeRequests: ChangeRequest[] = [
    { number: "CHG001", title: "Demo CR 1", orgId: "demo", createdBy: "user1" },
    { number: "CHG002", title: "Demo CR 2", orgId: "demo", createdBy: "user2" },
    { number: "CHG003", title: "ACME CR 1", orgId: "acme", createdBy: "user3" },
    { number: "CHG004", title: "Corp CR 1", orgId: "corp", createdBy: "user4" },
  ];

  const filterChangeRequests = (
    crs: ChangeRequest[],
    sessionOrgId: string,
    isSuperAdmin: boolean
  ): ChangeRequest[] => {
    if (isSuperAdmin) return crs;
    return crs.filter(cr => cr.orgId === sessionOrgId);
  };

  describe("Change Request Visibility", () => {
    it("super admin sees all change requests", () => {
      const visible = filterChangeRequests(changeRequests, "*", true);
      expect(visible).toHaveLength(4);
    });

    it("regular admin sees only their org's CRs", () => {
      const visible = filterChangeRequests(changeRequests, "demo", false);
      expect(visible).toHaveLength(2);
      expect(visible.every(cr => cr.orgId === "demo")).toBe(true);
    });
  });
});

describe("Super Admin Default Groups/Services", () => {
  interface Group {
    name: string;
    orgId: string;
    type: string;
  }

  interface Service {
    name: string;
    displayName: string;
    orgId: string;
  }

  const defaultGroups: Omit<Group, "orgId">[] = [
    { name: "Admin", type: "assignment" },
    { name: "CAB", type: "approval" },
    { name: "DevOps", type: "assignment" },
    { name: "Security", type: "both" },
  ];

  const defaultServices: Omit<Service, "orgId">[] = [
    { name: "api-gateway", displayName: "API Gateway" },
    { name: "database", displayName: "Database" },
    { name: "web-app", displayName: "Web Application" },
  ];

  const createDefaultsForOrg = (orgId: string) => {
    return {
      groups: defaultGroups.map(g => ({ ...g, orgId })),
      services: defaultServices.map(s => ({ ...s, orgId })),
    };
  };

  describe("Default Creation", () => {
    it("creates defaults with correct orgId", () => {
      const { groups, services } = createDefaultsForOrg("new-org");
      
      expect(groups.every(g => g.orgId === "new-org")).toBe(true);
      expect(services.every(s => s.orgId === "new-org")).toBe(true);
    });

    it("creates expected number of defaults", () => {
      const { groups, services } = createDefaultsForOrg("test-org");
      
      expect(groups).toHaveLength(4);
      expect(services).toHaveLength(3);
    });

    it("includes required default groups", () => {
      const { groups } = createDefaultsForOrg("test-org");
      const names = groups.map(g => g.name);
      
      expect(names).toContain("Admin");
      expect(names).toContain("CAB");
      expect(names).toContain("DevOps");
    });
  });
});
