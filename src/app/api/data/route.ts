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

  const userRoles = (session.user as { roles?: string[] }).roles || [];
  const permissions = (session.user as { permissions?: { canViewAllData?: boolean } }).permissions;
  const userEmail = session.user.email || "";
  const isSuperAdmin = (session.user as { isSuperAdmin?: boolean }).isSuperAdmin || false;
  const userOrgId = (session.user as { orgId?: string }).orgId || "demo";
  const canViewAll = userRoles.includes("admin") || permissions?.canViewAllData;

  const repo = new PrismaChangeRequestRepository(prisma);
  const since =
    days > 0 ? new Date(Date.now() - days * 24 * 60 * 60 * 1000) : null;

  // Filter by orgId unless super admin
  const orgFilter = isSuperAdmin ? {} : { orgId: userOrgId };
  
  // Users with canViewAllData see all CRs in their org, others see only their own (requested, assigned, or approver)
  const allCrs = await repo.list(orgFilter);
  let crs = allCrs;
  
  if (!canViewAll) {
    // Get CR numbers where user is an approver
    const approverCRs = await prisma.$queryRaw<Array<{ changeRequestId: string }>>`
      SELECT DISTINCT changeRequestId FROM Approval WHERE approverEmail = ${userEmail}
    `;
    const approverCRNumbers = new Set(approverCRs.map(r => r.changeRequestId));
    
    crs = allCrs.filter(c => 
      c.requestedBy === userEmail || 
      c.assignedTo === userEmail ||
      approverCRNumbers.has(c.number)
    );
  }
  
  const [releases] = await Promise.all([
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
      outageRisk: Math.round(c.computedRiskScore * (0.8 + (c.affectedServices.length * 0.1))),
      performanceRisk: Math.round(c.computedRiskScore * (c.type === "emergency" ? 1.2 : 0.9)),
      functionalityRisk: Math.round(c.computedImpactScore * (c.category === "software" ? 1.1 : 0.95)),
      securityRisk: Math.round(c.computedRiskScore * (c.riskLevel === "very_high" || c.riskLevel === "high" ? 1.15 : 0.85)),
      dataIntegrityRisk: Math.round(c.computedImpactScore * (c.category === "database" ? 1.2 : 0.9)),
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
      rolledBack: t.rolledBack,
    })),
    impactByCategory: impactByCategory(filtered),
  });
}
