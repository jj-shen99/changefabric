/**
 * POST /api/data/risk-predict
 * Run the in-app ML-style risk model on a CR (re-architected).
 * Body: { number: string, includeLLM?: boolean }
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PrismaChangeRequestRepository } from "@/core/adapters/prisma-repository";
import { predictRisk } from "@/core/ml/risk";
import { analyzeImpact } from "@/core/impact/analyzer";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const number: string | undefined = body?.number;
  if (!number) {
    return NextResponse.json({ error: "Missing 'number' in request body" }, { status: 400 });
  }

  const repo = new PrismaChangeRequestRepository(prisma);
  const cr = await repo.get(number);
  if (!cr) {
    return NextResponse.json({ error: "Change request not found" }, { status: 404 });
  }

  const userRole = (session.user as { role?: string }).role;
  const userEmail = session.user.email || "";
  if (userRole !== "admin" && cr.requestedBy !== userEmail) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const ml = predictRisk(cr);
  const impact = analyzeImpact(cr);

  return NextResponse.json({
    number: cr.number,
    mlRisk: {
      score: ml.score,
      probability: ml.probability,
      confidence: ml.confidence,
      riskTier:
        ml.score >= 75 ? "very_high" : ml.score >= 50 ? "high" : ml.score >= 25 ? "moderate" : "low",
      contributions: ml.contributions,
      explanation: ml.explanation,
    },
    impact,
    modelVersion: "core-ml-1.0",
    llmEnabled: false,
  });
}
