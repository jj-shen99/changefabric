/**
 * Pure analytics aggregations over a list of change requests.
 *
 * No I/O, no DB calls — pass in materialized records and receive the
 * dashboard payload. The HTTP layer is a thin wrapper around these.
 */

import type { ChangeRequest } from "../schema";
import { TERMINAL_STATES } from "../schema";

export interface DashboardMetrics {
  totalChanges: number;
  pendingChanges: number;
  inFlightChanges: number;
  closedChanges: number;
  rejectedChanges: number;
  emergencyChanges: number;
  avgRiskScore: number;
  avgMlRiskScore: number;
  approvalThroughputDays: number;
  changeLeadTimeDays: number;
  failureRate: number;
}

export interface CategoryBucket {
  category: string;
  avgRisk: number;
  count: number;
}

export interface TimeBucket {
  date: string;
  count: number;
  avgRisk: number;
  closed: number;
  failed: number;
}

const PENDING_STATES = new Set(["draft", "submitted", "awaiting_approval"]);
const IN_FLIGHT_STATES = new Set([
  "approved",
  "scheduled",
  "implemented",
]);

function days(from: Date, to: Date): number {
  return (to.getTime() - from.getTime()) / 86400000;
}

function isoWeekKey(d: Date): string {
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d);
  monday.setDate(diff);
  return monday.toISOString().slice(0, 10);
}

export function computeDashboardMetrics(crs: ChangeRequest[]): DashboardMetrics {
  const total = crs.length;
  const pending = crs.filter((c) => PENDING_STATES.has(c.state)).length;
  const inFlight = crs.filter((c) => IN_FLIGHT_STATES.has(c.state)).length;
  const closed = crs.filter((c) => c.state === "closed").length;
  const rejected = crs.filter((c) => c.state === "rejected" || c.state === "canceled").length;
  const emergency = crs.filter((c) => c.type === "emergency").length;

  const avgRisk =
    total === 0
      ? 0
      : Math.round(crs.reduce((a, c) => a + (c.computedRiskScore || 0), 0) / total);

  const mlScored = crs.filter((c) => typeof c.mlRiskScore === "number");
  const avgMl =
    mlScored.length === 0
      ? 0
      : Math.round(
          mlScored.reduce((a, c) => a + (c.mlRiskScore as number), 0) /
            mlScored.length
        );

  // Approval throughput: avg days from createdAt to first state leaving awaiting_approval (approximated by approvalState=approved && approvedAt fallback)
  const approvalDurations: number[] = [];
  for (const c of crs) {
    if (c.approvalState === "approved" && c.actualStart && c.createdAt) {
      approvalDurations.push(days(new Date(c.createdAt), new Date(c.actualStart)));
    }
  }
  const approvalThroughputDays =
    approvalDurations.length === 0
      ? 0
      : +(
          approvalDurations.reduce((a, b) => a + b, 0) / approvalDurations.length
        ).toFixed(2);

  const leadTimes: number[] = [];
  for (const c of crs) {
    if (c.state === "closed" && c.closedAt && c.createdAt) {
      leadTimes.push(days(new Date(c.createdAt), new Date(c.closedAt)));
    }
  }
  const changeLeadTimeDays =
    leadTimes.length === 0
      ? 0
      : +(leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length).toFixed(2);

  const terminal = crs.filter((c) => TERMINAL_STATES.includes(c.state)).length;
  const failureRate =
    terminal === 0 ? 0 : +((rejected / terminal) * 100).toFixed(1);

  return {
    totalChanges: total,
    pendingChanges: pending,
    inFlightChanges: inFlight,
    closedChanges: closed,
    rejectedChanges: rejected,
    emergencyChanges: emergency,
    avgRiskScore: avgRisk,
    avgMlRiskScore: avgMl,
    approvalThroughputDays,
    changeLeadTimeDays,
    failureRate,
  };
}

export function impactByCategory(crs: ChangeRequest[]): CategoryBucket[] {
  const map = new Map<string, { count: number; risk: number }>();
  for (const c of crs) {
    const key = c.category || "other";
    const e = map.get(key) ?? { count: 0, risk: 0 };
    e.count++;
    e.risk += c.computedRiskScore || 0;
    map.set(key, e);
  }
  return [...map.entries()]
    .map(([category, e]) => ({
      category,
      count: e.count,
      avgRisk: e.count ? Math.round(e.risk / e.count) : 0,
    }))
    .sort((a, b) => b.avgRisk - a.avgRisk);
}

export function weeklyTrend(crs: ChangeRequest[], take = 8): TimeBucket[] {
  const buckets = new Map<string, TimeBucket>();
  for (const c of crs) {
    if (!c.createdAt) continue;
    const key = isoWeekKey(new Date(c.createdAt));
    const existing =
      buckets.get(key) ??
      {
        date: new Date(key).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        count: 0,
        avgRisk: 0,
        closed: 0,
        failed: 0,
      };
    existing.count++;
    existing.avgRisk += c.computedRiskScore || 0;
    if (c.state === "closed") existing.closed++;
    if (c.state === "rejected" || c.state === "canceled") existing.failed++;
    buckets.set(key, existing);
  }
  const sorted = [...buckets.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  return sorted.slice(-take).map(([, b]) => ({
    ...b,
    avgRisk: b.count ? Math.round(b.avgRisk / b.count) : 0,
  }));
}

export interface ApprovalAnalytics {
  pending: number;
  approved: number;
  rejected: number;
  avgApproversPerCR: number;
  topApprovers: Array<{ email: string; decisions: number }>;
}

export function approvalAnalytics(
  approvals: Array<{ approverEmail: string; decision: string; changeRequestId: string }>
): ApprovalAnalytics {
  const pending = approvals.filter((a) => a.decision === "pending").length;
  const approved = approvals.filter((a) => a.decision === "approved").length;
  const rejected = approvals.filter((a) => a.decision === "rejected").length;
  const perCR = new Map<string, number>();
  const perApprover = new Map<string, number>();
  for (const a of approvals) {
    perCR.set(a.changeRequestId, (perCR.get(a.changeRequestId) ?? 0) + 1);
    if (a.decision !== "pending") {
      perApprover.set(a.approverEmail, (perApprover.get(a.approverEmail) ?? 0) + 1);
    }
  }
  const avgApproversPerCR =
    perCR.size === 0
      ? 0
      : +(
          [...perCR.values()].reduce((a, b) => a + b, 0) / perCR.size
        ).toFixed(2);
  const topApprovers = [...perApprover.entries()]
    .map(([email, decisions]) => ({ email, decisions }))
    .sort((a, b) => b.decisions - a.decisions)
    .slice(0, 5);
  return { pending, approved, rejected, avgApproversPerCR, topApprovers };
}
