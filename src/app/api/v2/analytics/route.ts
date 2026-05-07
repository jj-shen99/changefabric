/**
 * GET /api/v2/analytics — dashboard payload computed by core/analytics.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PrismaChangeRequestRepository } from "@/core/adapters/prisma-repository";
import {
  approvalAnalytics,
  computeDashboardMetrics,
  impactByCategory,
  weeklyTrend,
} from "@/core";
import { isResponse, requireSession, serverError } from "../_helpers";

export async function GET(request: Request) {
  const ctx = await requireSession();
  if (isResponse(ctx)) return ctx;
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get("days") || "0", 10);
    const repo = new PrismaChangeRequestRepository(prisma);
    const all = await repo.list(
      ctx.perms.canViewAllData ? undefined : { requestedBy: ctx.email }
    );
    const since = days > 0 ? new Date(Date.now() - days * 86400000) : null;
    const crs = since ? all.filter((c) => new Date(c.createdAt) >= since) : all;

    const approvals = await prisma.approval.findMany({
      select: { approverEmail: true, decision: true, changeRequestId: true },
    });

    return NextResponse.json({
      metrics: computeDashboardMetrics(crs),
      categoryBreakdown: impactByCategory(crs),
      trend: weeklyTrend(crs),
      approvals: approvalAnalytics(approvals),
    });
  } catch (err) {
    return serverError(err);
  }
}
