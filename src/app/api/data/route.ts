/**
 * Legacy /api/data — preserved as a backward-compatible facade for the
 * existing UI pages. It now reads from the re-architected ChangeRequest
 * model and returns the same payload shape the legacy components expect,
 * mapped from the new generic schema.
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PrismaChangeRequestRepository } from "@/core/adapters/prisma-repository";
import {
  computeDashboardMetrics,
  impactByCategory,
  weeklyTrend,
} from "@/core/analytics";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get("days") || "0", 10);

  const userRole = (session.user as { role?: string }).role;
  const userEmail = session.user.email || "";

  const repo = new PrismaChangeRequestRepository(prisma);
  const since =
    days > 0 ? new Date(Date.now() - days * 24 * 60 * 60 * 1000) : null;

  const [crs, releases] = await Promise.all([
    repo.list(
      userRole !== "admin" ? { requestedBy: userEmail } : undefined
    ),
    prisma.release.findMany({ orderBy: { scheduledDate: "desc" } }),
  ]);

  const filtered = since
    ? crs.filter((c) => new Date(c.createdAt) >= since)
    : crs;

  // Map to the legacy UI shape
  const formattedChanges = filtered.map((c) => ({
    ...c,
    id: c.number,
    short_description: c.title,
    state: c.state,
    author: c.requestedBy,
    team: c.assignmentGroup ?? "",
    status: c.state,
    createdAt: c.createdAt,
    sn_impact: c.impactLevel,
    risk: c.riskLevel, // Alias for UI compatibility
    linesAdded: 0,
    linesRemoved: 0,
    filesChanged: 0,
    approvers: [],
    tags: c.tags,
    impact: {
      outageRisk: c.computedRiskScore,
      performanceRisk: c.computedRiskScore,
      functionalityRisk: c.computedImpactScore,
      securityRisk: c.computedRiskScore,
      dataIntegrityRisk: c.computedImpactScore,
      overallRisk: Math.round(c.computedRiskScore),
      affectedServices: c.affectedServices,
      affectedUsers: 0,
      estimatedDowntime:
        c.plannedStart && c.plannedEnd
          ? `${c.plannedStart} – ${c.plannedEnd}`
          : "N/A",
      rollbackComplexity:
        c.riskLevel === "very_high" || c.riskLevel === "high" ? "high" : c.riskLevel === "moderate" ? "medium" : "low",
      blastRadius:
        c.affectedServices.length >= 3
          ? "high"
          : c.affectedServices.length >= 1
            ? "medium"
            : "low",
    },
    validations: [],
  }));

  const metrics = computeDashboardMetrics(filtered);
  const trend = weeklyTrend(filtered);

  return NextResponse.json({
    changeRequests: formattedChanges,
    releases: releases.map((r) => ({
      id: r.id,
      name: r.name,
      version: r.version,
      status: r.status,
      scheduledDate: r.scheduledDate.toISOString(),
      actualDate: r.actualDate?.toISOString(),
      changeRequests: [],
      overallRisk: r.overallRisk,
      releaseManager: r.releaseManager,
      notes: r.notes,
    })),
    dashboardMetrics: {
      totalChanges: metrics.totalChanges,
      pendingChanges: metrics.pendingChanges,
      deployedToday: metrics.closedChanges,
      failedDeployments: metrics.rejectedChanges,
      avgRiskScore: metrics.avgRiskScore,
      validationPassRate: 100 - metrics.failureRate,
      avgDeployTime:
        metrics.changeLeadTimeDays > 0
          ? `${metrics.changeLeadTimeDays} days`
          : "N/A",
      rollbackRate: metrics.failureRate,
      mttr: "N/A",
      changeLeadTime:
        metrics.changeLeadTimeDays > 0
          ? `${metrics.changeLeadTimeDays} days`
          : "N/A",
    },
    riskTrendData: trend.map((t) => ({
      date: t.date,
      avgRisk: t.avgRisk,
      deployments: t.count,
    })),
    validationTrendData: trend.map((t) => ({
      date: t.date,
      passRate: t.count
        ? Math.round((t.closed / Math.max(t.closed + t.failed, 1)) * 100)
        : 0,
      totalTests: t.count,
    })),
    deploymentFrequencyData: trend.map((t) => ({
      date: t.date,
      successful: t.closed,
      failed: t.failed,
      rolledBack: 0,
    })),
    impactByCategory: impactByCategory(filtered),
  });
}
