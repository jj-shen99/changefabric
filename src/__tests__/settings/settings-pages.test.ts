/**
 * Settings Pages Tests
 * 
 * Tests for the /settings section pages including:
 * - General settings and approval policies
 * - Account settings (email/password changes)
 * - Roles management
 * - Users management
 * - Services management
 * - Integrations
 */

// ── Settings Page Structure ──────────────────────────────────────────

describe("Settings Page Structure", () => {
  const SETTINGS_TABS = [
    { id: "general", label: "General" },
    { id: "approval", label: "Approval Policies" },
    { id: "integrations", label: "Integrations" },
  ];

  const SETTINGS_PAGES = [
    { path: "/settings", title: "Settings" },
    { path: "/settings/account", title: "Account Settings" },
    { path: "/settings/users", title: "User Management" },
    { path: "/settings/roles", title: "Role Management" },
    { path: "/settings/services", title: "Services Management" },
    { path: "/settings/integrations", title: "Integrations" },
    { path: "/settings/approvers", title: "Approvers" },
    { path: "/settings/groups", title: "Groups" },
  ];

  it("has correct number of settings tabs", () => {
    expect(SETTINGS_TABS).toHaveLength(3);
  });

  it("has correct number of settings pages", () => {
    expect(SETTINGS_PAGES).toHaveLength(8);
  });

  it("all settings pages have valid paths", () => {
    SETTINGS_PAGES.forEach((page) => {
      expect(page.path).toMatch(/^\/settings/);
    });
  });

  it("all settings pages have titles", () => {
    SETTINGS_PAGES.forEach((page) => {
      expect(page.title).toBeTruthy();
      expect(page.title.length).toBeGreaterThan(0);
    });
  });
});

// ── General Settings ─────────────────────────────────────────────────

describe("General Settings", () => {
  interface SettingItem {
    key: string;
    label: string;
    value: string;
    type: "number" | "toggle" | "select" | "text";
    options?: string[];
  }

  const defaultSettings: SettingItem[] = [
    { key: "risk_alert_threshold", label: "Risk Score Alert Threshold", value: "60", type: "number" },
    { key: "failed_validation_alerts", label: "Failed Validation Alerts", value: "Enabled", type: "toggle", options: ["Enabled", "Disabled"] },
    { key: "deployment_notifications", label: "Deployment Notifications", value: "Slack + Email", type: "select", options: ["Slack + Email", "Slack Only", "Email Only", "Disabled"] },
  ];

  it("has default notification settings", () => {
    expect(defaultSettings).toHaveLength(3);
  });

  it("risk alert threshold is a number type", () => {
    const riskSetting = defaultSettings.find(s => s.key === "risk_alert_threshold");
    expect(riskSetting).toBeDefined();
    expect(riskSetting?.type).toBe("number");
    expect(parseInt(riskSetting?.value || "0")).toBe(60);
  });

  it("failed validation alerts is a toggle", () => {
    const alertSetting = defaultSettings.find(s => s.key === "failed_validation_alerts");
    expect(alertSetting).toBeDefined();
    expect(alertSetting?.type).toBe("toggle");
    expect(alertSetting?.options).toContain("Enabled");
    expect(alertSetting?.options).toContain("Disabled");
  });

  it("deployment notifications has multiple options", () => {
    const notifSetting = defaultSettings.find(s => s.key === "deployment_notifications");
    expect(notifSetting).toBeDefined();
    expect(notifSetting?.type).toBe("select");
    expect(notifSetting?.options).toHaveLength(4);
    expect(notifSetting?.options).toContain("Slack + Email");
    expect(notifSetting?.options).toContain("Disabled");
  });

  it("all settings have unique keys", () => {
    const keys = defaultSettings.map(s => s.key);
    const uniqueKeys = new Set(keys);
    expect(uniqueKeys.size).toBe(keys.length);
  });
});

// ── Approval Policies ────────────────────────────────────────────────

describe("Approval Policies", () => {
  interface ApprovalPolicy {
    id: string;
    riskLevel: "high" | "medium" | "low";
    requiredApprovals: number;
    approverGroups: string[];
    autoApprove: boolean;
  }

  const defaultApprovalPolicies: ApprovalPolicy[] = [
    { id: "high", riskLevel: "high", requiredApprovals: 2, approverGroups: ["CAB", "Manager"], autoApprove: false },
    { id: "medium", riskLevel: "medium", requiredApprovals: 1, approverGroups: ["Manager"], autoApprove: false },
    { id: "low", riskLevel: "low", requiredApprovals: 1, approverGroups: ["Team Lead"], autoApprove: false },
  ];

  it("has policies for all risk levels", () => {
    const riskLevels = defaultApprovalPolicies.map(p => p.riskLevel);
    expect(riskLevels).toContain("high");
    expect(riskLevels).toContain("medium");
    expect(riskLevels).toContain("low");
  });

  it("high risk requires more approvals than low risk", () => {
    const highRisk = defaultApprovalPolicies.find(p => p.riskLevel === "high");
    const lowRisk = defaultApprovalPolicies.find(p => p.riskLevel === "low");
    expect(highRisk?.requiredApprovals).toBeGreaterThanOrEqual(lowRisk?.requiredApprovals || 0);
  });

  it("high risk includes CAB in approver groups", () => {
    const highRisk = defaultApprovalPolicies.find(p => p.riskLevel === "high");
    expect(highRisk?.approverGroups).toContain("CAB");
  });

  it("no policies have auto-approve enabled by default", () => {
    defaultApprovalPolicies.forEach(policy => {
      expect(policy.autoApprove).toBe(false);
    });
  });

  it("all policies require at least one approval", () => {
    defaultApprovalPolicies.forEach(policy => {
      expect(policy.requiredApprovals).toBeGreaterThanOrEqual(1);
    });
  });

  it("all policies have at least one approver group", () => {
    defaultApprovalPolicies.forEach(policy => {
      expect(policy.approverGroups.length).toBeGreaterThanOrEqual(1);
    });
  });

  it("policy IDs match risk levels", () => {
    defaultApprovalPolicies.forEach(policy => {
      expect(policy.id).toBe(policy.riskLevel);
    });
  });
});

// ── Account Settings ─────────────────────────────────────────────────

describe("Account Settings", () => {
  describe("Email Change Validation", () => {
    const validateEmail = (email: string): boolean => {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    };

    it("accepts valid email addresses", () => {
      expect(validateEmail("user@example.com")).toBe(true);
      expect(validateEmail("test.user@company.org")).toBe(true);
      expect(validateEmail("admin+tag@domain.co.uk")).toBe(true);
    });

    it("rejects invalid email addresses", () => {
      expect(validateEmail("invalid")).toBe(false);
      expect(validateEmail("@domain.com")).toBe(false);
      expect(validateEmail("user@")).toBe(false);
      expect(validateEmail("user @domain.com")).toBe(false);
    });
  });

  describe("Password Change Validation", () => {
    const validatePassword = (password: string): { valid: boolean; error?: string } => {
      if (password.length < 8) {
        return { valid: false, error: "Password must be at least 8 characters" };
      }
      return { valid: true };
    };

    const validatePasswordMatch = (password: string, confirm: string): boolean => {
      return password === confirm;
    };

    it("requires minimum 8 characters", () => {
      expect(validatePassword("short").valid).toBe(false);
      expect(validatePassword("short").error).toContain("8 characters");
      expect(validatePassword("longpassword").valid).toBe(true);
    });

    it("validates password confirmation match", () => {
      expect(validatePasswordMatch("password123", "password123")).toBe(true);
      expect(validatePasswordMatch("password123", "password456")).toBe(false);
    });

    it("accepts strong passwords", () => {
      expect(validatePassword("MyStr0ng!Pass").valid).toBe(true);
      expect(validatePassword("12345678").valid).toBe(true);
      expect(validatePassword("abcdefgh").valid).toBe(true);
    });
  });
});

// ── Role Management ──────────────────────────────────────────────────

describe("Role Management", () => {
  const SYSTEM_ROLES = [
    { name: "admin", displayName: "Admin", isSystem: true },
    { name: "change_manager", displayName: "Change Manager", isSystem: true },
    { name: "approver", displayName: "Approver", isSystem: true },
    { name: "implementer", displayName: "Implementer", isSystem: true },
    { name: "requester", displayName: "Requester", isSystem: true },
    { name: "cab_member", displayName: "CAB Member", isSystem: true },
  ];

  const ROLE_PERMISSIONS = {
    admin: {
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
    change_manager: {
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
    approver: {
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
    implementer: {
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
    requester: {
      canManageUsers: false,
      canManageRoles: false,
      canManageChanges: true,
      canApproveChanges: false,
      canImplementChanges: false,
      canManageReleases: false,
      canEditSettings: false,
      canViewMetrics: false,
      canViewAllData: false,
    },
  };

  it("has all required system roles", () => {
    expect(SYSTEM_ROLES).toHaveLength(6);
    const roleNames = SYSTEM_ROLES.map(r => r.name);
    expect(roleNames).toContain("admin");
    expect(roleNames).toContain("change_manager");
    expect(roleNames).toContain("approver");
    expect(roleNames).toContain("implementer");
    expect(roleNames).toContain("requester");
    expect(roleNames).toContain("cab_member");
  });

  it("all system roles are marked as system", () => {
    SYSTEM_ROLES.forEach(role => {
      expect(role.isSystem).toBe(true);
    });
  });

  it("all roles have display names", () => {
    SYSTEM_ROLES.forEach(role => {
      expect(role.displayName).toBeTruthy();
      expect(role.displayName.length).toBeGreaterThan(0);
    });
  });

  it("admin has all permissions", () => {
    const adminPerms = ROLE_PERMISSIONS.admin;
    Object.values(adminPerms).forEach(perm => {
      expect(perm).toBe(true);
    });
  });

  it("only admin can manage users", () => {
    expect(ROLE_PERMISSIONS.admin.canManageUsers).toBe(true);
    expect(ROLE_PERMISSIONS.change_manager.canManageUsers).toBe(false);
    expect(ROLE_PERMISSIONS.approver.canManageUsers).toBe(false);
    expect(ROLE_PERMISSIONS.implementer.canManageUsers).toBe(false);
    expect(ROLE_PERMISSIONS.requester.canManageUsers).toBe(false);
  });

  it("approver can approve but not implement", () => {
    expect(ROLE_PERMISSIONS.approver.canApproveChanges).toBe(true);
    expect(ROLE_PERMISSIONS.approver.canImplementChanges).toBe(false);
  });

  it("implementer can implement but not approve", () => {
    expect(ROLE_PERMISSIONS.implementer.canImplementChanges).toBe(true);
    expect(ROLE_PERMISSIONS.implementer.canApproveChanges).toBe(false);
  });

  it("change manager can manage changes and releases", () => {
    expect(ROLE_PERMISSIONS.change_manager.canManageChanges).toBe(true);
    expect(ROLE_PERMISSIONS.change_manager.canManageReleases).toBe(true);
  });
});

// ── User Management ──────────────────────────────────────────────────

describe("User Management", () => {
  interface UserRecord {
    id: string;
    email: string;
    name: string;
    roles: { id: string; name: string; displayName: string }[];
    createdAt: string;
    orgId: string;
  }

  const mockUsers: UserRecord[] = [
    {
      id: "user-1",
      email: "admin@example.com",
      name: "Admin User",
      roles: [{ id: "role-1", name: "admin", displayName: "Admin" }],
      createdAt: "2024-01-01T00:00:00Z",
      orgId: "org-1",
    },
    {
      id: "user-2",
      email: "manager@example.com",
      name: "Change Manager",
      roles: [{ id: "role-2", name: "change_manager", displayName: "Change Manager" }],
      createdAt: "2024-01-02T00:00:00Z",
      orgId: "org-1",
    },
    {
      id: "user-3",
      email: "approver@example.com",
      name: "Approver User",
      roles: [
        { id: "role-3", name: "approver", displayName: "Approver" },
        { id: "role-4", name: "implementer", displayName: "Implementer" },
      ],
      createdAt: "2024-01-03T00:00:00Z",
      orgId: "org-2",
    },
  ];

  describe("User Sorting", () => {
    type SortKey = "name" | "email" | "orgId" | "roles" | "createdAt";
    type SortDir = "asc" | "desc";

    const sortUsers = (users: UserRecord[], key: SortKey, dir: SortDir): UserRecord[] => {
      return [...users].sort((a, b) => {
        let cmp = 0;
        switch (key) {
          case "name":
            cmp = a.name.localeCompare(b.name);
            break;
          case "email":
            cmp = a.email.localeCompare(b.email);
            break;
          case "orgId":
            cmp = a.orgId.localeCompare(b.orgId);
            break;
          case "roles":
            cmp = a.roles.length - b.roles.length;
            break;
          case "createdAt":
            cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
            break;
        }
        return dir === "asc" ? cmp : -cmp;
      });
    };

    it("sorts by name ascending", () => {
      const sorted = sortUsers(mockUsers, "name", "asc");
      expect(sorted[0].name).toBe("Admin User");
      expect(sorted[2].name).toBe("Change Manager");
    });

    it("sorts by name descending", () => {
      const sorted = sortUsers(mockUsers, "name", "desc");
      expect(sorted[0].name).toBe("Change Manager");
      expect(sorted[2].name).toBe("Admin User");
    });

    it("sorts by email", () => {
      const sorted = sortUsers(mockUsers, "email", "asc");
      expect(sorted[0].email).toBe("admin@example.com");
    });

    it("sorts by role count", () => {
      const sorted = sortUsers(mockUsers, "roles", "desc");
      expect(sorted[0].roles.length).toBe(2);
    });

    it("sorts by created date", () => {
      const sorted = sortUsers(mockUsers, "createdAt", "asc");
      expect(sorted[0].id).toBe("user-1");
      expect(sorted[2].id).toBe("user-3");
    });
  });

  describe("User Validation", () => {
    const validateUserCreate = (data: { email: string; name: string; orgId: string }): { valid: boolean; errors: string[] } => {
      const errors: string[] = [];
      if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
        errors.push("Valid email is required");
      }
      if (!data.name || data.name.trim().length === 0) {
        errors.push("Name is required");
      }
      if (!data.orgId) {
        errors.push("Organization is required");
      }
      return { valid: errors.length === 0, errors };
    };

    it("validates required fields", () => {
      const result = validateUserCreate({ email: "", name: "", orgId: "" });
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBe(3);
    });

    it("accepts valid user data", () => {
      const result = validateUserCreate({
        email: "user@example.com",
        name: "Test User",
        orgId: "org-1",
      });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("rejects invalid email", () => {
      const result = validateUserCreate({
        email: "invalid-email",
        name: "Test User",
        orgId: "org-1",
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Valid email is required");
    });
  });

  describe("Role Assignment", () => {
    it("users can have multiple roles", () => {
      const multiRoleUser = mockUsers.find(u => u.roles.length > 1);
      expect(multiRoleUser).toBeDefined();
      expect(multiRoleUser?.roles.length).toBe(2);
    });

    it("users must have at least one role", () => {
      const validateRoleAssignment = (roleIds: string[]): boolean => {
        return roleIds.length >= 1;
      };
      expect(validateRoleAssignment([])).toBe(false);
      expect(validateRoleAssignment(["role-1"])).toBe(true);
      expect(validateRoleAssignment(["role-1", "role-2"])).toBe(true);
    });
  });
});

// ── Services Management ──────────────────────────────────────────────

describe("Services Management", () => {
  const CATEGORIES = [
    { value: "infrastructure", label: "Infrastructure" },
    { value: "application", label: "Application" },
    { value: "database", label: "Database" },
    { value: "network", label: "Network" },
    { value: "security", label: "Security" },
    { value: "other", label: "Other" },
  ];

  const CRITICALITY = [
    { value: "mission-critical", label: "Mission Critical" },
    { value: "business-critical", label: "Business Critical" },
    { value: "standard", label: "Standard" },
  ];

  interface Service {
    id: string;
    name: string;
    displayName: string;
    description: string;
    category: string;
    owner: string | null;
    criticality: string;
    isActive: boolean;
  }

  const mockServices: Service[] = [
    {
      id: "svc-1",
      name: "api-gateway",
      displayName: "API Gateway",
      description: "Main API gateway service",
      category: "infrastructure",
      owner: "Platform Team",
      criticality: "mission-critical",
      isActive: true,
    },
    {
      id: "svc-2",
      name: "user-db",
      displayName: "User Database",
      description: "PostgreSQL user database",
      category: "database",
      owner: "DBA Team",
      criticality: "business-critical",
      isActive: true,
    },
    {
      id: "svc-3",
      name: "legacy-app",
      displayName: "Legacy Application",
      description: "Legacy monolith",
      category: "application",
      owner: null,
      criticality: "standard",
      isActive: false,
    },
  ];

  it("has all service categories", () => {
    expect(CATEGORIES).toHaveLength(6);
    const values = CATEGORIES.map(c => c.value);
    expect(values).toContain("infrastructure");
    expect(values).toContain("application");
    expect(values).toContain("database");
    expect(values).toContain("security");
  });

  it("has all criticality levels", () => {
    expect(CRITICALITY).toHaveLength(3);
    const values = CRITICALITY.map(c => c.value);
    expect(values).toContain("mission-critical");
    expect(values).toContain("business-critical");
    expect(values).toContain("standard");
  });

  describe("Service Filtering", () => {
    const filterServices = (services: Service[], search: string): Service[] => {
      const lower = search.toLowerCase();
      return services.filter(
        s =>
          s.name.toLowerCase().includes(lower) ||
          s.displayName.toLowerCase().includes(lower) ||
          s.category.toLowerCase().includes(lower)
      );
    };

    it("filters by name", () => {
      const result = filterServices(mockServices, "api");
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("api-gateway");
    });

    it("filters by display name", () => {
      const result = filterServices(mockServices, "Gateway");
      expect(result).toHaveLength(1);
      expect(result[0].displayName).toBe("API Gateway");
    });

    it("filters by category", () => {
      const result = filterServices(mockServices, "database");
      expect(result).toHaveLength(1);
      expect(result[0].category).toBe("database");
    });

    it("returns all services for empty search", () => {
      const result = filterServices(mockServices, "");
      expect(result).toHaveLength(3);
    });

    it("returns empty array for no matches", () => {
      const result = filterServices(mockServices, "nonexistent");
      expect(result).toHaveLength(0);
    });
  });

  describe("Service Validation", () => {
    const validateService = (data: { name: string; displayName: string; category: string }): { valid: boolean; errors: string[] } => {
      const errors: string[] = [];
      if (!data.name || data.name.trim().length === 0) {
        errors.push("Service name is required");
      }
      if (!/^[a-z0-9-]+$/.test(data.name)) {
        errors.push("Service name must be lowercase with hyphens only");
      }
      if (!data.displayName || data.displayName.trim().length === 0) {
        errors.push("Display name is required");
      }
      if (!CATEGORIES.some(c => c.value === data.category)) {
        errors.push("Invalid category");
      }
      return { valid: errors.length === 0, errors };
    };

    it("validates required fields", () => {
      const result = validateService({ name: "", displayName: "", category: "" });
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("validates service name format", () => {
      const validResult = validateService({ name: "my-service", displayName: "My Service", category: "application" });
      expect(validResult.valid).toBe(true);

      const invalidResult = validateService({ name: "My Service", displayName: "My Service", category: "application" });
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.errors).toContain("Service name must be lowercase with hyphens only");
    });

    it("validates category exists", () => {
      const result = validateService({ name: "test-svc", displayName: "Test", category: "invalid-category" });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Invalid category");
    });
  });
});

// ── Integrations Settings ────────────────────────────────────────────

describe("Integrations Settings", () => {
  const INTEGRATION_TYPES = [
    { id: "itsm", name: "ITSM Import", description: "Import change requests from external ITSM" },
    { id: "git", name: "Git Integration", description: "Connect to Git repositories" },
  ];

  it("has ITSM integration option", () => {
    const itsm = INTEGRATION_TYPES.find(i => i.id === "itsm");
    expect(itsm).toBeDefined();
    expect(itsm?.name).toBe("ITSM Import");
  });

  it("has Git integration option", () => {
    const git = INTEGRATION_TYPES.find(i => i.id === "git");
    expect(git).toBeDefined();
    expect(git?.name).toBe("Git Integration");
  });

  describe("ITSM Credential Validation", () => {
    const validateItsmCredentials = (creds: { instance: string; user: string; password: string }): { valid: boolean; errors: string[] } => {
      const errors: string[] = [];
      if (!creds.instance) {
        errors.push("Instance URL is required");
      } else {
        try {
          const url = new URL(creds.instance);
          if (url.protocol !== "https:") {
            errors.push("Instance URL must use HTTPS");
          }
        } catch {
          errors.push("Invalid instance URL format");
        }
      }
      if (!creds.user) {
        errors.push("Username is required");
      }
      if (!creds.password) {
        errors.push("Password is required");
      }
      return { valid: errors.length === 0, errors };
    };

    it("validates required fields", () => {
      const result = validateItsmCredentials({ instance: "", user: "", password: "" });
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBe(3);
    });

    it("requires HTTPS for instance URL", () => {
      const result = validateItsmCredentials({
        instance: "http://example.com",
        user: "admin",
        password: "secret",
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Instance URL must use HTTPS");
    });

    it("accepts valid HTTPS URL", () => {
      const result = validateItsmCredentials({
        instance: "https://instance.itsm.example.com",
        user: "admin",
        password: "secret",
      });
      expect(result.valid).toBe(true);
    });

    it("rejects invalid URL format", () => {
      const result = validateItsmCredentials({
        instance: "not-a-url",
        user: "admin",
        password: "secret",
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Invalid instance URL format");
    });
  });
});

// ── Settings Storage ─────────────────────────────────────────────────

describe("Settings Storage", () => {
  const SETTINGS_KEY = "dashboard_settings";

  const serializeSettings = (settings: Record<string, string>): string => {
    return JSON.stringify(settings);
  };

  const deserializeSettings = (json: string): Record<string, string> | null => {
    try {
      return JSON.parse(json);
    } catch {
      return null;
    }
  };

  it("serializes settings to JSON", () => {
    const settings = { risk_alert_threshold: "60", failed_validation_alerts: "Enabled" };
    const json = serializeSettings(settings);
    expect(json).toBe('{"risk_alert_threshold":"60","failed_validation_alerts":"Enabled"}');
  });

  it("deserializes valid JSON", () => {
    const json = '{"key":"value"}';
    const result = deserializeSettings(json);
    expect(result).toEqual({ key: "value" });
  });

  it("returns null for invalid JSON", () => {
    const result = deserializeSettings("invalid json");
    expect(result).toBeNull();
  });

  it("uses correct storage key", () => {
    expect(SETTINGS_KEY).toBe("dashboard_settings");
  });
});
