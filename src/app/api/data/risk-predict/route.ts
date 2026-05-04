/**
 * POST /api/data/risk-predict
 * ─────────────────────────────────────────────────────────────
 * Run the predictive risk model (and optionally LLM quality
 * analysis) on a single change request.
 *
 * Body:
 *   { number: string, includeLLM?: boolean }
 *
 * Response:
 *   { mlRisk, llmQuality?, modelVersion }
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { predictRisk, isMLRiskEnabled } from "@/lib/ml-risk";
import { analyzeQualityWithLLM, isLLMEnabled } from "@/lib/llm";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const number: string | undefined = body?.number;
  const includeLLM: boolean = body?.includeLLM === true;

  if (!number) {
    return NextResponse.json({ error: "Missing 'number' in request body" }, { status: 400 });
  }

  if (!isMLRiskEnabled()) {
    return NextResponse.json({ error: "ML risk model is disabled" }, { status: 503 });
  }

  // Owner-filter for non-admins (matches /api/data convention)
  const userRole = (session.user as { role?: string }).role;
  const userEmail = session.user.email || "";
  const where: Record<string, unknown> = { number };
  if (userRole !== "admin") where.syncedBy = userEmail;

  const cr = await prisma.changeRequest.findFirst({ where });
  if (!cr) {
    return NextResponse.json({ error: "Change request not found" }, { status: 404 });
  }

  const mlRisk = predictRisk({
    type: cr.type,
    priority: cr.priority,
    urgency: cr.urgency,
    risk: cr.risk,
    impact: cr.impact,
    scope: cr.scope,
    category: cr.category,
    short_description: cr.short_description,
    description: cr.description,
    implementation_plan: cr.implementation_plan,
    backout_plan: cr.backout_plan,
    test_plan: cr.test_plan,
    risk_impact_analysis: cr.risk_impact_analysis,
  });

  const result: Record<string, unknown> = {
    number: cr.number,
    mlRisk,
    modelVersion: mlRisk.modelVersion,
    llmEnabled: isLLMEnabled(),
  };

  if (includeLLM) {
    const planText = [cr.implementation_plan, cr.backout_plan, cr.test_plan]
      .filter(Boolean).join("\n\n");
    result.llmQuality = await analyzeQualityWithLLM({
      title: cr.short_description,
      planText,
      riskTier: mlRisk.riskTier,
    });
  }

  return NextResponse.json(result);
}
