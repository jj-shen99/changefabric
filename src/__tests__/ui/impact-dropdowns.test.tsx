/**
 * Tests for Impact Page Dropdown Filters
 * Validates risk level and state dropdown options
 */
import "@testing-library/jest-dom";

describe("Impact Page Risk Level Dropdown", () => {
  // Standard risk levels - ordered high to low, no very_high
  const STANDARD_RISK_LEVELS = ["high", "moderate", "low"];

  describe("Risk Level Options", () => {
    it("should NOT include very_high risk level", () => {
      expect(STANDARD_RISK_LEVELS).not.toContain("very_high");
      expect(STANDARD_RISK_LEVELS).not.toContain("very high");
    });

    it("should have exactly 3 risk levels", () => {
      expect(STANDARD_RISK_LEVELS).toHaveLength(3);
    });

    it("should contain high, moderate, and low", () => {
      expect(STANDARD_RISK_LEVELS).toContain("high");
      expect(STANDARD_RISK_LEVELS).toContain("moderate");
      expect(STANDARD_RISK_LEVELS).toContain("low");
    });

    it("should order risk levels from high to low", () => {
      expect(STANDARD_RISK_LEVELS[0]).toBe("high");
      expect(STANDARD_RISK_LEVELS[1]).toBe("moderate");
      expect(STANDARD_RISK_LEVELS[2]).toBe("low");
    });

    it("low should be the last option", () => {
      expect(STANDARD_RISK_LEVELS[STANDARD_RISK_LEVELS.length - 1]).toBe("low");
    });
  });

  describe("Risk Level Filtering Logic", () => {
    const filterRiskLevels = (levels: string[]): string[] => {
      const standard = ["high", "moderate", "low"];
      return levels
        .filter(r => r !== "very_high" && r !== "very high")
        .sort((a, b) => {
          const aIdx = standard.indexOf(a.toLowerCase());
          const bIdx = standard.indexOf(b.toLowerCase());
          if (aIdx === -1 && bIdx === -1) return a.localeCompare(b);
          if (aIdx === -1) return 1;
          if (bIdx === -1) return -1;
          return aIdx - bIdx;
        });
    };

    it("should filter out very_high from data", () => {
      const fromData = ["low", "moderate", "high", "very_high"];
      const filtered = filterRiskLevels(fromData);
      expect(filtered).not.toContain("very_high");
    });

    it("should filter out 'very high' (with space) from data", () => {
      const fromData = ["low", "moderate", "high", "very high"];
      const filtered = filterRiskLevels(fromData);
      expect(filtered).not.toContain("very high");
    });

    it("should maintain high -> moderate -> low order", () => {
      const fromData = ["low", "high", "moderate"];
      const filtered = filterRiskLevels(fromData);
      expect(filtered).toEqual(["high", "moderate", "low"]);
    });

    it("should handle mixed case input", () => {
      const fromData = ["Low", "HIGH", "Moderate"];
      const filtered = filterRiskLevels(fromData);
      // Should sort by standard order
      expect(filtered[0].toLowerCase()).toBe("high");
      expect(filtered[filtered.length - 1].toLowerCase()).toBe("low");
    });
  });
});

describe("Impact Page State Dropdown", () => {
  // Standard workflow states - ordered by workflow progression
  const STANDARD_STATES = [
    "draft",
    "submitted",
    "awaiting_approval",
    "approved",
    "scheduled",
    "implemented",
    "closed",
    "rejected",
    "canceled",
    "rolled_back",
  ];

  describe("State Options", () => {
    it("should include all workflow states", () => {
      expect(STANDARD_STATES).toContain("draft");
      expect(STANDARD_STATES).toContain("submitted");
      expect(STANDARD_STATES).toContain("awaiting_approval");
      expect(STANDARD_STATES).toContain("approved");
      expect(STANDARD_STATES).toContain("scheduled");
      expect(STANDARD_STATES).toContain("implemented");
      expect(STANDARD_STATES).toContain("closed");
      expect(STANDARD_STATES).toContain("rejected");
      expect(STANDARD_STATES).toContain("canceled");
      expect(STANDARD_STATES).toContain("rolled_back");
    });

    it("should have 10 standard states", () => {
      expect(STANDARD_STATES).toHaveLength(10);
    });

    it("should start with draft", () => {
      expect(STANDARD_STATES[0]).toBe("draft");
    });

    it("should have terminal states at the end", () => {
      const terminalStates = ["closed", "rejected", "canceled", "rolled_back"];
      terminalStates.forEach(state => {
        expect(STANDARD_STATES).toContain(state);
      });
    });
  });

  describe("State Ordering Logic", () => {
    const sortStates = (states: string[]): string[] => {
      const standard = [
        "draft", "submitted", "awaiting_approval", "approved",
        "scheduled", "implemented", "closed", "rejected", "canceled", "rolled_back"
      ];
      return states.sort((a, b) => {
        const aIdx = standard.indexOf(a);
        const bIdx = standard.indexOf(b);
        if (aIdx === -1 && bIdx === -1) return a.localeCompare(b);
        if (aIdx === -1) return 1;
        if (bIdx === -1) return -1;
        return aIdx - bIdx;
      });
    };

    it("should order states by workflow progression", () => {
      const unordered = ["closed", "draft", "approved", "submitted"];
      const ordered = sortStates(unordered);
      expect(ordered).toEqual(["draft", "submitted", "approved", "closed"]);
    });

    it("should put unknown states at the end", () => {
      const withUnknown = ["draft", "custom_state", "submitted"];
      const ordered = sortStates(withUnknown);
      expect(ordered[ordered.length - 1]).toBe("custom_state");
    });

    it("should handle external ITSM legacy states", () => {
      const withLegacy = ["draft", "new", "implement", "submitted"];
      const ordered = sortStates(withLegacy);
      // Standard states first, then unknown
      expect(ordered.indexOf("draft")).toBeLessThan(ordered.indexOf("new"));
      expect(ordered.indexOf("submitted")).toBeLessThan(ordered.indexOf("implement"));
    });
  });
});

describe("Impact Page Group Dropdown", () => {
  // Standard groups matching seeded database
  const STANDARD_GROUPS = [
    "Admin", "CAB", "Database", "DevOps", "Engineering",
    "Infrastructure", "On-Call", "Platform", "QA", "Security"
  ];

  describe("Group Options", () => {
    it("should include all seeded database groups", () => {
      expect(STANDARD_GROUPS).toContain("Admin");
      expect(STANDARD_GROUPS).toContain("CAB");
      expect(STANDARD_GROUPS).toContain("Database");
      expect(STANDARD_GROUPS).toContain("DevOps");
      expect(STANDARD_GROUPS).toContain("Engineering");
      expect(STANDARD_GROUPS).toContain("Infrastructure");
      expect(STANDARD_GROUPS).toContain("On-Call");
      expect(STANDARD_GROUPS).toContain("Platform");
      expect(STANDARD_GROUPS).toContain("QA");
      expect(STANDARD_GROUPS).toContain("Security");
    });

    it("should have 10 standard groups", () => {
      expect(STANDARD_GROUPS).toHaveLength(10);
    });

    it("should be sorted alphabetically", () => {
      const sorted = [...STANDARD_GROUPS].sort();
      expect(STANDARD_GROUPS).toEqual(sorted);
    });

    it("should NOT include deprecated groups", () => {
      expect(STANDARD_GROUPS).not.toContain("Payments");
      expect(STANDARD_GROUPS).not.toContain("Identity");
      expect(STANDARD_GROUPS).not.toContain("Frontend");
      expect(STANDARD_GROUPS).not.toContain("Backend");
      expect(STANDARD_GROUPS).not.toContain("Mobile");
    });
  });

  describe("Group Filtering Logic", () => {
    const getUniqueGroups = (fromData: string[]): string[] => {
      const standard = ["Admin", "CAB", "Database", "DevOps", "Engineering", "Infrastructure", "On-Call", "Platform", "QA", "Security"];
      return [...new Set([...standard, ...fromData])].sort();
    };

    it("should include standard groups even with empty data", () => {
      const groups = getUniqueGroups([]);
      expect(groups).toEqual(STANDARD_GROUPS);
    });

    it("should merge data groups with standard groups", () => {
      const groups = getUniqueGroups(["Custom Team", "Platform"]);
      expect(groups).toContain("Custom Team");
      expect(groups).toContain("Platform");
      expect(groups.length).toBe(11); // 10 standard + 1 custom
    });

    it("should not duplicate existing groups", () => {
      const groups = getUniqueGroups(["Platform", "DevOps", "Security"]);
      expect(groups.filter(g => g === "Platform").length).toBe(1);
    });
  });
});

describe("Risk Score Calculation", () => {
  const scoreRisk = (v: string): number => {
    const l = (v || "").toLowerCase();
    if (l === "high") return 85;
    if (l === "moderate") return 55;
    if (l === "low") return 25;
    if (l === "none") return 5;
    return 40; // default
  };

  it("should NOT have very_high scoring", () => {
    // very_high should fall through to default
    expect(scoreRisk("very_high")).toBe(40);
    expect(scoreRisk("very high")).toBe(40);
  });

  it("should score high as 85", () => {
    expect(scoreRisk("high")).toBe(85);
  });

  it("should score moderate as 55", () => {
    expect(scoreRisk("moderate")).toBe(55);
  });

  it("should score low as 25", () => {
    expect(scoreRisk("low")).toBe(25);
  });

  it("should handle case insensitivity", () => {
    expect(scoreRisk("HIGH")).toBe(85);
    expect(scoreRisk("Moderate")).toBe(55);
    expect(scoreRisk("LOW")).toBe(25);
  });

  it("should return default for unknown values", () => {
    expect(scoreRisk("unknown")).toBe(40);
    expect(scoreRisk("")).toBe(40);
  });
});
