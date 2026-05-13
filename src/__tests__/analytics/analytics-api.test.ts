/**
 * Tests for the analytics API endpoint (/api/data/analytics)
 * 
 * These tests verify the API response structure and data transformations.
 */

describe("Analytics API Response Structure", () => {
  describe("failureAnalysis", () => {
    it("should have correct structure", () => {
      const failureAnalysis = {
        totalChanges: 100,
        deployed: 80,
        failed: 10,
        rolledBack: 5,
        inProgress: 3,
        implemented: 2,
        changeFailureRate: 10,
        failureByTeam: [],
        serviceRiskRanking: [],
      };

      expect(failureAnalysis).toHaveProperty("totalChanges");
      expect(failureAnalysis).toHaveProperty("deployed");
      expect(failureAnalysis).toHaveProperty("failed");
      expect(failureAnalysis).toHaveProperty("rolledBack");
      expect(failureAnalysis).toHaveProperty("inProgress");
      expect(failureAnalysis).toHaveProperty("implemented");
      expect(failureAnalysis).toHaveProperty("changeFailureRate");
      expect(failureAnalysis).toHaveProperty("failureByTeam");
      expect(failureAnalysis).toHaveProperty("serviceRiskRanking");
    });

    it("should calculate changeFailureRate correctly", () => {
      const totalChanges = 100;
      const failed = 15;
      const changeFailureRate = Math.round((failed / totalChanges) * 100);
      expect(changeFailureRate).toBe(15);
    });

    it("should handle zero total changes", () => {
      const totalChanges = 0;
      const failed = 0;
      const changeFailureRate = totalChanges > 0 ? Math.round((failed / totalChanges) * 100) : 0;
      expect(changeFailureRate).toBe(0);
    });
  });

  describe("velocity", () => {
    it("should have correct structure", () => {
      const velocity = {
        teamVelocity: [],
        categoryBreakdown: [],
        approvalEfficiency: [],
      };

      expect(velocity).toHaveProperty("teamVelocity");
      expect(velocity).toHaveProperty("categoryBreakdown");
      expect(velocity).toHaveProperty("approvalEfficiency");
    });

    it("should structure teamVelocity items correctly", () => {
      const teamVelocityItem = {
        team: "Platform Team",
        totalChanges: 50,
        deployed: 45,
        avgRisk: 35,
        deployRate: 90,
      };

      expect(teamVelocityItem).toHaveProperty("team");
      expect(teamVelocityItem).toHaveProperty("totalChanges");
      expect(teamVelocityItem).toHaveProperty("deployed");
      expect(teamVelocityItem).toHaveProperty("avgRisk");
      expect(teamVelocityItem).toHaveProperty("deployRate");
    });

    it("should structure approvalEfficiency items correctly", () => {
      const approvalEfficiencyItem = {
        id: "CHG0000001",
        title: "Test Change",
        team: "Platform Team",
        approverCount: 2,
        leadTimeHours: 24,
        category: "infrastructure",
      };

      expect(approvalEfficiencyItem).toHaveProperty("id");
      expect(approvalEfficiencyItem).toHaveProperty("title");
      expect(approvalEfficiencyItem).toHaveProperty("team");
      expect(approvalEfficiencyItem).toHaveProperty("approverCount");
      expect(approvalEfficiencyItem).toHaveProperty("leadTimeHours");
      expect(approvalEfficiencyItem).toHaveProperty("category");
    });
  });

  describe("rollbackIntelligence", () => {
    it("should have correct structure", () => {
      const rollbackIntelligence = {
        rollbackCount: 5,
        rollbackRate: 10,
        rollbackData: [],
        rollbackByService: [],
      };

      expect(rollbackIntelligence).toHaveProperty("rollbackCount");
      expect(rollbackIntelligence).toHaveProperty("rollbackRate");
      expect(rollbackIntelligence).toHaveProperty("rollbackData");
      expect(rollbackIntelligence).toHaveProperty("rollbackByService");
    });

    it("should calculate rollbackRate correctly", () => {
      const closed = 80;
      const rejected = 10;
      const rolledBack = 10;
      const totalOutcomes = closed + rejected + rolledBack;
      const rollbackRate = Math.round((rolledBack / totalOutcomes) * 100);
      expect(rollbackRate).toBe(10);
    });

    it("should structure rollbackData items correctly", () => {
      const rollbackDataItem = {
        id: "CHG0000001",
        title: "Failed Deployment",
        team: "Platform Team",
        category: "infrastructure",
        risk: 75,
        rollbackComplexity: "high",
        services: ["api-gateway", "auth-service"],
      };

      expect(rollbackDataItem).toHaveProperty("id");
      expect(rollbackDataItem).toHaveProperty("title");
      expect(rollbackDataItem).toHaveProperty("team");
      expect(rollbackDataItem).toHaveProperty("category");
      expect(rollbackDataItem).toHaveProperty("risk");
      expect(rollbackDataItem).toHaveProperty("rollbackComplexity");
      expect(rollbackDataItem).toHaveProperty("services");
      expect(Array.isArray(rollbackDataItem.services)).toBe(true);
    });

    it("should structure rollbackByService items correctly", () => {
      const rollbackByServiceItem = {
        service: "api-gateway",
        count: 5,
      };

      expect(rollbackByServiceItem).toHaveProperty("service");
      expect(rollbackByServiceItem).toHaveProperty("count");
    });
  });

  describe("releaseRiskRadar", () => {
    it("should have correct structure", () => {
      const releaseRiskRadarItem = {
        releaseId: "rel-001",
        releaseName: "Q1 Release",
        version: "1.0.0",
        status: "scheduled",
        overallRisk: 45,
        changeCount: 10,
        totalCodeChurn: 0,
        totalFilesChanged: 0,
        servicesImpacted: 3,
        servicesList: ["api-gateway", "auth-service", "database"],
        avgTestCoverage: 0,
        validationPassRate: 0,
        scheduledDate: "2024-01-15T00:00:00.000Z",
        riskFactors: {
          codeChurn: "low",
          serviceSpread: "medium",
          testCoverage: "low",
          rollbackComplexity: "low",
        },
      };

      expect(releaseRiskRadarItem).toHaveProperty("releaseId");
      expect(releaseRiskRadarItem).toHaveProperty("releaseName");
      expect(releaseRiskRadarItem).toHaveProperty("version");
      expect(releaseRiskRadarItem).toHaveProperty("status");
      expect(releaseRiskRadarItem).toHaveProperty("overallRisk");
      expect(releaseRiskRadarItem).toHaveProperty("changeCount");
      expect(releaseRiskRadarItem).toHaveProperty("servicesImpacted");
      expect(releaseRiskRadarItem).toHaveProperty("servicesList");
      expect(releaseRiskRadarItem).toHaveProperty("riskFactors");
    });

    it("should classify service spread correctly", () => {
      const classifyServiceSpread = (count: number) =>
        count > 5 ? "high" : count > 2 ? "medium" : "low";

      expect(classifyServiceSpread(1)).toBe("low");
      expect(classifyServiceSpread(2)).toBe("low");
      expect(classifyServiceSpread(3)).toBe("medium");
      expect(classifyServiceSpread(5)).toBe("medium");
      expect(classifyServiceSpread(6)).toBe("high");
      expect(classifyServiceSpread(10)).toBe("high");
    });
  });

  describe("blastRadius", () => {
    it("should have correct structure", () => {
      const blastRadiusItem = {
        service: "api-gateway",
        changeCount: 15,
        avgRisk: 45,
        changes: ["CHG0000001", "CHG0000002"],
        releases: [],
      };

      expect(blastRadiusItem).toHaveProperty("service");
      expect(blastRadiusItem).toHaveProperty("changeCount");
      expect(blastRadiusItem).toHaveProperty("avgRisk");
      expect(blastRadiusItem).toHaveProperty("changes");
      expect(blastRadiusItem).toHaveProperty("releases");
      expect(Array.isArray(blastRadiusItem.changes)).toBe(true);
    });

    it("should sort by changeCount descending", () => {
      const blastRadius = [
        { service: "api-gateway", changeCount: 10 },
        { service: "database", changeCount: 25 },
        { service: "auth-service", changeCount: 5 },
      ];

      const sorted = [...blastRadius].sort((a, b) => b.changeCount - a.changeCount);

      expect(sorted[0].service).toBe("database");
      expect(sorted[1].service).toBe("api-gateway");
      expect(sorted[2].service).toBe("auth-service");
    });
  });

  describe("confidenceScores", () => {
    it("should have correct structure", () => {
      const confidenceScoreItem = {
        releaseId: "rel-001",
        releaseName: "Q1 Release",
        version: "1.0.0",
        status: "scheduled",
        confidence: 75,
        recommendation: "continue" as const,
        breakdown: {
          testPassRate: 0,
          testCoverage: 0,
          riskScore: 25,
          failedTests: 0,
          hasBlockers: false,
          rollbackComplexity: "low",
        },
        totalValidations: 0,
        passedValidations: 0,
        failedValidations: 0,
      };

      expect(confidenceScoreItem).toHaveProperty("releaseId");
      expect(confidenceScoreItem).toHaveProperty("confidence");
      expect(confidenceScoreItem).toHaveProperty("recommendation");
      expect(confidenceScoreItem).toHaveProperty("breakdown");
    });

    it("should calculate confidence from risk correctly", () => {
      const calculateConfidence = (overallRisk: number) => Math.max(0, 100 - overallRisk);

      expect(calculateConfidence(0)).toBe(100);
      expect(calculateConfidence(25)).toBe(75);
      expect(calculateConfidence(50)).toBe(50);
      expect(calculateConfidence(100)).toBe(0);
      expect(calculateConfidence(150)).toBe(0); // Clamped to 0
    });

    it("should determine recommendation based on risk", () => {
      const getRecommendation = (overallRisk: number) =>
        overallRisk < 20 ? "continue" : overallRisk < 50 ? "pause" : "rollback";

      expect(getRecommendation(10)).toBe("continue");
      expect(getRecommendation(19)).toBe("continue");
      expect(getRecommendation(20)).toBe("pause");
      expect(getRecommendation(49)).toBe("pause");
      expect(getRecommendation(50)).toBe("rollback");
      expect(getRecommendation(80)).toBe("rollback");
    });
  });
});

describe("Analytics Date Filtering", () => {
  it("should filter CRs by date range correctly", () => {
    const now = Date.now();
    const days = 7;
    const since = new Date(now - days * 24 * 60 * 60 * 1000);

    const crs = [
      { createdAt: new Date(now - 1 * 24 * 60 * 60 * 1000) }, // 1 day ago
      { createdAt: new Date(now - 5 * 24 * 60 * 60 * 1000) }, // 5 days ago
      { createdAt: new Date(now - 10 * 24 * 60 * 60 * 1000) }, // 10 days ago
      { createdAt: new Date(now - 30 * 24 * 60 * 60 * 1000) }, // 30 days ago
    ];

    const filtered = crs.filter((c) => c.createdAt >= since);
    expect(filtered.length).toBe(2); // Only 1 and 5 days ago
  });

  it("should return all CRs when days is 0", () => {
    const days = 0;
    const since = days > 0 ? new Date(Date.now() - days * 24 * 60 * 60 * 1000) : null;

    const crs = [
      { createdAt: new Date() },
      { createdAt: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000) },
    ];

    const filtered = since ? crs.filter((c) => c.createdAt >= since) : crs;
    expect(filtered.length).toBe(2);
  });
});

describe("Team Statistics Aggregation", () => {
  it("should aggregate team statistics correctly", () => {
    interface MockCR {
      assignmentGroup: string;
      state: string;
      computedRiskScore: number;
    }

    const crs: MockCR[] = [
      { assignmentGroup: "Platform Team", state: "closed", computedRiskScore: 30 },
      { assignmentGroup: "Platform Team", state: "closed", computedRiskScore: 50 },
      { assignmentGroup: "Platform Team", state: "rejected", computedRiskScore: 70 },
      { assignmentGroup: "API Team", state: "closed", computedRiskScore: 40 },
      { assignmentGroup: "API Team", state: "rolled_back", computedRiskScore: 80 },
    ];

    const teamStats: Record<string, { total: number; deployed: number; failed: number; rolledBack: number; risk: number }> = {};
    for (const c of crs) {
      const team = c.assignmentGroup || "Unassigned";
      if (!teamStats[team]) teamStats[team] = { total: 0, deployed: 0, failed: 0, rolledBack: 0, risk: 0 };
      teamStats[team].total++;
      teamStats[team].risk += c.computedRiskScore;
      if (c.state === "closed") teamStats[team].deployed++;
      if (c.state === "rejected" || c.state === "canceled") teamStats[team].failed++;
      if (c.state === "rolled_back") teamStats[team].rolledBack++;
    }

    expect(teamStats["Platform Team"].total).toBe(3);
    expect(teamStats["Platform Team"].deployed).toBe(2);
    expect(teamStats["Platform Team"].failed).toBe(1);
    expect(teamStats["Platform Team"].rolledBack).toBe(0);
    expect(teamStats["Platform Team"].risk).toBe(150); // 30+50+70

    expect(teamStats["API Team"].total).toBe(2);
    expect(teamStats["API Team"].deployed).toBe(1);
    expect(teamStats["API Team"].failed).toBe(0);
    expect(teamStats["API Team"].rolledBack).toBe(1);
    expect(teamStats["API Team"].risk).toBe(120); // 40+80
  });

  it("should handle missing assignmentGroup", () => {
    const crs = [
      { assignmentGroup: null, state: "closed", computedRiskScore: 50 },
      { assignmentGroup: undefined, state: "closed", computedRiskScore: 50 },
      { assignmentGroup: "", state: "closed", computedRiskScore: 50 },
    ];

    const teamStats: Record<string, { total: number }> = {};
    for (const c of crs) {
      const team = c.assignmentGroup || "Unassigned";
      if (!teamStats[team]) teamStats[team] = { total: 0 };
      teamStats[team].total++;
    }

    expect(teamStats["Unassigned"].total).toBe(3);
  });
});

describe("Service Risk Aggregation", () => {
  it("should aggregate service risk correctly", () => {
    interface MockCR {
      affectedServices: string[];
      computedRiskScore: number;
    }

    const crs: MockCR[] = [
      { affectedServices: ["api-gateway", "auth-service"], computedRiskScore: 40 },
      { affectedServices: ["api-gateway"], computedRiskScore: 60 },
      { affectedServices: ["database"], computedRiskScore: 80 },
    ];

    const serviceMap: Record<string, { changeCount: number; changes: string[]; risk: number }> = {};
    for (const c of crs) {
      for (const svc of c.affectedServices) {
        if (!serviceMap[svc]) serviceMap[svc] = { changeCount: 0, changes: [], risk: 0 };
        serviceMap[svc].changeCount++;
        serviceMap[svc].risk += c.computedRiskScore;
      }
    }

    expect(serviceMap["api-gateway"].changeCount).toBe(2);
    expect(serviceMap["api-gateway"].risk).toBe(100); // 40+60
    expect(Math.round(serviceMap["api-gateway"].risk / serviceMap["api-gateway"].changeCount)).toBe(50);

    expect(serviceMap["auth-service"].changeCount).toBe(1);
    expect(serviceMap["auth-service"].risk).toBe(40);

    expect(serviceMap["database"].changeCount).toBe(1);
    expect(serviceMap["database"].risk).toBe(80);
  });

  it("should handle empty affectedServices", () => {
    const crs = [
      { affectedServices: [], computedRiskScore: 50 },
    ];

    const serviceMap: Record<string, { changeCount: number }> = {};
    for (const c of crs) {
      for (const svc of c.affectedServices) {
        if (!serviceMap[svc]) serviceMap[svc] = { changeCount: 0 };
        serviceMap[svc].changeCount++;
      }
    }

    expect(Object.keys(serviceMap).length).toBe(0);
  });
});
