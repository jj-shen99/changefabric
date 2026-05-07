/**
 * Lightweight, dependency-free ML-style risk scorer.
 *
 * Uses a logistic-regression-shaped model over engineered features so we can
 * produce a calibrated probability + per-feature explanation without bringing
 * in heavy native libraries. Tunable via WEIGHTS — these would be replaced by
 * a fitted model (e.g. shipped as JSON) in production.
 */

import type { ChangeRequest } from "../schema";

export interface MLRiskResult {
  /** 0..1 probability the change will fail or roll back. */
  probability: number;
  /** 0..100 calibrated risk score. */
  score: number;
  /** Confidence in the prediction 0..1. */
  confidence: number;
  /** Top contributing features with their signed contribution. */
  contributions: Array<{ feature: string; weight: number; value: number; contribution: number }>;
  explanation: string;
}

interface Feature {
  name: string;
  value: number;
  weight: number;
}

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

function extractFeatures(cr: ChangeRequest): Feature[] {
  const riskMap: Record<string, number> = {
    low: 0,
    moderate: 0.4,
    high: 0.75,
    very_high: 1,
  };
  const impactMap: Record<string, number> = { "1": 1, "2": 0.6, "3": 0.3 };
  const priorityMap: Record<string, number> = { "1": 1, "2": 0.7, "3": 0.4, "4": 0.2 };

  const text = (cr.description + " " + cr.justification).toLowerCase();
  const hasMigration = /migrat|upgrade|partition|schema/.test(text) ? 1 : 0;
  const hasSecurity = /security|cve|exploit|injection|auth/.test(text) ? 1 : 0;
  const isEmergency = cr.type === "emergency" ? 1 : 0;

  const backoutLen = cr.backoutPlan.trim().length;
  const testLen = cr.testPlan.trim().length;
  const implLen = cr.implementationPlan.trim().length;

  return [
    { name: "risk_level", value: riskMap[cr.riskLevel] ?? 0, weight: 1.4 },
    { name: "impact_level", value: impactMap[cr.impactLevel] ?? 0, weight: 1.1 },
    { name: "priority", value: priorityMap[cr.priority] ?? 0, weight: 0.7 },
    { name: "is_emergency", value: isEmergency, weight: 0.9 },
    { name: "fanout_services", value: Math.min(cr.affectedServices.length / 5, 1), weight: 1.0 },
    { name: "missing_backout_plan", value: backoutLen < 30 ? 1 : 0, weight: 0.8 },
    { name: "missing_test_plan", value: testLen < 30 ? 1 : 0, weight: 0.7 },
    { name: "missing_impl_plan", value: implLen < 30 ? 1 : 0, weight: 0.5 },
    { name: "mentions_migration", value: hasMigration, weight: 0.6 },
    { name: "mentions_security", value: hasSecurity, weight: 0.4 },
  ];
}

const BIAS = -2.0;

export function predictRisk(cr: ChangeRequest): MLRiskResult {
  const features = extractFeatures(cr);
  const logit = features.reduce((acc, f) => acc + f.value * f.weight, BIAS);
  const probability = sigmoid(logit);
  const score = Math.round(probability * 100);

  const contributions = features
    .map((f) => ({
      feature: f.name,
      weight: f.weight,
      value: f.value,
      contribution: f.value * f.weight,
    }))
    .sort((a, b) => b.contribution - a.contribution);

  // Confidence proxy: distance of probability from 0.5
  const confidence = Math.round(Math.abs(probability - 0.5) * 200) / 100;

  const top = contributions.slice(0, 3).filter((c) => c.contribution > 0);
  const explanation =
    top.length > 0
      ? `Top drivers: ${top.map((c) => `${c.feature} (+${c.contribution.toFixed(2)})`).join(", ")}.`
      : "No strong risk drivers detected.";

  return { probability, score, confidence, contributions, explanation };
}
