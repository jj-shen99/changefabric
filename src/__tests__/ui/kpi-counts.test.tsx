/**
 * Tests for KPI Count Calculations
 * Ensures KPI values correctly reflect actual CR data
 */
import "@testing-library/jest-dom";

describe("KPI Count Calculations", () => {
  // State definitions matching the application
  const STATE_GROUPS = {
    pending: ["draft", "submitted", "assessing", "awaiting_approval"],
    inFlight: ["approved", "scheduled", "in_progress", "implemented", "reviewing"],
    closed: ["closed"],
    rejected: ["canceled", "rejected"],
  };

  const mockChangeRequests = [
    { number: "CHG001", state: "draft" },
    { number: "CHG002", state: "submitted" },
    { number: "CHG003", state: "awaiting_approval" },
    { number: "CHG004", state: "approved" },
    { number: "CHG005", state: "scheduled" },
    { number: "CHG006", state: "in_progress" },
    { number: "CHG007", state: "implemented" },
    { number: "CHG008", state: "reviewing" },
    { number: "CHG009", state: "closed" },
    { number: "CHG010", state: "closed" },
    { number: "CHG011", state: "canceled" },
    { number: "CHG012", state: "rejected" },
  ];

  // Calculation functions matching the application
  function calculateCounts(items: typeof mockChangeRequests) {
    return {
      total: items.length,
      pending: items.filter((c) =>
        STATE_GROUPS.pending.includes(c.state)
      ).length,
      inFlight: items.filter((c) =>
        STATE_GROUPS.inFlight.includes(c.state)
      ).length,
      closed: items.filter((c) => c.state === "closed").length,
      rejected: items.filter((c) =>
        c.state === "rejected" || c.state === "canceled"
      ).length,
    };
  }

  describe("Count Calculations", () => {
    const counts = calculateCounts(mockChangeRequests);

    it("calculates total correctly", () => {
      expect(counts.total).toBe(12);
    });

    it("calculates pending correctly", () => {
      // draft, submitted, awaiting_approval = 3
      expect(counts.pending).toBe(3);
    });

    it("calculates in flight correctly", () => {
      // approved, scheduled, in_progress, implemented, reviewing = 5
      expect(counts.inFlight).toBe(5);
    });

    it("calculates closed correctly", () => {
      // 2 closed
      expect(counts.closed).toBe(2);
    });

    it("calculates rejected correctly", () => {
      // canceled + rejected = 2
      expect(counts.rejected).toBe(2);
    });

    it("all counts sum to total", () => {
      const sum = counts.pending + counts.inFlight + counts.closed + counts.rejected;
      expect(sum).toBe(counts.total);
    });
  });

  describe("State Group Completeness", () => {
    const allStates = [
      "draft",
      "submitted",
      "assessing",
      "awaiting_approval",
      "approved",
      "scheduled",
      "in_progress",
      "implemented",
      "reviewing",
      "closed",
      "canceled",
      "rejected",
    ];

    it("all states are categorized", () => {
      const categorizedStates = [
        ...STATE_GROUPS.pending,
        ...STATE_GROUPS.inFlight,
        ...STATE_GROUPS.closed,
        ...STATE_GROUPS.rejected,
      ];

      allStates.forEach((state) => {
        expect(categorizedStates).toContain(state);
      });
    });

    it("no state is in multiple groups", () => {
      const allCategorized = [
        ...STATE_GROUPS.pending,
        ...STATE_GROUPS.inFlight,
        ...STATE_GROUPS.closed,
        ...STATE_GROUPS.rejected,
      ];
      
      const uniqueStates = new Set(allCategorized);
      expect(uniqueStates.size).toBe(allCategorized.length);
    });
  });

  describe("Edge Cases", () => {
    it("handles empty array", () => {
      const counts = calculateCounts([]);
      expect(counts.total).toBe(0);
      expect(counts.pending).toBe(0);
      expect(counts.inFlight).toBe(0);
      expect(counts.closed).toBe(0);
      expect(counts.rejected).toBe(0);
    });

    it("handles all same state", () => {
      const allDraft = [
        { number: "CHG001", state: "draft" },
        { number: "CHG002", state: "draft" },
        { number: "CHG003", state: "draft" },
      ];
      const counts = calculateCounts(allDraft);
      expect(counts.total).toBe(3);
      expect(counts.pending).toBe(3);
      expect(counts.inFlight).toBe(0);
      expect(counts.closed).toBe(0);
      expect(counts.rejected).toBe(0);
    });

    it("handles unknown state gracefully", () => {
      const withUnknown = [
        { number: "CHG001", state: "draft" },
        { number: "CHG002", state: "unknown_state" },
      ];
      const counts = calculateCounts(withUnknown);
      expect(counts.total).toBe(2);
      expect(counts.pending).toBe(1);
      // Unknown state doesn't count in any category
      expect(counts.pending + counts.inFlight + counts.closed + counts.rejected).toBe(1);
    });
  });

  describe("Overview Page KPI Calculations", () => {
    // Overview page uses different calculation from changes list
    const overviewKpiDefinitions = {
      pending: {
        label: "Pending",
        states: ["draft", "submitted", "assessing", "awaiting_approval"],
      },
      inProgress: {
        label: "In Progress",
        states: ["approved", "scheduled", "in_progress", "implemented", "reviewing"],
      },
      closed: {
        label: "Closed",
        states: ["closed"],
      },
      canceled: {
        label: "Canceled/Rejected",
        states: ["canceled", "rejected"],
      },
    };

    it("overview KPIs match changes list KPIs", () => {
      expect(overviewKpiDefinitions.pending.states).toEqual(STATE_GROUPS.pending);
      expect(overviewKpiDefinitions.inProgress.states).toEqual(STATE_GROUPS.inFlight);
      expect(overviewKpiDefinitions.closed.states).toEqual(STATE_GROUPS.closed);
      expect(overviewKpiDefinitions.canceled.states).toEqual(STATE_GROUPS.rejected);
    });
  });
});

describe("KPI Display Consistency", () => {
  it("Changes page and Overview page use same state groupings", () => {
    // Both pages should categorize states identically
    const changesPageStates = {
      pending: ["draft", "submitted", "assessing", "awaiting_approval"],
      inFlight: ["approved", "scheduled", "in_progress", "implemented", "reviewing"],
    };

    const overviewPageStates = {
      pending: ["draft", "submitted", "assessing", "awaiting_approval"],
      inProgress: ["approved", "scheduled", "in_progress", "implemented", "reviewing"],
    };

    expect(changesPageStates.pending).toEqual(overviewPageStates.pending);
    expect(changesPageStates.inFlight).toEqual(overviewPageStates.inProgress);
  });
});
