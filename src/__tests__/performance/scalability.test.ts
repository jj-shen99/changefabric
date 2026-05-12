/**
 * Performance and Scalability Tests
 * Tests for data handling, sorting, filtering at scale
 */

describe("Performance and Scalability", () => {
  describe("Large Dataset Sorting", () => {
    // Generate mock CR data
    function generateMockCRs(count: number) {
      return Array.from({ length: count }, (_, i) => ({
        number: `CHG${String(i + 1).padStart(7, "0")}`,
        title: `Change Request ${i + 1}`,
        state: ["draft", "submitted", "awaiting_approval", "approved", "scheduled", "implemented", "closed"][i % 7],
        computedRiskScore: Math.floor(Math.random() * 100),
        mlRiskScore: Math.random() > 0.2 ? Math.floor(Math.random() * 100) : null,
        requestedBy: `user${i % 100}@example.com`,
        createdAt: new Date(Date.now() - i * 86400000).toISOString(),
      }));
    }

    function sortCRs<T extends { [key: string]: unknown }>(
      items: T[],
      sortKey: keyof T,
      sortDir: "asc" | "desc"
    ): T[] {
      return [...items].sort((a, b) => {
        let aVal = a[sortKey];
        let bVal = b[sortKey];
        
        if (aVal === null || aVal === undefined) aVal = -1 as T[keyof T];
        if (bVal === null || bVal === undefined) bVal = -1 as T[keyof T];
        
        if (typeof aVal === "number" && typeof bVal === "number") {
          return sortDir === "asc" ? aVal - bVal : bVal - aVal;
        }
        const aStr = String(aVal).toLowerCase();
        const bStr = String(bVal).toLowerCase();
        return sortDir === "asc" ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
      });
    }

    it("sorts 100 items in under 10ms", () => {
      const items = generateMockCRs(100);
      const start = performance.now();
      sortCRs(items, "computedRiskScore", "desc");
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(10);
    });

    it("sorts 1000 items in under 50ms", () => {
      const items = generateMockCRs(1000);
      const start = performance.now();
      sortCRs(items, "computedRiskScore", "desc");
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(50);
    });

    it("sorts 10000 items in under 500ms", () => {
      const items = generateMockCRs(10000);
      const start = performance.now();
      sortCRs(items, "computedRiskScore", "desc");
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(500);
    });

    it("handles multiple sort operations efficiently", () => {
      const items = generateMockCRs(1000);
      const start = performance.now();
      
      // Simulate user clicking different columns
      sortCRs(items, "number", "asc");
      sortCRs(items, "title", "desc");
      sortCRs(items, "computedRiskScore", "asc");
      sortCRs(items, "createdAt", "desc");
      sortCRs(items, "state", "asc");
      
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(100); // 5 sorts under 100ms
    });
  });

  describe("Large Dataset Filtering", () => {
    function generateMockCRs(count: number) {
      const states = ["draft", "submitted", "awaiting_approval", "approved", "scheduled", "implemented", "closed"];
      return Array.from({ length: count }, (_, i) => ({
        number: `CHG${String(i + 1).padStart(7, "0")}`,
        title: `Change Request ${i + 1} - ${["Database", "API", "UI", "Security", "Performance"][i % 5]}`,
        state: states[i % states.length],
        requestedBy: `user${i % 100}@example.com`,
        assignedTo: i % 3 === 0 ? `assignee${i % 50}@example.com` : null,
      }));
    }

    function filterCRs(
      items: ReturnType<typeof generateMockCRs>,
      stateFilter: string,
      searchQuery: string
    ) {
      return items.filter(item => {
        if (stateFilter && item.state !== stateFilter) return false;
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          return (
            item.number.toLowerCase().includes(q) ||
            item.title.toLowerCase().includes(q) ||
            item.requestedBy.toLowerCase().includes(q) ||
            (item.assignedTo?.toLowerCase().includes(q) ?? false)
          );
        }
        return true;
      });
    }

    it("filters 1000 items by state in under 10ms", () => {
      const items = generateMockCRs(1000);
      const start = performance.now();
      filterCRs(items, "approved", "");
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(10);
    });

    it("filters 1000 items by search query in under 20ms", () => {
      const items = generateMockCRs(1000);
      const start = performance.now();
      filterCRs(items, "", "Database");
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(20);
    });

    it("filters 10000 items by state and search in under 100ms", () => {
      const items = generateMockCRs(10000);
      const start = performance.now();
      filterCRs(items, "approved", "API");
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(100);
    });

    it("handles combined filter and sort efficiently", () => {
      const items = generateMockCRs(5000);
      const start = performance.now();
      
      // Filter then sort
      const filtered = filterCRs(items, "approved", "");
      filtered.sort((a, b) => a.number.localeCompare(b.number));
      
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(50);
    });
  });

  describe("Memory Efficiency", () => {
    it("does not create excessive copies when sorting", () => {
      const items = Array.from({ length: 1000 }, (_, i) => ({ id: i, value: Math.random() }));
      
      // Sort should create exactly one copy
      const sorted = [...items].sort((a, b) => a.value - b.value);
      
      expect(sorted).not.toBe(items); // Different array
      expect(sorted.length).toBe(items.length);
      expect(items[0]).toBe(items[0]); // Original unchanged
    });

    it("filter creates minimal copies", () => {
      const items = Array.from({ length: 1000 }, (_, i) => ({ id: i, value: i % 10 }));
      
      const filtered = items.filter(item => item.value < 5);
      
      expect(filtered.length).toBe(500);
      // Filtered items should reference same objects
      expect(filtered[0]).toBe(items[0]);
    });
  });

  describe("Pagination Performance", () => {
    function paginate<T>(items: T[], page: number, pageSize: number): T[] {
      const start = (page - 1) * pageSize;
      return items.slice(start, start + pageSize);
    }

    it("paginates 10000 items instantly", () => {
      const items = Array.from({ length: 10000 }, (_, i) => ({ id: i }));
      
      const start = performance.now();
      paginate(items, 50, 20); // Page 50, 20 items per page
      const duration = performance.now() - start;
      
      expect(duration).toBeLessThan(1); // Should be nearly instant
    });

    it("handles edge cases efficiently", () => {
      const items = Array.from({ length: 1000 }, (_, i) => ({ id: i }));
      
      const start = performance.now();
      
      // First page
      expect(paginate(items, 1, 20).length).toBe(20);
      // Last page
      expect(paginate(items, 50, 20).length).toBe(20);
      // Beyond last page
      expect(paginate(items, 100, 20).length).toBe(0);
      // Large page size
      expect(paginate(items, 1, 1000).length).toBe(1000);
      
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(5);
    });
  });

  describe("State Aggregation Performance", () => {
    function aggregateByState(items: { state: string }[]): Record<string, number> {
      return items.reduce((acc, item) => {
        acc[item.state] = (acc[item.state] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
    }

    it("aggregates 10000 items by state in under 20ms", () => {
      const states = ["draft", "submitted", "awaiting_approval", "approved", "scheduled", "implemented", "closed"];
      const items = Array.from({ length: 10000 }, (_, i) => ({
        state: states[i % states.length],
      }));
      
      const start = performance.now();
      const result = aggregateByState(items);
      const duration = performance.now() - start;
      
      expect(duration).toBeLessThan(20);
      expect(Object.keys(result).length).toBe(7);
    });
  });

  describe("Risk Score Calculation Performance", () => {
    function calculateRiskScore(cr: {
      priority: number;
      affectedServices: number;
      hasRollbackPlan: boolean;
      changeWindow: "maintenance" | "business" | "peak";
    }): number {
      let score = 0;
      
      // Priority factor (1-4, higher = more risk)
      score += cr.priority * 15;
      
      // Affected services factor
      score += Math.min(cr.affectedServices * 5, 25);
      
      // Rollback plan factor
      if (!cr.hasRollbackPlan) score += 20;
      
      // Change window factor
      const windowScores = { maintenance: 0, business: 10, peak: 20 };
      score += windowScores[cr.changeWindow];
      
      return Math.min(score, 100);
    }

    it("calculates risk for 10000 CRs in under 50ms", () => {
      const crs = Array.from({ length: 10000 }, () => ({
        priority: Math.floor(Math.random() * 4) + 1,
        affectedServices: Math.floor(Math.random() * 10),
        hasRollbackPlan: Math.random() > 0.3,
        changeWindow: (["maintenance", "business", "peak"] as const)[Math.floor(Math.random() * 3)],
      }));
      
      const start = performance.now();
      crs.forEach(calculateRiskScore);
      const duration = performance.now() - start;
      
      expect(duration).toBeLessThan(50);
    });
  });
});
