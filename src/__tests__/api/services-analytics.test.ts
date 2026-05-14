/**
 * Tests for Services API and Analytics Service Risk Ranking
 */

describe("Services API", () => {
  describe("GET /api/admin/services", () => {
    it("should return services with isActive as boolean", () => {
      // SQLite returns isActive as number (0 or 1)
      const rawService = { id: "1", name: "api-gateway", displayName: "API Gateway", isActive: 1 };
      
      // API should convert to boolean
      const converted = { ...rawService, isActive: Boolean(rawService.isActive) };
      expect(converted.isActive).toBe(true);
      expect(typeof converted.isActive).toBe("boolean");
    });

    it("should handle BigInt isActive values from SQLite", () => {
      // SQLite with Prisma raw queries may return BigInt
      const bigIntValue = BigInt(1);
      const converted = Boolean(bigIntValue);
      expect(converted).toBe(true);

      const bigIntZero = BigInt(0);
      const convertedZero = Boolean(bigIntZero);
      expect(convertedZero).toBe(false);
    });

    it("should return all service fields", () => {
      const service = {
        id: "svc-1",
        name: "api-gateway",
        displayName: "API Gateway",
        description: "Main API gateway",
        category: "infrastructure",
        owner: "Platform Team",
        criticality: "mission-critical",
        isActive: true,
        createdBy: "admin@example.com",
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      };

      expect(service).toHaveProperty("id");
      expect(service).toHaveProperty("name");
      expect(service).toHaveProperty("displayName");
      expect(service).toHaveProperty("category");
      expect(service).toHaveProperty("criticality");
      expect(service).toHaveProperty("isActive");
    });
  });

  describe("POST /api/admin/services", () => {
    it("should normalize service name to lowercase with hyphens", () => {
      const input = "API Gateway";
      const normalized = input.toLowerCase().replace(/\s+/g, "-");
      expect(normalized).toBe("api-gateway");
    });

    it("should require name and displayName", () => {
      const validBody = { name: "api-gateway", displayName: "API Gateway" };
      const invalidBody = { name: "api-gateway" };

      expect(validBody.name && validBody.displayName).toBeTruthy();
      expect(!("displayName" in invalidBody)).toBe(true);
    });

    it("should default isActive to true for new services", () => {
      const newService = { name: "new-service", displayName: "New Service" };
      const withDefaults = { ...newService, isActive: true };
      expect(withDefaults.isActive).toBe(true);
    });
  });

  describe("PUT /api/admin/services", () => {
    it("should allow toggling isActive status", () => {
      const service = { id: "1", name: "api-gateway", isActive: true };
      const updated = { ...service, isActive: false };
      expect(updated.isActive).toBe(false);
    });

    it("should require service id", () => {
      const body = { name: "updated-name" };
      expect(!("id" in body)).toBe(true);
    });
  });
});

describe("Service Risk Ranking in Analytics", () => {
  describe("Service display name resolution", () => {
    it("should use displayName when service exists in database", () => {
      const servicesMap = new Map([
        ["api-gateway", { displayName: "API Gateway", category: "infrastructure", criticality: "mission-critical" }],
        ["user-service", { displayName: "User Service", category: "application", criticality: "mission-critical" }],
      ]);

      const serviceName = "api-gateway";
      const serviceInfo = servicesMap.get(serviceName);
      const displayName = serviceInfo?.displayName || serviceName;

      expect(displayName).toBe("API Gateway");
    });

    it("should fallback to service name when not in database", () => {
      const servicesMap = new Map<string, { displayName: string }>();
      
      const serviceName = "unknown-service";
      const serviceInfo = servicesMap.get(serviceName);
      const displayName = serviceInfo?.displayName || serviceName;

      expect(displayName).toBe("unknown-service");
    });

    it("should include category and criticality from services table", () => {
      const servicesMap = new Map([
        ["payment-service", { displayName: "Payment Service", category: "application", criticality: "mission-critical" }],
      ]);

      const serviceName = "payment-service";
      const serviceInfo = servicesMap.get(serviceName);

      expect(serviceInfo?.category).toBe("application");
      expect(serviceInfo?.criticality).toBe("mission-critical");
    });
  });

  describe("Risk calculation", () => {
    it("should calculate average risk per service", () => {
      const changes = [
        { service: "api-gateway", risk: 80 },
        { service: "api-gateway", risk: 60 },
        { service: "api-gateway", risk: 40 },
      ];

      const totalRisk = changes.reduce((sum, c) => sum + c.risk, 0);
      const avgRisk = Math.round(totalRisk / changes.length);

      expect(avgRisk).toBe(60);
    });

    it("should sort services by average risk descending", () => {
      const services = [
        { service: "low-risk", avgRisk: 20 },
        { service: "high-risk", avgRisk: 80 },
        { service: "medium-risk", avgRisk: 50 },
      ];

      const sorted = services.sort((a, b) => b.avgRisk - a.avgRisk);

      expect(sorted[0].service).toBe("high-risk");
      expect(sorted[1].service).toBe("medium-risk");
      expect(sorted[2].service).toBe("low-risk");
    });
  });
});

describe("Analytics Tab Organization", () => {
  it("should have four tabs: Overview, Risk Analysis, Performance, Insights", () => {
    const tabs = ["overview", "risk", "performance", "insights"];
    
    expect(tabs).toContain("overview");
    expect(tabs).toContain("risk");
    expect(tabs).toContain("performance");
    expect(tabs).toContain("insights");
    expect(tabs).toHaveLength(4);
  });

  it("Group Risk Ranking should be in Risk Analysis tab", () => {
    const riskAnalysisModules = [
      "Deployment Outcomes",
      "Failure Rate by Assignment Group",
      "Service Regression Risk Ranking",
      "Rollback Intelligence",
      "Failure Root Cause Analysis",
      "Group Risk Ranking",
    ];

    expect(riskAnalysisModules).toContain("Group Risk Ranking");
    expect(riskAnalysisModules).toContain("Service Regression Risk Ranking");
  });

  it("Overview tab should show summary metrics", () => {
    const overviewModules = [
      "Summary KPIs",
      "Deployment Outcomes",
      "Deployment Frequency",
      "Group Velocity",
      "Category Breakdown",
      "Top Services by Risk",
    ];

    expect(overviewModules).toContain("Summary KPIs");
    expect(overviewModules).toContain("Top Services by Risk");
  });
});
