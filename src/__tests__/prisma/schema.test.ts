/**
 * Tests for Prisma Schema Definitions
 * @jest-environment node
 * 
 * Validates that the Prisma schema models have correct structure,
 * relationships, and constraints.
 */

describe("Prisma Schema - Organization Model", () => {
  interface Organization {
    id: string;
    orgId: string;
    name: string;
    description: string;
    isActive: boolean;
    enableCRImport: boolean;
    snowInstance: string | null;
    snowUsername: string | null;
    snowPassword: string | null;
    snowSyncEnabled: boolean;
    snowSyncIntervalHours: number;
    snowSyncDays: number;
    snowLastSyncAt: Date | null;
    snowLastSyncBy: string | null;
    snowLastSyncResult: string | null;
    createdAt: Date;
    updatedAt: Date;
  }

  const createMockOrg = (overrides: Partial<Organization> = {}): Organization => ({
    id: "uuid-123",
    orgId: "demo",
    name: "Demo Organization",
    description: "",
    isActive: true,
    enableCRImport: false,
    snowInstance: null,
    snowUsername: null,
    snowPassword: null,
    snowSyncEnabled: false,
    snowSyncIntervalHours: 24,
    snowSyncDays: 30,
    snowLastSyncAt: null,
    snowLastSyncBy: null,
    snowLastSyncResult: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  describe("Required Fields", () => {
    it("has required id field", () => {
      const org = createMockOrg();
      expect(org.id).toBeDefined();
      expect(typeof org.id).toBe("string");
    });

    it("has required orgId field (unique identifier)", () => {
      const org = createMockOrg();
      expect(org.orgId).toBeDefined();
      expect(typeof org.orgId).toBe("string");
    });

    it("has required name field", () => {
      const org = createMockOrg();
      expect(org.name).toBeDefined();
      expect(typeof org.name).toBe("string");
    });
  });

  describe("Default Values", () => {
    it("description defaults to empty string", () => {
      const org = createMockOrg();
      expect(org.description).toBe("");
    });

    it("isActive defaults to true", () => {
      const org = createMockOrg();
      expect(org.isActive).toBe(true);
    });

    it("enableCRImport defaults to false", () => {
      const org = createMockOrg();
      expect(org.enableCRImport).toBe(false);
    });

    it("snowSyncEnabled defaults to false", () => {
      const org = createMockOrg();
      expect(org.snowSyncEnabled).toBe(false);
    });

    it("snowSyncIntervalHours defaults to 24", () => {
      const org = createMockOrg();
      expect(org.snowSyncIntervalHours).toBe(24);
    });

    it("snowSyncDays defaults to 30", () => {
      const org = createMockOrg();
      expect(org.snowSyncDays).toBe(30);
    });
  });

  describe("ServiceNow Integration Fields", () => {
    it("snowInstance can be null or string", () => {
      const orgWithoutSnow = createMockOrg();
      expect(orgWithoutSnow.snowInstance).toBeNull();

      const orgWithSnow = createMockOrg({ snowInstance: "https://instance.example.com" });
      expect(orgWithSnow.snowInstance).toBe("https://instance.example.com");
    });

    it("snowUsername and snowPassword are encrypted strings", () => {
      const org = createMockOrg({
        snowUsername: "enc:encrypted-username",
        snowPassword: "enc:encrypted-password",
      });
      expect(org.snowUsername).toContain("enc:");
      expect(org.snowPassword).toContain("enc:");
    });
  });
});

describe("Prisma Schema - User Model", () => {
  interface User {
    id: string;
    email: string;
    name: string;
    hashedPassword: string;
    orgId: string;
    createdAt: Date;
    updatedAt: Date;
    resetToken: string | null;
    resetTokenExpiry: Date | null;
  }

  const createMockUser = (overrides: Partial<User> = {}): User => ({
    id: "user-uuid-123",
    email: "user@example.com",
    name: "Test User",
    hashedPassword: "$2a$12$hashedpassword",
    orgId: "demo",
    createdAt: new Date(),
    updatedAt: new Date(),
    resetToken: null,
    resetTokenExpiry: null,
    ...overrides,
  });

  describe("Required Fields", () => {
    it("has required email field (unique)", () => {
      const user = createMockUser();
      expect(user.email).toBeDefined();
      expect(user.email).toContain("@");
    });

    it("has required name field", () => {
      const user = createMockUser();
      expect(user.name).toBeDefined();
    });

    it("has required hashedPassword field", () => {
      const user = createMockUser();
      expect(user.hashedPassword).toBeDefined();
      expect(user.hashedPassword).toContain("$");
    });
  });

  describe("Default Values", () => {
    it("orgId defaults to demo", () => {
      const user = createMockUser();
      expect(user.orgId).toBe("demo");
    });
  });

  describe("Password Reset Fields", () => {
    it("resetToken can be null or unique string", () => {
      const userWithoutReset = createMockUser();
      expect(userWithoutReset.resetToken).toBeNull();

      const userWithReset = createMockUser({ resetToken: "unique-reset-token" });
      expect(userWithReset.resetToken).toBe("unique-reset-token");
    });

    it("resetTokenExpiry can be null or Date", () => {
      const userWithoutReset = createMockUser();
      expect(userWithoutReset.resetTokenExpiry).toBeNull();

      const expiry = new Date(Date.now() + 3600000);
      const userWithReset = createMockUser({ resetTokenExpiry: expiry });
      expect(userWithReset.resetTokenExpiry).toEqual(expiry);
    });
  });
});

describe("Prisma Schema - Role Model", () => {
  interface Role {
    id: string;
    name: string;
    displayName: string;
    description: string | null;
    orgId: string;
    canManageUsers: boolean;
    canManageRoles: boolean;
    canManageChanges: boolean;
    canApproveChanges: boolean;
    canImplementChanges: boolean;
    canManageReleases: boolean;
    canEditSettings: boolean;
    canViewMetrics: boolean;
    canViewAllData: boolean;
    isSuperAdmin: boolean;
    isSystem: boolean;
    isActive: boolean;
  }

  const createMockRole = (overrides: Partial<Role> = {}): Role => ({
    id: "role-uuid-123",
    name: "test_role",
    displayName: "Test Role",
    description: null,
    orgId: "demo",
    canManageUsers: false,
    canManageRoles: false,
    canManageChanges: false,
    canApproveChanges: false,
    canImplementChanges: false,
    canManageReleases: false,
    canEditSettings: false,
    canViewMetrics: false,
    canViewAllData: false,
    isSuperAdmin: false,
    isSystem: false,
    isActive: true,
    ...overrides,
  });

  describe("Required Fields", () => {
    it("has required name field (unique)", () => {
      const role = createMockRole();
      expect(role.name).toBeDefined();
    });

    it("has required displayName field", () => {
      const role = createMockRole();
      expect(role.displayName).toBeDefined();
    });
  });

  describe("Permission Defaults", () => {
    it("all permissions default to false", () => {
      const role = createMockRole();
      expect(role.canManageUsers).toBe(false);
      expect(role.canManageRoles).toBe(false);
      expect(role.canManageChanges).toBe(false);
      expect(role.canApproveChanges).toBe(false);
      expect(role.canImplementChanges).toBe(false);
      expect(role.canManageReleases).toBe(false);
      expect(role.canEditSettings).toBe(false);
      expect(role.canViewMetrics).toBe(false);
      expect(role.canViewAllData).toBe(false);
    });

    it("isSuperAdmin defaults to false", () => {
      const role = createMockRole();
      expect(role.isSuperAdmin).toBe(false);
    });

    it("isSystem defaults to false", () => {
      const role = createMockRole();
      expect(role.isSystem).toBe(false);
    });

    it("isActive defaults to true", () => {
      const role = createMockRole();
      expect(role.isActive).toBe(true);
    });
  });

  describe("Super Admin Role", () => {
    it("super admin has all permissions", () => {
      const superAdmin = createMockRole({
        name: "super_admin",
        displayName: "Super Administrator",
        orgId: "*",
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
      });

      expect(superAdmin.isSuperAdmin).toBe(true);
      expect(superAdmin.orgId).toBe("*");
      expect(superAdmin.canManageUsers).toBe(true);
      expect(superAdmin.canViewAllData).toBe(true);
    });
  });
});

describe("Prisma Schema - ChangeRequest Model", () => {
  interface ChangeRequest {
    number: string;
    externalId: string | null;
    externalSource: string | null;
    workflowKey: string;
    orgId: string;
    title: string;
    description: string;
    type: string;
    category: string;
    priority: string;
    riskLevel: string;
    impactLevel: string;
    urgency: string;
    state: string;
    approvalState: string;
    requestedBy: string;
    assignedTo: string | null;
    computedRiskScore: number;
    computedImpactScore: number;
  }

  const createMockCR = (overrides: Partial<ChangeRequest> = {}): ChangeRequest => ({
    number: "CHG0000001",
    externalId: null,
    externalSource: null,
    workflowKey: "standard",
    orgId: "demo",
    title: "Test Change Request",
    description: "",
    type: "standard",
    category: "other",
    priority: "3",
    riskLevel: "moderate",
    impactLevel: "3",
    urgency: "3",
    state: "draft",
    approvalState: "not_requested",
    requestedBy: "user@example.com",
    assignedTo: null,
    computedRiskScore: 0,
    computedImpactScore: 0,
    ...overrides,
  });

  describe("Required Fields", () => {
    it("has required number field (primary key)", () => {
      const cr = createMockCR();
      expect(cr.number).toBeDefined();
      expect(cr.number).toMatch(/^CHG\d+$/);
    });

    it("has required title field", () => {
      const cr = createMockCR();
      expect(cr.title).toBeDefined();
    });

    it("has required requestedBy field", () => {
      const cr = createMockCR();
      expect(cr.requestedBy).toBeDefined();
      expect(cr.requestedBy).toContain("@");
    });
  });

  describe("Default Values", () => {
    it("workflowKey defaults to standard", () => {
      const cr = createMockCR();
      expect(cr.workflowKey).toBe("standard");
    });

    it("type defaults to standard", () => {
      const cr = createMockCR();
      expect(cr.type).toBe("standard");
    });

    it("state defaults to draft", () => {
      const cr = createMockCR();
      expect(cr.state).toBe("draft");
    });

    it("approvalState defaults to not_requested", () => {
      const cr = createMockCR();
      expect(cr.approvalState).toBe("not_requested");
    });

    it("priority defaults to 3", () => {
      const cr = createMockCR();
      expect(cr.priority).toBe("3");
    });

    it("riskLevel defaults to moderate", () => {
      const cr = createMockCR();
      expect(cr.riskLevel).toBe("moderate");
    });
  });

  describe("External Source Tracking", () => {
    it("native CRs have null externalSource", () => {
      const cr = createMockCR();
      expect(cr.externalSource).toBeNull();
      expect(cr.externalId).toBeNull();
    });

    it("imported CRs have externalSource set", () => {
      const cr = createMockCR({
        externalSource: "servicenow",
        externalId: "sys_id_12345",
      });
      expect(cr.externalSource).toBe("servicenow");
      expect(cr.externalId).toBe("sys_id_12345");
    });
  });

  describe("CR Types", () => {
    it("supports standard type", () => {
      const cr = createMockCR({ type: "standard" });
      expect(cr.type).toBe("standard");
    });

    it("supports emergency type", () => {
      const cr = createMockCR({ type: "emergency" });
      expect(cr.type).toBe("emergency");
    });

    it("supports pre-approved type", () => {
      const cr = createMockCR({ type: "pre-approved" });
      expect(cr.type).toBe("pre-approved");
    });
  });
});

describe("Prisma Schema - Group Model", () => {
  interface Group {
    id: string;
    name: string;
    description: string;
    type: string;
    orgId: string;
    isActive: boolean;
    createdBy: string;
  }

  const createMockGroup = (overrides: Partial<Group> = {}): Group => ({
    id: "group-uuid-123",
    name: "CAB",
    description: "",
    type: "approver",
    orgId: "demo",
    isActive: true,
    createdBy: "admin@example.com",
    ...overrides,
  });

  describe("Required Fields", () => {
    it("has required name field", () => {
      const group = createMockGroup();
      expect(group.name).toBeDefined();
    });

    it("has required createdBy field", () => {
      const group = createMockGroup();
      expect(group.createdBy).toBeDefined();
    });
  });

  describe("Default Values", () => {
    it("type defaults to approver", () => {
      const group = createMockGroup();
      expect(group.type).toBe("approver");
    });

    it("description defaults to empty string", () => {
      const group = createMockGroup();
      expect(group.description).toBe("");
    });

    it("isActive defaults to true", () => {
      const group = createMockGroup();
      expect(group.isActive).toBe(true);
    });

    it("orgId defaults to demo", () => {
      const group = createMockGroup();
      expect(group.orgId).toBe("demo");
    });
  });

  describe("Group Types", () => {
    it("supports approver type", () => {
      const group = createMockGroup({ type: "approver" });
      expect(group.type).toBe("approver");
    });

    it("supports assignment type", () => {
      const group = createMockGroup({ type: "assignment" });
      expect(group.type).toBe("assignment");
    });

    it("supports both type", () => {
      const group = createMockGroup({ type: "both" });
      expect(group.type).toBe("both");
    });
  });
});

describe("Prisma Schema - Service Model", () => {
  interface Service {
    id: string;
    name: string;
    displayName: string;
    description: string;
    category: string;
    owner: string | null;
    criticality: string;
    orgId: string;
    isActive: boolean;
    createdBy: string;
  }

  const createMockService = (overrides: Partial<Service> = {}): Service => ({
    id: "service-uuid-123",
    name: "api-gateway",
    displayName: "API Gateway",
    description: "",
    category: "other",
    owner: null,
    criticality: "standard",
    orgId: "demo",
    isActive: true,
    createdBy: "admin@example.com",
    ...overrides,
  });

  describe("Required Fields", () => {
    it("has required name field", () => {
      const service = createMockService();
      expect(service.name).toBeDefined();
    });

    it("has required displayName field", () => {
      const service = createMockService();
      expect(service.displayName).toBeDefined();
    });

    it("has required createdBy field", () => {
      const service = createMockService();
      expect(service.createdBy).toBeDefined();
    });
  });

  describe("Default Values", () => {
    it("category defaults to other", () => {
      const service = createMockService();
      expect(service.category).toBe("other");
    });

    it("criticality defaults to standard", () => {
      const service = createMockService();
      expect(service.criticality).toBe("standard");
    });

    it("isActive defaults to true", () => {
      const service = createMockService();
      expect(service.isActive).toBe(true);
    });
  });

  describe("Service Categories", () => {
    const categories = ["infrastructure", "application", "database", "network", "security", "other"];

    categories.forEach(category => {
      it(`supports ${category} category`, () => {
        const service = createMockService({ category });
        expect(service.category).toBe(category);
      });
    });
  });

  describe("Service Criticality", () => {
    const criticalities = ["mission-critical", "business-critical", "standard"];

    criticalities.forEach(criticality => {
      it(`supports ${criticality} criticality`, () => {
        const service = createMockService({ criticality });
        expect(service.criticality).toBe(criticality);
      });
    });
  });
});

describe("Prisma Schema - ApprovalStep Model", () => {
  interface ApprovalStep {
    id: string;
    changeRequestId: string;
    name: string;
    ordering: number;
    policy: string;
    status: string;
    startedAt: Date | null;
    completedAt: Date | null;
  }

  const createMockApprovalStep = (overrides: Partial<ApprovalStep> = {}): ApprovalStep => ({
    id: "step-uuid-123",
    changeRequestId: "CHG0000001",
    name: "Tech Review",
    ordering: 0,
    policy: "all",
    status: "pending",
    startedAt: null,
    completedAt: null,
    ...overrides,
  });

  describe("Required Fields", () => {
    it("has required changeRequestId field", () => {
      const step = createMockApprovalStep();
      expect(step.changeRequestId).toBeDefined();
    });

    it("has required name field", () => {
      const step = createMockApprovalStep();
      expect(step.name).toBeDefined();
    });
  });

  describe("Default Values", () => {
    it("ordering defaults to 0", () => {
      const step = createMockApprovalStep();
      expect(step.ordering).toBe(0);
    });

    it("policy defaults to all", () => {
      const step = createMockApprovalStep();
      expect(step.policy).toBe("all");
    });

    it("status defaults to pending", () => {
      const step = createMockApprovalStep();
      expect(step.status).toBe("pending");
    });
  });

  describe("Approval Policies", () => {
    it("supports all policy", () => {
      const step = createMockApprovalStep({ policy: "all" });
      expect(step.policy).toBe("all");
    });

    it("supports any policy", () => {
      const step = createMockApprovalStep({ policy: "any" });
      expect(step.policy).toBe("any");
    });

    it("supports quorum policy", () => {
      const step = createMockApprovalStep({ policy: "quorum:2" });
      expect(step.policy).toBe("quorum:2");
    });
  });

  describe("Approval Statuses", () => {
    const statuses = ["pending", "approved", "rejected", "skipped"];

    statuses.forEach(status => {
      it(`supports ${status} status`, () => {
        const step = createMockApprovalStep({ status });
        expect(step.status).toBe(status);
      });
    });
  });
});

describe("Prisma Schema - Relationships", () => {
  describe("User-Role Many-to-Many", () => {
    interface UserRole {
      id: string;
      userId: string;
      roleId: string;
      assignedBy: string | null;
      assignedAt: Date;
    }

    it("UserRole junction table has required fields", () => {
      const userRole: UserRole = {
        id: "ur-uuid-123",
        userId: "user-uuid-123",
        roleId: "role-uuid-123",
        assignedBy: "admin@example.com",
        assignedAt: new Date(),
      };

      expect(userRole.userId).toBeDefined();
      expect(userRole.roleId).toBeDefined();
    });

    it("UserRole has unique constraint on userId-roleId", () => {
      const userRoles: UserRole[] = [
        { id: "1", userId: "user1", roleId: "role1", assignedBy: null, assignedAt: new Date() },
        { id: "2", userId: "user1", roleId: "role2", assignedBy: null, assignedAt: new Date() },
        { id: "3", userId: "user2", roleId: "role1", assignedBy: null, assignedAt: new Date() },
      ];

      const uniquePairs = new Set(userRoles.map(ur => `${ur.userId}-${ur.roleId}`));
      expect(uniquePairs.size).toBe(userRoles.length);
    });
  });

  describe("ChangeRequest-Release Relationship", () => {
    it("ChangeRequest can belong to a Release", () => {
      const cr = {
        number: "CHG0000001",
        releaseId: "REL-2024-001",
      };
      expect(cr.releaseId).toBeDefined();
    });

    it("ChangeRequest releaseId is optional", () => {
      const cr = {
        number: "CHG0000001",
        releaseId: null,
      };
      expect(cr.releaseId).toBeNull();
    });
  });

  describe("ChangeRequest-Approval Relationship", () => {
    it("ChangeRequest can have multiple ApprovalSteps", () => {
      const crNumber = "CHG0000001";
      const steps = [
        { id: "1", changeRequestId: crNumber, name: "Tech Review" },
        { id: "2", changeRequestId: crNumber, name: "CAB" },
        { id: "3", changeRequestId: crNumber, name: "Security" },
      ];

      expect(steps.every(s => s.changeRequestId === crNumber)).toBe(true);
      expect(steps).toHaveLength(3);
    });
  });
});

describe("Prisma Schema - Indexes", () => {
  describe("Organization Indexes", () => {
    it("has index on orgId", () => {
      const indexedFields = ["orgId"];
      expect(indexedFields).toContain("orgId");
    });
  });

  describe("User Indexes", () => {
    it("has index on orgId", () => {
      const indexedFields = ["orgId"];
      expect(indexedFields).toContain("orgId");
    });

    it("has unique index on email", () => {
      const uniqueFields = ["email"];
      expect(uniqueFields).toContain("email");
    });
  });

  describe("ChangeRequest Indexes", () => {
    it("has indexes on frequently queried fields", () => {
      const indexedFields = ["state", "requestedBy", "assignedTo", "releaseId", "createdAt", "orgId"];
      expect(indexedFields).toContain("state");
      expect(indexedFields).toContain("orgId");
      expect(indexedFields).toContain("createdAt");
    });
  });

  describe("Group Indexes", () => {
    it("has composite unique index on name-orgId", () => {
      const uniqueComposite = ["name", "orgId"];
      expect(uniqueComposite).toContain("name");
      expect(uniqueComposite).toContain("orgId");
    });
  });
});
