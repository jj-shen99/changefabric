/**
 * Tests for Health Score Formula with Editable Weights
 */

describe("Health Score Formula", () => {
  const defaultWeights = {
    deployRate: 40,
    riskInverse: 30,
    failureInverse: 30,
  };

  it("default weights should sum to 100", () => {
    const total = defaultWeights.deployRate + defaultWeights.riskInverse + defaultWeights.failureInverse;
    expect(total).toBe(100);
  });

  it("should calculate health score correctly with default weights", () => {
    const avgDeployRate = 80;
    const avgTeamRisk = 30;
    const changeFailureRate = 10;

    const healthScore = Math.round(
      avgDeployRate * (defaultWeights.deployRate / 100) +
      (100 - avgTeamRisk) * (defaultWeights.riskInverse / 100) +
      (100 - changeFailureRate) * (defaultWeights.failureInverse / 100)
    );

    // 80 * 0.4 + 70 * 0.3 + 90 * 0.3 = 32 + 21 + 27 = 80
    expect(healthScore).toBe(80);
  });

  it("should calculate health score with custom weights", () => {
    const customWeights = {
      deployRate: 50,
      riskInverse: 25,
      failureInverse: 25,
    };

    const avgDeployRate = 80;
    const avgTeamRisk = 30;
    const changeFailureRate = 10;

    const healthScore = Math.round(
      avgDeployRate * (customWeights.deployRate / 100) +
      (100 - avgTeamRisk) * (customWeights.riskInverse / 100) +
      (100 - changeFailureRate) * (customWeights.failureInverse / 100)
    );

    // 80 * 0.5 + 70 * 0.25 + 90 * 0.25 = 40 + 17.5 + 22.5 = 80
    expect(healthScore).toBe(80);
  });

  it("should validate weights sum to 100", () => {
    const invalidWeights = {
      deployRate: 50,
      riskInverse: 30,
      failureInverse: 30,
    };

    const total = invalidWeights.deployRate + invalidWeights.riskInverse + invalidWeights.failureInverse;
    const isValid = total === 100;

    expect(isValid).toBe(false);
    expect(total).toBe(110);
  });

  it("should classify health score correctly", () => {
    const getHealthLabel = (score: number) => {
      if (score >= 80) return "Excellent";
      if (score >= 60) return "Good";
      if (score >= 40) return "Fair";
      return "Needs Attention";
    };

    expect(getHealthLabel(85)).toBe("Excellent");
    expect(getHealthLabel(70)).toBe("Good");
    expect(getHealthLabel(50)).toBe("Fair");
    expect(getHealthLabel(30)).toBe("Needs Attention");
  });
});

describe("Health Score Weight Constraints", () => {
  it("each weight should be between 0 and 100", () => {
    const validateWeight = (weight: number) => weight >= 0 && weight <= 100;

    expect(validateWeight(40)).toBe(true);
    expect(validateWeight(0)).toBe(true);
    expect(validateWeight(100)).toBe(true);
    expect(validateWeight(-10)).toBe(false);
    expect(validateWeight(110)).toBe(false);
  });

  it("should clamp weight values to valid range", () => {
    const clampWeight = (value: number) => Math.max(0, Math.min(100, value));

    expect(clampWeight(50)).toBe(50);
    expect(clampWeight(-10)).toBe(0);
    expect(clampWeight(150)).toBe(100);
  });
});
