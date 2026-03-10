"use client";

import { useState, useMemo } from "react";
import {
  Rocket, Calendar, User, GitPullRequest, AlertTriangle, CheckCircle2, Clock,
  RotateCcw, ChevronDown, ChevronUp, ChevronRight, XCircle, Loader2, Filter,
  TestTube2, ShieldCheck, Eye, Gauge, Code2, FlaskConical, Search, History,
  TrendingUp, LayoutDashboard,
} from "lucide-react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Legend, LineChart, Line,
} from "recharts";
import { Card, CardHeader, CardTitle } from "@/components/card";
import { RiskBadge } from "@/components/risk-badge";
import { ChangeStatusBadge, ValidationStatusBadge } from "@/components/status-badge";
import { useData } from "@/hooks";
import { formatDate } from "@/lib/utils";
import { ValidationStatus, ValidationType } from "@/lib/types";

/* ─── Config ─── */
const statusConfig: Record<string, { label: string; className: string; icon: React.ElementType }> = {
  planning: { label: "Planning", className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300", icon: Clock },
  staging: { label: "Staging", className: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300", icon: AlertTriangle },
  canary: { label: "Canary", className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300", icon: Rocket },
  rolling_out: { label: "Rolling Out", className: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300", icon: Rocket },
  completed: { label: "Completed", className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300", icon: CheckCircle2 },
  rolled_back: { label: "Rolled Back", className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300", icon: RotateCcw },
};

const typeIcons: Record<ValidationType, React.ElementType> = {
  unit_test: TestTube2, integration_test: FlaskConical, performance_test: Gauge,
  security_scan: ShieldCheck, code_review: Code2, uat: Eye,
  smoke_test: Rocket, regression_test: RotateCcw, canary_deploy: Rocket, rollback_test: RotateCcw,
};

type PageTab = "overview" | "releases" | "historical";
type ViewMode = "all" | "by-release" | "by-team";

/* ─── Tab Button Component ─── */
function TabButton({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: React.ElementType; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
        active
          ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
          : "text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-300"
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

export default function ReleasesPage() {
  const { releases, changeRequests, validationTrendData, loading, error } = useData();
  const [activeTab, setActiveTab] = useState<PageTab>("overview");
  const [expandedRelease, setExpandedRelease] = useState<string | null>(null);

  // Validation state (hooks before early returns)
  const [typeFilter, setTypeFilter] = useState<ValidationType | "all">("all");
  const [statusFilter, setStatusFilter] = useState<ValidationStatus | "all">("all");
  const [releaseFilter, setReleaseFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("all");
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const teamStats = useMemo(() => {
    const allVals = changeRequests.flatMap((cr) => cr.validations.map((v) => ({ ...v, team: cr.team })));
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

  // Historical: per-release summary stats
  const releaseHistory = useMemo(() => {
    return releases.map((rel) => {
      const relChanges = changeRequests.filter((cr) => cr.releaseId === rel.id);
      const relVals = relChanges.flatMap((cr) => cr.validations);
      const p = relVals.filter((v) => v.status === "passed").length;
      const f = relVals.filter((v) => v.status === "failed").length;
      return {
        name: rel.name, version: rel.version, status: rel.status,
        changes: relChanges.length, validations: relVals.length, passed: p, failed: f,
        passRate: relVals.length > 0 ? Math.round((p / relVals.length) * 100) : 0,
        risk: rel.overallRisk, scheduledDate: rel.scheduledDate,
      };
    });
  }, [releases, changeRequests]);

  if (loading) return <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-40 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />)}</div>;
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

  const total = allValidations.length;
  const passed = allValidations.filter((v) => v.status === "passed").length;
  const failedCount = allValidations.filter((v) => v.status === "failed").length;
  const runningCount = allValidations.filter((v) => v.status === "running").length;
  const pendingCount = allValidations.filter((v) => v.status === "pending").length;
  const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;

  const pieData = [
    { name: "Passed", value: passed, color: "#22c55e" },
    { name: "Failed", value: failedCount, color: "#ef4444" },
    { name: "Running", value: runningCount, color: "#3b82f6" },
    { name: "Pending", value: pendingCount, color: "#94a3b8" },
  ];

  const typeStats = Object.entries(
    allValidations.reduce((acc, v) => {
      if (!acc[v.type]) acc[v.type] = { total: 0, passed: 0 };
      acc[v.type].total++;
      if (v.status === "passed") acc[v.type].passed++;
      return acc;
    }, {} as Record<string, { total: number; passed: number }>)
  ).map(([type, stats]) => ({ type: type.replace(/_/g, " "), passRate: Math.round((stats.passed / stats.total) * 100), total: stats.total }));

  const blockers = allValidations.filter((v) => v.status === "failed" && v.blockers && v.blockers.length > 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Releases & Validations</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Release timeline, deployment readiness, and validation tracking</p>
        </div>
      </div>

      {/* Top-Level Tabs */}
      <div className="flex gap-1 border-b border-gray-200 pb-0.5 dark:border-gray-800">
        <TabButton active={activeTab === "overview"} onClick={() => setActiveTab("overview")} icon={LayoutDashboard} label="Overview" />
        <TabButton active={activeTab === "releases"} onClick={() => setActiveTab("releases")} icon={Rocket} label="Releases" />
        <TabButton active={activeTab === "historical"} onClick={() => setActiveTab("historical")} icon={History} label="Historical" />
      </div>

      {/* ═══ TAB: OVERVIEW ═══ */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
            {[
              { label: "Total", value: total, icon: TestTube2, iconBg: "bg-gray-100 dark:bg-gray-800", iconColor: "text-gray-600 dark:text-gray-400", valueColor: "text-gray-900 dark:text-gray-100" },
              { label: "Passed", value: passed, icon: CheckCircle2, iconBg: "bg-green-100 dark:bg-green-900", iconColor: "text-green-600 dark:text-green-400", valueColor: "text-green-600 dark:text-green-400" },
              { label: "Failed", value: failedCount, icon: XCircle, iconBg: "bg-red-100 dark:bg-red-900", iconColor: "text-red-600 dark:text-red-400", valueColor: "text-red-600 dark:text-red-400" },
              { label: "Running", value: runningCount, icon: Loader2, iconBg: "bg-blue-100 dark:bg-blue-900", iconColor: "text-blue-600 dark:text-blue-400", valueColor: "text-blue-600 dark:text-blue-400" },
              { label: "Pending", value: pendingCount, icon: Clock, iconBg: "bg-gray-100 dark:bg-gray-800", iconColor: "text-gray-400", valueColor: "text-gray-400" },
              { label: "Pass Rate", value: `${passRate}%`, icon: ShieldCheck, iconBg: "bg-emerald-100 dark:bg-emerald-900", iconColor: "text-emerald-600 dark:text-emerald-400", valueColor: passRate >= 80 ? "text-green-600 dark:text-green-400" : passRate >= 60 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400" },
            ].map((kpi) => (
              <Card key={kpi.label} className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`rounded-lg p-2 ${kpi.iconBg}`}><kpi.icon className={`h-4 w-4 ${kpi.iconColor}`} /></div>
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
                  <PieChart><Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value">
                    {pieData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}
                  </Pie><Tooltip /></PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap justify-center gap-3 text-xs text-gray-600 dark:text-gray-400">
                {pieData.map((d) => (<span key={d.name} className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: d.color }} />{d.name} ({d.value})</span>))}
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

          {/* Blockers */}
          {blockers.length > 0 && (
            <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
              <CardHeader><CardTitle className="flex items-center gap-2 text-red-800 dark:text-red-300"><AlertTriangle className="h-4 w-4" />Active Blockers ({blockers.length})</CardTitle></CardHeader>
              <div className="space-y-2">
                {blockers.map((v) => (
                  <div key={v.id} className="rounded-lg border border-red-200 bg-white p-3 dark:border-red-800 dark:bg-gray-900">
                    <div className="flex items-center justify-between">
                      <div><span className="font-mono text-xs text-gray-400">{v.changeId}</span><span className="mx-2 text-gray-300 dark:text-gray-600">·</span><span className="text-sm font-medium text-gray-900 dark:text-gray-100">{v.name}</span></div>
                      <ValidationStatusBadge status={v.status} />
                    </div>
                    {v.blockers?.map((b, i) => (<p key={i} className="mt-1 text-sm text-red-700 dark:text-red-400">⚠ {b}</p>))}
                    {v.details && (<p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{v.details}</p>)}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* View Mode Tabs + Filters */}
          <Card className="p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex gap-1 rounded-lg bg-gray-100 p-0.5 dark:bg-gray-800">
                {([["all", "All Validations"], ["by-release", "By Release"], ["by-team", "By Team"]] as [ViewMode, string][]).map(([mode, label]) => (
                  <button key={mode} onClick={() => setViewMode(mode)} className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${viewMode === mode ? "bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-gray-100" : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"}`}>{label}</button>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative"><Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" /><input type="text" placeholder="Search validations..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="rounded-lg border border-gray-200 bg-white py-2 pl-8 pr-3 text-sm outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200" /></div>
                <Filter className="h-4 w-4 text-gray-400" />
                <select aria-label="Filter by release" className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200" value={releaseFilter} onChange={(e) => setReleaseFilter(e.target.value)}>
                  <option value="all">All Releases</option>
                  {releases.map((r) => (<option key={r.id} value={r.id}>{r.name}</option>))}
                </select>
                <select aria-label="Filter by validation type" className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as ValidationType | "all")}>
                  <option value="all">All Types</option>
                  {(["unit_test","integration_test","performance_test","security_scan","code_review","uat","smoke_test","regression_test","canary_deploy","rollback_test"] as ValidationType[]).map((t) => (<option key={t} value={t}>{t.replace(/_/g, " ")}</option>))}
                </select>
                <select aria-label="Filter by status" className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as ValidationStatus | "all")}>
                  <option value="all">All Statuses</option>
                  <option value="passed">Passed</option><option value="failed">Failed</option><option value="running">Running</option><option value="pending">Pending</option>
                </select>
                <span className="text-xs text-gray-400 dark:text-gray-500">{filtered.length} results</span>
              </div>
            </div>
          </Card>

          {/* Flat list */}
          {viewMode === "all" && (
            <div className="space-y-2">
              {filtered.map((v) => {
                const Icon = typeIcons[v.type] || TestTube2;
                return (
                  <Card key={`${v.changeId}-${v.id}`} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-gray-100 p-2 dark:bg-gray-800"><Icon className="h-4 w-4 text-gray-500 dark:text-gray-400" /></div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2"><span className="text-sm font-medium text-gray-900 dark:text-gray-100">{v.name}</span><span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500 dark:bg-gray-800 dark:text-gray-400">{v.type.replace(/_/g, " ")}</span></div>
                          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-gray-400">
                            <span className="font-mono">{v.changeId}</span><span>·</span><span>{v.team}</span>
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
                      <div className="flex items-center gap-3"><Rocket className="h-4 w-4 text-blue-500" /><div className="text-left"><p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{rel.name} <span className="text-xs font-normal text-gray-400">v{rel.version}</span></p><p className="text-xs text-gray-400">{relFiltered.length} validations · {relPassed} passed</p></div></div>
                      <div className="flex items-center gap-3"><span className={`text-sm font-bold ${relFiltered.length > 0 && relPassed / relFiltered.length >= 0.8 ? "text-green-600" : "text-amber-600"}`}>{relFiltered.length > 0 ? Math.round((relPassed / relFiltered.length) * 100) : 0}%</span>{expandedSections.has(`list-${rel.id}`) ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}</div>
                    </button>
                    {expandedSections.has(`list-${rel.id}`) && (
                      <div className="border-t border-gray-100 p-4 dark:border-gray-800"><div className="space-y-2">
                        {relFiltered.map((v) => { const Icon = typeIcons[v.type] || TestTube2; return (
                          <div key={`${v.changeId}-${v.id}`} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-800/50">
                            <div className="flex items-center gap-2"><Icon className="h-3.5 w-3.5 text-gray-400" /><span className="text-xs font-medium text-gray-700 dark:text-gray-300">{v.name}</span><span className="font-mono text-[10px] text-gray-400">{v.changeId}</span></div>
                            <ValidationStatusBadge status={v.status} />
                          </div>); })}
                      </div></div>
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
                      <div className="text-left"><p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{ts.team}</p><p className="text-xs text-gray-400">{teamFiltered.length} validations</p></div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2"><div className="h-2 w-16 rounded-full bg-gray-100 dark:bg-gray-800"><div className="h-2 rounded-full bg-green-500" style={{ width: `${teamFiltered.length > 0 ? (teamPassed / teamFiltered.length) * 100 : 0}%` }} /></div><span className="text-xs font-bold text-gray-600 dark:text-gray-400">{teamFiltered.length > 0 ? Math.round((teamPassed / teamFiltered.length) * 100) : 0}%</span></div>
                        {expandedSections.has(`team-${ts.team}`) ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
                      </div>
                    </button>
                    {expandedSections.has(`team-${ts.team}`) && (
                      <div className="border-t border-gray-100 p-4 dark:border-gray-800"><div className="space-y-2">
                        {teamFiltered.map((v) => { const Icon = typeIcons[v.type] || TestTube2; return (
                          <div key={`${v.changeId}-${v.id}`} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-800/50">
                            <div className="flex items-center gap-2"><Icon className="h-3.5 w-3.5 text-gray-400" /><span className="text-xs font-medium text-gray-700 dark:text-gray-300">{v.name}</span><span className="font-mono text-[10px] text-gray-400">{v.changeId}</span>{v.releaseId && <span className="text-[10px] text-blue-500">{v.releaseId}</span>}</div>
                            <ValidationStatusBadge status={v.status} />
                          </div>); })}
                      </div></div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ═══ TAB: RELEASES ═══ */}
      {activeTab === "releases" && (
        <div className="space-y-6">
          {releases.map((release) => {
            const config = statusConfig[release.status];
            const StatusIcon = config.icon;
            const relatedChanges = changeRequests.filter((cr) => release.changeRequests.includes(cr.id));
            const totalVals = relatedChanges.flatMap((cr) => cr.validations);
            const passedVals = totalVals.filter((v) => v.status === "passed").length;
            const failedVals = totalVals.filter((v) => v.status === "failed").length;
            const pendingVals = totalVals.filter((v) => v.status === "pending" || v.status === "running").length;
            const valPassRate = totalVals.length > 0 ? Math.round((passedVals / totalVals.length) * 100) : 0;
            return (
              <Card key={release.id} className="overflow-hidden">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`rounded-xl p-3 ${release.status === "completed" ? "bg-green-100 dark:bg-green-900" : release.status === "staging" ? "bg-amber-100 dark:bg-amber-900" : "bg-blue-100 dark:bg-blue-900"}`}>
                      <Rocket className={`h-6 w-6 ${release.status === "completed" ? "text-green-600 dark:text-green-400" : release.status === "staging" ? "text-amber-600 dark:text-amber-400" : "text-blue-600 dark:text-blue-400"}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">{release.name}</h2>
                        <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-mono text-gray-500 dark:bg-gray-800 dark:text-gray-400">v{release.version}</span>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${config.className}`}><StatusIcon className="h-3 w-3" />{config.label}</span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />Scheduled: {formatDate(release.scheduledDate)}</span>
                        {release.actualDate && (<span className="flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5 text-green-500" />Deployed: {formatDate(release.actualDate)}</span>)}
                        <span className="flex items-center gap-1"><User className="h-3.5 w-3.5" />{release.releaseManager}</span>
                      </div>
                    </div>
                  </div>
                  <RiskBadge score={release.overallRisk} size="lg" />
                </div>
                {release.notes && (<p className="mt-3 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-600 dark:bg-gray-800 dark:text-gray-400">{release.notes}</p>)}
                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-medium text-gray-700 dark:text-gray-300">Deployment Readiness</span>
                    <span className="text-gray-500 dark:text-gray-400">{passedVals}/{totalVals.length} validations passed ({valPassRate}%)</span>
                  </div>
                  <div className="flex h-2 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800">
                    {totalVals.length > 0 && (<>
                      <div className="bg-green-400 transition-all" style={{ width: `${(passedVals / totalVals.length) * 100}%` }} />
                      <div className="bg-red-400 transition-all" style={{ width: `${(failedVals / totalVals.length) * 100}%` }} />
                      <div className="bg-blue-300 animate-pulse transition-all" style={{ width: `${(pendingVals / totalVals.length) * 100}%` }} />
                    </>)}
                  </div>
                  <div className="mt-1 flex gap-4 text-[10px] text-gray-400">
                    <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-green-400" /> {passedVals} Passed</span>
                    <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-red-400" /> {failedVals} Failed</span>
                    <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-blue-300" /> {pendingVals} Pending/Running</span>
                  </div>
                </div>
                {relatedChanges.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-xs font-semibold uppercase text-gray-400 mb-2">Bundled Changes ({relatedChanges.length})</h4>
                    <div className="space-y-2">
                      {relatedChanges.map((cr) => (
                        <div key={cr.id} className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-800/50">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <GitPullRequest className="h-3.5 w-3.5 text-gray-400" />
                              <span className="font-mono text-xs text-gray-400">{cr.id}</span>
                              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{cr.title}</span>
                            </div>
                            <div className="mt-1 flex items-center gap-3 text-xs text-gray-400">
                              <span>{cr.team}</span><span>·</span><span>{cr.author}</span><span>·</span><span className="capitalize">{cr.category.replace(/_/g, " ")}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <ChangeStatusBadge status={cr.status} />
                            <RiskBadge score={cr.impact.overallRisk} size="sm" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {relatedChanges.length === 0 && (<p className="mt-4 text-sm text-gray-400 text-center py-2">No change requests bundled in this release</p>)}
                {totalVals.length > 0 && (
                  <div className="mt-4">
                    <button onClick={() => setExpandedRelease(expandedRelease === release.id ? null : release.id)}
                      className="flex w-full items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-xs font-semibold uppercase text-gray-500 hover:bg-gray-100 dark:bg-gray-800/50 dark:text-gray-400 dark:hover:bg-gray-800">
                      <span>All Validations ({totalVals.length})</span>
                      {expandedRelease === release.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                    {expandedRelease === release.id && (
                      <div className="mt-2 space-y-2">
                        {relatedChanges.map((cr) => (
                          <div key={cr.id}>
                            <p className="mb-1 text-[10px] font-semibold uppercase text-gray-400 dark:text-gray-500">{cr.id} — {cr.title}</p>
                            <div className="space-y-1">
                              {cr.validations.map((v) => (
                                <div key={v.id} className="flex items-center justify-between rounded-lg border border-gray-100 p-2 dark:border-gray-800">
                                  <div>
                                    <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{v.name}</p>
                                    <p className="text-[10px] text-gray-400">{v.type.replace(/_/g, " ")}</p>
                                    {v.duration && <p className="text-[10px] text-gray-400">{v.duration}</p>}
                                    {v.details && <p className="mt-0.5 text-[10px] text-gray-500 dark:text-gray-400">{v.details}</p>}
                                  </div>
                                  <ValidationStatusBadge status={v.status} />
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* ═══ TAB: HISTORICAL ═══ */}
      {activeTab === "historical" && (
        <div className="space-y-6">
          {/* Validation Trend Line Chart */}
          {validationTrendData.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp className="h-4 w-4 text-blue-500" />Validation Pass Rate Trend</CardTitle></CardHeader>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={validationTrendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                    <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" domain={[0, 100]} />
                    <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0" }} />
                    <Legend />
                    <Line type="monotone" dataKey="passRate" name="Pass Rate %" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="totalTests" name="Total Tests" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} yAxisId={0} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}

          {/* Per-Release History Table */}
          <Card>
            <CardHeader><CardTitle>Release History Summary</CardTitle></CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800">
                    <th className="pb-3 font-medium text-gray-500 dark:text-gray-400">Release</th>
                    <th className="pb-3 font-medium text-gray-500 dark:text-gray-400">Status</th>
                    <th className="pb-3 font-medium text-gray-500 dark:text-gray-400 text-right">Changes</th>
                    <th className="pb-3 font-medium text-gray-500 dark:text-gray-400 text-right">Validations</th>
                    <th className="pb-3 font-medium text-gray-500 dark:text-gray-400 text-right">Passed</th>
                    <th className="pb-3 font-medium text-gray-500 dark:text-gray-400 text-right">Failed</th>
                    <th className="pb-3 font-medium text-gray-500 dark:text-gray-400 text-right">Pass Rate</th>
                    <th className="pb-3 font-medium text-gray-500 dark:text-gray-400 text-right">Risk</th>
                    <th className="pb-3 font-medium text-gray-500 dark:text-gray-400">Scheduled</th>
                  </tr>
                </thead>
                <tbody>
                  {releaseHistory.map((rh) => (
                    <tr key={rh.name} className="border-b border-gray-50 dark:border-gray-800">
                      <td className="py-3 font-medium text-gray-900 dark:text-gray-100">{rh.name} <span className="text-xs text-gray-400">v{rh.version}</span></td>
                      <td className="py-3"><span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${statusConfig[rh.status]?.className || "bg-gray-100 text-gray-600"}`}>{statusConfig[rh.status]?.label || rh.status}</span></td>
                      <td className="py-3 text-right text-gray-600 dark:text-gray-400">{rh.changes}</td>
                      <td className="py-3 text-right text-gray-600 dark:text-gray-400">{rh.validations}</td>
                      <td className="py-3 text-right text-green-600">{rh.passed}</td>
                      <td className="py-3 text-right text-red-600">{rh.failed}</td>
                      <td className="py-3 text-right">
                        <span className={`font-bold ${rh.passRate >= 80 ? "text-green-600" : rh.passRate >= 60 ? "text-amber-600" : "text-red-600"}`}>{rh.passRate}%</span>
                      </td>
                      <td className="py-3 text-right"><RiskBadge score={rh.risk} size="sm" /></td>
                      <td className="py-3 text-xs text-gray-500 dark:text-gray-400">{formatDate(rh.scheduledDate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Pass Rate per Release bar chart */}
          <Card>
            <CardHeader><CardTitle>Pass Rate by Release</CardTitle></CardHeader>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={releaseHistory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                  <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" domain={[0, 100]} />
                  <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0" }} />
                  <Legend />
                  <Bar dataKey="passRate" name="Pass Rate %" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="risk" name="Risk Score" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Team historical comparison */}
          <Card>
            <CardHeader><CardTitle>Team Pass Rate Comparison</CardTitle></CardHeader>
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
      )}
    </div>
  );
}
