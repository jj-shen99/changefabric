/**
 * Tests for impact analysis module
 */
import { analyzeImpact } from "../impact/analyzer";
import type { ChangeRequest } from "../schema";

describe("Impact Analysis", () => {
  const baseCR: Partial<ChangeRequest> = {
    number: "CHG0000001",
    title: "Test CR",
    description: "Test description",
    type: "normal",
    category: "infrastructure",
    priority: "2",
    riskLevel: "moderate",
    impactLevel: "2",
    urgency: "2",
    state: "draft",
    affectedServices: [],
    implementationPlan: "",
    backoutPlan: "",
    testPlan: "",
    riskAndImpactAnalysis: "",
  };

  describe("analyzeImpact", () => {
    it("returns higher risk for high-risk changes", () => {
      const highRiskCR = {
        ...baseCR,
        riskLevel: "very_high",
        priority: "1",
        impactLevel: "1",
      } as ChangeRequest;

      const lowRiskCR = {
        ...baseCR,
        riskLevel: "low",
        priority: "4",
        impactLevel: "3",
      } as ChangeRequest;

      const highResult = analyzeImpact(highRiskCR);
      const lowResult = analyzeImpact(lowRiskCR);

      expect(highResult.overallRisk).toBeGreaterThan(lowResult.overallRisk);
    });

    it("considers affected services count for blast radius", () => {
      const fewServices = {
        ...baseCR,
        affectedServices: ["service-1"],
      } as ChangeRequest;

      const manyServices = {
        ...baseCR,
        affectedServices: ["service-1", "service-2", "service-3", "service-4", "service-5"],
      } as ChangeRequest;

      const fewResult = analyzeImpact(fewServices);
      const manyResult = analyzeImpact(manyServices);

      expect(manyResult.blastRadius).toBe("critical");
      expect(fewResult.blastRadius).toBe("medium");
    });

    it("considers emergency type as higher risk", () => {
      const normalCR = {
        ...baseCR,
        type: "normal",
      } as ChangeRequest;

      const emergencyCR = {
        ...baseCR,
        type: "emergency",
      } as ChangeRequest;

      const normalResult = analyzeImpact(normalCR);
      const emergencyResult = analyzeImpact(emergencyCR);

      expect(emergencyResult.outageRisk).toBeGreaterThan(normalResult.outageRisk);
    });

    it("considers database category as higher risk", () => {
      const infraCR = {
        ...baseCR,
        category: "infrastructure",
      } as ChangeRequest;

      const dbCR = {
        ...baseCR,
        category: "database",
      } as ChangeRequest;

      const infraResult = analyzeImpact(infraCR);
      const dbResult = analyzeImpact(dbCR);

      expect(dbResult.dataIntegrityRisk).toBeGreaterThan(infraResult.dataIntegrityRisk);
    });

    it("returns risk breakdown", () => {
      const cr = baseCR as ChangeRequest;
      const result = analyzeImpact(cr);

      expect(result).toHaveProperty("overallRisk");
      expect(result).toHaveProperty("outageRisk");
      expect(result).toHaveProperty("performanceRisk");
      expect(result).toHaveProperty("functionalityRisk");
      expect(result).toHaveProperty("securityRisk");
      expect(result).toHaveProperty("dataIntegrityRisk");
      expect(result).toHaveProperty("blastRadius");
      expect(result).toHaveProperty("rollbackComplexity");
      expect(result).toHaveProperty("rationale");
    });

    it("includes rationale in result", () => {
      const cr = {
        ...baseCR,
        riskLevel: "high",
        affectedServices: ["service-1", "service-2"],
      } as ChangeRequest;

      const result = analyzeImpact(cr);

      expect(result.rationale).toBeInstanceOf(Array);
      expect(result.rationale.length).toBeGreaterThan(0);
    });

    it("handles missing optional fields gracefully", () => {
      const minimalCR = {
        number: "CHG0000001",
        title: "Minimal CR",
        type: "normal",
        category: "other",
        priority: "3",
        riskLevel: "moderate",
        impactLevel: "2",
        urgency: "2",
        state: "draft",
        implementationPlan: "",
        backoutPlan: "",
        testPlan: "",
      } as ChangeRequest;

      expect(() => analyzeImpact(minimalCR)).not.toThrow();
    });

    it("scores are within expected range (0-100)", () => {
      const testCases = [
        { riskLevel: "low", priority: "4", impactLevel: "3" },
        { riskLevel: "moderate", priority: "3", impactLevel: "2" },
        { riskLevel: "high", priority: "2", impactLevel: "1" },
        { riskLevel: "very_high", priority: "1", impactLevel: "1" },
      ];

      testCases.forEach((testCase) => {
        const cr = { ...baseCR, ...testCase } as ChangeRequest;
        const result = analyzeImpact(cr);

        expect(result.overallRisk).toBeGreaterThanOrEqual(0);
        expect(result.overallRisk).toBeLessThanOrEqual(100);
        expect(result.outageRisk).toBeGreaterThanOrEqual(0);
        expect(result.outageRisk).toBeLessThanOrEqual(100);
        expect(result.functionalityRisk).toBeGreaterThanOrEqual(0);
        expect(result.functionalityRisk).toBeLessThanOrEqual(100);
        expect(result.dataIntegrityRisk).toBeGreaterThanOrEqual(0);
        expect(result.dataIntegrityRisk).toBeLessThanOrEqual(100);
      });
    });

    it("identifies missing backout plan in rationale", () => {
      const cr = {
        ...baseCR,
        backoutPlan: "",
      } as ChangeRequest;

      const result = analyzeImpact(cr);

      expect(result.rationale).toContain("missing_backout_plan (+15)");
    });

    it("identifies missing test plan in rationale", () => {
      const cr = {
        ...baseCR,
        testPlan: "",
      } as ChangeRequest;

      const result = analyzeImpact(cr);

      expect(result.rationale).toContain("missing_test_plan (+15 functionality)");
    });

    it("calculates estimated downtime from planned window", () => {
      const cr = {
        ...baseCR,
        plannedStart: new Date(Date.now()).toISOString(),
        plannedEnd: new Date(Date.now() + 60 * 60000).toISOString(), // 60 minutes
      } as ChangeRequest;

      const result = analyzeImpact(cr);

      expect(result.estimatedDowntime).toContain("60 min");
    });
  });
});
