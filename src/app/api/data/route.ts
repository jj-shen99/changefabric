import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [changeRequests, releases, metrics] = await Promise.all([
    prisma.changeRequest.findMany({
      include: { validations: true },
      orderBy: { opened_at: "desc" },
    }),
    prisma.release.findMany({
      orderBy: { scheduledDate: "desc" },
    }),
    prisma.dashboardMetric.findFirst({
      orderBy: { recordedAt: "desc" },
    }),
  ]);

  // Return SN fields as-is, plus backward-compat aliases for old pages
  const formattedChanges = changeRequests.map((cr) => ({
    ...cr,
    // Legacy aliases so existing dashboard pages still work
    id: cr.number,
    title: cr.short_description,
    author: cr.opened_by,
    team: cr.assignment_group,
    status: cr.state,
    createdAt: cr.opened_at,
    sn_impact: cr.impact,
    linesAdded: 0,
    linesRemoved: 0,
    filesChanged: 0,
    approvers: [] as string[],
    tags: [] as string[],
    impact: {
      outageRisk: 0,
      performanceRisk: 0,
      functionalityRisk: 0,
      securityRisk: 0,
      dataIntegrityRisk: 0,
      overallRisk: 0,
      affectedServices: [] as string[],
      affectedUsers: 0,
      estimatedDowntime: "0 min",
      rollbackComplexity: "low",
      blastRadius: "low",
    },
    validations: cr.validations.map((v) => ({
      id: v.id,
      type: v.type,
      name: v.name,
      status: v.status,
    })),
  }));

  const formattedReleases = releases.map((r) => ({
    id: r.id,
    name: r.name,
    version: r.version,
    status: r.status,
    scheduledDate: r.scheduledDate.toISOString(),
    actualDate: r.actualDate?.toISOString(),
    changeRequests: [] as string[],
    overallRisk: r.overallRisk,
    releaseManager: r.releaseManager,
    notes: r.notes,
  }));

  const dashboardMetrics = metrics
    ? {
        totalChanges: metrics.totalChanges,
        pendingChanges: metrics.pendingChanges,
        deployedToday: metrics.deployedToday,
        failedDeployments: metrics.failedDeployments,
        avgRiskScore: metrics.avgRiskScore,
        validationPassRate: metrics.validationPassRate,
        avgDeployTime: metrics.avgDeployTime,
        rollbackRate: metrics.rollbackRate,
        mttr: metrics.mttr,
        changeLeadTime: metrics.changeLeadTime,
      }
    : null;

  return NextResponse.json({
    changeRequests: formattedChanges,
    releases: formattedReleases,
    dashboardMetrics,
    riskTrendData: [
      { date: "Feb 3", avgRisk: 25, deployments: 12 },
      { date: "Feb 10", avgRisk: 32, deployments: 15 },
      { date: "Feb 17", avgRisk: 28, deployments: 10 },
      { date: "Feb 24", avgRisk: 45, deployments: 18 },
      { date: "Mar 3", avgRisk: 38, deployments: 14 },
      { date: "Mar 9", avgRisk: 42, deployments: 8 },
    ],
    validationTrendData: [
      { date: "Feb 3", passRate: 96, totalTests: 1240 },
      { date: "Feb 10", passRate: 92, totalTests: 1580 },
      { date: "Feb 17", passRate: 98, totalTests: 1120 },
      { date: "Feb 24", passRate: 89, totalTests: 1890 },
      { date: "Mar 3", passRate: 94, totalTests: 1650 },
      { date: "Mar 9", passRate: 91, totalTests: 1420 },
    ],
    deploymentFrequencyData: [
      { date: "Feb 3", successful: 11, failed: 1, rolledBack: 0 },
      { date: "Feb 10", successful: 13, failed: 1, rolledBack: 1 },
      { date: "Feb 17", successful: 10, failed: 0, rolledBack: 0 },
      { date: "Feb 24", successful: 15, failed: 2, rolledBack: 1 },
      { date: "Mar 3", successful: 12, failed: 1, rolledBack: 1 },
      { date: "Mar 9", successful: 6, failed: 2, rolledBack: 0 },
    ],
    impactByCategory: [
      { category: "Infrastructure", avgRisk: 62, count: 8 },
      { category: "Database", avgRisk: 58, count: 5 },
      { category: "Security", avgRisk: 35, count: 12 },
      { category: "Feature", avgRisk: 28, count: 42 },
      { category: "Bugfix", avgRisk: 22, count: 35 },
      { category: "Config", avgRisk: 12, count: 25 },
      { category: "Dependencies", avgRisk: 30, count: 20 },
    ],
  });
}
