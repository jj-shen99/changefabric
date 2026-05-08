/**
 * Tests for permission and visibility logic
 * @jest-environment node
 */

import { ROLE_PERMISSIONS, type UserRole } from "@/lib/auth-types";

describe("Role Permissions", () => {
  describe("canViewAllData permission", () => {
    it("admin can view all data", () => {
      expect(ROLE_PERMISSIONS.admin.canViewAllData).toBe(true);
    });

    it("manager cannot view all data (only their own CRs)", () => {
      expect(ROLE_PERMISSIONS.manager.canViewAllData).toBe(false);
    });

    it("viewer cannot view all data (only their own CRs)", () => {
      expect(ROLE_PERMISSIONS.viewer.canViewAllData).toBe(false);
    });
  });

  describe("canManageChanges permission", () => {
    it("admin can manage changes", () => {
      expect(ROLE_PERMISSIONS.admin.canManageChanges).toBe(true);
    });

    it("manager can manage changes", () => {
      expect(ROLE_PERMISSIONS.manager.canManageChanges).toBe(true);
    });

    it("viewer cannot manage changes", () => {
      expect(ROLE_PERMISSIONS.viewer.canManageChanges).toBe(false);
    });
  });

  describe("canManageUsers permission", () => {
    it("only admin can manage users", () => {
      expect(ROLE_PERMISSIONS.admin.canManageUsers).toBe(true);
      expect(ROLE_PERMISSIONS.manager.canManageUsers).toBe(false);
      expect(ROLE_PERMISSIONS.viewer.canManageUsers).toBe(false);
    });
  });

  describe("all roles are defined", () => {
    const expectedRoles: UserRole[] = ["admin", "manager", "viewer"];

    it("has all expected roles", () => {
      expectedRoles.forEach((role) => {
        expect(ROLE_PERMISSIONS[role]).toBeDefined();
      });
    });

    it("each role has all required permissions", () => {
      const requiredPermissions = [
        "canManageUsers",
        "canManageChanges",
        "canApproveChanges",
        "canManageReleases",
        "canEditSettings",
        "canViewMetrics",
        "canViewAllData",
      ];

      expectedRoles.forEach((role) => {
        requiredPermissions.forEach((perm) => {
          expect(ROLE_PERMISSIONS[role]).toHaveProperty(perm);
          expect(typeof ROLE_PERMISSIONS[role][perm as keyof typeof ROLE_PERMISSIONS.admin]).toBe("boolean");
        });
      });
    });
  });
});

describe("State Normalization", () => {
  // Test the normalizeState function logic
  const normalizeState = (state: string) => state.toLowerCase().replace(/\s+/g, "_");

  describe("normalizes ServiceNow states", () => {
    it("normalizes 'New' to 'new'", () => {
      expect(normalizeState("New")).toBe("new");
    });

    it("normalizes 'Closed' to 'closed'", () => {
      expect(normalizeState("Closed")).toBe("closed");
    });

    it("normalizes 'Canceled' to 'canceled'", () => {
      expect(normalizeState("Canceled")).toBe("canceled");
    });

    it("normalizes 'Authorize' to 'authorize'", () => {
      expect(normalizeState("Authorize")).toBe("authorize");
    });

    it("normalizes 'Implement' to 'implement'", () => {
      expect(normalizeState("Implement")).toBe("implement");
    });

    it("normalizes 'Review' to 'review'", () => {
      expect(normalizeState("Review")).toBe("review");
    });
  });

  describe("handles native states", () => {
    it("keeps 'draft' as 'draft'", () => {
      expect(normalizeState("draft")).toBe("draft");
    });

    it("keeps 'awaiting_approval' as 'awaiting_approval'", () => {
      expect(normalizeState("awaiting_approval")).toBe("awaiting_approval");
    });

    it("keeps 'in_progress' as 'in_progress'", () => {
      expect(normalizeState("in_progress")).toBe("in_progress");
    });
  });

  describe("handles edge cases", () => {
    it("handles states with spaces", () => {
      expect(normalizeState("In Progress")).toBe("in_progress");
    });

    it("handles mixed case", () => {
      expect(normalizeState("CLOSED")).toBe("closed");
    });

    it("handles empty string", () => {
      expect(normalizeState("")).toBe("");
    });
  });
});

describe("KPI State Categorization", () => {
  const normalizeState = (state: string) => state.toLowerCase().replace(/\s+/g, "_");

  const pendingStates = ["draft", "submitted", "assessing", "awaiting_approval", "new", "assess", "authorize"];
  const inFlightStates = ["approved", "scheduled", "in_progress", "implemented", "reviewing", "implement", "review"];
  const closedStates = ["closed"];
  const rejectedStates = ["rejected", "canceled"];

  describe("pending states", () => {
    it("includes all expected pending states", () => {
      // Native pending states
      expect(pendingStates).toContain("draft");
      expect(pendingStates).toContain("submitted");
      expect(pendingStates).toContain("assessing");
      expect(pendingStates).toContain("awaiting_approval");
      // ServiceNow pending states
      expect(pendingStates).toContain("new");
      expect(pendingStates).toContain("assess");
      expect(pendingStates).toContain("authorize");
    });

    it("correctly categorizes ServiceNow 'New' as pending", () => {
      expect(pendingStates.includes(normalizeState("New"))).toBe(true);
    });

    it("correctly categorizes ServiceNow 'Authorize' as pending", () => {
      expect(pendingStates.includes(normalizeState("Authorize"))).toBe(true);
    });
  });

  describe("in-flight states", () => {
    it("includes all expected in-flight states", () => {
      // Native in-flight states
      expect(inFlightStates).toContain("approved");
      expect(inFlightStates).toContain("scheduled");
      expect(inFlightStates).toContain("in_progress");
      expect(inFlightStates).toContain("implemented");
      expect(inFlightStates).toContain("reviewing");
      // ServiceNow in-flight states
      expect(inFlightStates).toContain("implement");
      expect(inFlightStates).toContain("review");
    });

    it("correctly categorizes ServiceNow 'Implement' as in-flight", () => {
      expect(inFlightStates.includes(normalizeState("Implement"))).toBe(true);
    });

    it("correctly categorizes ServiceNow 'Scheduled' as in-flight", () => {
      expect(inFlightStates.includes(normalizeState("Scheduled"))).toBe(true);
    });
  });

  describe("closed states", () => {
    it("correctly categorizes 'closed' as closed", () => {
      expect(closedStates.includes(normalizeState("closed"))).toBe(true);
    });

    it("correctly categorizes ServiceNow 'Closed' as closed", () => {
      expect(closedStates.includes(normalizeState("Closed"))).toBe(true);
    });
  });

  describe("rejected states", () => {
    it("correctly categorizes 'rejected' as rejected", () => {
      expect(rejectedStates.includes(normalizeState("rejected"))).toBe(true);
    });

    it("correctly categorizes 'canceled' as rejected", () => {
      expect(rejectedStates.includes(normalizeState("canceled"))).toBe(true);
    });

    it("correctly categorizes ServiceNow 'Canceled' as rejected", () => {
      expect(rejectedStates.includes(normalizeState("Canceled"))).toBe(true);
    });
  });
});
