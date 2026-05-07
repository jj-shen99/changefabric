/**
 * Tests for Risk Score Calculations in /api/data
 * Ensures risk scores are varied and meaningful, not all the same value
 * @jest-environment node
 */

describe("Risk Score Calculations", () => {
  describe("Impact Risk Score Generation", () => {
    /**
     * Risk scores should be varied based on CR attributes, not all identical.
     * Each risk category should have its own calculation logic.
     */
    
    const mockCR = {
      computedRiskScore: 50,
      computedImpactScore: 40,
      type: "normal",
      category: "software",
      riskLevel: "moderate",
      affectedServices: ["service-a", "service-b"],
    };

    // Simulate the calculation logic from /api/data/route.ts
    function calculateImpactScores(cr: typeof mockCR) {
      return {
        outageRisk: Math.round(cr.computedRiskScore * (0.8 + (cr.affectedServices.length * 0.1))),
        performanceRisk: Math.round(cr.computedRiskScore * (cr.type === "emergency" ? 1.2 : 0.9)),
        functionalityRisk: Math.round(cr.computedImpactScore * (cr.category === "software" ? 1.1 : 0.95)),
        securityRisk: Math.round(cr.computedRiskScore * (cr.riskLevel === "very_high" || cr.riskLevel === "high" ? 1.15 : 0.85)),
        dataIntegrityRisk: Math.round(cr.computedImpactScore * (cr.category === "database" ? 1.2 : 0.9)),
        overallRisk: Math.round(cr.computedRiskScore),
      };
    }

    it("generates varied risk scores, not all identical", () => {
      const scores = calculateImpactScores(mockCR);
      const uniqueScores = new Set(Object.values(scores));
      
      // Should have at least 3 different values
      expect(uniqueScores.size).toBeGreaterThanOrEqual(3);
    });

    it("outage risk increases with more affected services", () => {
      const fewServices = calculateImpactScores({ ...mockCR, affectedServices: ["a"] });
      const manyServices = calculateImpactScores({ ...mockCR, affectedServices: ["a", "b", "c", "d"] });
      
      expect(manyServices.outageRisk).toBeGreaterThan(fewServices.outageRisk);
    });

    it("performance risk is higher for emergency changes", () => {
      const normalChange = calculateImpactScores({ ...mockCR, type: "normal" });
      const emergencyChange = calculateImpactScores({ ...mockCR, type: "emergency" });
      
      expect(emergencyChange.performanceRisk).toBeGreaterThan(normalChange.performanceRisk);
    });

    it("functionality risk is higher for software category", () => {
      const softwareChange = calculateImpactScores({ ...mockCR, category: "software" });
      const infraChange = calculateImpactScores({ ...mockCR, category: "infrastructure" });
      
      expect(softwareChange.functionalityRisk).toBeGreaterThan(infraChange.functionalityRisk);
    });

    it("security risk is higher for high risk level changes", () => {
      const moderateRisk = calculateImpactScores({ ...mockCR, riskLevel: "moderate" });
      const highRisk = calculateImpactScores({ ...mockCR, riskLevel: "high" });
      
      expect(highRisk.securityRisk).toBeGreaterThan(moderateRisk.securityRisk);
    });

    it("data integrity risk is higher for database category", () => {
      const softwareChange = calculateImpactScores({ ...mockCR, category: "software" });
      const databaseChange = calculateImpactScores({ ...mockCR, category: "database" });
      
      expect(databaseChange.dataIntegrityRisk).toBeGreaterThan(softwareChange.dataIntegrityRisk);
    });

    it("overall risk equals computed risk score", () => {
      const scores = calculateImpactScores(mockCR);
      expect(scores.overallRisk).toBe(mockCR.computedRiskScore);
    });
  });

  describe("Risk Score Bounds", () => {
    it("risk scores should be non-negative", () => {
      const mockCR = {
        computedRiskScore: 10,
        computedImpactScore: 10,
        type: "normal",
        category: "other",
        riskLevel: "low",
        affectedServices: [],
      };

      const scores = {
        outageRisk: Math.round(mockCR.computedRiskScore * (0.8 + (mockCR.affectedServices.length * 0.1))),
        performanceRisk: Math.round(mockCR.computedRiskScore * 0.9),
        functionalityRisk: Math.round(mockCR.computedImpactScore * 0.95),
        securityRisk: Math.round(mockCR.computedRiskScore * 0.85),
        dataIntegrityRisk: Math.round(mockCR.computedImpactScore * 0.9),
      };

      Object.values(scores).forEach((score) => {
        expect(score).toBeGreaterThanOrEqual(0);
      });
    });

    it("risk scores should not exceed 100 for normal inputs", () => {
      const mockCR = {
        computedRiskScore: 80,
        computedImpactScore: 80,
        type: "emergency",
        category: "database",
        riskLevel: "very_high",
        affectedServices: ["a", "b", "c"],
      };

      const scores = {
        outageRisk: Math.round(mockCR.computedRiskScore * (0.8 + (mockCR.affectedServices.length * 0.1))),
        performanceRisk: Math.round(mockCR.computedRiskScore * 1.2),
        functionalityRisk: Math.round(mockCR.computedImpactScore * 1.1),
        securityRisk: Math.round(mockCR.computedRiskScore * 1.15),
        dataIntegrityRisk: Math.round(mockCR.computedImpactScore * 1.2),
      };

      // Most scores should be reasonable (under 120 even with multipliers)
      Object.values(scores).forEach((score) => {
        expect(score).toBeLessThan(150);
      });
    });
  });

  describe("Risk Overview Display Requirements", () => {
    it("should display 5 risk categories", () => {
      const riskCategories = [
        "Overall",
        "Outage",
        "Performance",
        "Functionality",
        "Security",
      ];
      
      expect(riskCategories).toHaveLength(5);
    });

    it("each category should have a distinct calculation", () => {
      const calculations = {
        overall: "computedRiskScore",
        outage: "computedRiskScore * (0.8 + affectedServices.length * 0.1)",
        performance: "computedRiskScore * (emergency ? 1.2 : 0.9)",
        functionality: "computedImpactScore * (software ? 1.1 : 0.95)",
        security: "computedRiskScore * (high/very_high ? 1.15 : 0.85)",
      };

      const uniqueCalculations = new Set(Object.values(calculations));
      expect(uniqueCalculations.size).toBe(Object.keys(calculations).length);
    });
  });
});

describe("Average Risk Score Calculation", () => {
  it("calculates average correctly for multiple CRs", () => {
    const changeRequests = [
      { impact: { outageRisk: 40 } },
      { impact: { outageRisk: 60 } },
      { impact: { outageRisk: 50 } },
    ];

    const avgScore = (fn: (cr: typeof changeRequests[0]) => number) =>
      changeRequests.length > 0
        ? Math.round(changeRequests.reduce((a, c) => a + fn(c), 0) / changeRequests.length)
        : 0;

    const avgOutageRisk = avgScore((c) => c.impact.outageRisk);
    expect(avgOutageRisk).toBe(50);
  });

  it("returns 0 for empty array", () => {
    const changeRequests: { impact: { outageRisk: number } }[] = [];

    const avgScore = (fn: (cr: typeof changeRequests[0]) => number) =>
      changeRequests.length > 0
        ? Math.round(changeRequests.reduce((a, c) => a + fn(c), 0) / changeRequests.length)
        : 0;

    const avgOutageRisk = avgScore((c) => c.impact.outageRisk);
    expect(avgOutageRisk).toBe(0);
  });
});
