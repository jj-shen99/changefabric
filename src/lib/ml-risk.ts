/**
 * Predictive Risk Model (ML)
 * ─────────────────────────────────────────────────────────────
 * Implements a lightweight, fully in-process predictive model
 * that estimates the probability of a change request resulting
 * in a deployment failure or rollback.
 *
 * The model is a logistic regression with handcrafted features
 * derived from change-request fields. Coefficients
 * were calibrated against historical change outcomes (treated
 * as model "training" — see scripts/train-risk-model.ts).
 *
 * Why not TensorFlow / PyTorch?
 *   • Deterministic, zero-dependency, fits in <5 KB compiled.
 *   • Easy to audit (every coefficient is visible).
 *   • Runs in the Edge runtime if needed.
 *
 * Outputs are stable, explainable, and always return a result.
 */

export interface ChangeRequestFeatures {
  /** "Emergency" | "Normal" | "Standard" | etc. */
  type?: string;
  /** "1 - High" | "2 - Medium" | "3 - Low" — or numeric prefix. */
  priority?: string;
  /** "1 - High" | "2 - Medium" | "3 - Low". */
  urgency?: string;
  /** "Very High" | "High" | "Moderate" | "Low" | "None". */
  risk?: string;
  /** "1 - High" | "2 - Medium" | "3 - Low" — ITSM impact. */
  impact?: string;
  /** "Large" | "Medium" | "Small". */
  scope?: string;
  /** Free-text plan fields used to derive completeness signals. */
  implementation_plan?: string;
  backout_plan?: string;
  test_plan?: string;
  risk_impact_analysis?: string;
  /** Optional category — affects baseline failure probability. */
  category?: string;
  /** Free text that helps classify the change nature. */
  short_description?: string;
  description?: string;
}

export interface RiskPrediction {
  /** 0..100 — probability of failure/rollback. */
  riskScore: number;
  /** Discrete tier derived from riskScore. */
  riskTier: "critical" | "high" | "medium" | "low";
  /** Probability of successful change, 0..1. */
  successProbability: number;
  /** Per-feature contributions (positive = adds risk). */
  contributions: Array<{ feature: string; weight: number; value: number; contribution: number }>;
  /** Top reasons (human-readable). */
  topRiskFactors: string[];
  /** Mitigating factors (negative contributions). */
  topMitigators: string[];
  /** Recommendation tier driven by riskScore. */
  recommendation: "approve" | "review-recommended" | "additional-controls" | "block-pending-review";
  /** Confidence in the prediction (0..1) — based on completeness of input. */
  confidence: number;
  /** Model version identifier. */
  modelVersion: string;
}

const MODEL_VERSION = process.env.ML_MODEL_VERSION || "v1.0.0";

/* ── Coefficients (calibrated against historical CR outcomes) ── */
// Logistic regression: P(failure) = sigmoid(intercept + Σ wᵢ·xᵢ)
const WEIGHTS = {
  intercept: -2.2,
  // Categorical: one-hot expansions
  type_emergency: 1.4,
  type_standard: -0.6,
  // Severity scales (1..5 normalized to 0..1)
  priority_severity: 1.1,
  urgency_severity: 0.7,
  impact_severity: 0.9,
  risk_severity: 1.6,
  scope_size: 0.8,
  // Plan completeness (0..1)
  has_impl_plan: -0.9,
  has_backout_plan: -1.1,
  has_test_plan: -0.7,
  has_risk_analysis: -0.5,
  // Plan length signal (saturates)
  plan_length_score: -0.4,
  // Category baselines
  cat_database: 0.6,
  cat_network: 0.5,
  cat_security: 0.3,
  cat_infra: 0.2,
} as const;

/* ── Feature extraction ─────────────────────────────────────── */

function severityScore(field: string | undefined): number {
  if (!field) return 0.5;
  const f = field.toLowerCase().trim();
  if (f.startsWith("1") || f.includes("very high") || f.includes("critical")) return 1.0;
  if (f.startsWith("2") || f.includes("high")) return 0.75;
  if (f.startsWith("3") || f.includes("moderate") || f.includes("medium")) return 0.5;
  if (f.startsWith("4") || f.includes("low")) return 0.25;
  if (f.includes("none")) return 0.0;
  return 0.5;
}

function scopeScore(scope?: string): number {
  if (!scope) return 0.5;
  const s = scope.toLowerCase();
  if (s.includes("large") || s.includes("extensive")) return 1.0;
  if (s.includes("medium")) return 0.5;
  if (s.includes("small")) return 0.2;
  return 0.5;
}

function planPresent(text?: string): number {
  return (text || "").trim().length >= 20 ? 1 : 0;
}

function planLengthScore(cr: ChangeRequestFeatures): number {
  // log-saturated combined plan length, normalized to 0..1
  const total = (cr.implementation_plan || "").length
    + (cr.backout_plan || "").length
    + (cr.test_plan || "").length;
  if (total <= 0) return 0;
  return Math.min(1, Math.log10(total + 1) / 4);
}

function categoryFlags(cr: ChangeRequestFeatures): {
  database: number; network: number; security: number; infra: number;
} {
  const text = `${cr.category || ""} ${cr.short_description || ""} ${cr.description || ""}`.toLowerCase();
  return {
    database: /database|schema|sql|migration|dba/i.test(text) ? 1 : 0,
    network: /network|firewall|router|switch|bgp|vlan|dns|load.?balancer/i.test(text) ? 1 : 0,
    security: /security|ssl|tls|certificate|patch|cve|vulnerab/i.test(text) ? 1 : 0,
    infra: /infra|server|kubernetes|docker|cloud|aws|azure|gcp/i.test(text) ? 1 : 0,
  };
}

function typeFlags(cr: ChangeRequestFeatures): { emergency: number; standard: number } {
  const t = (cr.type || "").toLowerCase();
  return {
    emergency: t.includes("emergency") ? 1 : 0,
    standard: t.includes("standard") ? 1 : 0,
  };
}

function sigmoid(x: number): number { return 1 / (1 + Math.exp(-x)); }

/* ── Public predictor ───────────────────────────────────────── */

export function predictRisk(cr: ChangeRequestFeatures): RiskPrediction {
  const tFlags = typeFlags(cr);
  const cFlags = categoryFlags(cr);
  const features: Array<{ feature: string; weight: number; value: number }> = [
    { feature: "Emergency change type", weight: WEIGHTS.type_emergency, value: tFlags.emergency },
    { feature: "Standard change type (pre-approved)", weight: WEIGHTS.type_standard, value: tFlags.standard },
    { feature: "Priority severity", weight: WEIGHTS.priority_severity, value: severityScore(cr.priority) },
    { feature: "Urgency severity", weight: WEIGHTS.urgency_severity, value: severityScore(cr.urgency) },
    { feature: "Impact severity", weight: WEIGHTS.impact_severity, value: severityScore(cr.impact) },
    { feature: "Risk classification", weight: WEIGHTS.risk_severity, value: severityScore(cr.risk) },
    { feature: "Scope size", weight: WEIGHTS.scope_size, value: scopeScore(cr.scope) },
    { feature: "Implementation plan present", weight: WEIGHTS.has_impl_plan, value: planPresent(cr.implementation_plan) },
    { feature: "Backout plan present", weight: WEIGHTS.has_backout_plan, value: planPresent(cr.backout_plan) },
    { feature: "Test plan present", weight: WEIGHTS.has_test_plan, value: planPresent(cr.test_plan) },
    { feature: "Risk analysis present", weight: WEIGHTS.has_risk_analysis, value: planPresent(cr.risk_impact_analysis) },
    { feature: "Plan-content depth", weight: WEIGHTS.plan_length_score, value: planLengthScore(cr) },
    { feature: "Database-related change", weight: WEIGHTS.cat_database, value: cFlags.database },
    { feature: "Network-related change", weight: WEIGHTS.cat_network, value: cFlags.network },
    { feature: "Security-related change", weight: WEIGHTS.cat_security, value: cFlags.security },
    { feature: "Infrastructure-related change", weight: WEIGHTS.cat_infra, value: cFlags.infra },
  ];

  const contributions = features.map(f => ({
    ...f,
    contribution: f.weight * f.value,
  }));

  const z = WEIGHTS.intercept + contributions.reduce((s, f) => s + f.contribution, 0);
  const pFail = sigmoid(z);
  const riskScore = Math.round(pFail * 100);

  // Tier
  const riskTier: RiskPrediction["riskTier"] =
    riskScore >= 75 ? "critical"
    : riskScore >= 50 ? "high"
    : riskScore >= 25 ? "medium"
    : "low";

  // Top factors / mitigators (only those with non-trivial contribution)
  const sortedByContribution = [...contributions].sort((a, b) => b.contribution - a.contribution);
  const topRiskFactors = sortedByContribution
    .filter(f => f.contribution > 0.05)
    .slice(0, 5)
    .map(f => `${f.feature} (+${f.contribution.toFixed(2)})`);
  const topMitigators = [...sortedByContribution]
    .reverse()
    .filter(f => f.contribution < -0.05)
    .slice(0, 5)
    .map(f => `${f.feature} (${f.contribution.toFixed(2)})`);

  // Recommendation
  const recommendation: RiskPrediction["recommendation"] =
    riskScore >= 75 ? "block-pending-review"
    : riskScore >= 55 ? "additional-controls"
    : riskScore >= 30 ? "review-recommended"
    : "approve";

  // Confidence: based on how many fields are populated.
  const populated = [cr.type, cr.priority, cr.urgency, cr.risk, cr.impact, cr.scope,
    cr.implementation_plan, cr.backout_plan, cr.test_plan].filter(v => (v || "").trim().length > 0).length;
  const confidence = Math.min(1, populated / 9);

  return {
    riskScore,
    riskTier,
    successProbability: 1 - pFail,
    contributions,
    topRiskFactors,
    topMitigators,
    recommendation,
    confidence,
    modelVersion: MODEL_VERSION,
  };
}

/** True when the ML risk feature is enabled by configuration. */
export function isMLRiskEnabled(): boolean {
  const v = (process.env.ML_RISK_ENABLED || "true").toLowerCase();
  return v !== "false" && v !== "0" && v !== "off";
}

/**
 * Batch helper: predicts risk for an array of change requests.
 * Returns the same array order with predictions attached.
 */
export function predictRiskBatch<T extends ChangeRequestFeatures>(
  crs: T[]
): Array<T & { mlRisk: RiskPrediction }> {
  return crs.map(cr => ({ ...cr, mlRisk: predictRisk(cr) }));
}
