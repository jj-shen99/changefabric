import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/* ── SN field → numeric risk score helpers ── */

function riskScore(snRisk: string): number {
  const r = (snRisk || "").toLowerCase().trim();
  if (r.includes("very high")) return 90;
  if (r.includes("high")) return 75;
  if (r.includes("moderate")) return 50;
  if (r.includes("low")) return 25;
  return 0;
}

function impactScore(snImpact: string): number {
  const i = (snImpact || "").toLowerCase().trim();
  if (i.includes("1")) return 90;
  if (i.includes("2")) return 60;
  if (i.includes("3")) return 30;
  return 0;
}

function priorityScore(snPriority: string): number {
  const p = (snPriority || "").toLowerCase().trim();
  if (p.includes("1")) return 90;
  if (p.includes("2")) return 70;
  if (p.includes("3")) return 45;
  if (p.includes("4")) return 20;
  return 0;
}

/** Composite risk 0–100 from SN risk, impact, priority */
function overallRisk(risk: string, impact: string, priority: string): number {
  return Math.round(riskScore(risk) * 0.4 + impactScore(impact) * 0.35 + priorityScore(priority) * 0.25);
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get("days") || "0", 10);
  
  // Build where clause with date filter and user filter
  const userRole = (session.user as { role?: string }).role;
  const userEmail = session.user.email || "";
  
  // Non-admin users can only see change requests they synced
  const whereClause: Record<string, unknown> = {};
  if (days > 0) {
    whereClause.opened_at = { gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString() };
  }
  if (userRole !== "admin") {
    whereClause.syncedBy = userEmail;
  }

  const [changeRequests, releases] = await Promise.all([
    prisma.changeRequest.findMany({
      where: whereClause,
      include: { validations: true },
      orderBy: { opened_at: "desc" },
    }),
    prisma.release.findMany({
      orderBy: { scheduledDate: "desc" },
    }),
  ]);

  // Compute real risk scores from SN fields
  const formattedChanges = changeRequests.map((cr) => {
    const overall = overallRisk(cr.risk, cr.impact, cr.priority);
    const riskNum = riskScore(cr.risk);
    const impactNum = impactScore(cr.impact);
    const priNum = priorityScore(cr.priority);
    const services = cr.business_service ? [cr.business_service] : [];
    if (cr.cmdb_ci && cr.cmdb_ci !== cr.business_service) services.push(cr.cmdb_ci);

    return {
      ...cr,
      // Legacy aliases
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
      approvers: cr.approval_history ? [cr.approval_history] : ([] as string[]),
      tags: [cr.type, cr.category].filter(Boolean) as string[],
      // Real risk object computed from SN fields
      impact: {
        outageRisk: riskNum,
        performanceRisk: Math.round((riskNum + impactNum) / 2),
        functionalityRisk: impactNum,
        securityRisk: priNum,
        dataIntegrityRisk: Math.round((impactNum + priNum) / 2),
        overallRisk: overall,
        affectedServices: services,
        affectedUsers: 0,
        estimatedDowntime: cr.work_start && cr.work_end ? `${cr.work_start} – ${cr.work_end}` : "N/A",
        rollbackComplexity: cr.risk.toLowerCase().includes("high") ? "high" : cr.risk.toLowerCase().includes("moderate") ? "medium" : "low",
        blastRadius: cr.impact.includes("1") ? "critical" : cr.impact.includes("2") ? "high" : "low",
      },
      validations: cr.validations.map((v) => ({
        id: v.id,
        type: v.type,
        name: v.name,
        status: v.status,
      })),
    };
  });

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

  // ── Compute real KPIs from change requests ──
  const total = changeRequests.length;
  const pendingStates = ["New", "Assess", "Authorize", "Scheduled"];
  const implementedStates = ["Implement", "Review", "Closed"];
  const pending = changeRequests.filter((cr) => pendingStates.includes(cr.state)).length;
  const closed = changeRequests.filter((cr) => cr.state === "Closed").length;
  const canceled = changeRequests.filter((cr) => cr.state === "Canceled").length;
  const implemented = changeRequests.filter((cr) => implementedStates.includes(cr.state)).length;
  const riskScores = formattedChanges.map((cr) => cr.impact.overallRisk);
  const avgRisk = total > 0 ? Math.round(riskScores.reduce((a, b) => a + b, 0) / total) : 0;

  // Compute change lead time (avg days from opened_at to closed_at for closed items)
  const leadTimes: number[] = [];
  for (const cr of changeRequests) {
    if (cr.state === "Closed" && cr.opened_at && cr.closed_at) {
      const days = (new Date(cr.closed_at).getTime() - new Date(cr.opened_at).getTime()) / 86400000;
      if (days > 0) leadTimes.push(days);
    }
  }
  const avgLeadTime = leadTimes.length > 0 ? (leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length).toFixed(1) : "N/A";

  const dashboardMetrics = {
    totalChanges: total,
    pendingChanges: pending,
    deployedToday: implemented,
    failedDeployments: canceled,
    avgRiskScore: avgRisk,
    validationPassRate: total > 0 ? Math.round((closed / Math.max(closed + canceled, 1)) * 100 * 10) / 10 : 0,
    avgDeployTime: avgLeadTime !== "N/A" ? `${avgLeadTime} days` : "N/A",
    rollbackRate: total > 0 ? Math.round((canceled / total) * 100 * 10) / 10 : 0,
    mttr: "N/A",
    changeLeadTime: avgLeadTime !== "N/A" ? `${avgLeadTime} days` : "N/A",
  };

  // ── Compute real trend data from opened_at dates ──
  const weekBuckets = new Map<string, { count: number; riskSum: number; closed: number; canceled: number }>();
  for (let i = 0; i < formattedChanges.length; i++) {
    const cr = changeRequests[i];
    const fc = formattedChanges[i];
    if (!cr.opened_at) continue;
    const d = new Date(cr.opened_at);
    // Group by ISO week (Mon-based)
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d);
    monday.setDate(diff);
    const key = monday.toISOString().slice(0, 10);
    const bucket = weekBuckets.get(key) || { count: 0, riskSum: 0, closed: 0, canceled: 0 };
    bucket.count++;
    bucket.riskSum += fc.impact.overallRisk;
    if (cr.state === "Closed") bucket.closed++;
    if (cr.state === "Canceled") bucket.canceled++;
    weekBuckets.set(key, bucket);
  }

  const sortedWeeks = [...weekBuckets.entries()].sort((a, b) => a[0].localeCompare(b[0])).slice(-8);

  const riskTrendData = sortedWeeks.map(([week, b]) => ({
    date: new Date(week).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    avgRisk: b.count > 0 ? Math.round(b.riskSum / b.count) : 0,
    deployments: b.count,
  }));

  const deploymentFrequencyData = sortedWeeks.map(([week, b]) => ({
    date: new Date(week).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    successful: b.closed,
    failed: b.canceled,
    rolledBack: 0,
  }));

  // ── Compute real impact by category ──
  const catMap = new Map<string, { riskSum: number; count: number }>();
  for (const fc of formattedChanges) {
    const cat = (fc.category as string) || "Other";
    const entry = catMap.get(cat) || { riskSum: 0, count: 0 };
    entry.riskSum += fc.impact.overallRisk;
    entry.count++;
    catMap.set(cat, entry);
  }
  const impactByCategory = [...catMap.entries()]
    .map(([category, e]) => ({
      category,
      avgRisk: e.count > 0 ? Math.round(e.riskSum / e.count) : 0,
      count: e.count,
    }))
    .sort((a, b) => b.avgRisk - a.avgRisk);

  // ── Compute validation trend (placeholder - no real test data) ──
  const validationTrendData = sortedWeeks.map(([week, b]) => ({
    date: new Date(week).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    passRate: b.count > 0 ? Math.round((b.closed / Math.max(b.closed + b.canceled, 1)) * 100) : 0,
    totalTests: b.count,
  }));

  return NextResponse.json({
    changeRequests: formattedChanges,
    releases: formattedReleases,
    dashboardMetrics,
    riskTrendData,
    validationTrendData,
    deploymentFrequencyData,
    impactByCategory,
  });
}
