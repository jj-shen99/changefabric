/**
 * Deterministic impact-analysis engine.
 *
 * Produces a structured assessment from CR fields without calling out to any
 * external service. ML-based scoring is layered on top via core/ml.
 */

import type { ChangeRequest } from "../schema";

export interface ImpactReport {
  outageRisk: number;
  performanceRisk: number;
  functionalityRisk: number;
  securityRisk: number;
  dataIntegrityRisk: number;
  overallRisk: number; // 0..100
  blastRadius: "low" | "medium" | "high" | "critical";
  rollbackComplexity: "low" | "medium" | "high" | "critical";
  affectedServices: string[];
  estimatedDowntime: string;
  rationale: string[];
}

const RISK_WEIGHT: Record<string, number> = {
  low: 25,
  moderate: 50,
  high: 75,
  very_high: 95,
};

const IMPACT_WEIGHT: Record<string, number> = { "1": 90, "2": 60, "3": 30 };

const PRIORITY_WEIGHT: Record<string, number> = {
  "1": 90,
  "2": 70,
  "3": 45,
  "4": 20,
};

function clamp(n: number, lo = 0, hi = 100) {
  return Math.max(lo, Math.min(hi, Math.round(n)));
}

export function analyzeImpact(cr: ChangeRequest): ImpactReport {
  const r = RISK_WEIGHT[cr.riskLevel] ?? 25;
  const i = IMPACT_WEIGHT[cr.impactLevel] ?? 30;
  const p = PRIORITY_WEIGHT[cr.priority] ?? 30;

  const rationale: string[] = [
    `risk_level=${cr.riskLevel} (${r})`,
    `impact_level=${cr.impactLevel} (${i})`,
    `priority=${cr.priority} (${p})`,
  ];

  // Heuristics based on CR content
  const hasBackoutPlan = cr.backoutPlan.trim().length > 30;
  const hasTestPlan = cr.testPlan.trim().length > 30;
  const hasImplPlan = cr.implementationPlan.trim().length > 30;
  const services = cr.affectedServices ?? [];
  const fanOut = services.length;

  const outageRisk = clamp(r * 0.7 + i * 0.3 + (cr.type === "emergency" ? 10 : 0));
  const performanceRisk = clamp(r * 0.5 + i * 0.5);
  const functionalityRisk = clamp(i * 0.7 + (hasTestPlan ? 0 : 15));
  const securityRisk = clamp(p * 0.5 + (cr.category === "security" ? 25 : 0));
  const dataIntegrityRisk = clamp(
    i * 0.5 + (cr.category.includes("database") ? 20 : 0) + (hasBackoutPlan ? 0 : 15)
  );

  const overall = clamp(
    outageRisk * 0.3 +
      performanceRisk * 0.15 +
      functionalityRisk * 0.2 +
      securityRisk * 0.15 +
      dataIntegrityRisk * 0.2
  );

  const blastRadius: ImpactReport["blastRadius"] =
    fanOut >= 5 ? "critical" : fanOut >= 3 ? "high" : fanOut >= 1 ? "medium" : "low";

  const rollbackComplexity: ImpactReport["rollbackComplexity"] =
    !hasBackoutPlan
      ? "high"
      : cr.riskLevel === "very_high"
        ? "critical"
        : cr.riskLevel === "high"
          ? "high"
          : cr.riskLevel === "moderate"
            ? "medium"
            : "low";

  const estimatedDowntime =
    cr.plannedStart && cr.plannedEnd
      ? `${new Date(cr.plannedEnd).getTime() - new Date(cr.plannedStart).getTime() > 0
          ? Math.round(
              (new Date(cr.plannedEnd).getTime() -
                new Date(cr.plannedStart).getTime()) /
                60000
            )
          : 0} min planned`
      : "unspecified";

  if (!hasBackoutPlan) rationale.push("missing_backout_plan (+15)");
  if (!hasTestPlan) rationale.push("missing_test_plan (+15 functionality)");
  if (!hasImplPlan) rationale.push("missing_implementation_plan");
  if (cr.type === "emergency") rationale.push("emergency_change (+10 outage)");
  rationale.push(`affected_services=${fanOut}`);

  return {
    outageRisk,
    performanceRisk,
    functionalityRisk,
    securityRisk,
    dataIntegrityRisk,
    overallRisk: overall,
    blastRadius,
    rollbackComplexity,
    affectedServices: services,
    estimatedDowntime,
    rationale,
  };
}
