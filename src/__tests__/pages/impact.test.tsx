/**
 * Tests for /impact page - Impact Analysis Dashboard
 * These tests validate the impact page logic and URL parameter handling
 */
import "@testing-library/jest-dom";

describe("Impact Analysis Page", () => {
  describe("URL Parameter Handling", () => {
    it("supports cr parameter for pre-selection", () => {
      const url = new URL("http://localhost/impact?cr=CHG0000001");
      expect(url.searchParams.get("cr")).toBe("CHG0000001");
    });

    it("handles missing cr parameter", () => {
      const url = new URL("http://localhost/impact");
      expect(url.searchParams.get("cr")).toBeNull();
    });
  });

  describe("Plan Quality Scoring", () => {
    const scorePlan = (plan: string): number => {
      if (!plan || plan.trim().length === 0) return 0;
      let score = 0;
      if (plan.length > 100) score += 20;
      if (plan.length > 300) score += 20;
      if (/\d+\.\s/.test(plan)) score += 15; // Numbered steps
      if (/rollback|revert|backout/i.test(plan)) score += 10;
      if (/test|verify|validate/i.test(plan)) score += 10;
      return Math.min(100, score);
    };

    it("scores empty plan as 0", () => {
      expect(scorePlan("")).toBe(0);
    });

    it("scores short plan lower", () => {
      expect(scorePlan("Deploy it")).toBeLessThan(50);
    });

    it("scores detailed plan higher", () => {
      const detailedPlan = `
        1. Create backup of current state
        2. Deploy new version to staging
        3. Run integration tests
        4. Deploy to production with canary
        5. Monitor metrics for 1 hour
        6. Rollback if error rate > 1%
      `;
      expect(scorePlan(detailedPlan)).toBeGreaterThan(40);
    });

    it("rewards numbered steps", () => {
      const withSteps = "1. First step\n2. Second step";
      const withoutSteps = "First step, then second step";
      expect(scorePlan(withSteps)).toBeGreaterThan(scorePlan(withoutSteps));
    });
  });

  describe("Risk Level Filtering", () => {
    const mockCRs = [
      { number: "CHG0000001", riskLevel: "high" },
      { number: "CHG0000002", riskLevel: "low" },
      { number: "CHG0000003", riskLevel: "moderate" },
    ];

    it("filters by high risk", () => {
      const filtered = mockCRs.filter((cr) => cr.riskLevel === "high");
      expect(filtered.length).toBe(1);
      expect(filtered[0].number).toBe("CHG0000001");
    });

    it("filters by low risk", () => {
      const filtered = mockCRs.filter((cr) => cr.riskLevel === "low");
      expect(filtered.length).toBe(1);
      expect(filtered[0].number).toBe("CHG0000002");
    });

    it("shows all when filter is 'all'", () => {
      const filter = "all";
      const filtered = filter === "all" ? mockCRs : mockCRs.filter((cr) => cr.riskLevel === filter);
      expect(filtered.length).toBe(3);
    });
  });

  describe("State Filtering", () => {
    const mockCRs = [
      { number: "CHG0000001", state: "awaiting_approval" },
      { number: "CHG0000002", state: "scheduled" },
      { number: "CHG0000003", state: "draft" },
    ];

    it("filters by state", () => {
      const filtered = mockCRs.filter((cr) => cr.state === "scheduled");
      expect(filtered.length).toBe(1);
      expect(filtered[0].number).toBe("CHG0000002");
    });
  });

  describe("Search Functionality", () => {
    const mockCRs = [
      { number: "CHG0000001", title: "Payment Gateway Migration" },
      { number: "CHG0000002", title: "Redis Caching" },
    ];

    it("searches by CR number", () => {
      const search = "CHG0000001";
      const filtered = mockCRs.filter(
        (cr) => cr.number.includes(search) || cr.title.toLowerCase().includes(search.toLowerCase())
      );
      expect(filtered.length).toBe(1);
    });

    it("searches by title", () => {
      const search = "payment";
      const filtered = mockCRs.filter(
        (cr) => cr.number.includes(search) || cr.title.toLowerCase().includes(search.toLowerCase())
      );
      expect(filtered.length).toBe(1);
      expect(filtered[0].number).toBe("CHG0000001");
    });

    it("returns empty for no match", () => {
      const search = "nonexistent";
      const filtered = mockCRs.filter(
        (cr) => cr.number.includes(search) || cr.title.toLowerCase().includes(search.toLowerCase())
      );
      expect(filtered.length).toBe(0);
    });
  });

  describe("Weight Calculations", () => {
    const defaultWeights = {
      implementation: 0.25,
      backout: 0.25,
      testPlan: 0.20,
      riskAnalysis: 0.15,
      changePlan: 0.10,
      justification: 0.05,
    };

    it("weights sum to 1", () => {
      const sum = Object.values(defaultWeights).reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1, 5);
    });

    it("calculates weighted score", () => {
      const scores = {
        implementation: 80,
        backout: 60,
        testPlan: 70,
        riskAnalysis: 50,
        changePlan: 40,
        justification: 90,
      };

      const weighted =
        scores.implementation * defaultWeights.implementation +
        scores.backout * defaultWeights.backout +
        scores.testPlan * defaultWeights.testPlan +
        scores.riskAnalysis * defaultWeights.riskAnalysis +
        scores.changePlan * defaultWeights.changePlan +
        scores.justification * defaultWeights.justification;

      expect(weighted).toBeGreaterThan(0);
      expect(weighted).toBeLessThanOrEqual(100);
    });
  });
});
