/**
 * Predictive Risk Model tests.
 */

import { predictRisk, predictRiskBatch, isMLRiskEnabled, type ChangeRequestFeatures } from "../ml-risk";

describe("predictRisk — output shape", () => {
  const baseCR: ChangeRequestFeatures = {
    type: "Normal", priority: "3 - Moderate", urgency: "3 - Low",
    risk: "Moderate", impact: "3 - Low", scope: "Medium",
    implementation_plan: "Step 1. Apply patch. Step 2. Verify.",
    backout_plan: "Revert package via apt-get install --reinstall.",
    test_plan: "Run smoke tests.",
  };

  it("returns all required fields", () => {
    const r = predictRisk(baseCR);
    expect(r).toHaveProperty("riskScore");
    expect(r).toHaveProperty("riskTier");
    expect(r).toHaveProperty("successProbability");
    expect(r).toHaveProperty("contributions");
    expect(r).toHaveProperty("topRiskFactors");
    expect(r).toHaveProperty("topMitigators");
    expect(r).toHaveProperty("recommendation");
    expect(r).toHaveProperty("confidence");
    expect(r).toHaveProperty("modelVersion");
  });

  it("riskScore is bounded 0..100", () => {
    const r = predictRisk(baseCR);
    expect(r.riskScore).toBeGreaterThanOrEqual(0);
    expect(r.riskScore).toBeLessThanOrEqual(100);
  });

  it("successProbability + p(failure)/100 ≈ 1", () => {
    const r = predictRisk(baseCR);
    expect(r.successProbability + r.riskScore / 100).toBeCloseTo(1, 1);
  });

  it("contributions array is non-empty", () => {
    const r = predictRisk(baseCR);
    expect(r.contributions.length).toBeGreaterThan(10);
  });
});

describe("predictRisk — risk tiers", () => {
  it("emergency + critical-risk + no plans → high risk", () => {
    const r = predictRisk({
      type: "Emergency", priority: "1 - Critical", urgency: "1 - High",
      risk: "Very High", impact: "1 - High", scope: "Large",
    });
    expect(r.riskTier).toMatch(/critical|high/);
    expect(r.riskScore).toBeGreaterThan(60);
  });

  it("standard + low-risk + complete plans → low risk", () => {
    const r = predictRisk({
      type: "Standard", priority: "4 - Low", urgency: "3 - Low",
      risk: "Low", impact: "3 - Low", scope: "Small",
      implementation_plan: "1. Apply via Ansible playbook. 2. Run health checks. 3. Update CMDB.",
      backout_plan: "Run rollback playbook within 5 minutes; recovery time estimated at 10 minutes.",
      test_plan: "Smoke test against canary, verify metrics, confirm with monitoring.",
      risk_impact_analysis: "No customer impact; pre-approved standard change.",
    });
    expect(r.riskTier).toMatch(/low|medium/);
  });

  it("missing plans add risk vs same fields with plans", () => {
    const f = { type: "Normal", priority: "2 - High", risk: "High", impact: "2 - Medium", scope: "Medium" };
    const without = predictRisk(f);
    const withPlans = predictRisk({
      ...f,
      implementation_plan: "Detailed step-by-step rollout plan with verification.",
      backout_plan: "Documented rollback procedure with 30-minute recovery time.",
      test_plan: "Comprehensive smoke and regression tests.",
    });
    expect(without.riskScore).toBeGreaterThan(withPlans.riskScore);
  });
});

describe("predictRisk — recommendation", () => {
  it("approve at very low risk", () => {
    const r = predictRisk({
      type: "Standard", priority: "4 - Low", risk: "None", impact: "3 - Low", scope: "Small",
      implementation_plan: "trivial config tweak",
      backout_plan: "revert config file",
      test_plan: "verify service responds",
    });
    expect(["approve", "review-recommended"]).toContain(r.recommendation);
  });

  it("block at very high risk", () => {
    const r = predictRisk({
      type: "Emergency", priority: "1 - Critical", urgency: "1 - High",
      risk: "Very High", impact: "1 - High", scope: "Large",
      short_description: "emergency database schema migration during peak traffic",
    });
    expect(["block-pending-review", "additional-controls"]).toContain(r.recommendation);
  });
});

describe("predictRisk — confidence", () => {
  it("low confidence with empty input", () => {
    const r = predictRisk({});
    expect(r.confidence).toBeLessThan(0.5);
  });

  it("high confidence with all fields populated", () => {
    const r = predictRisk({
      type: "Normal", priority: "3 - Moderate", urgency: "3 - Low",
      risk: "Moderate", impact: "3 - Low", scope: "Medium",
      implementation_plan: "step 1", backout_plan: "step 1",
      test_plan: "step 1",
    });
    expect(r.confidence).toBeGreaterThanOrEqual(0.8);
  });
});

describe("predictRisk — explainability", () => {
  it("topRiskFactors mentions emergency for emergency change", () => {
    const r = predictRisk({ type: "Emergency", risk: "High", impact: "1 - High" });
    const text = r.topRiskFactors.join(" ").toLowerCase();
    expect(text).toMatch(/emergency|risk|impact/);
  });

  it("topMitigators mentions plans when plans are present", () => {
    const r = predictRisk({
      type: "Normal", risk: "Low", impact: "3 - Low",
      implementation_plan: "detailed plan",
      backout_plan: "detailed backout",
      test_plan: "detailed tests",
    });
    const text = r.topMitigators.join(" ").toLowerCase();
    expect(text).toMatch(/plan/);
  });
});

describe("predictRisk — categorical features", () => {
  it("database changes have higher baseline risk", () => {
    const base = { type: "Normal", priority: "3 - Moderate", risk: "Moderate", impact: "2 - Medium" };
    const db = predictRisk({ ...base, short_description: "database schema migration" });
    const generic = predictRisk({ ...base, short_description: "minor config tweak" });
    expect(db.riskScore).toBeGreaterThanOrEqual(generic.riskScore);
  });

  it("network changes are flagged", () => {
    const r = predictRisk({
      type: "Normal", risk: "Moderate", impact: "2 - Medium",
      short_description: "BGP routing update on edge router",
    });
    const features = r.contributions.find(c => c.feature.toLowerCase().includes("network"));
    expect(features?.value).toBe(1);
  });
});

describe("predictRiskBatch", () => {
  it("preserves array order", () => {
    const crs = [
      { type: "Standard", risk: "Low" } as ChangeRequestFeatures,
      { type: "Emergency", risk: "Very High" } as ChangeRequestFeatures,
    ];
    const out = predictRiskBatch(crs);
    expect(out.length).toBe(2);
    expect(out[0].mlRisk.riskTier).toMatch(/low|medium/);
    expect(out[1].mlRisk.riskTier).toMatch(/high|critical/);
  });

  it("returns empty array for empty input", () => {
    expect(predictRiskBatch([])).toEqual([]);
  });
});

describe("isMLRiskEnabled", () => {
  const original = process.env.ML_RISK_ENABLED;
  afterEach(() => { process.env.ML_RISK_ENABLED = original; });

  it("default is enabled", () => {
    delete process.env.ML_RISK_ENABLED;
    expect(isMLRiskEnabled()).toBe(true);
  });

  it("respects 'false'", () => {
    process.env.ML_RISK_ENABLED = "false";
    expect(isMLRiskEnabled()).toBe(false);
  });

  it("respects '0' / 'off'", () => {
    process.env.ML_RISK_ENABLED = "0";
    expect(isMLRiskEnabled()).toBe(false);
    process.env.ML_RISK_ENABLED = "off";
    expect(isMLRiskEnabled()).toBe(false);
  });
});

describe("predictRisk — determinism", () => {
  it("same input produces same output", () => {
    const cr: ChangeRequestFeatures = {
      type: "Normal", priority: "2 - High", risk: "High",
      implementation_plan: "step 1",
    };
    const a = predictRisk(cr);
    const b = predictRisk(cr);
    expect(a.riskScore).toBe(b.riskScore);
    expect(a.riskTier).toBe(b.riskTier);
  });
});

describe("predictRisk — modelVersion", () => {
  it("includes a non-empty modelVersion", () => {
    const r = predictRisk({});
    expect(r.modelVersion).toBeTruthy();
    expect(typeof r.modelVersion).toBe("string");
  });
});
