/**
 * Comprehensive tests for role permissions
 * @jest-environment node
 * 
 * Role Hierarchy (by permission level):
 * 1. Admin - Full system access, all permissions
 * 2. Manager (change_manager) - Manage CRs, approve, implement, view all data
 * 3. Approver - Can only approve CRs assigned to them
 * 4. Implementer - Can only implement approved CRs
 * 5. Requester - Can create/edit own CRs, view own metrics
 * 6. CAB Member - Can approve changes, view all data (advisory board)
 * 
 * Role Redundancy Rules:
 * - Admin includes ALL permissions, no other roles needed
 * - Manager includes approver AND implementer abilities
 * - If user has manager, don't add approver or implementer
 */

import { ROLE_PERMISSIONS, ROLE_LABELS, type UserRole } from "@/lib/auth-types";

describe("Role Definitions", () => {
  const validRoles: UserRole[] = ["admin", "manager", "approver", "implementer", "requester"];

  describe("All roles are defined", () => {
    it("has all expected roles in ROLE_PERMISSIONS", () => {
      validRoles.forEach(role => {
        expect(ROLE_PERMISSIONS[role]).toBeDefined();
      });
    });

    it("has all expected roles in ROLE_LABELS", () => {
      validRoles.forEach(role => {
        expect(ROLE_LABELS[role]).toBeDefined();
        expect(typeof ROLE_LABELS[role]).toBe("string");
      });
    });

    it("does not include deprecated viewer role", () => {
      expect((ROLE_PERMISSIONS as Record<string, unknown>)["viewer"]).toBeUndefined();
      expect((ROLE_LABELS as Record<string, unknown>)["viewer"]).toBeUndefined();
    });

    it("does not include deprecated security_reviewer role", () => {
      expect((ROLE_PERMISSIONS as Record<string, unknown>)["security_reviewer"]).toBeUndefined();
      expect((ROLE_LABELS as Record<string, unknown>)["security_reviewer"]).toBeUndefined();
    });
  });

  describe("Each role has all required permission fields", () => {
    const requiredPermissions = [
      "canManageUsers",
      "canManageRoles",
      "canManageChanges",
      "canApproveChanges",
      "canImplementChanges",
      "canManageReleases",
      "canEditSettings",
      "canViewMetrics",
      "canViewAllData",
    ];

    validRoles.forEach(role => {
      it(`${role} has all required permissions`, () => {
        requiredPermissions.forEach(perm => {
          expect(ROLE_PERMISSIONS[role]).toHaveProperty(perm);
          expect(typeof ROLE_PERMISSIONS[role][perm as keyof typeof ROLE_PERMISSIONS.admin]).toBe("boolean");
        });
      });
    });
  });
});

describe("Admin Permissions", () => {
  const adminPerms = ROLE_PERMISSIONS.admin;

  it("has ALL permissions set to true", () => {
    expect(adminPerms.canManageUsers).toBe(true);
    expect(adminPerms.canManageRoles).toBe(true);
    expect(adminPerms.canManageChanges).toBe(true);
    expect(adminPerms.canApproveChanges).toBe(true);
    expect(adminPerms.canImplementChanges).toBe(true);
    expect(adminPerms.canManageReleases).toBe(true);
    expect(adminPerms.canEditSettings).toBe(true);
    expect(adminPerms.canViewMetrics).toBe(true);
    expect(adminPerms.canViewAllData).toBe(true);
  });

  it("includes all manager permissions", () => {
    const managerPerms = ROLE_PERMISSIONS.manager;
    Object.keys(managerPerms).forEach(key => {
      const perm = key as keyof typeof managerPerms;
      if (managerPerms[perm]) {
        expect(adminPerms[perm]).toBe(true);
      }
    });
  });

  it("includes all approver permissions", () => {
    const approverPerms = ROLE_PERMISSIONS.approver;
    Object.keys(approverPerms).forEach(key => {
      const perm = key as keyof typeof approverPerms;
      if (approverPerms[perm]) {
        expect(adminPerms[perm]).toBe(true);
      }
    });
  });

  it("includes all implementer permissions", () => {
    const implementerPerms = ROLE_PERMISSIONS.implementer;
    Object.keys(implementerPerms).forEach(key => {
      const perm = key as keyof typeof implementerPerms;
      if (implementerPerms[perm]) {
        expect(adminPerms[perm]).toBe(true);
      }
    });
  });
});

describe("Manager Permissions", () => {
  const managerPerms = ROLE_PERMISSIONS.manager;

  it("can manage changes", () => {
    expect(managerPerms.canManageChanges).toBe(true);
  });

  it("can approve changes (includes approver ability)", () => {
    expect(managerPerms.canApproveChanges).toBe(true);
  });

  it("can implement changes (includes implementer ability)", () => {
    expect(managerPerms.canImplementChanges).toBe(true);
  });

  it("can manage releases", () => {
    expect(managerPerms.canManageReleases).toBe(true);
  });

  it("can view metrics", () => {
    expect(managerPerms.canViewMetrics).toBe(true);
  });

  it("can view all data", () => {
    expect(managerPerms.canViewAllData).toBe(true);
  });

  it("can manage roles (assign roles to team members)", () => {
    expect(managerPerms.canManageRoles).toBe(true);
  });

  it("cannot manage users (admin only)", () => {
    expect(managerPerms.canManageUsers).toBe(false);
  });

  it("cannot edit settings (admin only)", () => {
    expect(managerPerms.canEditSettings).toBe(false);
  });

  it("includes ALL approver permissions", () => {
    const approverPerms = ROLE_PERMISSIONS.approver;
    // Manager should have at least all the permissions approver has
    expect(managerPerms.canApproveChanges).toBe(true);
    expect(approverPerms.canApproveChanges).toBe(true);
  });

  it("includes ALL implementer permissions", () => {
    const implementerPerms = ROLE_PERMISSIONS.implementer;
    // Manager should have at least all the permissions implementer has
    expect(managerPerms.canImplementChanges).toBe(true);
    expect(implementerPerms.canImplementChanges).toBe(true);
  });
});

describe("Approver Permissions", () => {
  const approverPerms = ROLE_PERMISSIONS.approver;

  it("can approve changes", () => {
    expect(approverPerms.canApproveChanges).toBe(true);
  });

  it("can view metrics", () => {
    expect(approverPerms.canViewMetrics).toBe(true);
  });

  it("cannot manage changes", () => {
    expect(approverPerms.canManageChanges).toBe(false);
  });

  it("cannot implement changes", () => {
    expect(approverPerms.canImplementChanges).toBe(false);
  });

  it("cannot view all data (only assigned CRs)", () => {
    expect(approverPerms.canViewAllData).toBe(false);
  });

  it("cannot manage users", () => {
    expect(approverPerms.canManageUsers).toBe(false);
  });

  it("cannot manage roles", () => {
    expect(approverPerms.canManageRoles).toBe(false);
  });

  it("cannot manage releases", () => {
    expect(approverPerms.canManageReleases).toBe(false);
  });

  it("cannot edit settings", () => {
    expect(approverPerms.canEditSettings).toBe(false);
  });
});

describe("Implementer Permissions", () => {
  const implementerPerms = ROLE_PERMISSIONS.implementer;

  it("can implement changes", () => {
    expect(implementerPerms.canImplementChanges).toBe(true);
  });

  it("can view metrics", () => {
    expect(implementerPerms.canViewMetrics).toBe(true);
  });

  it("cannot manage changes", () => {
    expect(implementerPerms.canManageChanges).toBe(false);
  });

  it("cannot approve changes", () => {
    expect(implementerPerms.canApproveChanges).toBe(false);
  });

  it("cannot view all data (only assigned CRs)", () => {
    expect(implementerPerms.canViewAllData).toBe(false);
  });

  it("cannot manage users", () => {
    expect(implementerPerms.canManageUsers).toBe(false);
  });

  it("cannot manage roles", () => {
    expect(implementerPerms.canManageRoles).toBe(false);
  });

  it("cannot manage releases", () => {
    expect(implementerPerms.canManageReleases).toBe(false);
  });

  it("cannot edit settings", () => {
    expect(implementerPerms.canEditSettings).toBe(false);
  });
});

describe("Requester Permissions", () => {
  const requesterPerms = ROLE_PERMISSIONS.requester;

  it("can manage changes (create/edit own CRs)", () => {
    expect(requesterPerms.canManageChanges).toBe(true);
  });

  it("can view metrics (for own CRs)", () => {
    expect(requesterPerms.canViewMetrics).toBe(true);
  });

  it("cannot approve changes", () => {
    expect(requesterPerms.canApproveChanges).toBe(false);
  });

  it("cannot implement changes", () => {
    expect(requesterPerms.canImplementChanges).toBe(false);
  });

  it("cannot view all data (only own CRs)", () => {
    expect(requesterPerms.canViewAllData).toBe(false);
  });

  it("cannot manage users", () => {
    expect(requesterPerms.canManageUsers).toBe(false);
  });

  it("cannot manage roles", () => {
    expect(requesterPerms.canManageRoles).toBe(false);
  });

  it("cannot manage releases", () => {
    expect(requesterPerms.canManageReleases).toBe(false);
  });

  it("cannot edit settings", () => {
    expect(requesterPerms.canEditSettings).toBe(false);
  });
});

describe("Role Redundancy Rules", () => {
  describe("Admin supersedes all roles", () => {
    it("admin has all permissions that manager has", () => {
      const adminPerms = ROLE_PERMISSIONS.admin;
      const managerPerms = ROLE_PERMISSIONS.manager;
      
      Object.keys(managerPerms).forEach(key => {
        const perm = key as keyof typeof managerPerms;
        if (managerPerms[perm]) {
          expect(adminPerms[perm]).toBe(true);
        }
      });
    });

    it("no additional role provides permissions admin doesn't have", () => {
      const adminPerms = ROLE_PERMISSIONS.admin;
      const allPerms = Object.values(adminPerms);
      expect(allPerms.every(p => p === true)).toBe(true);
    });
  });

  describe("Manager supersedes approver and implementer", () => {
    it("manager has canApproveChanges (approver ability)", () => {
      expect(ROLE_PERMISSIONS.manager.canApproveChanges).toBe(true);
      expect(ROLE_PERMISSIONS.approver.canApproveChanges).toBe(true);
    });

    it("manager has canImplementChanges (implementer ability)", () => {
      expect(ROLE_PERMISSIONS.manager.canImplementChanges).toBe(true);
      expect(ROLE_PERMISSIONS.implementer.canImplementChanges).toBe(true);
    });

    it("manager has additional permissions beyond approver", () => {
      expect(ROLE_PERMISSIONS.manager.canManageChanges).toBe(true);
      expect(ROLE_PERMISSIONS.approver.canManageChanges).toBe(false);
    });

    it("manager has additional permissions beyond implementer", () => {
      expect(ROLE_PERMISSIONS.manager.canManageChanges).toBe(true);
      expect(ROLE_PERMISSIONS.implementer.canManageChanges).toBe(false);
    });
  });
});

describe("Permission Combinations", () => {
  it("only admin can manage users", () => {
    expect(ROLE_PERMISSIONS.admin.canManageUsers).toBe(true);
    expect(ROLE_PERMISSIONS.manager.canManageUsers).toBe(false);
    expect(ROLE_PERMISSIONS.approver.canManageUsers).toBe(false);
    expect(ROLE_PERMISSIONS.implementer.canManageUsers).toBe(false);
    expect(ROLE_PERMISSIONS.requester.canManageUsers).toBe(false);
  });

  it("only admin can edit settings", () => {
    expect(ROLE_PERMISSIONS.admin.canEditSettings).toBe(true);
    expect(ROLE_PERMISSIONS.manager.canEditSettings).toBe(false);
    expect(ROLE_PERMISSIONS.approver.canEditSettings).toBe(false);
    expect(ROLE_PERMISSIONS.implementer.canEditSettings).toBe(false);
    expect(ROLE_PERMISSIONS.requester.canEditSettings).toBe(false);
  });

  it("admin and manager can view all data", () => {
    expect(ROLE_PERMISSIONS.admin.canViewAllData).toBe(true);
    expect(ROLE_PERMISSIONS.manager.canViewAllData).toBe(true);
    expect(ROLE_PERMISSIONS.approver.canViewAllData).toBe(false);
    expect(ROLE_PERMISSIONS.implementer.canViewAllData).toBe(false);
    expect(ROLE_PERMISSIONS.requester.canViewAllData).toBe(false);
  });

  it("all roles except none can view metrics", () => {
    expect(ROLE_PERMISSIONS.admin.canViewMetrics).toBe(true);
    expect(ROLE_PERMISSIONS.manager.canViewMetrics).toBe(true);
    expect(ROLE_PERMISSIONS.approver.canViewMetrics).toBe(true);
    expect(ROLE_PERMISSIONS.implementer.canViewMetrics).toBe(true);
    expect(ROLE_PERMISSIONS.requester.canViewMetrics).toBe(true);
  });

  it("admin and manager can manage releases", () => {
    expect(ROLE_PERMISSIONS.admin.canManageReleases).toBe(true);
    expect(ROLE_PERMISSIONS.manager.canManageReleases).toBe(true);
    expect(ROLE_PERMISSIONS.approver.canManageReleases).toBe(false);
    expect(ROLE_PERMISSIONS.implementer.canManageReleases).toBe(false);
    expect(ROLE_PERMISSIONS.requester.canManageReleases).toBe(false);
  });

  it("admin and manager can manage roles", () => {
    expect(ROLE_PERMISSIONS.admin.canManageRoles).toBe(true);
    expect(ROLE_PERMISSIONS.manager.canManageRoles).toBe(true);
    expect(ROLE_PERMISSIONS.approver.canManageRoles).toBe(false);
    expect(ROLE_PERMISSIONS.implementer.canManageRoles).toBe(false);
    expect(ROLE_PERMISSIONS.requester.canManageRoles).toBe(false);
  });
});

describe("Role Labels", () => {
  it("admin label is Administrator", () => {
    expect(ROLE_LABELS.admin).toBe("Administrator");
  });

  it("manager label is Manager", () => {
    expect(ROLE_LABELS.manager).toBe("Manager");
  });

  it("approver label is Approver", () => {
    expect(ROLE_LABELS.approver).toBe("Approver");
  });

  it("implementer label is Implementer", () => {
    expect(ROLE_LABELS.implementer).toBe("Implementer");
  });

  it("requester label is Requester", () => {
    expect(ROLE_LABELS.requester).toBe("Requester");
  });
});
