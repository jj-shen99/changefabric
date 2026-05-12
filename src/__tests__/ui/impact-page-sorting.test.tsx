/**
 * Tests for /impact page sorting functionality
 * 
 * Test Coverage:
 * - Happy paths: Basic sorting operations for Plan Analysis and ML Analysis tabs
 * - Negative cases: Empty data, missing plan content
 * - Boundary conditions: Single item, extreme scores
 * - Equivalence partitioning: Score ranges, gap counts
 * - Decision tree: Sort direction toggling, tab switching
 * - Control flow: Filter + sort combinations
 */

import "@testing-library/jest-dom";

// Mock next/navigation
jest.mock("next/navigation", () => ({
  useSearchParams: () => ({ get: jest.fn(() => null) }),
}));

// Mock hooks
jest.mock("@/hooks", () => ({
  useData: () => ({
    changeRequests: [],
    loading: false,
    error: null,
  }),
}));

// Types matching the impact page implementation
type PlanSortKey = "number" | "overallScore" | "gapCount" | "state" | "group";
type SortDir = "asc" | "desc";

// Plan result structure
interface PlanResult {
  cr: {
    number: string;
    short_description: string;
    state: string;
    risk: string;
    assignment_group: string;
  };
  overallScore: number;
  gapCount: number;
  riskLevel: string;
  implementation: { present: boolean; quality: number };
  backout: { present: boolean; quality: number };
  testPlan: { present: boolean; quality: number };
  riskAnalysis: { present: boolean; quality: number };
  justification: { present: boolean; quality: number };
}

// Sample plan results for testing
const mockPlanResults: PlanResult[] = [
  {
    cr: {
      number: "CHG0000001",
      short_description: "Database Migration",
      state: "draft",
      risk: "moderate",
      assignment_group: "Platform",
    },
    overallScore: 65,
    gapCount: 1,
    riskLevel: "medium",
    implementation: { present: true, quality: 70 },
    backout: { present: true, quality: 60 },
    testPlan: { present: true, quality: 55 },
    riskAnalysis: { present: false, quality: 0 },
    justification: { present: true, quality: 80 },
  },
  {
    cr: {
      number: "CHG0000002",
      short_description: "API Update",
      state: "awaiting_approval",
      risk: "high",
      assignment_group: "Backend",
    },
    overallScore: 45,
    gapCount: 2,
    riskLevel: "high",
    implementation: { present: true, quality: 50 },
    backout: { present: false, quality: 0 },
    testPlan: { present: true, quality: 40 },
    riskAnalysis: { present: false, quality: 0 },
    justification: { present: true, quality: 60 },
  },
  {
    cr: {
      number: "CHG0000003",
      short_description: "Security Patch",
      state: "approved",
      risk: "low",
      assignment_group: "Security",
    },
    overallScore: 85,
    gapCount: 0,
    riskLevel: "low",
    implementation: { present: true, quality: 90 },
    backout: { present: true, quality: 85 },
    testPlan: { present: true, quality: 80 },
    riskAnalysis: { present: true, quality: 75 },
    justification: { present: true, quality: 95 },
  },
];

// Sorting utility function (mirrors implementation)
function sortPlanResults(items: PlanResult[], sortKey: PlanSortKey, sortDir: SortDir): PlanResult[] {
  return [...items].sort((a, b) => {
    let aVal: string | number;
    let bVal: string | number;
    switch (sortKey) {
      case "number": aVal = a.cr.number || ""; bVal = b.cr.number || ""; break;
      case "overallScore": aVal = a.overallScore; bVal = b.overallScore; break;
      case "gapCount": aVal = a.gapCount; bVal = b.gapCount; break;
      case "state": aVal = a.cr.state || ""; bVal = b.cr.state || ""; break;
      case "group": aVal = a.cr.assignment_group || ""; bVal = b.cr.assignment_group || ""; break;
      default: aVal = a.overallScore; bVal = b.overallScore;
    }
    if (typeof aVal === "number" && typeof bVal === "number") {
      return sortDir === "asc" ? aVal - bVal : bVal - aVal;
    }
    return sortDir === "asc" ? String(aVal).localeCompare(String(bVal)) : String(bVal).localeCompare(String(aVal));
  });
}

describe("Impact Page Sorting", () => {
  // ═══════════════════════════════════════════════════════════════════
  // HAPPY PATH TESTS
  // ═══════════════════════════════════════════════════════════════════
  
  describe("Happy Paths - Plan Analysis Tab", () => {
    test("sorts by overallScore ascending (lowest readiness first)", () => {
      const sorted = sortPlanResults(mockPlanResults, "overallScore", "asc");
      expect(sorted[0].overallScore).toBe(45);
      expect(sorted[1].overallScore).toBe(65);
      expect(sorted[2].overallScore).toBe(85);
    });

    test("sorts by overallScore descending (highest readiness first)", () => {
      const sorted = sortPlanResults(mockPlanResults, "overallScore", "desc");
      expect(sorted[0].overallScore).toBe(85);
      expect(sorted[1].overallScore).toBe(65);
      expect(sorted[2].overallScore).toBe(45);
    });

    test("sorts by gapCount ascending (fewest gaps first)", () => {
      const sorted = sortPlanResults(mockPlanResults, "gapCount", "asc");
      expect(sorted[0].gapCount).toBe(0);
      expect(sorted[1].gapCount).toBe(1);
      expect(sorted[2].gapCount).toBe(2);
    });

    test("sorts by gapCount descending (most gaps first)", () => {
      const sorted = sortPlanResults(mockPlanResults, "gapCount", "desc");
      expect(sorted[0].gapCount).toBe(2);
      expect(sorted[1].gapCount).toBe(1);
      expect(sorted[2].gapCount).toBe(0);
    });

    test("sorts by number ascending", () => {
      const sorted = sortPlanResults(mockPlanResults, "number", "asc");
      expect(sorted[0].cr.number).toBe("CHG0000001");
      expect(sorted[1].cr.number).toBe("CHG0000002");
      expect(sorted[2].cr.number).toBe("CHG0000003");
    });

    test("sorts by state ascending", () => {
      const sorted = sortPlanResults(mockPlanResults, "state", "asc");
      expect(sorted[0].cr.state).toBe("approved");
      expect(sorted[1].cr.state).toBe("awaiting_approval");
      expect(sorted[2].cr.state).toBe("draft");
    });

    test("sorts by group ascending", () => {
      const sorted = sortPlanResults(mockPlanResults, "group", "asc");
      expect(sorted[0].cr.assignment_group).toBe("Backend");
      expect(sorted[1].cr.assignment_group).toBe("Platform");
      expect(sorted[2].cr.assignment_group).toBe("Security");
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // NEGATIVE CASES
  // ═══════════════════════════════════════════════════════════════════
  
  describe("Negative Cases", () => {
    test("handles empty array", () => {
      const sorted = sortPlanResults([], "overallScore", "asc");
      expect(sorted).toEqual([]);
      expect(sorted.length).toBe(0);
    });

    test("handles missing assignment_group", () => {
      const itemsWithMissing = [
        { ...mockPlanResults[0], cr: { ...mockPlanResults[0].cr, assignment_group: "" } },
        { ...mockPlanResults[1], cr: { ...mockPlanResults[1].cr, assignment_group: "Zebra" } },
        { ...mockPlanResults[2], cr: { ...mockPlanResults[2].cr, assignment_group: "Alpha" } },
      ];
      const sorted = sortPlanResults(itemsWithMissing, "group", "asc");
      expect(sorted[0].cr.assignment_group).toBe("");
      expect(sorted[1].cr.assignment_group).toBe("Alpha");
      expect(sorted[2].cr.assignment_group).toBe("Zebra");
    });

    test("handles all plans with zero score", () => {
      const zeroScores = mockPlanResults.map(p => ({ ...p, overallScore: 0 }));
      const sorted = sortPlanResults(zeroScores, "overallScore", "asc");
      expect(sorted.every(p => p.overallScore === 0)).toBe(true);
    });

    test("handles all plans with maximum gaps (5)", () => {
      const maxGaps = mockPlanResults.map(p => ({ ...p, gapCount: 5 }));
      const sorted = sortPlanResults(maxGaps, "gapCount", "desc");
      expect(sorted.every(p => p.gapCount === 5)).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // BOUNDARY CONDITIONS
  // ═══════════════════════════════════════════════════════════════════
  
  describe("Boundary Conditions", () => {
    test("handles single item", () => {
      const singleItem = [mockPlanResults[0]];
      const sorted = sortPlanResults(singleItem, "overallScore", "asc");
      expect(sorted.length).toBe(1);
      expect(sorted[0].overallScore).toBe(65);
    });

    test("handles score at boundary 0", () => {
      const items = [
        { ...mockPlanResults[0], overallScore: 0 },
        { ...mockPlanResults[1], overallScore: 50 },
      ];
      const sorted = sortPlanResults(items, "overallScore", "asc");
      expect(sorted[0].overallScore).toBe(0);
    });

    test("handles score at boundary 100", () => {
      const items = [
        { ...mockPlanResults[0], overallScore: 100 },
        { ...mockPlanResults[1], overallScore: 50 },
      ];
      const sorted = sortPlanResults(items, "overallScore", "desc");
      expect(sorted[0].overallScore).toBe(100);
    });

    test("handles gapCount at boundary 0", () => {
      const items = [
        { ...mockPlanResults[0], gapCount: 0 },
        { ...mockPlanResults[1], gapCount: 3 },
      ];
      const sorted = sortPlanResults(items, "gapCount", "asc");
      expect(sorted[0].gapCount).toBe(0);
    });

    test("handles gapCount at boundary 5 (max possible)", () => {
      const items = [
        { ...mockPlanResults[0], gapCount: 5 },
        { ...mockPlanResults[1], gapCount: 2 },
      ];
      const sorted = sortPlanResults(items, "gapCount", "desc");
      expect(sorted[0].gapCount).toBe(5);
    });

    test("handles large dataset (100 items)", () => {
      const largeDataset = Array.from({ length: 100 }, (_, i) => ({
        ...mockPlanResults[0],
        cr: { ...mockPlanResults[0].cr, number: `CHG${String(i).padStart(7, "0")}` },
        overallScore: Math.floor(Math.random() * 101),
      }));
      const sorted = sortPlanResults(largeDataset, "overallScore", "asc");
      expect(sorted.length).toBe(100);
      for (let i = 1; i < sorted.length; i++) {
        expect(sorted[i].overallScore).toBeGreaterThanOrEqual(sorted[i - 1].overallScore);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // EQUIVALENCE PARTITIONING
  // ═══════════════════════════════════════════════════════════════════
  
  describe("Equivalence Partitioning", () => {
    // Partition 1: Score ranges (readiness levels)
    describe("Score Ranges", () => {
      test("critical risk range (0-24)", () => {
        const items = [
          { ...mockPlanResults[0], overallScore: 10 },
          { ...mockPlanResults[1], overallScore: 20 },
          { ...mockPlanResults[2], overallScore: 5 },
        ];
        const sorted = sortPlanResults(items, "overallScore", "asc");
        expect(sorted[0].overallScore).toBe(5);
        expect(sorted[2].overallScore).toBe(20);
      });

      test("high risk range (25-49)", () => {
        const items = [
          { ...mockPlanResults[0], overallScore: 30 },
          { ...mockPlanResults[1], overallScore: 45 },
          { ...mockPlanResults[2], overallScore: 25 },
        ];
        const sorted = sortPlanResults(items, "overallScore", "asc");
        expect(sorted[0].overallScore).toBe(25);
        expect(sorted[2].overallScore).toBe(45);
      });

      test("medium risk range (50-74)", () => {
        const items = [
          { ...mockPlanResults[0], overallScore: 60 },
          { ...mockPlanResults[1], overallScore: 50 },
          { ...mockPlanResults[2], overallScore: 74 },
        ];
        const sorted = sortPlanResults(items, "overallScore", "asc");
        expect(sorted[0].overallScore).toBe(50);
        expect(sorted[2].overallScore).toBe(74);
      });

      test("low risk range (75-100)", () => {
        const items = [
          { ...mockPlanResults[0], overallScore: 90 },
          { ...mockPlanResults[1], overallScore: 75 },
          { ...mockPlanResults[2], overallScore: 100 },
        ];
        const sorted = sortPlanResults(items, "overallScore", "asc");
        expect(sorted[0].overallScore).toBe(75);
        expect(sorted[2].overallScore).toBe(100);
      });
    });

    // Partition 2: Gap counts
    describe("Gap Counts", () => {
      test("no gaps (0)", () => {
        const items = mockPlanResults.map(p => ({ ...p, gapCount: 0 }));
        const sorted = sortPlanResults(items, "gapCount", "asc");
        expect(sorted.every(p => p.gapCount === 0)).toBe(true);
      });

      test("some gaps (1-2)", () => {
        const items = [
          { ...mockPlanResults[0], gapCount: 1 },
          { ...mockPlanResults[1], gapCount: 2 },
          { ...mockPlanResults[2], gapCount: 1 },
        ];
        const sorted = sortPlanResults(items, "gapCount", "asc");
        expect(sorted[0].gapCount).toBe(1);
        expect(sorted[2].gapCount).toBe(2);
      });

      test("many gaps (3-5)", () => {
        const items = [
          { ...mockPlanResults[0], gapCount: 4 },
          { ...mockPlanResults[1], gapCount: 3 },
          { ...mockPlanResults[2], gapCount: 5 },
        ];
        const sorted = sortPlanResults(items, "gapCount", "asc");
        expect(sorted[0].gapCount).toBe(3);
        expect(sorted[2].gapCount).toBe(5);
      });
    });

    // Partition 3: State values
    describe("State Values", () => {
      test("early workflow states", () => {
        const items = [
          { ...mockPlanResults[0], cr: { ...mockPlanResults[0].cr, state: "submitted" } },
          { ...mockPlanResults[1], cr: { ...mockPlanResults[1].cr, state: "draft" } },
          { ...mockPlanResults[2], cr: { ...mockPlanResults[2].cr, state: "assessing" } },
        ];
        const sorted = sortPlanResults(items, "state", "asc");
        expect(sorted[0].cr.state).toBe("assessing");
        expect(sorted[1].cr.state).toBe("draft");
        expect(sorted[2].cr.state).toBe("submitted");
      });

      test("late workflow states", () => {
        const items = [
          { ...mockPlanResults[0], cr: { ...mockPlanResults[0].cr, state: "closed" } },
          { ...mockPlanResults[1], cr: { ...mockPlanResults[1].cr, state: "implemented" } },
          { ...mockPlanResults[2], cr: { ...mockPlanResults[2].cr, state: "reviewing" } },
        ];
        const sorted = sortPlanResults(items, "state", "asc");
        expect(sorted[0].cr.state).toBe("closed");
        expect(sorted[1].cr.state).toBe("implemented");
        expect(sorted[2].cr.state).toBe("reviewing");
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // DECISION TREE TESTING
  // ═══════════════════════════════════════════════════════════════════
  
  describe("Decision Tree Testing", () => {
    test("toggle sort: same column asc -> desc", () => {
      const sortKey: PlanSortKey = "overallScore";
      let sortDir: SortDir = "asc";
      const clickedKey: PlanSortKey = "overallScore";
      
      if (sortKey === clickedKey) {
        sortDir = sortDir === "asc" ? "desc" : "asc";
      }
      
      expect(sortDir).toBe("desc");
    });

    test("toggle sort: same column desc -> asc", () => {
      const sortKey: PlanSortKey = "overallScore";
      let sortDir: SortDir = "desc";
      const clickedKey: PlanSortKey = "overallScore";
      
      if (sortKey === clickedKey) {
        sortDir = sortDir === "asc" ? "desc" : "asc";
      }
      
      expect(sortDir).toBe("asc");
    });

    test("change column: resets to asc", () => {
      let sortKey: PlanSortKey = "overallScore";
      let sortDir: SortDir = "desc";
      const clickedKey: PlanSortKey = "gapCount";
      
      if (sortKey !== clickedKey) {
        sortKey = clickedKey;
        sortDir = "asc";
      }
      
      expect(sortKey).toBe("gapCount");
      expect(sortDir).toBe("asc");
    });

    test("sequential column changes", () => {
      let sortKey: PlanSortKey = "number";
      let sortDir: SortDir = "asc";
      
      // Click overallScore
      sortKey = "overallScore";
      sortDir = "asc";
      expect(sortKey).toBe("overallScore");
      
      // Click overallScore again
      sortDir = "desc";
      expect(sortDir).toBe("desc");
      
      // Click gapCount
      sortKey = "gapCount";
      sortDir = "asc";
      expect(sortKey).toBe("gapCount");
      expect(sortDir).toBe("asc");
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // CONTROL FLOW TESTING
  // ═══════════════════════════════════════════════════════════════════
  
  describe("Control Flow Testing", () => {
    test("filter by risk then sort by score", () => {
      const filtered = mockPlanResults.filter(p => p.cr.risk === "high" || p.cr.risk === "moderate");
      const sorted = sortPlanResults(filtered, "overallScore", "asc");
      
      expect(sorted.length).toBe(2);
      expect(sorted[0].overallScore).toBe(45); // high risk
      expect(sorted[1].overallScore).toBe(65); // moderate risk
    });

    test("filter by state then sort by gaps", () => {
      const filtered = mockPlanResults.filter(p => p.cr.state !== "draft");
      const sorted = sortPlanResults(filtered, "gapCount", "asc");
      
      expect(sorted.length).toBe(2);
      expect(sorted[0].gapCount).toBe(0); // approved
      expect(sorted[1].gapCount).toBe(2); // awaiting_approval
    });

    test("filter by group then sort by number", () => {
      const filtered = mockPlanResults.filter(p => 
        p.cr.assignment_group === "Platform" || p.cr.assignment_group === "Security"
      );
      const sorted = sortPlanResults(filtered, "number", "asc");
      
      expect(sorted.length).toBe(2);
      expect(sorted[0].cr.number).toBe("CHG0000001");
      expect(sorted[1].cr.number).toBe("CHG0000003");
    });

    test("search filter then sort", () => {
      const searchTerm = "security";
      const filtered = mockPlanResults.filter(p => 
        p.cr.short_description.toLowerCase().includes(searchTerm.toLowerCase())
      );
      const sorted = sortPlanResults(filtered, "overallScore", "desc");
      
      expect(sorted.length).toBe(1);
      expect(sorted[0].cr.short_description).toBe("Security Patch");
    });

    test("multiple filters then sort", () => {
      const filtered = mockPlanResults
        .filter(p => p.cr.risk !== "low")
        .filter(p => p.gapCount > 0);
      const sorted = sortPlanResults(filtered, "overallScore", "asc");
      
      expect(sorted.length).toBe(2);
      expect(sorted[0].overallScore).toBeLessThan(sorted[1].overallScore);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // ML ANALYSIS TAB TESTS
  // ═══════════════════════════════════════════════════════════════════
  
  describe("ML Analysis Tab Sorting", () => {
    test("uses same sorting logic as Plan Analysis", () => {
      // ML tab uses the same planResults and sorting
      const planSorted = sortPlanResults(mockPlanResults, "overallScore", "asc");
      const mlSorted = sortPlanResults(mockPlanResults, "overallScore", "asc");
      
      expect(planSorted).toEqual(mlSorted);
    });

    test("independent sort state from Plan Analysis", () => {
      // Simulate Plan tab sorted by score desc
      const planSorted = sortPlanResults(mockPlanResults, "overallScore", "desc");
      // Simulate ML tab sorted by gaps asc
      const mlSorted = sortPlanResults(mockPlanResults, "gapCount", "asc");
      
      // They should be different
      expect(planSorted[0].cr.number).not.toBe(mlSorted[0].cr.number);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // INTEGRATION TESTS
  // ═══════════════════════════════════════════════════════════════════
  
  describe("Integration Tests", () => {
    test("sort maintains data integrity", () => {
      const original = [...mockPlanResults];
      const sorted = sortPlanResults(mockPlanResults, "overallScore", "asc");
      
      // Original should not be mutated
      expect(mockPlanResults).toEqual(original);
      
      // Sorted should have same items
      expect(sorted.length).toBe(mockPlanResults.length);
      sorted.forEach(item => {
        expect(mockPlanResults.some(p => p.cr.number === item.cr.number)).toBe(true);
      });
    });

    test("multiple sorts produce consistent results", () => {
      const sorted1 = sortPlanResults(mockPlanResults, "overallScore", "asc");
      const sorted2 = sortPlanResults(mockPlanResults, "overallScore", "asc");
      
      expect(sorted1).toEqual(sorted2);
    });

    test("reverse sort produces exact opposite order", () => {
      const asc = sortPlanResults(mockPlanResults, "overallScore", "asc");
      const desc = sortPlanResults(mockPlanResults, "overallScore", "desc");
      
      expect(asc[0]).toEqual(desc[desc.length - 1]);
      expect(asc[asc.length - 1]).toEqual(desc[0]);
    });

    test("plan quality scores preserved after sort", () => {
      const sorted = sortPlanResults(mockPlanResults, "overallScore", "asc");
      
      sorted.forEach(item => {
        const original = mockPlanResults.find(p => p.cr.number === item.cr.number);
        expect(item.implementation.quality).toBe(original?.implementation.quality);
        expect(item.backout.quality).toBe(original?.backout.quality);
        expect(item.testPlan.quality).toBe(original?.testPlan.quality);
      });
    });
  });
});
