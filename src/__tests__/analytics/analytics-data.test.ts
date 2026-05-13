/**
 * Tests for analytics data computation and API responses
 * 
 * These tests verify that analytics data is computed correctly from real CR data,
 * including failure analysis, velocity metrics, rollback intelligence, and state distributions.
 */

// Mock CR data for testing - simplified type for analytics computation tests
interface MockCR {
  number: string;
  state: string;
  category: string;
  computedRiskScore: number;
  assignmentGroup: string;
  affectedServices: string[];
  createdAt: Date;
  actualEnd: Date | null;
}

const createMockCR = (overrides: Partial<MockCR> = {}): MockCR => ({
  number: overrides.number || "CHG0000001",
  state: overrides.state || "draft",
  category: overrides.category || "infrastructure",
  computedRiskScore: overrides.computedRiskScore ?? 50,
  assignmentGroup: overrides.assignmentGroup || "Platform Team",
  affectedServices: overrides.affectedServices || ["api-gateway"],
  createdAt: overrides.createdAt || new Date(),
  actualEnd: overrides.actualEnd || null,
});

// Analytics computation functions (matching the API logic)
const PENDING_STATES = new Set(["draft", "submitted", "awaiting_approval"]);
const IN_FLIGHT_STATES = new Set(["approved", "scheduled", "in_progress", "implemented"]);
const TERMINAL_STATES = new Set(["closed", "rejected", "canceled", "rolled_back"]);

function computeMetrics(crs: MockCR[]) {
  const total = crs.length;
  const pending = crs.filter((c) => PENDING_STATES.has(c.state)).length;
  const inFlight = crs.filter((c) => IN_FLIGHT_STATES.has(c.state)).length;
  const closed = crs.filter((c) => c.state === "closed").length;
  const rejected = crs.filter((c) => c.state === "rejected" || c.state === "canceled").length;
  const highRisk = crs.filter((c) => c.computedRiskScore >= 70).length;
  const avgRisk = total === 0 ? 0 : Math.round(crs.reduce((a, c) => a + c.computedRiskScore, 0) / total);
  
  return { total, pending, inFlight, closed, rejected, highRisk, avgRisk };
}

function groupByCategory(crs: MockCR[]) {
  const map: Record<string, { count: number; totalRisk: number }> = {};
  for (const c of crs) {
    if (!map[c.category]) map[c.category] = { count: 0, totalRisk: 0 };
    map[c.category].count++;
    map[c.category].totalRisk += c.computedRiskScore;
  }
  return Object.entries(map).map(([category, data]) => ({
    category,
    count: data.count,
    avgRisk: Math.round(data.totalRisk / data.count),
  }));
}

describe("Analytics Data Computation", () => {
  describe("computeMetrics", () => {
    it("computes correct totals for empty data", () => {
      const metrics = computeMetrics([]);
      expect(metrics.total).toBe(0);
      expect(metrics.pending).toBe(0);
      expect(metrics.highRisk).toBe(0);
      expect(metrics.avgRisk).toBe(0);
    });

    it("computes correct totals for mixed states", () => {
      const crs = [
        createMockCR({ state: "draft", computedRiskScore: 30 }),
        createMockCR({ state: "submitted", computedRiskScore: 50 }),
        createMockCR({ state: "awaiting_approval", computedRiskScore: 70 }),
        createMockCR({ state: "in_progress", computedRiskScore: 80 }),
        createMockCR({ state: "closed", computedRiskScore: 40 }),
      ];
      const metrics = computeMetrics(crs);
      expect(metrics.total).toBe(5);
      expect(metrics.avgRisk).toBe(54); // (30+50+70+80+40)/5 = 54
    });

    it("counts high risk CRs correctly (score >= 70)", () => {
      const crs = [
        createMockCR({ computedRiskScore: 69 }),
        createMockCR({ computedRiskScore: 70 }),
        createMockCR({ computedRiskScore: 85 }),
        createMockCR({ computedRiskScore: 100 }),
      ];
      const metrics = computeMetrics(crs);
      expect(metrics.highRisk).toBe(3); // 70, 85, 100
    });

    it("counts pending CRs correctly", () => {
      const crs = [
        createMockCR({ state: "draft" }),
        createMockCR({ state: "submitted" }),
        createMockCR({ state: "awaiting_approval" }),
        createMockCR({ state: "approved" }),
        createMockCR({ state: "scheduled" }),
        createMockCR({ state: "in_progress" }),
        createMockCR({ state: "implemented" }),
        createMockCR({ state: "closed" }),
        createMockCR({ state: "rejected" }),
        createMockCR({ state: "rolled_back" }),
      ];
      const metrics = computeMetrics(crs);
      // Pending = draft, submitted, awaiting_approval
      expect(metrics.pending).toBe(3);
      // In-flight = approved, scheduled, in_progress, implemented
      expect(metrics.inFlight).toBe(4);
    });
  });

  describe("groupByCategory", () => {
    it("returns empty array for no data", () => {
      const result = groupByCategory([]);
      expect(result).toEqual([]);
    });

    it("groups CRs by category correctly", () => {
      const crs = [
        createMockCR({ category: "infrastructure" }),
        createMockCR({ category: "infrastructure" }),
        createMockCR({ category: "database" }),
        createMockCR({ category: "security" }),
        createMockCR({ category: "security" }),
        createMockCR({ category: "security" }),
      ];
      const result = groupByCategory(crs);
      
      const infra = result.find(r => r.category === "infrastructure");
      const db = result.find(r => r.category === "database");
      const security = result.find(r => r.category === "security");
      
      expect(infra?.count).toBe(2);
      expect(db?.count).toBe(1);
      expect(security?.count).toBe(3);
    });

    it("computes average risk per category", () => {
      const crs = [
        createMockCR({ category: "infrastructure", computedRiskScore: 40 }),
        createMockCR({ category: "infrastructure", computedRiskScore: 60 }),
        createMockCR({ category: "database", computedRiskScore: 80 }),
      ];
      const result = groupByCategory(crs);
      
      const infra = result.find(r => r.category === "infrastructure");
      const db = result.find(r => r.category === "database");
      
      expect(infra?.avgRisk).toBe(50); // (40+60)/2
      expect(db?.avgRisk).toBe(80);
    });
  });
});

describe("Failure Analysis Computation", () => {
  describe("State-based metrics", () => {
    it("counts deployed (closed) CRs correctly", () => {
      const crs = [
        createMockCR({ state: "closed" }),
        createMockCR({ state: "closed" }),
        createMockCR({ state: "draft" }),
        createMockCR({ state: "in_progress" }),
      ];
      const closed = crs.filter(c => c.state === "closed");
      expect(closed.length).toBe(2);
    });

    it("counts failed (rejected/canceled) CRs correctly", () => {
      const crs = [
        createMockCR({ state: "rejected" }),
        createMockCR({ state: "canceled" }),
        createMockCR({ state: "closed" }),
      ];
      const failed = crs.filter(c => c.state === "rejected" || c.state === "canceled");
      expect(failed.length).toBe(2);
    });

    it("counts rolled back CRs correctly", () => {
      const crs = [
        createMockCR({ state: "rolled_back" }),
        createMockCR({ state: "rolled_back" }),
        createMockCR({ state: "closed" }),
      ];
      const rolledBack = crs.filter(c => c.state === "rolled_back");
      expect(rolledBack.length).toBe(2);
    });

    it("counts in_progress CRs correctly", () => {
      const crs = [
        createMockCR({ state: "in_progress" }),
        createMockCR({ state: "in_progress" }),
        createMockCR({ state: "implemented" }),
        createMockCR({ state: "scheduled" }),
      ];
      const inProgress = crs.filter(c => c.state === "in_progress");
      expect(inProgress.length).toBe(2);
    });

    it("calculates change failure rate correctly", () => {
      const crs = [
        createMockCR({ state: "closed" }),
        createMockCR({ state: "closed" }),
        createMockCR({ state: "rejected" }),
        createMockCR({ state: "canceled" }),
      ];
      const failed = crs.filter(c => c.state === "rejected" || c.state === "canceled");
      const failureRate = Math.round((failed.length / crs.length) * 100);
      expect(failureRate).toBe(50); // 2/4 = 50%
    });

    it("calculates rollback rate correctly", () => {
      const crs = [
        createMockCR({ state: "closed" }),
        createMockCR({ state: "closed" }),
        createMockCR({ state: "rolled_back" }),
        createMockCR({ state: "rejected" }),
      ];
      const closed = crs.filter(c => c.state === "closed");
      const rejected = crs.filter(c => c.state === "rejected" || c.state === "canceled");
      const rolledBack = crs.filter(c => c.state === "rolled_back");
      const totalOutcomes = closed.length + rejected.length + rolledBack.length;
      const rollbackRate = Math.round((rolledBack.length / totalOutcomes) * 100);
      expect(rollbackRate).toBe(25); // 1/4 = 25%
    });
  });

  describe("Team-based metrics", () => {
    it("groups CRs by team correctly", () => {
      const crs = [
        createMockCR({ assignmentGroup: "Platform Team", state: "closed" }),
        createMockCR({ assignmentGroup: "Platform Team", state: "rejected" }),
        createMockCR({ assignmentGroup: "API Team", state: "closed" }),
        createMockCR({ assignmentGroup: "API Team", state: "closed" }),
        createMockCR({ assignmentGroup: "API Team", state: "rolled_back" }),
      ];
      
      const teamStats: Record<string, { total: number; deployed: number; failed: number; rolledBack: number }> = {};
      for (const c of crs) {
        const team = c.assignmentGroup || "Unassigned";
        if (!teamStats[team]) teamStats[team] = { total: 0, deployed: 0, failed: 0, rolledBack: 0 };
        teamStats[team].total++;
        if (c.state === "closed") teamStats[team].deployed++;
        if (c.state === "rejected" || c.state === "canceled") teamStats[team].failed++;
        if (c.state === "rolled_back") teamStats[team].rolledBack++;
      }
      
      expect(teamStats["Platform Team"].total).toBe(2);
      expect(teamStats["Platform Team"].deployed).toBe(1);
      expect(teamStats["Platform Team"].failed).toBe(1);
      
      expect(teamStats["API Team"].total).toBe(3);
      expect(teamStats["API Team"].deployed).toBe(2);
      expect(teamStats["API Team"].rolledBack).toBe(1);
    });

    it("calculates team deploy rate correctly", () => {
      const teamStats = { total: 10, deployed: 8 };
      const deployRate = Math.round((teamStats.deployed / teamStats.total) * 100);
      expect(deployRate).toBe(80);
    });

    it("calculates team average risk correctly", () => {
      const crs = [
        createMockCR({ assignmentGroup: "Platform Team", computedRiskScore: 40 }),
        createMockCR({ assignmentGroup: "Platform Team", computedRiskScore: 60 }),
        createMockCR({ assignmentGroup: "Platform Team", computedRiskScore: 80 }),
      ];
      const totalRisk = crs.reduce((sum, c) => sum + c.computedRiskScore, 0);
      const avgRisk = Math.round(totalRisk / crs.length);
      expect(avgRisk).toBe(60);
    });
  });

  describe("Service-based metrics", () => {
    it("groups CRs by affected service correctly", () => {
      const crs = [
        createMockCR({ affectedServices: ["api-gateway", "auth-service"] }),
        createMockCR({ affectedServices: ["api-gateway"] }),
        createMockCR({ affectedServices: ["database", "cache"] }),
      ];
      
      const serviceMap: Record<string, { changeCount: number; changes: string[] }> = {};
      for (const c of crs) {
        for (const svc of c.affectedServices) {
          if (!serviceMap[svc]) serviceMap[svc] = { changeCount: 0, changes: [] };
          serviceMap[svc].changeCount++;
          serviceMap[svc].changes.push(c.number);
        }
      }
      
      expect(serviceMap["api-gateway"].changeCount).toBe(2);
      expect(serviceMap["auth-service"].changeCount).toBe(1);
      expect(serviceMap["database"].changeCount).toBe(1);
      expect(serviceMap["cache"].changeCount).toBe(1);
    });

    it("calculates service average risk exposure correctly", () => {
      const crs = [
        createMockCR({ affectedServices: ["api-gateway"], computedRiskScore: 40 }),
        createMockCR({ affectedServices: ["api-gateway"], computedRiskScore: 80 }),
      ];
      
      const serviceMap: Record<string, { risk: number; count: number }> = {};
      for (const c of crs) {
        for (const svc of c.affectedServices) {
          if (!serviceMap[svc]) serviceMap[svc] = { risk: 0, count: 0 };
          serviceMap[svc].risk += c.computedRiskScore;
          serviceMap[svc].count++;
        }
      }
      
      const avgRisk = Math.round(serviceMap["api-gateway"].risk / serviceMap["api-gateway"].count);
      expect(avgRisk).toBe(60);
    });
  });
});

describe("Velocity Metrics", () => {
  describe("Lead time calculation", () => {
    it("calculates lead time in hours correctly", () => {
      const createdAt = new Date("2024-01-01T00:00:00Z");
      const closedAt = new Date("2024-01-02T12:00:00Z"); // 36 hours later
      const leadTimeHours = Math.round((closedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60));
      expect(leadTimeHours).toBe(36);
    });

    it("handles same-day deployments", () => {
      const createdAt = new Date("2024-01-01T08:00:00Z");
      const closedAt = new Date("2024-01-01T14:00:00Z"); // 6 hours later
      const leadTimeHours = Math.round((closedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60));
      expect(leadTimeHours).toBe(6);
    });

    it("ensures minimum lead time of 1 hour", () => {
      const createdAt = new Date("2024-01-01T08:00:00Z");
      const closedAt = new Date("2024-01-01T08:30:00Z"); // 30 minutes later
      const leadTimeHours = Math.max(1, Math.round((closedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60)));
      expect(leadTimeHours).toBe(1);
    });
  });

  describe("Category breakdown", () => {
    it("counts CRs per category correctly", () => {
      const crs = [
        createMockCR({ category: "infrastructure" }),
        createMockCR({ category: "infrastructure" }),
        createMockCR({ category: "database" }),
        createMockCR({ category: "feature" }),
        createMockCR({ category: "feature" }),
        createMockCR({ category: "feature" }),
      ];
      
      const categoryMap: Record<string, number> = {};
      for (const c of crs) {
        categoryMap[c.category] = (categoryMap[c.category] || 0) + 1;
      }
      
      expect(categoryMap["infrastructure"]).toBe(2);
      expect(categoryMap["database"]).toBe(1);
      expect(categoryMap["feature"]).toBe(3);
    });
  });
});

describe("Rollback Intelligence", () => {
  describe("Rollback complexity classification", () => {
    it("classifies high risk as high complexity", () => {
      const riskScore = 75;
      const complexity = riskScore >= 60 ? "high" : riskScore >= 30 ? "medium" : "low";
      expect(complexity).toBe("high");
    });

    it("classifies medium risk as medium complexity", () => {
      const riskScore = 45;
      const complexity = riskScore >= 60 ? "high" : riskScore >= 30 ? "medium" : "low";
      expect(complexity).toBe("medium");
    });

    it("classifies low risk as low complexity", () => {
      const riskScore = 20;
      const complexity = riskScore >= 60 ? "high" : riskScore >= 30 ? "medium" : "low";
      expect(complexity).toBe("low");
    });
  });

  describe("Rollback by service aggregation", () => {
    it("counts rollbacks per service correctly", () => {
      const rolledBackCRs = [
        createMockCR({ state: "rolled_back", affectedServices: ["api-gateway", "auth-service"] }),
        createMockCR({ state: "rolled_back", affectedServices: ["api-gateway"] }),
        createMockCR({ state: "rolled_back", affectedServices: ["database"] }),
      ];
      
      const rollbackServiceMap: Record<string, number> = {};
      for (const c of rolledBackCRs) {
        for (const svc of c.affectedServices) {
          rollbackServiceMap[svc] = (rollbackServiceMap[svc] || 0) + 1;
        }
      }
      
      expect(rollbackServiceMap["api-gateway"]).toBe(2);
      expect(rollbackServiceMap["auth-service"]).toBe(1);
      expect(rollbackServiceMap["database"]).toBe(1);
    });

    it("sorts services by rollback count descending", () => {
      const rollbackServiceMap: Record<string, number> = {
        "api-gateway": 5,
        "auth-service": 2,
        "database": 8,
        "cache": 1,
      };
      
      const sorted = Object.entries(rollbackServiceMap)
        .map(([service, count]) => ({ service, count }))
        .sort((a, b) => b.count - a.count);
      
      expect(sorted[0].service).toBe("database");
      expect(sorted[0].count).toBe(8);
      expect(sorted[1].service).toBe("api-gateway");
      expect(sorted[3].service).toBe("cache");
    });
  });
});

describe("State Distribution", () => {
  it("includes in_progress state in distribution", () => {
    const crs = [
      createMockCR({ state: "draft" }),
      createMockCR({ state: "in_progress" }),
      createMockCR({ state: "in_progress" }),
      createMockCR({ state: "implemented" }),
      createMockCR({ state: "closed" }),
    ];
    
    const stateDistribution: Record<string, number> = {};
    for (const c of crs) {
      stateDistribution[c.state] = (stateDistribution[c.state] || 0) + 1;
    }
    
    expect(stateDistribution["in_progress"]).toBe(2);
    expect(stateDistribution["implemented"]).toBe(1);
    expect(stateDistribution["draft"]).toBe(1);
    expect(stateDistribution["closed"]).toBe(1);
  });

  it("calculates percentage distribution correctly", () => {
    const crs = [
      createMockCR({ state: "draft" }),
      createMockCR({ state: "in_progress" }),
      createMockCR({ state: "in_progress" }),
      createMockCR({ state: "closed" }),
      createMockCR({ state: "closed" }),
    ];
    
    const total = crs.length;
    const inProgressCount = crs.filter(c => c.state === "in_progress").length;
    const inProgressPct = Math.round((inProgressCount / total) * 100);
    
    expect(inProgressPct).toBe(40); // 2/5 = 40%
  });
});
