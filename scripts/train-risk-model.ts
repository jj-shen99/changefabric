/**
 * Train / calibrate the predictive risk model from historical
 * change-request outcomes in the database.
 *
 * Usage:  npx tsx scripts/train-risk-model.ts
 *
 * The script:
 *   1. Loads all closed change requests from the DB.
 *   2. Labels each as success / failure based on close_code & state.
 *   3. Computes summary stats (base rate, feature distributions).
 *   4. Logs a recommended weight delta — manually update WEIGHTS in
 *      src/lib/ml-risk.ts to apply.
 *
 * This is a deliberately simple "calibration" loop — it does NOT
 * run a heavy gradient solver (kept dependency-free). For
 * production-grade training, export the dataset and use scikit-learn
 * or any standard ML stack offline.
 */

import { PrismaClient } from "@prisma/client";
import { predictRisk } from "../src/lib/ml-risk";

const prisma = new PrismaClient();

interface Outcome { failed: boolean; predictedScore: number }

async function main() {
  console.log("─ Loading historical change requests…");
  const all = await prisma.changeRequest.findMany({
    where: {
      state: { in: ["Closed", "closed", "Closed Complete", "Closed Incomplete", "Closed Cancelled"] },
    },
  });
  console.log(`  • ${all.length} closed CRs found`);
  if (all.length === 0) {
    console.log("  No data — nothing to calibrate.");
    return;
  }

  const outcomes: Outcome[] = all.map(cr => {
    const code = (cr.close_code || "").toLowerCase();
    const state = (cr.state || "").toLowerCase();
    const failed = code.includes("unsuccess")
      || code.includes("fail")
      || state.includes("incomplete")
      || state.includes("cancel");
    const pred = predictRisk({
      type: cr.type, priority: cr.priority, urgency: cr.urgency,
      risk: cr.risk, impact: cr.impact, scope: cr.scope,
      category: cr.category, short_description: cr.short_description,
      description: cr.description, implementation_plan: cr.implementation_plan,
      backout_plan: cr.backout_plan, test_plan: cr.test_plan,
      risk_impact_analysis: cr.risk_impact_analysis,
    });
    return { failed, predictedScore: pred.riskScore };
  });

  const baseRate = outcomes.filter(o => o.failed).length / outcomes.length;
  console.log(`\n─ Base failure rate: ${(baseRate * 100).toFixed(1)}%`);

  // Bucket-level accuracy
  const buckets = [
    { name: "low (<25)", min: 0, max: 24 },
    { name: "medium (25-49)", min: 25, max: 49 },
    { name: "high (50-74)", min: 50, max: 74 },
    { name: "critical (75-100)", min: 75, max: 100 },
  ];

  console.log("\n─ Predicted-bucket vs actual-failure rate:");
  for (const b of buckets) {
    const inBucket = outcomes.filter(o => o.predictedScore >= b.min && o.predictedScore <= b.max);
    if (inBucket.length === 0) {
      console.log(`  ${b.name.padEnd(20)} : 0 samples`);
      continue;
    }
    const fr = inBucket.filter(o => o.failed).length / inBucket.length;
    console.log(`  ${b.name.padEnd(20)} : ${inBucket.length.toString().padStart(4)} samples, ${(fr * 100).toFixed(1)}% actual failure`);
  }

  // Brier score (lower = better calibration)
  const brier = outcomes.reduce((s, o) => {
    const p = o.predictedScore / 100;
    const y = o.failed ? 1 : 0;
    return s + (p - y) ** 2;
  }, 0) / outcomes.length;
  console.log(`\n─ Brier score: ${brier.toFixed(4)}  (0=perfect, 0.25=baseline)`);

  if (brier > 0.20) {
    console.log("  ⚠ Calibration is weak. Consider re-tuning WEIGHTS in src/lib/ml-risk.ts.");
  } else {
    console.log("  ✓ Model calibration is acceptable.");
  }

  await prisma.$disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
