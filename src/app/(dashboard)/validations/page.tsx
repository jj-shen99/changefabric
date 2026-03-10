"use client";

import { useState, useMemo } from "react";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Filter,
  AlertTriangle,
  TestTube2,
  ShieldCheck,
  Eye,
  Gauge,
  RotateCcw,
  Code2,
  Rocket,
  FlaskConical,
  Search,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts";
import { Card, CardHeader, CardTitle } from "@/components/card";
import { ValidationStatusBadge } from "@/components/status-badge";
import { useData } from "@/hooks";
import { ValidationStatus, ValidationType } from "@/lib/types";

const typeIcons: Record<ValidationType, React.ElementType> = {
  unit_test: TestTube2,
  integration_test: FlaskConical,
  performance_test: Gauge,
  security_scan: ShieldCheck,
  code_review: Code2,
  uat: Eye,
  smoke_test: Rocket,
  regression_test: RotateCcw,
  canary_deploy: Rocket,
  rollback_test: RotateCcw,
};

type ViewMode = "all" | "by-release" | "by-team";

export default function ValidationsPage() {
  const { changeRequests, releases, loading, error } = useData();
  const [typeFilter, setTypeFilter] = useState<ValidationType | "all">("all");
  const [statusFilter, setStatusFilter] = useState<ValidationStatus | "all">("all");
  const [releaseFilter, setReleaseFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("all");
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  // Team pass rate (must be before early returns)
  const teamStats = useMemo(() => {
    const allVals = changeRequests.flatMap((cr) =>
      cr.validations.map((v) => ({ ...v, team: cr.team }))
    );
    const map: Record<string, { total: number; passed: number; failed: number }> = {};
    allVals.forEach((v) => {
      if (!map[v.team]) map[v.team] = { total: 0, passed: 0, failed: 0 };
      map[v.team].total++;
      if (v.status === "passed") map[v.team].passed++;
      if (v.status === "failed") map[v.team].failed++;
    });
    return Object.entries(map).map(([team, s]) => ({
      team,
      passRate: s.total > 0 ? Math.round((s.passed / s.total) * 100) : 0,
      failRate: s.total > 0 ? Math.round((s.failed / s.total) * 100) : 0,
      total: s.total,
    })).sort((a, b) => b.passRate - a.passRate);
  }, [changeRequests]);

  // Release readiness (must be before early returns)
  const releaseReadiness = useMemo(() => {
    return releases.map((rel) => {
      const relChanges = changeRequests.filter((cr) => cr.releaseId === rel.id);
      const relValidations = relChanges.flatMap((cr) => cr.validations);
      const relPassed = relValidations.filter((v) => v.status === "passed").length;
      const relFailed = relValidations.filter((v) => v.status === "failed").length;
      const relTotal = relValidations.length;
      const relPassRate = relTotal > 0 ? Math.round((relPassed / relTotal) * 100) : 0;
      const hasBlockers = relValidations.some((v) => v.status === "failed" && v.blockers && v.blockers.length > 0);
      return {
        id: rel.id,
        name: rel.name,
        version: rel.version,
        status: rel.status,
        changeCount: relChanges.length,
        totalValidations: relTotal,
        passed: relPassed,
        failed: relFailed,
        passRate: relPassRate,
        hasBlockers,
        changes: relChanges.map((cr) => ({
          id: cr.id,
          title: cr.title,
          team: cr.team,
          validations: cr.validations,
        })),
      };
    });
  }, [releases, changeRequests]);

  if (loading) return <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-32 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />)}</div>;
  if (error) return <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">{error}</div>;

  const toggleSection = (id: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const allValidations = changeRequests.flatMap((cr) =>
    cr.validations.map((v) => ({ ...v, changeId: cr.id, changeTitle: cr.title, team: cr.team, releaseId: cr.releaseId || null }))
  );

  const filtered = allValidations.filter((v) => {
    const matchType = typeFilter === "all" || v.type === typeFilter;
    const matchStatus = statusFilter === "all" || v.status === statusFilter;
    const matchRelease = releaseFilter === "all" || v.releaseId === releaseFilter;
    const matchSearch = !searchQuery || v.name.toLowerCase().includes(searchQuery.toLowerCase()) || v.changeTitle.toLowerCase().includes(searchQuery.toLowerCase()) || v.changeId.toLowerCase().includes(searchQuery.toLowerCase());
    return matchType && matchStatus && matchRelease && matchSearch;
  });

  // Stats
  const total = allValidations.length;
  const passed = allValidations.filter((v) => v.status === "passed").length;
  const failedCount = allValidations.filter((v) => v.status === "failed").length;
  const running = allValidations.filter((v) => v.status === "running").length;
  const pending = allValidations.filter((v) => v.status === "pending").length;
  const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;

  const pieData = [
    { name: "Passed", value: passed, color: "#22c55e" },
    { name: "Failed", value: failedCount, color: "#ef4444" },
    { name: "Running", value: running, color: "#3b82f6" },
    { name: "Pending", value: pending, color: "#94a3b8" },
  ];

  // Validations by type
  const typeStats = Object.entries(
    allValidations.reduce((acc, v) => {
      if (!acc[v.type]) acc[v.type] = { total: 0, passed: 0 };
      acc[v.type].total++;
      if (v.status === "passed") acc[v.type].passed++;
      return acc;
    }, {} as Record<string, { total: number; passed: number }>)
  ).map(([type, stats]) => ({
    type: type.replace(/_/g, " "),
    passRate: Math.round((stats.passed / stats.total) * 100),
    total: stats.total,
  }));

  // Blockers
  const blockers = allValidations.filter(
    (v) => v.status === "failed" && v.blockers && v.blockers.length > 0
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Validations</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Track test results, approvals, and deployment gates across all change requests and releases
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {[
          { label: "Total", value: total, icon: TestTube2, iconBg: "bg-gray-100 dark:bg-gray-800", iconColor: "text-gray-600 dark:text-gray-400", valueColor: "text-gray-900 dark:text-gray-100" },
          { label: "Passed", value: passed, icon: CheckCircle2, iconBg: "bg-green-100 dark:bg-green-900", iconColor: "text-green-600 dark:text-green-400", valueColor: "text-green-600 dark:text-green-400" },
          { label: "Failed", value: failedCount, icon: XCircle, iconBg: "bg-red-100 dark:bg-red-900", iconColor: "text-red-600 dark:text-red-400", valueColor: "text-red-600 dark:text-red-400" },
          { label: "Running", value: running, icon: Loader2, iconBg: "bg-blue-100 dark:bg-blue-900", iconColor: "text-blue-600 dark:text-blue-400", valueColor: "text-blue-600 dark:text-blue-400" },
          { label: "Pending", value: pending, icon: Clock, iconBg: "bg-gray-100 dark:bg-gray-800", iconColor: "text-gray-400", valueColor: "text-gray-400" },
          { label: "Pass Rate", value: `${passRate}%`, icon: ShieldCheck, iconBg: "bg-emerald-100 dark:bg-emerald-900", iconColor: "text-emerald-600 dark:text-emerald-400", valueColor: passRate >= 80 ? "text-green-600 dark:text-green-400" : passRate >= 60 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400" },
        ].map((kpi) => (
          <Card key={kpi.label} className="p-4">
            <div className="flex items-center gap-3">
              <div className={`rounded-lg p-2 ${kpi.iconBg}`}>
                <kpi.icon className={`h-4 w-4 ${kpi.iconColor}`} />
              </div>
              <div>
                <p className={`text-2xl font-bold ${kpi.valueColor}`}>{kpi.value}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{kpi.label}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>Status Distribution</CardTitle></CardHeader>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value">
                  {pieData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap justify-center gap-3 text-xs text-gray-600 dark:text-gray-400">
            {pieData.map((d) => (
              <span key={d.name} className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: d.color }} />
                {d.name} ({d.value})
              </span>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader><CardTitle>Pass Rate by Type</CardTitle></CardHeader>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={typeStats}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="type" tick={{ fontSize: 9 }} stroke="#94a3b8" angle={-25} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" domain={[0, 100]} />
                <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0" }} />
                <Bar dataKey="passRate" fill="#2563eb" radius={[4, 4, 0, 0]} name="Pass Rate %" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader><CardTitle>Pass Rate by Team</CardTitle></CardHeader>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={teamStats} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 11 }} stroke="#94a3b8" domain={[0, 100]} />
                <YAxis dataKey="team" type="category" tick={{ fontSize: 10 }} stroke="#94a3b8" width={90} />
                <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0" }} />
                <Legend />
                <Bar dataKey="passRate" name="Pass %" fill="#22c55e" radius={[0, 4, 4, 0]} stackId="a" />
                <Bar dataKey="failRate" name="Fail %" fill="#ef4444" radius={[0, 4, 4, 0]} stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Release Readiness */}
      <Card>
        <CardHeader><CardTitle>Release Validation Readiness</CardTitle></CardHeader>
        <div className="space-y-4">
          {releaseReadiness.map((rel) => (
            <div key={rel.id} className="rounded-lg border border-gray-100 p-4 dark:border-gray-800">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{rel.name}</span>
                    <span className="text-xs text-gray-400">v{rel.version}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      rel.status === "completed" ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" :
                      rel.status === "staging" ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" :
                      "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                    }`}>{rel.status}</span>
                    {rel.hasBlockers && (
                      <span className="flex items-center gap-0.5 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-700 dark:bg-red-900 dark:text-red-300">
                        <AlertTriangle className="h-3 w-3" /> Blockers
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-gray-400">{rel.changeCount} changes · {rel.totalValidations} validations</p>
                </div>
                <div className="text-right">
                  <span className={`text-lg font-bold ${
                    rel.passRate >= 80 ? "text-green-600 dark:text-green-400" :
                    rel.passRate >= 60 ? "text-amber-600 dark:text-amber-400" :
                    "text-red-600 dark:text-red-400"
                  }`}>{rel.passRate}%</span>
                  <p className="text-[10px] text-gray-400">{rel.passed}/{rel.totalValidations} passed</p>
                </div>
              </div>
              {/* Progress bar */}
              <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                {rel.totalValidations > 0 && (
                  <>
                    <div className="bg-green-500" style={{ width: `${(rel.passed / rel.totalValidations) * 100}%` }} />
                    <div className="bg-red-500" style={{ width: `${(rel.failed / rel.totalValidations) * 100}%` }} />
                  </>
                )}
              </div>
              {/* Expandable per-change details */}
              <button
                onClick={() => toggleSection(rel.id)}
                className="mt-2 flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
              >
                {expandedSections.has(rel.id) ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                {expandedSections.has(rel.id) ? "Hide" : "Show"} validations per change
              </button>
              {expandedSections.has(rel.id) && (
                <div className="mt-3 space-y-3">
                  {rel.changes.map((cr) => {
                    const crPassed = cr.validations.filter((v) => v.status === "passed").length;
                    const crTotal = cr.validations.length;
                    return (
                      <div key={cr.id} className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800/50">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-mono text-[10px] text-gray-400">{cr.id}</span>
                            <span className="ml-2 text-xs font-medium text-gray-700 dark:text-gray-300">{cr.title}</span>
                            <span className="ml-2 text-[10px] text-gray-400">{cr.team}</span>
                          </div>
                          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{crPassed}/{crTotal}</span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {cr.validations.map((v) => {
                            const Icon = typeIcons[v.type as ValidationType] || TestTube2;
                            return (
                              <div key={v.id} className="flex items-center gap-1 rounded border border-gray-200 bg-white px-2 py-1 dark:border-gray-700 dark:bg-gray-800" title={`${v.name} — ${v.status}`}>
                                <Icon className="h-3 w-3 text-gray-400" />
                                <span className="text-[10px] text-gray-600 dark:text-gray-400">{v.name}</span>
                                <ValidationStatusBadge status={v.status as ValidationStatus} />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
          {/* Unassigned changes */}
          {(() => {
            const unassigned = changeRequests.filter((cr) => !cr.releaseId);
            if (unassigned.length === 0) return null;
            const uValidations = unassigned.flatMap((cr) => cr.validations);
            const uPassed = uValidations.filter((v) => v.status === "passed").length;
            return (
              <div className="rounded-lg border border-dashed border-gray-200 p-4 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Unassigned to Release</span>
                    <p className="text-xs text-gray-400">{unassigned.length} changes · {uValidations.length} validations</p>
                  </div>
                  <span className="text-sm font-bold text-gray-500">{uValidations.length > 0 ? Math.round((uPassed / uValidations.length) * 100) : 0}%</span>
                </div>
                <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                  {uValidations.length > 0 && (
                    <div className="bg-green-500" style={{ width: `${(uPassed / uValidations.length) * 100}%` }} />
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      </Card>

      {/* Blockers */}
      {blockers.length > 0 && (
        <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-800 dark:text-red-300">
              <AlertTriangle className="h-4 w-4" />
              Active Blockers ({blockers.length})
            </CardTitle>
          </CardHeader>
          <div className="space-y-2">
            {blockers.map((v) => (
              <div key={v.id} className="rounded-lg border border-red-200 bg-white p-3 dark:border-red-800 dark:bg-gray-900">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-mono text-xs text-gray-400">{v.changeId}</span>
                    <span className="mx-2 text-gray-300 dark:text-gray-600">·</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{v.name}</span>
                  </div>
                  <ValidationStatusBadge status={v.status} />
                </div>
                {v.blockers?.map((b, i) => (
                  <p key={i} className="mt-1 text-sm text-red-700 dark:text-red-400">⚠ {b}</p>
                ))}
                {v.details && (
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{v.details}</p>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* View Mode Tabs + Filters */}
      <Card className="p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          {/* View mode tabs */}
          <div className="flex gap-1 rounded-lg bg-gray-100 p-0.5 dark:bg-gray-800">
            {([["all", "All Validations"], ["by-release", "By Release"], ["by-team", "By Team"]] as [ViewMode, string][]).map(([mode, label]) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  viewMode === mode
                    ? "bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-gray-100"
                    : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
              <input
                type="text"
                placeholder="Search validations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="rounded-lg border border-gray-200 bg-white py-2 pl-8 pr-3 text-sm outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
              />
            </div>
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              aria-label="Filter by release"
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
              value={releaseFilter}
              onChange={(e) => setReleaseFilter(e.target.value)}
            >
              <option value="all">All Releases</option>
              {releases.map((r) => (<option key={r.id} value={r.id}>{r.name}</option>))}
              <option value="__none__">Unassigned</option>
            </select>
            <select
              aria-label="Filter by validation type"
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as ValidationType | "all")}
            >
              <option value="all">All Types</option>
              <option value="unit_test">Unit Test</option>
              <option value="integration_test">Integration Test</option>
              <option value="performance_test">Performance Test</option>
              <option value="security_scan">Security Scan</option>
              <option value="code_review">Code Review</option>
              <option value="uat">UAT</option>
              <option value="smoke_test">Smoke Test</option>
              <option value="regression_test">Regression Test</option>
              <option value="canary_deploy">Canary Deploy</option>
              <option value="rollback_test">Rollback Test</option>
            </select>
            <select
              aria-label="Filter by validation status"
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as ValidationStatus | "all")}
            >
              <option value="all">All Statuses</option>
              <option value="passed">Passed</option>
              <option value="failed">Failed</option>
              <option value="running">Running</option>
              <option value="pending">Pending</option>
            </select>
            <span className="text-xs text-gray-400 dark:text-gray-500">{filtered.length} results</span>
          </div>
        </div>
      </Card>

      {/* Validation List - grouped by view mode */}
      {viewMode === "all" && (
        <div className="space-y-2">
          {filtered.map((v) => {
            const Icon = typeIcons[v.type] || TestTube2;
            return (
              <Card key={`${v.changeId}-${v.id}`} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-gray-100 p-2 dark:bg-gray-800">
                      <Icon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{v.name}</span>
                        <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                          {v.type.replace(/_/g, " ")}
                        </span>
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-gray-400">
                        <span className="font-mono">{v.changeId}</span>
                        <span>·</span>
                        <span>{v.team}</span>
                        {v.releaseId && (<><span>·</span><span>{v.releaseId}</span></>)}
                        {v.duration && (<><span>·</span><span>{v.duration}</span></>)}
                        {v.coverage !== undefined && (<><span>·</span><span>Coverage: {v.coverage}%</span></>)}
                      </div>
                      {v.details && (<p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{v.details}</p>)}
                    </div>
                  </div>
                  <ValidationStatusBadge status={v.status} />
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {viewMode === "by-release" && (
        <div className="space-y-4">
          {releases.map((rel) => {
            const relFiltered = filtered.filter((v) => v.releaseId === rel.id);
            if (relFiltered.length === 0 && releaseFilter !== "all" && releaseFilter !== rel.id) return null;
            const relPassed = relFiltered.filter((v) => v.status === "passed").length;
            return (
              <Card key={rel.id}>
                <button onClick={() => toggleSection(`list-${rel.id}`)} className="flex w-full items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <Rocket className="h-4 w-4 text-blue-500" />
                    <div className="text-left">
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{rel.name} <span className="text-xs font-normal text-gray-400">v{rel.version}</span></p>
                      <p className="text-xs text-gray-400">{relFiltered.length} validations · {relPassed} passed</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-sm font-bold ${relFiltered.length > 0 && relPassed / relFiltered.length >= 0.8 ? "text-green-600" : "text-amber-600"}`}>
                      {relFiltered.length > 0 ? Math.round((relPassed / relFiltered.length) * 100) : 0}%
                    </span>
                    {expandedSections.has(`list-${rel.id}`) ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
                  </div>
                </button>
                {expandedSections.has(`list-${rel.id}`) && (
                  <div className="border-t border-gray-100 p-4 dark:border-gray-800">
                    <div className="space-y-2">
                      {relFiltered.map((v) => {
                        const Icon = typeIcons[v.type] || TestTube2;
                        return (
                          <div key={`${v.changeId}-${v.id}`} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-800/50">
                            <div className="flex items-center gap-2">
                              <Icon className="h-3.5 w-3.5 text-gray-400" />
                              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{v.name}</span>
                              <span className="font-mono text-[10px] text-gray-400">{v.changeId}</span>
                              {v.coverage !== undefined && <span className="text-[10px] text-gray-400">{v.coverage}%</span>}
                            </div>
                            <ValidationStatusBadge status={v.status} />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {viewMode === "by-team" && (
        <div className="space-y-4">
          {teamStats.map((ts) => {
            const teamFiltered = filtered.filter((v) => v.team === ts.team);
            if (teamFiltered.length === 0) return null;
            const teamPassed = teamFiltered.filter((v) => v.status === "passed").length;
            return (
              <Card key={ts.team}>
                <button onClick={() => toggleSection(`team-${ts.team}`)} className="flex w-full items-center justify-between p-4">
                  <div className="text-left">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{ts.team}</p>
                    <p className="text-xs text-gray-400">{teamFiltered.length} validations</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-16 rounded-full bg-gray-100 dark:bg-gray-800">
                        <div className="h-2 rounded-full bg-green-500" style={{ width: `${teamFiltered.length > 0 ? (teamPassed / teamFiltered.length) * 100 : 0}%` }} />
                      </div>
                      <span className="text-xs font-bold text-gray-600 dark:text-gray-400">{teamFiltered.length > 0 ? Math.round((teamPassed / teamFiltered.length) * 100) : 0}%</span>
                    </div>
                    {expandedSections.has(`team-${ts.team}`) ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
                  </div>
                </button>
                {expandedSections.has(`team-${ts.team}`) && (
                  <div className="border-t border-gray-100 p-4 dark:border-gray-800">
                    <div className="space-y-2">
                      {teamFiltered.map((v) => {
                        const Icon = typeIcons[v.type] || TestTube2;
                        return (
                          <div key={`${v.changeId}-${v.id}`} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-800/50">
                            <div className="flex items-center gap-2">
                              <Icon className="h-3.5 w-3.5 text-gray-400" />
                              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{v.name}</span>
                              <span className="font-mono text-[10px] text-gray-400">{v.changeId}</span>
                              {v.releaseId && <span className="text-[10px] text-blue-500">{v.releaseId}</span>}
                            </div>
                            <ValidationStatusBadge status={v.status} />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
