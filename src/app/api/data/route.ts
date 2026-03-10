import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function parseJson(str: string): unknown {
  try {
    return JSON.parse(str);
  } catch {
    return str;
  }
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [changeRequests, releases, metrics] = await Promise.all([
    prisma.changeRequest.findMany({
      include: { impact: true, validations: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.release.findMany({
      orderBy: { scheduledDate: "desc" },
    }),
    prisma.dashboardMetric.findFirst({
      orderBy: { recordedAt: "desc" },
    }),
  ]);

  const formattedChanges = changeRequests.map((cr) => ({
    id: cr.id,
    title: cr.title,
    description: cr.description,
    category: cr.category,
    status: cr.status,
    author: cr.author,
    team: cr.team,
    createdAt: cr.createdAt.toISOString(),
    scheduledAt: cr.scheduledAt?.toISOString(),
    deployedAt: cr.deployedAt?.toISOString(),
    releaseId: cr.releaseId,
    jiraTicket: cr.jiraTicket,
    prUrl: cr.prUrl,
    linesAdded: cr.linesAdded,
    linesRemoved: cr.linesRemoved,
    filesChanged: cr.filesChanged,
    approvers: parseJson(cr.approvers) as string[],
    tags: parseJson(cr.tags) as string[],
    impact: cr.impact
      ? {
          outageRisk: cr.impact.outageRisk,
          performanceRisk: cr.impact.performanceRisk,
          functionalityRisk: cr.impact.functionalityRisk,
          securityRisk: cr.impact.securityRisk,
          dataIntegrityRisk: cr.impact.dataIntegrityRisk,
          overallRisk: cr.impact.overallRisk,
          affectedServices: parseJson(cr.impact.affectedServices) as string[],
          affectedUsers: cr.impact.affectedUsers,
          estimatedDowntime: cr.impact.estimatedDowntime,
          rollbackComplexity: cr.impact.rollbackComplexity,
          blastRadius: cr.impact.blastRadius,
        }
      : null,
    validations: cr.validations.map((v) => ({
      id: v.id,
      type: v.type,
      name: v.name,
      status: v.status,
      startedAt: v.startedAt?.toISOString(),
      completedAt: v.completedAt?.toISOString(),
      duration: v.duration,
      coverage: v.coverage,
      details: v.details,
      blockers: parseJson(v.blockers) as string[],
    })),
  }));

  const formattedReleases = releases.map((r) => ({
    id: r.id,
    name: r.name,
    version: r.version,
    status: r.status,
    scheduledDate: r.scheduledDate.toISOString(),
    actualDate: r.actualDate?.toISOString(),
    changeRequests: changeRequests
      .filter((cr) => cr.releaseId === r.id)
      .map((cr) => cr.id),
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
