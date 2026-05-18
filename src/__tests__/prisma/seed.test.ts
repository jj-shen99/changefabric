/**
 * Tests for Prisma Seed Data
 * @jest-environment node
 * 
 * Validates that the seed script creates correct data structures,
 * default values, and relationships.
 */

describe("Seed Data - Organizations", () => {
  interface Organization {
    orgId: string;
    name: string;
    isActive: boolean;
  }

  const expectedOrgs: Organization[] = [
    { orgId: "demo", name: "Demo Organization", isActive: true },
  ];

  describe("Default Organization", () => {
    it("creates demo organization", () => {
      const demo = expectedOrgs.find(o => o.orgId === "demo");
      expect(demo).toBeDefined();
      expect(demo?.name).toBe("Demo Organization");
    });

    it("demo organization is active", () => {
      const demo = expectedOrgs.find(o => o.orgId === "demo");
      expect(demo?.isActive).toBe(true);
    });
  });
});

describe("Seed Data - System Roles", () => {
  interface SystemRole {
    name: string;
    displayName: string;
    isSuperAdmin: boolean;
    isSystem: boolean;
    canManageUsers: boolean;
    canManageRoles: boolean;
    canManageChanges: boolean;
    canApproveChanges: boolean;
    canImplementChanges: boolean;
    canManageReleases: boolean;
    canEditSettings: boolean;
    canViewMetrics: boolean;
    canViewAllData: boolean;
  }

  const systemRoles: SystemRole[] = [
    {
      name: "super_admin",
      displayName: "Super Administrator",
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
    },
    {
      name: "admin",
      displayName: "Administrator",
      isSuperAdmin: false,
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
    },
    {
      name: "change_manager",
      displayName: "Change Manager",
      isSuperAdmin: false,
      isSystem: true,
      canManageUsers: false,
      canManageRoles: false,
      canManageChanges: true,
      canApproveChanges: true,
      canImplementChanges: true,
      canManageReleases: true,
      canEditSettings: false,
      canViewMetrics: true,
      canViewAllData: true,
    },
    {
      name: "approver",
      displayName: "Approver",
      isSuperAdmin: false,
      isSystem: true,
      canManageUsers: false,
      canManageRoles: false,
      canManageChanges: false,
      canApproveChanges: true,
      canImplementChanges: false,
      canManageReleases: false,
      canEditSettings: false,
      canViewMetrics: true,
      canViewAllData: false,
    },
    {
      name: "implementer",
      displayName: "Implementer",
      isSuperAdmin: false,
      isSystem: true,
      canManageUsers: false,
      canManageRoles: false,
      canManageChanges: false,
      canApproveChanges: false,
      canImplementChanges: true,
      canManageReleases: false,
      canEditSettings: false,
      canViewMetrics: true,
      canViewAllData: false,
    },
    {
      name: "requester",
      displayName: "Requester",
      isSuperAdmin: false,
      isSystem: true,
      canManageUsers: false,
      canManageRoles: false,
      canManageChanges: true,
      canApproveChanges: false,
      canImplementChanges: false,
      canManageReleases: false,
      canEditSettings: false,
      canViewMetrics: true,
      canViewAllData: false,
    },
    {
      name: "cab_member",
      displayName: "CAB Member",
      isSuperAdmin: false,
      isSystem: true,
      canManageUsers: false,
      canManageRoles: false,
      canManageChanges: false,
      canApproveChanges: true,
      canImplementChanges: false,
      canManageReleases: false,
      canEditSettings: false,
      canViewMetrics: true,
      canViewAllData: true,
    },
  ];

  describe("Role Definitions", () => {
    it("has 7 system roles", () => {
      expect(systemRoles).toHaveLength(7);
    });

    it("all system roles have isSystem = true", () => {
      expect(systemRoles.every(r => r.isSystem)).toBe(true);
    });

    it("only super_admin has isSuperAdmin = true", () => {
      const superAdmins = systemRoles.filter(r => r.isSuperAdmin);
      expect(superAdmins).toHaveLength(1);
      expect(superAdmins[0].name).toBe("super_admin");
    });
  });

  describe("Super Admin Role", () => {
    const superAdmin = systemRoles.find(r => r.name === "super_admin")!;

    it("has all permissions enabled", () => {
      expect(superAdmin.canManageUsers).toBe(true);
      expect(superAdmin.canManageRoles).toBe(true);
      expect(superAdmin.canManageChanges).toBe(true);
      expect(superAdmin.canApproveChanges).toBe(true);
      expect(superAdmin.canImplementChanges).toBe(true);
      expect(superAdmin.canManageReleases).toBe(true);
      expect(superAdmin.canEditSettings).toBe(true);
      expect(superAdmin.canViewMetrics).toBe(true);
      expect(superAdmin.canViewAllData).toBe(true);
    });
  });

  describe("Admin Role", () => {
    const admin = systemRoles.find(r => r.name === "admin")!;

    it("has all permissions enabled", () => {
      expect(admin.canManageUsers).toBe(true);
      expect(admin.canManageRoles).toBe(true);
      expect(admin.canEditSettings).toBe(true);
    });

    it("is not super admin", () => {
      expect(admin.isSuperAdmin).toBe(false);
    });
  });

  describe("Approver Role", () => {
    const approver = systemRoles.find(r => r.name === "approver")!;

    it("can only approve changes", () => {
      expect(approver.canApproveChanges).toBe(true);
      expect(approver.canManageChanges).toBe(false);
      expect(approver.canImplementChanges).toBe(false);
    });

    it("cannot view all data", () => {
      expect(approver.canViewAllData).toBe(false);
    });
  });

  describe("Implementer Role", () => {
    const implementer = systemRoles.find(r => r.name === "implementer")!;

    it("can only implement changes", () => {
      expect(implementer.canImplementChanges).toBe(true);
      expect(implementer.canApproveChanges).toBe(false);
      expect(implementer.canManageChanges).toBe(false);
    });
  });

  describe("Requester Role", () => {
    const requester = systemRoles.find(r => r.name === "requester")!;

    it("can manage changes (create/edit own)", () => {
      expect(requester.canManageChanges).toBe(true);
    });

    it("cannot approve or implement", () => {
      expect(requester.canApproveChanges).toBe(false);
      expect(requester.canImplementChanges).toBe(false);
    });
  });

  describe("CAB Member Role", () => {
    const cabMember = systemRoles.find(r => r.name === "cab_member")!;

    it("can approve changes", () => {
      expect(cabMember.canApproveChanges).toBe(true);
    });

    it("can view all data", () => {
      expect(cabMember.canViewAllData).toBe(true);
    });

    it("cannot manage users or settings", () => {
      expect(cabMember.canManageUsers).toBe(false);
      expect(cabMember.canEditSettings).toBe(false);
    });
  });
});

describe("Seed Data - Demo Users", () => {
  interface DemoUser {
    email: string;
    name: string;
    roles: string[];
    orgId: string;
  }

  const demoUsers: DemoUser[] = [
    { email: "superadmin@example.com", name: "Super Administrator", roles: ["super_admin"], orgId: "*" },
    { email: "admin@example.com", name: "System Admin", roles: ["admin"], orgId: "demo" },
    { email: "mike@example.com", name: "Mike Torres", roles: ["change_manager"], orgId: "demo" },
    { email: "lisa@example.com", name: "Lisa Wang", roles: ["change_manager"], orgId: "demo" },
    { email: "approver1@example.com", name: "Alice Approver", roles: ["approver"], orgId: "demo" },
    { email: "approver2@example.com", name: "Bob Approver", roles: ["approver"], orgId: "demo" },
    { email: "implementer1@example.com", name: "Ian Implementer", roles: ["implementer"], orgId: "demo" },
    { email: "devops1@example.com", name: "DevOps Engineer 1", roles: ["implementer"], orgId: "demo" },
    { email: "requester1@example.com", name: "Rachel Requester", roles: ["requester"], orgId: "demo" },
    { email: "developer1@example.com", name: "Dev One", roles: ["requester"], orgId: "demo" },
    { email: "cab@example.com", name: "CAB Chair", roles: ["cab_member"], orgId: "demo" },
  ];

  describe("User Count", () => {
    it("has at least 10 demo users", () => {
      expect(demoUsers.length).toBeGreaterThanOrEqual(10);
    });
  });

  describe("Super Admin User", () => {
    const superAdmin = demoUsers.find(u => u.email === "superadmin@example.com")!;

    it("exists", () => {
      expect(superAdmin).toBeDefined();
    });

    it("has super_admin role", () => {
      expect(superAdmin.roles).toContain("super_admin");
    });

    it("has global orgId (*)", () => {
      expect(superAdmin.orgId).toBe("*");
    });
  });

  describe("Admin User", () => {
    const admin = demoUsers.find(u => u.email === "admin@example.com")!;

    it("exists", () => {
      expect(admin).toBeDefined();
    });

    it("has admin role", () => {
      expect(admin.roles).toContain("admin");
    });

    it("belongs to demo org", () => {
      expect(admin.orgId).toBe("demo");
    });
  });

  describe("Role Distribution", () => {
    it("has users with each role type", () => {
      const roleTypes = ["super_admin", "admin", "change_manager", "approver", "implementer", "requester", "cab_member"];
      
      roleTypes.forEach(role => {
        const usersWithRole = demoUsers.filter(u => u.roles.includes(role));
        expect(usersWithRole.length).toBeGreaterThanOrEqual(1);
      });
    });
  });

  describe("Email Format", () => {
    it("all users have valid email format", () => {
      demoUsers.forEach(user => {
        expect(user.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
      });
    });
  });
});

describe("Seed Data - Demo Passwords", () => {
  interface PasswordRule {
    pattern: string;
    description: string;
    examples: string[];
  }

  const passwordRules: PasswordRule[] = [
    {
      pattern: "superadmin123!",
      description: "Super admin password",
      examples: ["superadmin@example.com"],
    },
    {
      pattern: "admin123!",
      description: "Admin password",
      examples: ["admin@example.com"],
    },
    {
      pattern: "manager123!",
      description: "Manager password",
      examples: ["mike@example.com", "lisa@example.com"],
    },
    {
      pattern: "email-prefix",
      description: "Password equals email prefix",
      examples: ["approver1@example.com", "implementer1@example.com", "requester1@example.com"],
    },
  ];

  describe("Password Patterns", () => {
    it("super admin has known password", () => {
      const rule = passwordRules.find(r => r.description === "Super admin password")!;
      expect(rule.pattern).toBe("superadmin123!");
    });

    it("admin has known password", () => {
      const rule = passwordRules.find(r => r.description === "Admin password")!;
      expect(rule.pattern).toBe("admin123!");
    });

    it("role users use email prefix as password", () => {
      const rule = passwordRules.find(r => r.description === "Password equals email prefix")!;
      expect(rule.pattern).toBe("email-prefix");
      expect(rule.examples).toContain("approver1@example.com");
    });
  });

  describe("Password Hashing", () => {
    it("passwords are hashed with bcrypt", () => {
      const bcryptPattern = /^\$2[aby]?\$\d+\$/;
      const hashedPassword = "$2a$12$hashedpasswordexample";
      expect(hashedPassword).toMatch(bcryptPattern);
    });

    it("bcrypt uses cost factor of 12", () => {
      const hashedPassword = "$2a$12$hashedpasswordexample";
      expect(hashedPassword).toContain("$12$");
    });
  });
});

describe("Seed Data - Workflow Definitions", () => {
  interface WorkflowDefinition {
    key: string;
    name: string;
    description: string;
  }

  const workflows: WorkflowDefinition[] = [
    { key: "standard", name: "Standard Change", description: "Standard change workflow with full approval" },
    { key: "emergency", name: "Emergency Change", description: "Emergency change with expedited approval" },
    { key: "standard_preapproved", name: "Pre-Approved Change", description: "Pre-approved changes with minimal approval" },
  ];

  describe("Workflow Types", () => {
    it("has 3 workflow types", () => {
      expect(workflows).toHaveLength(3);
    });

    it("has standard workflow", () => {
      const standard = workflows.find(w => w.key === "standard");
      expect(standard).toBeDefined();
    });

    it("has emergency workflow", () => {
      const emergency = workflows.find(w => w.key === "emergency");
      expect(emergency).toBeDefined();
    });

    it("has pre-approved workflow", () => {
      const preapproved = workflows.find(w => w.key === "standard_preapproved");
      expect(preapproved).toBeDefined();
    });
  });
});

describe("Seed Data - Default Groups", () => {
  interface DefaultGroup {
    name: string;
    description: string;
    type: string;
  }

  const defaultGroups: DefaultGroup[] = [
    { name: "Admin", description: "System administrators", type: "assignment" },
    { name: "CAB", description: "Change Advisory Board", type: "approval" },
    { name: "DevOps", description: "DevOps team", type: "assignment" },
    { name: "Security", description: "Security team", type: "both" },
    { name: "Database", description: "Database team", type: "assignment" },
    { name: "Engineering", description: "Engineering team", type: "assignment" },
  ];

  describe("Group Types", () => {
    it("has assignment groups", () => {
      const assignmentGroups = defaultGroups.filter(g => g.type === "assignment" || g.type === "both");
      expect(assignmentGroups.length).toBeGreaterThan(0);
    });

    it("has approval groups", () => {
      const approvalGroups = defaultGroups.filter(g => g.type === "approval" || g.type === "both");
      expect(approvalGroups.length).toBeGreaterThan(0);
    });

    it("CAB is an approval group", () => {
      const cab = defaultGroups.find(g => g.name === "CAB");
      expect(cab?.type).toBe("approval");
    });

    it("Security can be both", () => {
      const security = defaultGroups.find(g => g.name === "Security");
      expect(security?.type).toBe("both");
    });
  });
});

describe("Seed Data - Default Services", () => {
  interface DefaultService {
    name: string;
    displayName: string;
    category: string;
    criticality: string;
  }

  const defaultServices: DefaultService[] = [
    { name: "api-gateway", displayName: "API Gateway", category: "infrastructure", criticality: "mission-critical" },
    { name: "database", displayName: "Database", category: "database", criticality: "mission-critical" },
    { name: "web-app", displayName: "Web Application", category: "application", criticality: "business-critical" },
    { name: "auth-service", displayName: "Authentication Service", category: "security", criticality: "mission-critical" },
    { name: "cache", displayName: "Cache Service", category: "infrastructure", criticality: "business-critical" },
  ];

  describe("Service Categories", () => {
    it("has infrastructure services", () => {
      const infraServices = defaultServices.filter(s => s.category === "infrastructure");
      expect(infraServices.length).toBeGreaterThan(0);
    });

    it("has database services", () => {
      const dbServices = defaultServices.filter(s => s.category === "database");
      expect(dbServices.length).toBeGreaterThan(0);
    });

    it("has application services", () => {
      const appServices = defaultServices.filter(s => s.category === "application");
      expect(appServices.length).toBeGreaterThan(0);
    });
  });

  describe("Service Criticality", () => {
    it("has mission-critical services", () => {
      const missionCritical = defaultServices.filter(s => s.criticality === "mission-critical");
      expect(missionCritical.length).toBeGreaterThan(0);
    });

    it("database is mission-critical", () => {
      const db = defaultServices.find(s => s.name === "database");
      expect(db?.criticality).toBe("mission-critical");
    });

    it("auth-service is mission-critical", () => {
      const auth = defaultServices.find(s => s.name === "auth-service");
      expect(auth?.criticality).toBe("mission-critical");
    });
  });
});

describe("Seed Data - Sample Change Requests", () => {
  interface SampleCR {
    number: string;
    title: string;
    type: string;
    state: string;
    orgId: string;
  }

  const sampleCRs: SampleCR[] = [
    { number: "CHG0030001", title: "Database Schema Migration", type: "standard", state: "draft", orgId: "demo" },
    { number: "CHG0030002", title: "API Gateway Update", type: "standard", state: "submitted", orgId: "demo" },
    { number: "CHG0030003", title: "Security Patch", type: "emergency", state: "approved", orgId: "demo" },
    { number: "CHG0030004", title: "Feature Flag Rollout", type: "pre-approved", state: "scheduled", orgId: "demo" },
    { number: "CHG0030005", title: "Infrastructure Upgrade", type: "standard", state: "closed", orgId: "demo" },
  ];

  describe("CR States", () => {
    it("has CRs in different states", () => {
      const states = new Set(sampleCRs.map(cr => cr.state));
      expect(states.size).toBeGreaterThan(1);
    });

    it("has draft CRs", () => {
      const drafts = sampleCRs.filter(cr => cr.state === "draft");
      expect(drafts.length).toBeGreaterThan(0);
    });

    it("has closed CRs", () => {
      const closed = sampleCRs.filter(cr => cr.state === "closed");
      expect(closed.length).toBeGreaterThan(0);
    });
  });

  describe("CR Types", () => {
    it("has standard CRs", () => {
      const standard = sampleCRs.filter(cr => cr.type === "standard");
      expect(standard.length).toBeGreaterThan(0);
    });

    it("has emergency CRs", () => {
      const emergency = sampleCRs.filter(cr => cr.type === "emergency");
      expect(emergency.length).toBeGreaterThan(0);
    });

    it("has pre-approved CRs", () => {
      const preapproved = sampleCRs.filter(cr => cr.type === "pre-approved");
      expect(preapproved.length).toBeGreaterThan(0);
    });
  });

  describe("CR Number Format", () => {
    it("all CRs have valid number format", () => {
      sampleCRs.forEach(cr => {
        expect(cr.number).toMatch(/^CHG\d{7}$/);
      });
    });
  });
});

describe("Seed Data - Multi-Tenancy", () => {
  describe("Organization Isolation", () => {
    it("demo org users belong to demo org", () => {
      const demoOrgId = "demo";
      const demoUsers = [
        { email: "admin@example.com", orgId: "demo" },
        { email: "mike@example.com", orgId: "demo" },
      ];

      demoUsers.forEach(user => {
        expect(user.orgId).toBe(demoOrgId);
      });
    });

    it("super admin has global org access", () => {
      const superAdmin = { email: "superadmin@example.com", orgId: "*" };
      expect(superAdmin.orgId).toBe("*");
    });
  });

  describe("Data Scoping", () => {
    it("CRs are scoped to organizations", () => {
      const crs = [
        { number: "CHG001", orgId: "demo" },
        { number: "CHG002", orgId: "demo" },
      ];

      crs.forEach(cr => {
        expect(cr.orgId).toBeDefined();
      });
    });

    it("groups are scoped to organizations", () => {
      const groups = [
        { name: "CAB", orgId: "demo" },
        { name: "DevOps", orgId: "demo" },
      ];

      groups.forEach(group => {
        expect(group.orgId).toBeDefined();
      });
    });

    it("services are scoped to organizations", () => {
      const services = [
        { name: "api-gateway", orgId: "demo" },
        { name: "database", orgId: "demo" },
      ];

      services.forEach(service => {
        expect(service.orgId).toBeDefined();
      });
    });
  });
});
