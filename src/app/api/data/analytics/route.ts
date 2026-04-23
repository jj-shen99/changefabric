import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get("days") || "0", 10);

  // Build where clause with date filter and user filter
  const userRole = (session.user as { role?: string }).role;
  const userEmail = session.user.email || "";

  const whereClause: Record<string, unknown> = {};
  if (days > 0) {
    whereClause.opened_at = { gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString() };
  }
  // Non-admin users can only see analytics for change requests they synced
  if (userRole !== "admin") {
    whereClause.syncedBy = userEmail;
  }

  const [changeRequests, releases] = await Promise.all([
    prisma.changeRequest.findMany({ where: whereClause, include: { validations: true }, orderBy: { opened_at: "desc" } }),
    prisma.release.findMany({ orderBy: { scheduledDate: "desc" } }),
  ]);

  // ── Release Risk Radar (stub — releases no longer link to CRs) ──
  const releaseRiskRadar = releases.map((rel) => ({
    releaseId: rel.id,
    releaseName: rel.name,
    version: rel.version,
    status: rel.status,
    overallRisk: rel.overallRisk,
    changeCount: 0,
    totalCodeChurn: 0,
    totalFilesChanged: 0,
    servicesImpacted: 0,
    servicesList: [] as string[],
    avgTestCoverage: 0,
    validationPassRate: 0,
    scheduledDate: rel.scheduledDate.toISOString(),
    riskFactors: { codeChurn: "low", serviceSpread: "low", testCoverage: "low", rollbackComplexity: "low" },
  }));

  // ── Blast Radius (based on business_service) ──
  const serviceMap: Record<string, { changeCount: number; changes: string[] }> = {};
  changeRequests.forEach((cr) => {
    const svc = cr.business_service || "Unknown";
    if (!serviceMap[svc]) serviceMap[svc] = { changeCount: 0, changes: [] };
    serviceMap[svc].changeCount++;
    serviceMap[svc].changes.push(cr.number);
  });
  const blastRadius = Object.entries(serviceMap)
    .map(([service, data]) => ({
      service,
      changeCount: data.changeCount,
      avgRisk: 0,
      changes: data.changes,
      releases: [] as string[],
    }))
    .sort((a, b) => b.changeCount - a.changeCount);

  // ── Release Confidence Scores ──
  const confidenceScores = releases.map((rel) => ({
    releaseId: rel.id,
    releaseName: rel.name,
    version: rel.version,
    status: rel.status,
    confidence: Math.max(0, 100 - rel.overallRisk),
    recommendation: rel.overallRisk < 20 ? "continue" as const : rel.overallRisk < 50 ? "pause" as const : "rollback" as const,
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

  // ── Change Failure Analysis (by SN state) ──
  const allChanges = changeRequests;
  const closed = allChanges.filter((c) => c.state.toLowerCase().includes("closed"));
  const stateStats: Record<string, number> = {};
  allChanges.forEach((cr) => {
    const s = cr.state || "Unknown";
    stateStats[s] = (stateStats[s] || 0) + 1;
  });

  // Per-team (assignment_group) stats
  const teamStats: Record<string, { total: number; deployed: number; failed: number; rolledBack: number; avgRisk: number }> = {};
  allChanges.forEach((cr) => {
    const team = cr.assignment_group || "Unassigned";
    if (!teamStats[team]) teamStats[team] = { total: 0, deployed: 0, failed: 0, rolledBack: 0, avgRisk: 0 };
    teamStats[team].total++;
    if (cr.state.toLowerCase().includes("closed")) teamStats[team].deployed++;
  });
  const failureByTeam = Object.entries(teamStats).map(([team, stats]) => ({
    team,
    total: stats.total,
    deployed: stats.deployed,
    failed: stats.failed,
    rolledBack: stats.rolledBack,
    avgRisk: 0,
    failureRate: 0,
  }));

  // ── Deployment Velocity ──
  const teamVelocity = Object.entries(teamStats).map(([team, stats]) => ({
    team,
    totalChanges: stats.total,
    deployed: stats.deployed,
    avgRisk: 0,
    deployRate: stats.total > 0 ? Math.round((stats.deployed / stats.total) * 100) : 0,
  }));

  // Category breakdown
  const categoryStats: Record<string, number> = {};
  allChanges.forEach((cr) => {
    categoryStats[cr.category || "Uncategorized"] = (categoryStats[cr.category || "Uncategorized"] || 0) + 1;
  });
  const categoryBreakdown = Object.entries(categoryStats)
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);

  return NextResponse.json({
    releaseRiskRadar,
    blastRadius,
    confidenceScores,
    failureAnalysis: {
      totalChanges: allChanges.length,
      deployed: closed.length,
      failed: 0,
      rolledBack: 0,
      changeFailureRate: 0,
      failureByTeam,
      serviceRiskRanking: [] as { service: string; avgRiskExposure: number; changeCount: number }[],
    },
    velocity: {
      teamVelocity,
      categoryBreakdown,
      approvalEfficiency: [] as { id: string; title: string; team: string; approverCount: number; leadTimeHours: number; category: string }[],
    },
    rollbackIntelligence: {
      rollbackCount: 0,
      rollbackRate: 0,
      rollbackData: [] as { id: string; title: string; team: string; category: string; risk: number; rollbackComplexity: string; services: string[] }[],
      rollbackByService: [] as { service: string; count: number }[],
    },
  });
}
