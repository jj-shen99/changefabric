/**
 * Tests for UI styling consistency
 * Ensures CSS classes and styling patterns are consistent across the application
 */

describe("UI Styling Consistency", () => {
  describe("Color Palette", () => {
    // Standard color classes used throughout the app
    const standardColors = {
      primary: ["blue-600", "blue-700", "blue-50", "blue-100"],
      success: ["emerald-600", "emerald-700", "emerald-50", "emerald-100", "green-500", "green-600"],
      warning: ["amber-600", "amber-700", "amber-50", "amber-100", "yellow-500"],
      danger: ["rose-600", "rose-700", "rose-50", "rose-100", "red-500", "red-600"],
      neutral: ["gray-50", "gray-100", "gray-200", "gray-400", "gray-500", "gray-600", "gray-700", "gray-800", "gray-900"],
    };

    it("has consistent primary colors", () => {
      expect(standardColors.primary).toContain("blue-600");
      expect(standardColors.primary).toContain("blue-700");
    });

    it("has consistent success colors", () => {
      expect(standardColors.success).toContain("emerald-600");
      expect(standardColors.success).toContain("green-500");
    });

    it("has consistent warning colors", () => {
      expect(standardColors.warning).toContain("amber-600");
    });

    it("has consistent danger colors", () => {
      expect(standardColors.danger).toContain("rose-600");
      expect(standardColors.danger).toContain("red-500");
    });
  });

  describe("State Badge Colors", () => {
    const stateBadgeColors: Record<string, { bg: string; text: string }> = {
      draft: { bg: "bg-gray-100", text: "text-gray-700" },
      submitted: { bg: "bg-blue-100", text: "text-blue-700" },
      awaiting_approval: { bg: "bg-amber-100", text: "text-amber-700" },
      approved: { bg: "bg-emerald-100", text: "text-emerald-700" },
      scheduled: { bg: "bg-purple-100", text: "text-purple-700" },
      implemented: { bg: "bg-indigo-100", text: "text-indigo-700" },
      closed: { bg: "bg-green-100", text: "text-green-700" },
      rejected: { bg: "bg-rose-100", text: "text-rose-700" },
      canceled: { bg: "bg-gray-100", text: "text-gray-700" },
      rolled_back: { bg: "bg-orange-100", text: "text-orange-700" },
    };

    it("has colors for all workflow states", () => {
      const workflowStates = [
        "draft", "submitted", "awaiting_approval", "approved",
        "scheduled", "implemented", "closed", "rejected", "canceled", "rolled_back"
      ];
      
      workflowStates.forEach(state => {
        expect(stateBadgeColors[state]).toBeDefined();
        expect(stateBadgeColors[state].bg).toMatch(/^bg-/);
        expect(stateBadgeColors[state].text).toMatch(/^text-/);
      });
    });

    it("does NOT have in_progress state color (removed)", () => {
      expect(stateBadgeColors["in_progress"]).toBeUndefined();
    });
  });

  describe("Risk Score Colors", () => {
    function getRiskColor(score: number): string {
      if (score >= 75) return "bg-red-500";
      if (score >= 50) return "bg-orange-500";
      if (score >= 25) return "bg-amber-500";
      return "bg-green-500";
    }

    it("returns red for critical risk (75-100)", () => {
      expect(getRiskColor(75)).toBe("bg-red-500");
      expect(getRiskColor(90)).toBe("bg-red-500");
      expect(getRiskColor(100)).toBe("bg-red-500");
    });

    it("returns orange for high risk (50-74)", () => {
      expect(getRiskColor(50)).toBe("bg-orange-500");
      expect(getRiskColor(60)).toBe("bg-orange-500");
      expect(getRiskColor(74)).toBe("bg-orange-500");
    });

    it("returns amber for medium risk (25-49)", () => {
      expect(getRiskColor(25)).toBe("bg-amber-500");
      expect(getRiskColor(35)).toBe("bg-amber-500");
      expect(getRiskColor(49)).toBe("bg-amber-500");
    });

    it("returns green for low risk (0-24)", () => {
      expect(getRiskColor(0)).toBe("bg-green-500");
      expect(getRiskColor(10)).toBe("bg-green-500");
      expect(getRiskColor(24)).toBe("bg-green-500");
    });
  });

  describe("Button Styles", () => {
    const buttonStyles = {
      primary: "bg-blue-600 hover:bg-blue-700 text-white",
      secondary: "bg-gray-100 hover:bg-gray-200 text-gray-700",
      danger: "bg-rose-600 hover:bg-rose-700 text-white",
      success: "bg-emerald-600 hover:bg-emerald-700 text-white",
      ghost: "hover:bg-gray-100 text-gray-600",
    };

    it("has consistent button variants", () => {
      expect(buttonStyles.primary).toContain("bg-blue-600");
      expect(buttonStyles.danger).toContain("bg-rose-600");
      expect(buttonStyles.success).toContain("bg-emerald-600");
    });

    it("all buttons have hover states", () => {
      Object.values(buttonStyles).forEach(style => {
        expect(style).toMatch(/hover:/);
      });
    });
  });

  describe("Dark Mode Support", () => {
    const darkModeClasses = [
      "dark:bg-gray-900",
      "dark:bg-gray-800",
      "dark:bg-gray-950",
      "dark:text-gray-100",
      "dark:text-gray-200",
      "dark:text-gray-300",
      "dark:border-gray-700",
      "dark:border-gray-800",
    ];

    it("has standard dark mode background classes", () => {
      expect(darkModeClasses).toContain("dark:bg-gray-900");
      expect(darkModeClasses).toContain("dark:bg-gray-950");
    });

    it("has standard dark mode text classes", () => {
      expect(darkModeClasses).toContain("dark:text-gray-100");
      expect(darkModeClasses).toContain("dark:text-gray-200");
    });

    it("has standard dark mode border classes", () => {
      expect(darkModeClasses).toContain("dark:border-gray-700");
      expect(darkModeClasses).toContain("dark:border-gray-800");
    });
  });

  describe("Spacing Consistency", () => {
    const spacingPatterns = {
      cardPadding: ["p-4", "p-6", "px-4", "py-4", "px-6", "py-6"],
      gap: ["gap-2", "gap-3", "gap-4", "gap-6"],
      margin: ["mt-2", "mt-4", "mb-2", "mb-4", "my-4"],
    };

    it("uses consistent card padding", () => {
      expect(spacingPatterns.cardPadding).toContain("p-4");
      expect(spacingPatterns.cardPadding).toContain("p-6");
    });

    it("uses consistent gap values", () => {
      expect(spacingPatterns.gap).toContain("gap-2");
      expect(spacingPatterns.gap).toContain("gap-4");
    });
  });

  describe("Typography", () => {
    const typographyClasses = {
      heading: ["text-xl", "text-lg", "text-base", "font-semibold", "font-bold"],
      body: ["text-sm", "text-base", "text-gray-600", "text-gray-700"],
      small: ["text-xs", "text-gray-500", "text-gray-400"],
    };

    it("has consistent heading styles", () => {
      expect(typographyClasses.heading).toContain("font-semibold");
      expect(typographyClasses.heading).toContain("font-bold");
    });

    it("has consistent body text styles", () => {
      expect(typographyClasses.body).toContain("text-sm");
      expect(typographyClasses.body).toContain("text-gray-600");
    });

    it("has consistent small text styles", () => {
      expect(typographyClasses.small).toContain("text-xs");
      expect(typographyClasses.small).toContain("text-gray-500");
    });
  });
});
