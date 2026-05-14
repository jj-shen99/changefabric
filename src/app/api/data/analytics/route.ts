/**
 * Legacy /api/data/analytics — facade over the new core analytics module.
 * Returns the same payload keys consumed by existing dashboard pages.
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PrismaChangeRequestRepository } from "@/core/adapters/prisma-repository";
import { impactByCategory } from "@/core/analytics";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get("days") || "0", 10);
  const userRoles = (session.user as { roles?: string[] }).roles || [];
  const permissions = (session.user as { permissions?: { canViewAllData?: boolean } }).permissions;
  const userEmail = session.user.email || "";
  const canViewAll = userRoles.includes("admin") || permissions?.canViewAllData;

  const repo = new PrismaChangeRequestRepository(prisma);
  const since = days > 0 ? new Date(Date.now() - days * 24 * 60 * 60 * 1000) : null;

  // Fetch services for Service Risk Ranking
  interface ServiceRow { name: string; displayName: string; category: string; criticality: string; }
  const [allCRs, releases, assignmentGroups, servicesData] = await Promise.all([
    repo.list(!canViewAll ? { requestedBy: userEmail } : undefined),
    prisma.release.findMany({ orderBy: { scheduledDate: "desc" } }),
    prisma.group.findMany({ where: { type: { in: ["assignment", "both"] }, isActive: true }, select: { name: true } }),
    prisma.$queryRaw<ServiceRow[]>`SELECT name, displayName, category, criticality FROM Service WHERE isActive = 1`,
  ]);
  const validGroupNames = new Set(assignmentGroups.map(g => g.name));
  const servicesMap = new Map(servicesData.map(s => [s.name, s]));
  const crs = since ? allCRs.filter((c) => new Date(c.createdAt) >= since) : allCRs;

  // Per-release rollups using the new releaseId link
  const releaseRiskRadar = releases.map((rel) => {
    const inRel = crs.filter((c) => c.releaseId === rel.id);
    const totalRisk = inRel.reduce((a, b) => a + (b.computedRiskScore || 0), 0);
    const services = new Set<string>();
    inRel.forEach((c) => c.affectedServices.forEach((s) => services.add(s)));
    return {
      releaseId: rel.id,
      releaseName: rel.name,
      version: rel.version,
      status: rel.status,
      overallRisk: inRel.length > 0 ? Math.round(totalRisk / inRel.length) : rel.overallRisk,
      changeCount: inRel.length,
      totalCodeChurn: 0,
      totalFilesChanged: 0,
      servicesImpacted: services.size,
      servicesList: [...services],
      avgTestCoverage: 0,
      validationPassRate: 0,
      scheduledDate: rel.scheduledDate.toISOString(),
      riskFactors: {
        codeChurn: "low",
        serviceSpread: services.size > 5 ? "high" : services.size > 2 ? "medium" : "low",
        testCoverage: "low",
        rollbackComplexity: "low",
      },
    };
  });

  // Blast radius by service - use services table data
  const serviceStatsMap: Record<string, { changeCount: number; changes: string[]; risk: number }> = {};
  for (const c of crs) {
    for (const svc of c.affectedServices) {
      if (!serviceStatsMap[svc]) serviceStatsMap[svc] = { changeCount: 0, changes: [], risk: 0 };
      serviceStatsMap[svc].changeCount++;
      serviceStatsMap[svc].changes.push(c.number);
      serviceStatsMap[svc].risk += c.computedRiskScore;
    }
  }
  
  // Build blast radius using services table for display names and metadata
  const blastRadius = Object.entries(serviceStatsMap)
    .map(([serviceName, d]) => {
      const serviceInfo = servicesMap.get(serviceName);
      return {
        service: serviceInfo?.displayName || serviceName,
        serviceName, // Keep original name for reference
        category: serviceInfo?.category || "unknown",
        criticality: serviceInfo?.criticality || "standard",
        changeCount: d.changeCount,
        avgRisk: d.changeCount ? Math.round(d.risk / d.changeCount) : 0,
        changes: d.changes,
        releases: [] as string[],
      };
    })
    .sort((a, b) => b.avgRisk - a.avgRisk); // Sort by risk instead of count

  const confidenceScores = releases.map((rel) => ({
    releaseId: rel.id,
    releaseName: rel.name,
    version: rel.version,
    status: rel.status,
    confidence: Math.max(0, 100 - rel.overallRisk),
    recommendation: (rel.overallRisk < 20
      ? "continue"
      : rel.overallRisk < 50
        ? "pause"
        : "rollback") as "continue" | "pause" | "rollback",
    breakdown: {
      testPassRate: 0,
      testCoverage: 0,
      riskScore: rel.overallRisk,
      failedTests: 0,
      hasBlockers: false,
      rollbackComplexity: "low",
    },
    totalValidations: 0,
    passedValidations: 0,
    failedValidations: 0,
  }));

  const closed = crs.filter((c) => c.state === "closed");
  const rejected = crs.filter((c) => c.state === "rejected" || c.state === "canceled");
  const rolledBack = crs.filter((c) => c.state === "rolled_back");
  const inProgress = crs.filter((c) => c.state === "in_progress");
  const implemented = crs.filter((c) => c.state === "implemented");

  const teamStats: Record<string, { total: number; deployed: number; failed: number; rolledBack: number; risk: number }> = {};
  for (const c of crs) {
    const rawGroup = c.assignmentGroup || "Unassigned";
    // Only include groups that exist in the assignment groups table, or show as "Other" if not found
    const team = validGroupNames.has(rawGroup) ? rawGroup : (rawGroup === "Unassigned" ? "Unassigned" : "Other");
    if (!teamStats[team]) teamStats[team] = { total: 0, deployed: 0, failed: 0, rolledBack: 0, risk: 0 };
    teamStats[team].total++;
    teamStats[team].risk += c.computedRiskScore;
    if (c.state === "closed") teamStats[team].deployed++;
    if (c.state === "rejected" || c.state === "canceled") teamStats[team].failed++;
    if (c.state === "rolled_back") teamStats[team].rolledBack++;
  }
  const failureByTeam = Object.entries(teamStats).map(([team, s]) => ({
    team,
    total: s.total,
    deployed: s.deployed,
    failed: s.failed,
    rolledBack: s.rolledBack,
    avgRisk: s.total ? Math.round(s.risk / s.total) : 0,
    failureRate: s.total ? Math.round((s.failed / s.total) * 100) : 0,
  }));
  const teamVelocity = Object.entries(teamStats).map(([team, s]) => ({
    team,
    totalChanges: s.total,
    deployed: s.deployed,
    avgRisk: s.total ? Math.round(s.risk / s.total) : 0,
    deployRate: s.total ? Math.round((s.deployed / s.total) * 100) : 0,
  }));

  const categoryBreakdown = impactByCategory(crs).map((b) => ({
    category: b.category,
    count: b.count,
  }));

  // Approval efficiency - compute lead time from creation to close for deployed changes
  const approvalEfficiency = closed.slice(0, 20).map((c) => {
    const createdAt = new Date(c.createdAt);
    const closedAt = c.actualEnd ? new Date(c.actualEnd) : new Date();
    const leadTimeHours = Math.round((closedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60));
    return {
      id: c.number,
      title: c.title,
      team: c.assignmentGroup || "Unassigned",
      approverCount: 1, // Simplified - would need to count actual approvals
      leadTimeHours: Math.max(1, leadTimeHours),
      category: c.category,
    };
  });

  // Rollback intelligence - real data from rolled_back CRs
  const rollbackServiceMap: Record<string, number> = {};
  const rollbackData = rolledBack.map((c) => {
    c.affectedServices.forEach((svc) => {
      rollbackServiceMap[svc] = (rollbackServiceMap[svc] || 0) + 1;
    });
    return {
      id: c.number,
      title: c.title,
      team: c.assignmentGroup || "Unassigned",
      category: c.category,
      risk: c.computedRiskScore,
      rollbackComplexity: c.computedRiskScore >= 60 ? "high" : c.computedRiskScore >= 30 ? "medium" : "low",
      services: c.affectedServices,
    };
  });
  const rollbackByService = Object.entries(rollbackServiceMap)
    .map(([service, count]) => ({ service, count }))
    .sort((a, b) => b.count - a.count);

  // Calculate rollback rate
  const totalOutcomes = closed.length + rejected.length + rolledBack.length;
  const rollbackRate = totalOutcomes > 0 ? Math.round((rolledBack.length / totalOutcomes) * 100) : 0;

  return NextResponse.json({
    releaseRiskRadar,
    blastRadius,
    confidenceScores,
    failureAnalysis: {
      totalChanges: crs.length,
      deployed: closed.length,
      failed: rejected.length,
      rolledBack: rolledBack.length,
      inProgress: inProgress.length,
      implemented: implemented.length,
      changeFailureRate:
        crs.length > 0 ? Math.round((rejected.length / crs.length) * 100) : 0,
      failureByTeam,
      serviceRiskRanking: blastRadius.slice(0, 10).map((b) => ({
        service: b.service,
        avgRiskExposure: b.avgRisk,
        changeCount: b.changeCount,
      })),
    },
    velocity: {
      teamVelocity,
      categoryBreakdown,
      approvalEfficiency,
    },
    rollbackIntelligence: {
      rollbackCount: rolledBack.length,
      rollbackRate,
      rollbackData,
      rollbackByService,
    },
  });
}
