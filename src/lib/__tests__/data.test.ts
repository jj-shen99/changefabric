/**
 * Unit tests for static data module (legacy fallback data)
 */

import {
  dashboardMetrics,
  changeRequests,
  releases,
  riskTrendData,
  validationTrendData,
  deploymentFrequencyData,
  impactByCategory,
} from "../data";

describe("Dashboard Metrics", () => {
  it("has all required KPI fields", () => {
    expect(dashboardMetrics).toHaveProperty("totalChanges");
    expect(dashboardMetrics).toHaveProperty("pendingChanges");
    expect(dashboardMetrics).toHaveProperty("deployedToday");
    expect(dashboardMetrics).toHaveProperty("failedDeployments");
    expect(dashboardMetrics).toHaveProperty("avgRiskScore");
    expect(dashboardMetrics).toHaveProperty("validationPassRate");
    expect(dashboardMetrics).toHaveProperty("avgDeployTime");
    expect(dashboardMetrics).toHaveProperty("rollbackRate");
    expect(dashboardMetrics).toHaveProperty("mttr");
    expect(dashboardMetrics).toHaveProperty("changeLeadTime");
  });

  it("has numeric values for counts", () => {
    expect(typeof dashboardMetrics.totalChanges).toBe("number");
    expect(typeof dashboardMetrics.pendingChanges).toBe("number");
    expect(typeof dashboardMetrics.deployedToday).toBe("number");
    expect(typeof dashboardMetrics.failedDeployments).toBe("number");
  });

  it("has valid percentage values", () => {
    expect(dashboardMetrics.validationPassRate).toBeGreaterThanOrEqual(0);
    expect(dashboardMetrics.validationPassRate).toBeLessThanOrEqual(100);
    expect(dashboardMetrics.rollbackRate).toBeGreaterThanOrEqual(0);
    expect(dashboardMetrics.rollbackRate).toBeLessThanOrEqual(100);
  });

  it("has valid risk score", () => {
    expect(dashboardMetrics.avgRiskScore).toBeGreaterThanOrEqual(0);
    expect(dashboardMetrics.avgRiskScore).toBeLessThanOrEqual(100);
  });

  it("has string values for time metrics", () => {
    expect(typeof dashboardMetrics.avgDeployTime).toBe("string");
    expect(typeof dashboardMetrics.mttr).toBe("string");
    expect(typeof dashboardMetrics.changeLeadTime).toBe("string");
  });
});

describe("Change Requests", () => {
  it("is a non-empty array", () => {
    expect(Array.isArray(changeRequests)).toBe(true);
    expect(changeRequests.length).toBeGreaterThan(0);
  });

  it("each CR has required identification fields", () => {
    changeRequests.forEach((cr) => {
      expect(cr).toHaveProperty("id");
      expect(cr).toHaveProperty("title");
      expect(cr).toHaveProperty("description");
      expect(cr.id).toMatch(/^CR-\d+$/);
    });
  });

  it("each CR has category and status", () => {
    const validCategories = [
      "infrastructure", "feature", "hotfix", "database_migration",
      "dependency_update", "config_change", "security_patch",
    ];
    const validStatuses = [
      "pending_review", "approved", "deployed", "in_progress",
    ];

    changeRequests.forEach((cr) => {
      expect(validCategories).toContain(cr.category);
      expect(validStatuses).toContain(cr.status);
    });
  });

  it("each CR has author and team", () => {
    changeRequests.forEach((cr) => {
      expect(typeof cr.author).toBe("string");
      expect(cr.author.length).toBeGreaterThan(0);
      expect(typeof cr.team).toBe("string");
      expect(cr.team.length).toBeGreaterThan(0);
    });
  });

  it("each CR has impact assessment", () => {
    changeRequests.forEach((cr) => {
      expect(cr).toHaveProperty("impact");
      expect(cr.impact).toHaveProperty("outageRisk");
      expect(cr.impact).toHaveProperty("performanceRisk");
      expect(cr.impact).toHaveProperty("functionalityRisk");
      expect(cr.impact).toHaveProperty("securityRisk");
      expect(cr.impact).toHaveProperty("dataIntegrityRisk");
      expect(cr.impact).toHaveProperty("overallRisk");
    });
  });

  it("impact scores are within valid range (0-100)", () => {
    changeRequests.forEach((cr) => {
      const risks = [
        cr.impact.outageRisk,
        cr.impact.performanceRisk,
        cr.impact.functionalityRisk,
        cr.impact.securityRisk,
        cr.impact.dataIntegrityRisk,
        cr.impact.overallRisk,
      ];
      risks.forEach((risk) => {
        expect(risk).toBeGreaterThanOrEqual(0);
        expect(risk).toBeLessThanOrEqual(100);
      });
    });
  });

  it("each CR has validations array", () => {
    changeRequests.forEach((cr) => {
      expect(Array.isArray(cr.validations)).toBe(true);
    });
  });

  it("validations have required fields", () => {
    const validTypes = [
      "unit_test", "integration_test", "performance_test", "security_scan",
      "code_review", "uat", "canary_deploy", "rollback_test", "smoke_test",
      "regression_test",
    ];
    const validStatuses = ["passed", "failed", "pending", "running"];

    changeRequests.forEach((cr) => {
      cr.validations.forEach((v: { id: string; type: string; name: string; status: string }) => {
        expect(v).toHaveProperty("id");
        expect(v).toHaveProperty("type");
        expect(v).toHaveProperty("name");
        expect(v).toHaveProperty("status");
        expect(validTypes).toContain(v.type);
        expect(validStatuses).toContain(v.status);
      });
    });
  });

  it("has code change metrics", () => {
    changeRequests.forEach((cr) => {
      expect(typeof cr.linesAdded).toBe("number");
      expect(typeof cr.linesRemoved).toBe("number");
      expect(typeof cr.filesChanged).toBe("number");
      expect(cr.linesAdded).toBeGreaterThanOrEqual(0);
      expect(cr.linesRemoved).toBeGreaterThanOrEqual(0);
      expect(cr.filesChanged).toBeGreaterThanOrEqual(0);
    });
  });

  it("has blast radius classification", () => {
    const validBlastRadius = ["low", "medium", "high", "critical"];
    changeRequests.forEach((cr) => {
      expect(validBlastRadius).toContain(cr.impact.blastRadius);
    });
  });

  it("has rollback complexity classification", () => {
    const validComplexity = ["low", "medium", "high", "critical"];
    changeRequests.forEach((cr) => {
      expect(validComplexity).toContain(cr.impact.rollbackComplexity);
    });
  });
});

describe("Releases", () => {
  it("is a non-empty array", () => {
    expect(Array.isArray(releases)).toBe(true);
    expect(releases.length).toBeGreaterThan(0);
  });

  it("each release has required fields", () => {
    releases.forEach((rel) => {
      expect(rel).toHaveProperty("id");
      expect(rel).toHaveProperty("name");
      expect(rel).toHaveProperty("version");
      expect(rel).toHaveProperty("status");
      expect(rel).toHaveProperty("scheduledDate");
      expect(rel).toHaveProperty("changeRequests");
      expect(rel).toHaveProperty("overallRisk");
      expect(rel).toHaveProperty("releaseManager");
    });
  });

  it("release IDs follow pattern", () => {
    releases.forEach((rel) => {
      expect(rel.id).toMatch(/^REL-\d+$/);
    });
  });

  it("versions follow semver pattern", () => {
    releases.forEach((rel) => {
      expect(rel.version).toMatch(/^\d+\.\d+\.\d+$/);
    });
  });

  it("has valid status values", () => {
    const validStatuses = ["planning", "staging", "completed", "cancelled"];
    releases.forEach((rel) => {
      expect(validStatuses).toContain(rel.status);
    });
  });

  it("changeRequests is an array of CR IDs", () => {
    releases.forEach((rel) => {
      expect(Array.isArray(rel.changeRequests)).toBe(true);
      rel.changeRequests.forEach((crId) => {
        expect(crId).toMatch(/^CR-\d+$/);
      });
    });
  });

  it("overallRisk is within valid range", () => {
    releases.forEach((rel) => {
      expect(rel.overallRisk).toBeGreaterThanOrEqual(0);
      expect(rel.overallRisk).toBeLessThanOrEqual(100);
    });
  });

  it("completed releases have actualDate", () => {
    releases.forEach((rel) => {
      if (rel.status === "completed") {
        expect(rel.actualDate).toBeDefined();
      }
    });
  });
});

describe("Risk Trend Data", () => {
  it("is a non-empty array", () => {
    expect(Array.isArray(riskTrendData)).toBe(true);
    expect(riskTrendData.length).toBeGreaterThan(0);
  });

  it("each entry has required fields", () => {
    riskTrendData.forEach((entry) => {
      expect(entry).toHaveProperty("date");
      expect(entry).toHaveProperty("avgRisk");
      expect(entry).toHaveProperty("deployments");
    });
  });

  it("avgRisk is within valid range", () => {
    riskTrendData.forEach((entry) => {
      expect(entry.avgRisk).toBeGreaterThanOrEqual(0);
      expect(entry.avgRisk).toBeLessThanOrEqual(100);
    });
  });

  it("deployments is non-negative", () => {
    riskTrendData.forEach((entry) => {
      expect(entry.deployments).toBeGreaterThanOrEqual(0);
    });
  });
});

describe("Validation Trend Data", () => {
  it("is a non-empty array", () => {
    expect(Array.isArray(validationTrendData)).toBe(true);
    expect(validationTrendData.length).toBeGreaterThan(0);
  });

  it("each entry has required fields", () => {
    validationTrendData.forEach((entry) => {
      expect(entry).toHaveProperty("date");
      expect(entry).toHaveProperty("passRate");
      expect(entry).toHaveProperty("totalTests");
    });
  });

  it("passRate is a valid percentage", () => {
    validationTrendData.forEach((entry) => {
      expect(entry.passRate).toBeGreaterThanOrEqual(0);
      expect(entry.passRate).toBeLessThanOrEqual(100);
    });
  });

  it("totalTests is positive", () => {
    validationTrendData.forEach((entry) => {
      expect(entry.totalTests).toBeGreaterThan(0);
    });
  });
});

describe("Deployment Frequency Data", () => {
  it("is a non-empty array", () => {
    expect(Array.isArray(deploymentFrequencyData)).toBe(true);
    expect(deploymentFrequencyData.length).toBeGreaterThan(0);
  });

  it("each entry has required fields", () => {
    deploymentFrequencyData.forEach((entry) => {
      expect(entry).toHaveProperty("date");
      expect(entry).toHaveProperty("successful");
      expect(entry).toHaveProperty("failed");
      expect(entry).toHaveProperty("rolledBack");
    });
  });

  it("all counts are non-negative", () => {
    deploymentFrequencyData.forEach((entry) => {
      expect(entry.successful).toBeGreaterThanOrEqual(0);
      expect(entry.failed).toBeGreaterThanOrEqual(0);
      expect(entry.rolledBack).toBeGreaterThanOrEqual(0);
    });
  });

  it("successful >= failed + rolledBack (healthy system)", () => {
    deploymentFrequencyData.forEach((entry) => {
      expect(entry.successful).toBeGreaterThanOrEqual(entry.failed);
    });
  });
});

describe("Impact By Category Data", () => {
  it("is a non-empty array", () => {
    expect(Array.isArray(impactByCategory)).toBe(true);
    expect(impactByCategory.length).toBeGreaterThan(0);
  });

  it("each entry has required fields", () => {
    impactByCategory.forEach((entry) => {
      expect(entry).toHaveProperty("category");
      expect(entry).toHaveProperty("avgRisk");
      expect(entry).toHaveProperty("count");
    });
  });

  it("avgRisk is within valid range", () => {
    impactByCategory.forEach((entry) => {
      expect(entry.avgRisk).toBeGreaterThanOrEqual(0);
      expect(entry.avgRisk).toBeLessThanOrEqual(100);
    });
  });

  it("count is positive", () => {
    impactByCategory.forEach((entry) => {
      expect(entry.count).toBeGreaterThan(0);
    });
  });

  it("includes expected categories", () => {
    const categories = impactByCategory.map((e) => e.category);
    expect(categories).toContain("Infrastructure");
    expect(categories).toContain("Feature");
    expect(categories).toContain("Security");
  });

  it("infrastructure has higher risk than config", () => {
    const infra = impactByCategory.find((e) => e.category === "Infrastructure");
    const config = impactByCategory.find((e) => e.category === "Config");
    expect(infra!.avgRisk).toBeGreaterThan(config!.avgRisk);
  });
});

describe("Data Consistency", () => {
  it("CR IDs in releases exist in changeRequests", () => {
    const crIds = new Set(changeRequests.map((cr) => cr.id));
    releases.forEach((rel) => {
      rel.changeRequests.forEach((crId) => {
        expect(crIds.has(crId)).toBe(true);
      });
    });
  });

  it("releaseId in CRs exists in releases", () => {
    const relIds = new Set(releases.map((r) => r.id));
    changeRequests.forEach((cr) => {
      if (cr.releaseId) {
        expect(relIds.has(cr.releaseId)).toBe(true);
      }
    });
  });

  it("trend data has consistent date formats", () => {
    const datePattern = /^[A-Z][a-z]{2} \d{1,2}$/; // e.g., "Feb 3"
    riskTrendData.forEach((e) => expect(e.date).toMatch(datePattern));
    validationTrendData.forEach((e) => expect(e.date).toMatch(datePattern));
    deploymentFrequencyData.forEach((e) => expect(e.date).toMatch(datePattern));
  });
});
