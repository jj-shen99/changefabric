import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [changeRequests, releases] = await Promise.all([
    prisma.changeRequest.findMany({ include: { impact: true, validations: true }, orderBy: { createdAt: "desc" } }),
    prisma.release.findMany({ include: { changeRequests: { include: { impact: true, validations: true } } }, orderBy: { scheduledDate: "desc" } }),
  ]);

  // ── Release Risk Radar ──────────────────────────────────
  const releaseRiskRadar = releases.map((rel) => {
    const changes = rel.changeRequests;
    const totalLines = changes.reduce((s, c) => s + c.linesAdded + c.linesRemoved, 0);
    const totalFiles = changes.reduce((s, c) => s + c.filesChanged, 0);
    const allServices = new Set(changes.flatMap((c) => c.impact ? JSON.parse(c.impact.affectedServices) : []));
    const allValidations = changes.flatMap((c) => c.validations);
    const avgCoverage = allValidations.filter((v) => v.coverage !== null && v.coverage !== undefined).length > 0
      ? allValidations.filter((v) => v.coverage !== null && v.coverage !== undefined).reduce((s, v) => s + (v.coverage || 0), 0) / allValidations.filter((v) => v.coverage !== null && v.coverage !== undefined).length
      : 0;
    const passRate = allValidations.length > 0
      ? (allValidations.filter((v) => v.status === "passed").length / allValidations.length) * 100
      : 0;

    return {
      releaseId: rel.id,
      releaseName: rel.name,
      version: rel.version,
      status: rel.status,
      overallRisk: rel.overallRisk,
      changeCount: changes.length,
      totalCodeChurn: totalLines,
      totalFilesChanged: totalFiles,
      servicesImpacted: allServices.size,
      servicesList: Array.from(allServices),
      avgTestCoverage: Math.round(avgCoverage * 10) / 10,
      validationPassRate: Math.round(passRate * 10) / 10,
      scheduledDate: rel.scheduledDate.toISOString(),
      riskFactors: {
        codeChurn: totalLines > 2000 ? "high" : totalLines > 500 ? "medium" : "low",
        serviceSpread: allServices.size > 5 ? "high" : allServices.size > 2 ? "medium" : "low",
        testCoverage: avgCoverage < 70 ? "high" : avgCoverage < 85 ? "medium" : "low",
        rollbackComplexity: changes.some((c) => c.impact?.rollbackComplexity === "critical") ? "critical"
          : changes.some((c) => c.impact?.rollbackComplexity === "high") ? "high" : "low",
      },
    };
  });

  // ── Blast Radius ────────────────────────────────────────
  const serviceMap: Record<string, { changeCount: number; totalRisk: number; changes: string[]; releases: string[] }> = {};
  changeRequests.forEach((cr) => {
    const services: string[] = cr.impact ? JSON.parse(cr.impact.affectedServices) : [];
    services.forEach((svc) => {
      if (!serviceMap[svc]) serviceMap[svc] = { changeCount: 0, totalRisk: 0, changes: [], releases: [] };
      serviceMap[svc].changeCount++;
      serviceMap[svc].totalRisk += cr.impact?.overallRisk || 0;
      serviceMap[svc].changes.push(cr.id);
      if (cr.releaseId && !serviceMap[svc].releases.includes(cr.releaseId)) {
        serviceMap[svc].releases.push(cr.releaseId);
      }
    });
  });
  const blastRadius = Object.entries(serviceMap)
    .map(([service, data]) => ({
      service,
      changeCount: data.changeCount,
      avgRisk: Math.round(data.totalRisk / data.changeCount),
      changes: data.changes,
      releases: data.releases,
    }))
    .sort((a, b) => b.avgRisk - a.avgRisk);

  // ── Release Confidence Scores ───────────────────────────
  const confidenceScores = releases.map((rel) => {
    const changes = rel.changeRequests;
    const allValidations = changes.flatMap((c) => c.validations);
    const passed = allValidations.filter((v) => v.status === "passed").length;
    const failed = allValidations.filter((v) => v.status === "failed").length;
    const total = allValidations.length;
    const passRate = total > 0 ? (passed / total) * 100 : 0;
    const avgCoverage = allValidations.filter((v) => v.coverage !== null && v.coverage !== undefined).length > 0
      ? allValidations.filter((v) => v.coverage !== null && v.coverage !== undefined).reduce((s, v) => s + (v.coverage || 0), 0) / allValidations.filter((v) => v.coverage !== null && v.coverage !== undefined).length
      : 0;
    const maxRollbackComplexity = changes.reduce((max, c) => {
      const val = c.impact?.rollbackComplexity || "low";
      const order: Record<string, number> = { low: 0, medium: 1, high: 2, critical: 3 };
      return (order[val] || 0) > (order[max] || 0) ? val : max;
    }, "low");
    const hasBlockers = allValidations.some((v) => {
      const blockers = JSON.parse(v.blockers || "[]");
      return blockers.length > 0;
    });

    // Composite score: 40% test pass rate + 25% coverage + 20% inverse risk + 15% no blockers
    const testScore = passRate;
    const coverageScore = avgCoverage;
    const riskScore = Math.max(0, 100 - rel.overallRisk);
    const blockerScore = hasBlockers ? 0 : 100;
    const confidence = Math.round(testScore * 0.4 + coverageScore * 0.25 + riskScore * 0.2 + blockerScore * 0.15);

    let recommendation: "continue" | "pause" | "rollback";
    if (confidence >= 80 && failed === 0 && !hasBlockers) recommendation = "continue";
    else if (confidence >= 50) recommendation = "pause";
    else recommendation = "rollback";

    return {
      releaseId: rel.id,
      releaseName: rel.name,
      version: rel.version,
      status: rel.status,
      confidence,
      recommendation,
      breakdown: {
        testPassRate: Math.round(passRate),
        testCoverage: Math.round(avgCoverage),
        riskScore: rel.overallRisk,
        failedTests: failed,
        hasBlockers,
        rollbackComplexity: maxRollbackComplexity,
      },
      totalValidations: total,
      passedValidations: passed,
      failedValidations: failed,
    };
  });

  // ── Change Failure Analysis ─────────────────────────────
  const allChanges = changeRequests;
  const deployed = allChanges.filter((c) => c.status === "deployed");
  const failed = allChanges.filter((c) => c.status === "failed");
  const rolledBack = allChanges.filter((c) => c.status === "rolled_back");
  const failureRate = deployed.length + failed.length + rolledBack.length > 0
    ? ((failed.length + rolledBack.length) / (deployed.length + failed.length + rolledBack.length)) * 100
    : 0;

  // Per-team failure data
  const teamStats: Record<string, { total: number; deployed: number; failed: number; rolledBack: number; avgRisk: number }> = {};
  allChanges.forEach((cr) => {
    if (!teamStats[cr.team]) teamStats[cr.team] = { total: 0, deployed: 0, failed: 0, rolledBack: 0, avgRisk: 0 };
    teamStats[cr.team].total++;
    if (cr.status === "deployed") teamStats[cr.team].deployed++;
    if (cr.status === "failed") teamStats[cr.team].failed++;
    if (cr.status === "rolled_back") teamStats[cr.team].rolledBack++;
    teamStats[cr.team].avgRisk += cr.impact?.overallRisk || 0;
  });
  const failureByTeam = Object.entries(teamStats).map(([team, stats]) => ({
    team,
    total: stats.total,
    deployed: stats.deployed,
    failed: stats.failed,
    rolledBack: stats.rolledBack,
    avgRisk: Math.round(stats.avgRisk / stats.total),
    failureRate: stats.total > 0 ? Math.round(((stats.failed + stats.rolledBack) / stats.total) * 100) : 0,
  }));

  // Per-service failure exposure
  const serviceRisk: Record<string, { exposure: number; changes: number }> = {};
  allChanges.forEach((cr) => {
    const services: string[] = cr.impact ? JSON.parse(cr.impact.affectedServices) : [];
    services.forEach((svc) => {
      if (!serviceRisk[svc]) serviceRisk[svc] = { exposure: 0, changes: 0 };
      serviceRisk[svc].exposure += cr.impact?.overallRisk || 0;
      serviceRisk[svc].changes++;
    });
  });
  const serviceRiskRanking = Object.entries(serviceRisk)
    .map(([service, data]) => ({
      service,
      avgRiskExposure: Math.round(data.exposure / data.changes),
      changeCount: data.changes,
    }))
    .sort((a, b) => b.avgRiskExposure - a.avgRiskExposure);

  // ── Deployment Velocity ─────────────────────────────────
  const teamVelocity = Object.entries(teamStats).map(([team, stats]) => ({
    team,
    totalChanges: stats.total,
    deployed: stats.deployed,
    avgRisk: Math.round(stats.avgRisk / stats.total),
    deployRate: stats.total > 0 ? Math.round((stats.deployed / stats.total) * 100) : 0,
  }));

  // Category breakdown
  const categoryStats: Record<string, number> = {};
  allChanges.forEach((cr) => {
    categoryStats[cr.category] = (categoryStats[cr.category] || 0) + 1;
  });
  const categoryBreakdown = Object.entries(categoryStats)
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);

  // Approval efficiency (approvers vs time from created to deployed)
  const approvalEfficiency = allChanges
    .filter((cr) => cr.deployedAt)
    .map((cr) => {
      const leadTimeMs = cr.deployedAt!.getTime() - cr.createdAt.getTime();
      const leadTimeHours = Math.round(leadTimeMs / (1000 * 60 * 60) * 10) / 10;
      const approvers: string[] = JSON.parse(cr.approvers);
      return {
        id: cr.id,
        title: cr.title,
        team: cr.team,
        approverCount: approvers.length,
        leadTimeHours,
        category: cr.category,
      };
    });

  // ── Rollback Intelligence ───────────────────────────────
  const rollbackData = allChanges
    .filter((cr) => cr.status === "rolled_back")
    .map((cr) => ({
      id: cr.id,
      title: cr.title,
      team: cr.team,
      category: cr.category,
      risk: cr.impact?.overallRisk || 0,
      rollbackComplexity: cr.impact?.rollbackComplexity || "unknown",
      services: cr.impact ? JSON.parse(cr.impact.affectedServices) : [],
    }));

  // Service rollback frequency
  const rollbackByService: Record<string, number> = {};
  rollbackData.forEach((rd) => {
    rd.services.forEach((svc: string) => {
      rollbackByService[svc] = (rollbackByService[svc] || 0) + 1;
    });
  });

  return NextResponse.json({
    releaseRiskRadar,
    blastRadius,
    confidenceScores,
    failureAnalysis: {
      totalChanges: allChanges.length,
      deployed: deployed.length,
      failed: failed.length,
      rolledBack: rolledBack.length,
      changeFailureRate: Math.round(failureRate * 10) / 10,
      failureByTeam,
      serviceRiskRanking,
    },
    velocity: {
      teamVelocity,
      categoryBreakdown,
      approvalEfficiency,
    },
    rollbackIntelligence: {
      rollbackCount: rolledBack.length,
      rollbackRate: allChanges.length > 0 ? Math.round((rolledBack.length / allChanges.length) * 100 * 10) / 10 : 0,
      rollbackData,
      rollbackByService: Object.entries(rollbackByService)
        .map(([service, count]) => ({ service, count }))
        .sort((a, b) => b.count - a.count),
    },
  });
}
