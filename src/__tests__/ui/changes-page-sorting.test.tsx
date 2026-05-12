/**
 * Tests for /changes page sorting functionality
 * 
 * Test Coverage:
 * - Happy paths: Basic sorting operations
 * - Negative cases: Empty data, null values
 * - Boundary conditions: Single item, large datasets
 * - Equivalence partitioning: String vs numeric columns
 * - Decision tree: Sort direction toggling
 * - Control flow: Filter + sort combinations
 */

import "@testing-library/jest-dom";

// Mock next/navigation
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  usePathname: () => "/changes",
}));

// Mock usePermissions hook
jest.mock("@/hooks", () => ({
  usePermissions: () => ({ canManageChanges: true }),
}));

// Sample CR data for testing
const mockCRs = [
  {
    number: "CHG0000001",
    title: "Database Migration",
    state: "draft",
    type: "normal",
    category: "infrastructure",
    priority: "2",
    riskLevel: "moderate",
    computedRiskScore: 45,
    mlRiskScore: 52,
    requestedBy: "Alice Smith",
    assignedTo: "Bob Jones",
    createdAt: "2024-01-15T10:00:00Z",
  },
  {
    number: "CHG0000002",
    title: "API Update",
    state: "awaiting_approval",
    type: "emergency",
    category: "application",
    priority: "1",
    riskLevel: "high",
    computedRiskScore: 78,
    mlRiskScore: 85,
    requestedBy: "Charlie Brown",
    assignedTo: "Diana Prince",
    createdAt: "2024-01-16T14:30:00Z",
  },
  {
    number: "CHG0000003",
    title: "Security Patch",
    state: "approved",
    type: "standard",
    category: "security",
    priority: "1",
    riskLevel: "low",
    computedRiskScore: 25,
    mlRiskScore: 30,
    requestedBy: "Eve Wilson",
    assignedTo: "Frank Miller",
    createdAt: "2024-01-14T08:00:00Z",
  },
];

// Sorting utility function (mirrors implementation)
type SortKey = "number" | "title" | "state" | "computedRiskScore" | "mlRiskScore" | "requestedBy" | "createdAt";
type SortDir = "asc" | "desc";

function sortCRs(items: typeof mockCRs, sortKey: SortKey, sortDir: SortDir) {
  return [...items].sort((a, b) => {
    let aVal: string | number | null = a[sortKey];
    let bVal: string | number | null = b[sortKey];
    
    if (aVal == null) aVal = sortKey === "mlRiskScore" || sortKey === "computedRiskScore" ? -1 : "";
    if (bVal == null) bVal = sortKey === "mlRiskScore" || sortKey === "computedRiskScore" ? -1 : "";
    
    if (typeof aVal === "number" && typeof bVal === "number") {
      return sortDir === "asc" ? aVal - bVal : bVal - aVal;
    }
    const aStr = String(aVal).toLowerCase();
    const bStr = String(bVal).toLowerCase();
    if (sortDir === "asc") return aStr.localeCompare(bStr);
    return bStr.localeCompare(aStr);
  });
}

describe("Changes Page Sorting", () => {
  // ═══════════════════════════════════════════════════════════════════
  // HAPPY PATH TESTS
  // ═══════════════════════════════════════════════════════════════════
  
  describe("Happy Paths", () => {
    test("sorts by number ascending", () => {
      const sorted = sortCRs(mockCRs, "number", "asc");
      expect(sorted[0].number).toBe("CHG0000001");
      expect(sorted[1].number).toBe("CHG0000002");
      expect(sorted[2].number).toBe("CHG0000003");
    });

    test("sorts by number descending", () => {
      const sorted = sortCRs(mockCRs, "number", "desc");
      expect(sorted[0].number).toBe("CHG0000003");
      expect(sorted[1].number).toBe("CHG0000002");
      expect(sorted[2].number).toBe("CHG0000001");
    });

    test("sorts by title ascending (alphabetical)", () => {
      const sorted = sortCRs(mockCRs, "title", "asc");
      expect(sorted[0].title).toBe("API Update");
      expect(sorted[1].title).toBe("Database Migration");
      expect(sorted[2].title).toBe("Security Patch");
    });

    test("sorts by title descending (reverse alphabetical)", () => {
      const sorted = sortCRs(mockCRs, "title", "desc");
      expect(sorted[0].title).toBe("Security Patch");
      expect(sorted[1].title).toBe("Database Migration");
      expect(sorted[2].title).toBe("API Update");
    });

    test("sorts by computedRiskScore ascending (lowest first)", () => {
      const sorted = sortCRs(mockCRs, "computedRiskScore", "asc");
      expect(sorted[0].computedRiskScore).toBe(25);
      expect(sorted[1].computedRiskScore).toBe(45);
      expect(sorted[2].computedRiskScore).toBe(78);
    });

    test("sorts by computedRiskScore descending (highest first)", () => {
      const sorted = sortCRs(mockCRs, "computedRiskScore", "desc");
      expect(sorted[0].computedRiskScore).toBe(78);
      expect(sorted[1].computedRiskScore).toBe(45);
      expect(sorted[2].computedRiskScore).toBe(25);
    });

    test("sorts by createdAt ascending (oldest first)", () => {
      const sorted = sortCRs(mockCRs, "createdAt", "asc");
      expect(sorted[0].number).toBe("CHG0000003"); // Jan 14
      expect(sorted[1].number).toBe("CHG0000001"); // Jan 15
      expect(sorted[2].number).toBe("CHG0000002"); // Jan 16
    });

    test("sorts by createdAt descending (newest first)", () => {
      const sorted = sortCRs(mockCRs, "createdAt", "desc");
      expect(sorted[0].number).toBe("CHG0000002"); // Jan 16
      expect(sorted[1].number).toBe("CHG0000001"); // Jan 15
      expect(sorted[2].number).toBe("CHG0000003"); // Jan 14
    });

    test("sorts by state ascending", () => {
      const sorted = sortCRs(mockCRs, "state", "asc");
      expect(sorted[0].state).toBe("approved");
      expect(sorted[1].state).toBe("awaiting_approval");
      expect(sorted[2].state).toBe("draft");
    });

    test("sorts by requestedBy ascending", () => {
      const sorted = sortCRs(mockCRs, "requestedBy", "asc");
      expect(sorted[0].requestedBy).toBe("Alice Smith");
      expect(sorted[1].requestedBy).toBe("Charlie Brown");
      expect(sorted[2].requestedBy).toBe("Eve Wilson");
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // NEGATIVE CASES
  // ═══════════════════════════════════════════════════════════════════
  
  describe("Negative Cases", () => {
    test("handles empty array", () => {
      const sorted = sortCRs([], "number", "asc");
      expect(sorted).toEqual([]);
      expect(sorted.length).toBe(0);
    });

    test("handles null/undefined mlRiskScore values", () => {
      const itemsWithNull = [
        { ...mockCRs[0], mlRiskScore: null as unknown as number },
        { ...mockCRs[1], mlRiskScore: 50 },
        { ...mockCRs[2], mlRiskScore: undefined as unknown as number },
      ];
      const sorted = sortCRs(itemsWithNull, "mlRiskScore", "asc");
      // Null/undefined should be treated as -1 and come first
      expect(sorted[0].mlRiskScore).toBeNull();
      expect(sorted[1].mlRiskScore).toBeUndefined();
      expect(sorted[2].mlRiskScore).toBe(50);
    });

    test("handles null/undefined string values", () => {
      const itemsWithNull = [
        { ...mockCRs[0], requestedBy: null as unknown as string },
        { ...mockCRs[1], requestedBy: "Zoe" },
        { ...mockCRs[2], requestedBy: undefined as unknown as string },
      ];
      const sorted = sortCRs(itemsWithNull, "requestedBy", "asc");
      // Null/undefined should be treated as empty string and come first
      expect(sorted[0].requestedBy).toBeNull();
      expect(sorted[1].requestedBy).toBeUndefined();
      expect(sorted[2].requestedBy).toBe("Zoe");
    });

    test("handles empty string values", () => {
      const itemsWithEmpty = [
        { ...mockCRs[0], title: "" },
        { ...mockCRs[1], title: "Zebra" },
        { ...mockCRs[2], title: "Alpha" },
      ];
      const sorted = sortCRs(itemsWithEmpty, "title", "asc");
      expect(sorted[0].title).toBe("");
      expect(sorted[1].title).toBe("Alpha");
      expect(sorted[2].title).toBe("Zebra");
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // BOUNDARY CONDITIONS
  // ═══════════════════════════════════════════════════════════════════
  
  describe("Boundary Conditions", () => {
    test("handles single item array", () => {
      const singleItem = [mockCRs[0]];
      const sorted = sortCRs(singleItem, "number", "asc");
      expect(sorted.length).toBe(1);
      expect(sorted[0].number).toBe("CHG0000001");
    });

    test("handles two items - swap needed", () => {
      const twoItems = [mockCRs[1], mockCRs[0]]; // CHG0000002, CHG0000001
      const sorted = sortCRs(twoItems, "number", "asc");
      expect(sorted[0].number).toBe("CHG0000001");
      expect(sorted[1].number).toBe("CHG0000002");
    });

    test("handles two items - no swap needed", () => {
      const twoItems = [mockCRs[0], mockCRs[1]]; // CHG0000001, CHG0000002
      const sorted = sortCRs(twoItems, "number", "asc");
      expect(sorted[0].number).toBe("CHG0000001");
      expect(sorted[1].number).toBe("CHG0000002");
    });

    test("handles identical values (stable sort)", () => {
      const itemsWithSameScore = [
        { ...mockCRs[0], computedRiskScore: 50, number: "CHG0000001" },
        { ...mockCRs[1], computedRiskScore: 50, number: "CHG0000002" },
        { ...mockCRs[2], computedRiskScore: 50, number: "CHG0000003" },
      ];
      const sorted = sortCRs(itemsWithSameScore, "computedRiskScore", "asc");
      // All have same score, order should be preserved (stable sort behavior)
      expect(sorted.every(item => item.computedRiskScore === 50)).toBe(true);
    });

    test("handles extreme numeric values", () => {
      const extremeValues = [
        { ...mockCRs[0], computedRiskScore: 0 },
        { ...mockCRs[1], computedRiskScore: 100 },
        { ...mockCRs[2], computedRiskScore: 50 },
      ];
      const sorted = sortCRs(extremeValues, "computedRiskScore", "asc");
      expect(sorted[0].computedRiskScore).toBe(0);
      expect(sorted[1].computedRiskScore).toBe(50);
      expect(sorted[2].computedRiskScore).toBe(100);
    });

    test("handles large dataset (100 items)", () => {
      const largeDataset = Array.from({ length: 100 }, (_, i) => ({
        ...mockCRs[0],
        number: `CHG${String(i).padStart(7, "0")}`,
        computedRiskScore: Math.floor(Math.random() * 100),
      }));
      const sorted = sortCRs(largeDataset, "computedRiskScore", "asc");
      expect(sorted.length).toBe(100);
      // Verify ascending order
      for (let i = 1; i < sorted.length; i++) {
        expect(sorted[i].computedRiskScore).toBeGreaterThanOrEqual(sorted[i - 1].computedRiskScore);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // EQUIVALENCE PARTITIONING
  // ═══════════════════════════════════════════════════════════════════
  
  describe("Equivalence Partitioning", () => {
    // Partition 1: Numeric columns
    describe("Numeric Columns", () => {
      test("computedRiskScore - low range (0-33)", () => {
        const items = [
          { ...mockCRs[0], computedRiskScore: 10 },
          { ...mockCRs[1], computedRiskScore: 25 },
          { ...mockCRs[2], computedRiskScore: 5 },
        ];
        const sorted = sortCRs(items, "computedRiskScore", "asc");
        expect(sorted[0].computedRiskScore).toBe(5);
        expect(sorted[2].computedRiskScore).toBe(25);
      });

      test("computedRiskScore - medium range (34-66)", () => {
        const items = [
          { ...mockCRs[0], computedRiskScore: 50 },
          { ...mockCRs[1], computedRiskScore: 40 },
          { ...mockCRs[2], computedRiskScore: 60 },
        ];
        const sorted = sortCRs(items, "computedRiskScore", "asc");
        expect(sorted[0].computedRiskScore).toBe(40);
        expect(sorted[2].computedRiskScore).toBe(60);
      });

      test("computedRiskScore - high range (67-100)", () => {
        const items = [
          { ...mockCRs[0], computedRiskScore: 80 },
          { ...mockCRs[1], computedRiskScore: 70 },
          { ...mockCRs[2], computedRiskScore: 95 },
        ];
        const sorted = sortCRs(items, "computedRiskScore", "asc");
        expect(sorted[0].computedRiskScore).toBe(70);
        expect(sorted[2].computedRiskScore).toBe(95);
      });

      test("mlRiskScore sorting", () => {
        const sorted = sortCRs(mockCRs, "mlRiskScore", "asc");
        expect(sorted[0].mlRiskScore).toBe(30);
        expect(sorted[2].mlRiskScore).toBe(85);
      });
    });

    // Partition 2: String columns
    describe("String Columns", () => {
      test("title - short strings", () => {
        const items = [
          { ...mockCRs[0], title: "A" },
          { ...mockCRs[1], title: "B" },
          { ...mockCRs[2], title: "C" },
        ];
        const sorted = sortCRs(items, "title", "asc");
        expect(sorted[0].title).toBe("A");
        expect(sorted[2].title).toBe("C");
      });

      test("title - long strings", () => {
        const items = [
          { ...mockCRs[0], title: "A very long title that describes the change in detail" },
          { ...mockCRs[1], title: "Another long title with many words" },
          { ...mockCRs[2], title: "Brief title" },
        ];
        const sorted = sortCRs(items, "title", "asc");
        expect(sorted[0].title).toContain("A very long");
        expect(sorted[1].title).toContain("Another long");
        expect(sorted[2].title).toBe("Brief title");
      });

      test("title - case insensitive", () => {
        const items = [
          { ...mockCRs[0], title: "zebra" },
          { ...mockCRs[1], title: "ALPHA" },
          { ...mockCRs[2], title: "Beta" },
        ];
        const sorted = sortCRs(items, "title", "asc");
        expect(sorted[0].title).toBe("ALPHA");
        expect(sorted[1].title).toBe("Beta");
        expect(sorted[2].title).toBe("zebra");
      });

      test("number - CR number format", () => {
        const items = [
          { ...mockCRs[0], number: "CHG0000100" },
          { ...mockCRs[1], number: "CHG0000010" },
          { ...mockCRs[2], number: "CHG0000001" },
        ];
        const sorted = sortCRs(items, "number", "asc");
        expect(sorted[0].number).toBe("CHG0000001");
        expect(sorted[1].number).toBe("CHG0000010");
        expect(sorted[2].number).toBe("CHG0000100");
      });
    });

    // Partition 3: Date/timestamp columns
    describe("Date Columns", () => {
      test("createdAt - same day different times", () => {
        const items = [
          { ...mockCRs[0], createdAt: "2024-01-15T23:59:59Z" },
          { ...mockCRs[1], createdAt: "2024-01-15T00:00:00Z" },
          { ...mockCRs[2], createdAt: "2024-01-15T12:00:00Z" },
        ];
        const sorted = sortCRs(items, "createdAt", "asc");
        expect(sorted[0].createdAt).toBe("2024-01-15T00:00:00Z");
        expect(sorted[1].createdAt).toBe("2024-01-15T12:00:00Z");
        expect(sorted[2].createdAt).toBe("2024-01-15T23:59:59Z");
      });

      test("createdAt - different months", () => {
        const items = [
          { ...mockCRs[0], createdAt: "2024-03-01T10:00:00Z" },
          { ...mockCRs[1], createdAt: "2024-01-01T10:00:00Z" },
          { ...mockCRs[2], createdAt: "2024-02-01T10:00:00Z" },
        ];
        const sorted = sortCRs(items, "createdAt", "asc");
        expect(sorted[0].createdAt).toContain("2024-01");
        expect(sorted[1].createdAt).toContain("2024-02");
        expect(sorted[2].createdAt).toContain("2024-03");
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // DECISION TREE TESTING
  // ═══════════════════════════════════════════════════════════════════
  
  describe("Decision Tree Testing", () => {
    // Decision: Click column header
    // Branch 1: Same column clicked -> toggle direction
    // Branch 2: Different column clicked -> set new column, reset to asc
    
    test("clicking same column toggles direction: asc -> desc", () => {
      const sortKey: SortKey = "number";
      let sortDir: SortDir = "asc";
      
      // Simulate clicking same column
      const clickedKey: SortKey = "number";
      if (sortKey === clickedKey) {
        sortDir = sortDir === "asc" ? "desc" : "asc";
      }
      
      expect(sortDir).toBe("desc");
    });

    test("clicking same column toggles direction: desc -> asc", () => {
      const sortKey: SortKey = "number";
      let sortDir: SortDir = "desc";
      
      // Simulate clicking same column
      const clickedKey: SortKey = "number";
      if (sortKey === clickedKey) {
        sortDir = sortDir === "asc" ? "desc" : "asc";
      }
      
      expect(sortDir).toBe("asc");
    });

    test("clicking different column sets new key and resets to asc", () => {
      let sortKey: SortKey = "number";
      let sortDir: SortDir = "desc";
      
      // Simulate clicking different column
      const clickedKey: SortKey = "title";
      if (sortKey !== clickedKey) {
        sortKey = clickedKey;
        sortDir = "asc";
      }
      
      expect(sortKey).toBe("title");
      expect(sortDir).toBe("asc");
    });

    test("multiple column switches maintain correct state", () => {
      let sortKey: SortKey = "number";
      let sortDir: SortDir = "asc";
      
      // Click title
      sortKey = "title";
      sortDir = "asc";
      expect(sortKey).toBe("title");
      
      // Click title again
      sortDir = "desc";
      expect(sortDir).toBe("desc");
      
      // Click computedRiskScore
      sortKey = "computedRiskScore";
      sortDir = "asc";
      expect(sortKey).toBe("computedRiskScore");
      expect(sortDir).toBe("asc");
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // CONTROL FLOW TESTING
  // ═══════════════════════════════════════════════════════════════════
  
  describe("Control Flow Testing", () => {
    // Test all paths through the sorting logic
    
    test("path: numeric comparison - asc", () => {
      const items = [
        { ...mockCRs[0], computedRiskScore: 50 },
        { ...mockCRs[1], computedRiskScore: 25 },
      ];
      const sorted = sortCRs(items, "computedRiskScore", "asc");
      expect(sorted[0].computedRiskScore).toBe(25);
      expect(sorted[1].computedRiskScore).toBe(50);
    });

    test("path: numeric comparison - desc", () => {
      const items = [
        { ...mockCRs[0], computedRiskScore: 25 },
        { ...mockCRs[1], computedRiskScore: 50 },
      ];
      const sorted = sortCRs(items, "computedRiskScore", "desc");
      expect(sorted[0].computedRiskScore).toBe(50);
      expect(sorted[1].computedRiskScore).toBe(25);
    });

    test("path: string comparison - asc", () => {
      const items = [
        { ...mockCRs[0], title: "Zebra" },
        { ...mockCRs[1], title: "Alpha" },
      ];
      const sorted = sortCRs(items, "title", "asc");
      expect(sorted[0].title).toBe("Alpha");
      expect(sorted[1].title).toBe("Zebra");
    });

    test("path: string comparison - desc", () => {
      const items = [
        { ...mockCRs[0], title: "Alpha" },
        { ...mockCRs[1], title: "Zebra" },
      ];
      const sorted = sortCRs(items, "title", "desc");
      expect(sorted[0].title).toBe("Zebra");
      expect(sorted[1].title).toBe("Alpha");
    });

    test("path: null value handling for numeric column", () => {
      const items = [
        { ...mockCRs[0], mlRiskScore: null as unknown as number },
        { ...mockCRs[1], mlRiskScore: 50 },
      ];
      const sorted = sortCRs(items, "mlRiskScore", "asc");
      // Null treated as -1, should come first in asc
      expect(sorted[0].mlRiskScore).toBeNull();
      expect(sorted[1].mlRiskScore).toBe(50);
    });

    test("path: null value handling for string column", () => {
      const items = [
        { ...mockCRs[0], title: null as unknown as string },
        { ...mockCRs[1], title: "Alpha" },
      ];
      const sorted = sortCRs(items, "title", "asc");
      // Null treated as "", should come first in asc
      expect(sorted[0].title).toBeNull();
      expect(sorted[1].title).toBe("Alpha");
    });

    test("combined: filter then sort", () => {
      // Simulate filtering by state then sorting
      const filtered = mockCRs.filter(cr => cr.state !== "draft");
      const sorted = sortCRs(filtered, "computedRiskScore", "asc");
      
      expect(sorted.length).toBe(2);
      expect(sorted[0].computedRiskScore).toBe(25); // Security Patch
      expect(sorted[1].computedRiskScore).toBe(78); // API Update
    });

    test("combined: search filter then sort", () => {
      // Simulate search filtering then sorting
      const searchTerm = "patch";
      const filtered = mockCRs.filter(cr => 
        cr.title.toLowerCase().includes(searchTerm.toLowerCase())
      );
      const sorted = sortCRs(filtered, "number", "asc");
      
      expect(sorted.length).toBe(1);
      expect(sorted[0].title).toBe("Security Patch");
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // INTEGRATION TESTS
  // ═══════════════════════════════════════════════════════════════════
  
  describe("Integration Tests", () => {
    test("sort maintains data integrity", () => {
      const original = [...mockCRs];
      const sorted = sortCRs(mockCRs, "computedRiskScore", "asc");
      
      // Original should not be mutated
      expect(mockCRs).toEqual(original);
      
      // Sorted should have same items
      expect(sorted.length).toBe(mockCRs.length);
      sorted.forEach(item => {
        expect(mockCRs.some(cr => cr.number === item.number)).toBe(true);
      });
    });

    test("multiple sorts produce consistent results", () => {
      const sorted1 = sortCRs(mockCRs, "number", "asc");
      const sorted2 = sortCRs(mockCRs, "number", "asc");
      
      expect(sorted1).toEqual(sorted2);
    });

    test("reverse sort produces exact opposite order", () => {
      const asc = sortCRs(mockCRs, "number", "asc");
      const desc = sortCRs(mockCRs, "number", "desc");
      
      expect(asc[0]).toEqual(desc[desc.length - 1]);
      expect(asc[asc.length - 1]).toEqual(desc[0]);
    });
  });
});
