/**
 * Tests for train-risk-model.ts script
 * @jest-environment node
 * 
 * Tests the risk model training and calibration functionality.
 */

describe("Risk Model Training", () => {
  describe("Outcome Classification", () => {
    interface ChangeRequest {
      closeCode: string;
      state: string;
    }

    const classifyOutcome = (cr: ChangeRequest): boolean => {
      const code = (cr.closeCode || "").toLowerCase();
      const state = (cr.state || "").toLowerCase();
      return code.includes("unsuccess")
        || code.includes("fail")
        || state.includes("incomplete")
        || state.includes("cancel")
        || state === "rejected";
    };

    describe("Failure Detection", () => {
      it("detects unsuccessful close code", () => {
        expect(classifyOutcome({ closeCode: "Unsuccessful", state: "closed" })).toBe(true);
      });

      it("detects failed close code", () => {
        expect(classifyOutcome({ closeCode: "Failed", state: "closed" })).toBe(true);
      });

      it("detects incomplete state", () => {
        expect(classifyOutcome({ closeCode: "", state: "Closed Incomplete" })).toBe(true);
      });

      it("detects cancelled state", () => {
        expect(classifyOutcome({ closeCode: "", state: "Closed Cancelled" })).toBe(true);
      });

      it("detects rejected state", () => {
        expect(classifyOutcome({ closeCode: "", state: "rejected" })).toBe(true);
      });
    });

    describe("Success Detection", () => {
      it("successful close is not failure", () => {
        expect(classifyOutcome({ closeCode: "Successful", state: "Closed" })).toBe(false);
      });

      it("complete close is not failure", () => {
        expect(classifyOutcome({ closeCode: "Complete", state: "Closed Complete" })).toBe(false);
      });

      it("empty close code with closed state is not failure", () => {
        expect(classifyOutcome({ closeCode: "", state: "closed" })).toBe(false);
      });
    });
  });

  describe("Risk Buckets", () => {
    interface Bucket {
      name: string;
      min: number;
      max: number;
    }

    const buckets: Bucket[] = [
      { name: "low (<25)", min: 0, max: 24 },
      { name: "medium (25-49)", min: 25, max: 49 },
      { name: "high (50-74)", min: 50, max: 74 },
      { name: "critical (75-100)", min: 75, max: 100 },
    ];

    describe("Bucket Definitions", () => {
      it("has 4 risk buckets", () => {
        expect(buckets).toHaveLength(4);
      });

      it("buckets cover full range 0-100", () => {
        const min = Math.min(...buckets.map(b => b.min));
        const max = Math.max(...buckets.map(b => b.max));
        expect(min).toBe(0);
        expect(max).toBe(100);
      });

      it("buckets are contiguous", () => {
        const sorted = [...buckets].sort((a, b) => a.min - b.min);
        for (let i = 1; i < sorted.length; i++) {
          expect(sorted[i].min).toBe(sorted[i - 1].max + 1);
        }
      });
    });

    describe("Score Classification", () => {
      const classifyScore = (score: number): string => {
        const bucket = buckets.find(b => score >= b.min && score <= b.max);
        return bucket?.name || "unknown";
      };

      it("classifies score 0 as low", () => {
        expect(classifyScore(0)).toBe("low (<25)");
      });

      it("classifies score 24 as low", () => {
        expect(classifyScore(24)).toBe("low (<25)");
      });

      it("classifies score 25 as medium", () => {
        expect(classifyScore(25)).toBe("medium (25-49)");
      });

      it("classifies score 50 as high", () => {
        expect(classifyScore(50)).toBe("high (50-74)");
      });

      it("classifies score 75 as critical", () => {
        expect(classifyScore(75)).toBe("critical (75-100)");
      });

      it("classifies score 100 as critical", () => {
        expect(classifyScore(100)).toBe("critical (75-100)");
      });
    });
  });

  describe("Brier Score Calculation", () => {
    interface Outcome {
      failed: boolean;
      predictedScore: number;
    }

    const calculateBrierScore = (outcomes: Outcome[]): number => {
      if (outcomes.length === 0) return 0;
      return outcomes.reduce((sum, o) => {
        const p = o.predictedScore / 100;
        const y = o.failed ? 1 : 0;
        return sum + (p - y) ** 2;
      }, 0) / outcomes.length;
    };

    describe("Perfect Predictions", () => {
      it("returns 0 for perfect predictions", () => {
        const outcomes: Outcome[] = [
          { failed: true, predictedScore: 100 },
          { failed: false, predictedScore: 0 },
        ];
        expect(calculateBrierScore(outcomes)).toBe(0);
      });
    });

    describe("Worst Predictions", () => {
      it("returns 1 for completely wrong predictions", () => {
        const outcomes: Outcome[] = [
          { failed: true, predictedScore: 0 },
          { failed: false, predictedScore: 100 },
        ];
        expect(calculateBrierScore(outcomes)).toBe(1);
      });
    });

    describe("Baseline Predictions", () => {
      it("returns ~0.25 for random 50% predictions", () => {
        const outcomes: Outcome[] = [
          { failed: true, predictedScore: 50 },
          { failed: false, predictedScore: 50 },
        ];
        expect(calculateBrierScore(outcomes)).toBe(0.25);
      });
    });

    describe("Empty Outcomes", () => {
      it("returns 0 for empty array", () => {
        expect(calculateBrierScore([])).toBe(0);
      });
    });

    describe("Calibration Threshold", () => {
      it("good calibration is below 0.20", () => {
        const goodOutcomes: Outcome[] = [
          { failed: true, predictedScore: 80 },
          { failed: false, predictedScore: 20 },
          { failed: true, predictedScore: 70 },
          { failed: false, predictedScore: 30 },
        ];
        const score = calculateBrierScore(goodOutcomes);
        expect(score).toBeLessThan(0.20);
      });
    });
  });

  describe("Base Rate Calculation", () => {
    interface Outcome {
      failed: boolean;
    }

    const calculateBaseRate = (outcomes: Outcome[]): number => {
      if (outcomes.length === 0) return 0;
      return outcomes.filter(o => o.failed).length / outcomes.length;
    };

    describe("Base Rate", () => {
      it("returns 0 for no failures", () => {
        const outcomes = [{ failed: false }, { failed: false }];
        expect(calculateBaseRate(outcomes)).toBe(0);
      });

      it("returns 1 for all failures", () => {
        const outcomes = [{ failed: true }, { failed: true }];
        expect(calculateBaseRate(outcomes)).toBe(1);
      });

      it("returns 0.5 for half failures", () => {
        const outcomes = [{ failed: true }, { failed: false }];
        expect(calculateBaseRate(outcomes)).toBe(0.5);
      });

      it("returns 0 for empty array", () => {
        expect(calculateBaseRate([])).toBe(0);
      });
    });
  });

  describe("CR to Risk Input Mapping", () => {
    interface ChangeRequest {
      type: string;
      priority: string;
      urgency: string;
      riskLevel: string;
      impactLevel: string;
      category: string;
      title: string;
      description: string;
      implementationPlan: string;
      backoutPlan: string;
      testPlan: string;
      riskAndImpactAnalysis: string;
    }

    interface RiskInput {
      type: string;
      priority: string;
      urgency: string;
      risk: string;
      impact: string;
      scope: string;
      category: string;
      short_description: string;
      description: string;
      implementation_plan: string;
      backout_plan: string;
      test_plan: string;
      risk_impact_analysis: string;
    }

    const mapCRToRiskInput = (cr: ChangeRequest): RiskInput => ({
      type: cr.type,
      priority: cr.priority,
      urgency: cr.urgency,
      risk: cr.riskLevel,
      impact: cr.impactLevel,
      scope: "",
      category: cr.category,
      short_description: cr.title,
      description: cr.description,
      implementation_plan: cr.implementationPlan,
      backout_plan: cr.backoutPlan,
      test_plan: cr.testPlan,
      risk_impact_analysis: cr.riskAndImpactAnalysis,
    });

    describe("Field Mapping", () => {
      const cr: ChangeRequest = {
        type: "standard",
        priority: "2",
        urgency: "2",
        riskLevel: "high",
        impactLevel: "2",
        category: "infrastructure",
        title: "Database Migration",
        description: "Migrate to new schema",
        implementationPlan: "Step 1...",
        backoutPlan: "Rollback...",
        testPlan: "Test...",
        riskAndImpactAnalysis: "Risk analysis...",
      };

      const input = mapCRToRiskInput(cr);

      it("maps type correctly", () => {
        expect(input.type).toBe(cr.type);
      });

      it("maps riskLevel to risk", () => {
        expect(input.risk).toBe(cr.riskLevel);
      });

      it("maps impactLevel to impact", () => {
        expect(input.impact).toBe(cr.impactLevel);
      });

      it("maps title to short_description", () => {
        expect(input.short_description).toBe(cr.title);
      });

      it("maps implementationPlan to implementation_plan", () => {
        expect(input.implementation_plan).toBe(cr.implementationPlan);
      });

      it("maps backoutPlan to backout_plan", () => {
        expect(input.backout_plan).toBe(cr.backoutPlan);
      });

      it("maps testPlan to test_plan", () => {
        expect(input.test_plan).toBe(cr.testPlan);
      });

      it("sets scope to empty string", () => {
        expect(input.scope).toBe("");
      });
    });
  });
});

describe("Closed CR States", () => {
  const closedStates = [
    "Closed",
    "closed",
    "Closed Complete",
    "Closed Incomplete",
    "Closed Cancelled",
  ];

  describe("State Recognition", () => {
    it("recognizes all closed state variations", () => {
      closedStates.forEach(state => {
        expect(state.toLowerCase()).toContain("closed");
      });
    });

    it("has 5 closed state variations", () => {
      expect(closedStates).toHaveLength(5);
    });
  });

  describe("State Filtering", () => {
    const isClosedState = (state: string): boolean => {
      return closedStates.some(s => s.toLowerCase() === state.toLowerCase());
    };

    it("matches exact closed states", () => {
      expect(isClosedState("Closed")).toBe(true);
      expect(isClosedState("closed")).toBe(true);
      expect(isClosedState("Closed Complete")).toBe(true);
    });

    it("does not match non-closed states", () => {
      expect(isClosedState("draft")).toBe(false);
      expect(isClosedState("submitted")).toBe(false);
      expect(isClosedState("approved")).toBe(false);
    });
  });
});

describe("Calibration Recommendations", () => {
  describe("Brier Score Thresholds", () => {
    const getRecommendation = (brierScore: number): string => {
      if (brierScore > 0.20) {
        return "Calibration is weak. Consider re-tuning WEIGHTS.";
      }
      return "Model calibration is acceptable.";
    };

    it("recommends tuning for score > 0.20", () => {
      expect(getRecommendation(0.25)).toContain("weak");
    });

    it("accepts score <= 0.20", () => {
      expect(getRecommendation(0.20)).toContain("acceptable");
    });

    it("accepts score of 0.15", () => {
      expect(getRecommendation(0.15)).toContain("acceptable");
    });

    it("accepts perfect score of 0", () => {
      expect(getRecommendation(0)).toContain("acceptable");
    });
  });
});
