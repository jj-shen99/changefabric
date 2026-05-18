"use client";

import { useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  GitPullRequest,
  Rocket,
  TrendingDown,
  XCircle,
  Calendar,
  Shield,
  ClipboardCheck,
  Zap,
  FileText,
  Gauge,
  RotateCcw,
  Info,
  Layers,
  PieChart as PieChartIcon,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from "recharts";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/card";
import { PageHeader } from "@/components/page-header";
import { useData } from "@/hooks";
import DashboardLoading from "./loading";

export default function OverviewPage() {
  const [days, setDays] = useState(7);
  const { changeRequests, dashboardMetrics, loading, error } = useData(days);

  if (loading) return <DashboardLoading />;
  if (error) return <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">{error}</div>;
  if (!dashboardMetrics) return <div className="text-gray-500">No data available</div>;

  // Calculate accurate KPIs from actual change request data
  const pendingStates = new Set(["draft", "submitted", "awaiting_approval"]);
  const inProgressStates = new Set(["approved", "scheduled", "implemented"]);
  const pendingCount = changeRequests.filter(cr => pendingStates.has(cr.state)).length;
  const inProgressCount = changeRequests.filter(cr => inProgressStates.has(cr.state)).length;
  const closedCount = changeRequests.filter(cr => cr.state === "closed").length;
  const rolledBackCount = changeRequests.filter(cr => cr.state === "rolled_back").length;
  const totalCount = changeRequests.length;
  const avgRisk = totalCount > 0 ? Math.round(changeRequests.reduce((a, c) => a + (c.impact?.overallRisk || 0), 0) / totalCount) : 0;
  const closeRate = totalCount > 0 ? Math.round((closedCount / totalCount) * 100) : 0;
  const rollbackRate = totalCount > 0 ? Math.round((rolledBackCount / totalCount) * 100) : 0;

  const kpiCards = [
    { label: "Total Changes", value: totalCount, icon: GitPullRequest, color: "text-blue-600", bg: "bg-blue-50", tooltip: "Total number of change requests in the selected time period" },
    { label: "Pending Approval", value: pendingCount, icon: Clock, color: "text-amber-600", bg: "bg-amber-50", tooltip: "CRs in: Draft, Submitted, Awaiting Approval" },
    { label: "In Progress", value: inProgressCount, icon: Rocket, color: "text-green-600", bg: "bg-green-50", tooltip: "CRs in: Approved, Scheduled, In Progress, Implemented" },
    { label: "Closed", value: closedCount, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50", tooltip: "Successfully completed change requests" },
    { label: "Rolled Back", value: rolledBackCount, icon: TrendingDown, color: "text-rose-600", bg: "bg-rose-50", tooltip: "CRs that were rolled back during or after implementation" },
    { label: "Avg Risk Score", value: avgRisk, icon: AlertTriangle, color: "text-yellow-600", bg: "bg-yellow-50", tooltip: "Average computed risk score across all CRs (0-100)" },
    { label: "Close Rate", value: `${closeRate}%`, icon: Activity, color: "text-purple-600", bg: "bg-purple-50", tooltip: "Percentage of CRs successfully closed (Closed / Total)" },
    { label: "Rollback Rate", value: `${rollbackRate}%`, icon: XCircle, color: "text-red-600", bg: "bg-red-50", tooltip: "Percentage of CRs rolled back (Rolled Back / Total)" },
  ];


  /* ═══ Plan Scoring (lightweight inline) ═══ */
  const PLAN_KW: Record<string, string[]> = {
    implementation: ["step","deploy","install","configure","verify","validate","monitor","rollout","pre-check","post-check","approval","schedule"],
    backout: ["revert","rollback","restore","undo","previous","snapshot","backup","recovery","failover","downtime"],
    testPlan: ["test","verify","validate","smoke","regression","acceptance","integration","unit","performance","security","coverage"],
    riskAnalysis: ["risk","impact","mitigation","contingency","fallback","probability","severity","exposure","vulnerability","dependency"],
    justification: ["business","requirement","need","value","benefit","compliance","security","improvement"],
  };
  function scorePlanText(text: string, keywords: string[]): { present: boolean; quality: number } {
    const t = (text||"").trim();
    if (!t || t.length < 5) return { present: false, quality: 0 };
    let q = 20;
    if (t.length > 500) q += 20; else if (t.length > 200) q += 12; else if (t.length > 50) q += 5;
    if (/(?:^|\n)\s*(?:\d+[.)\s]|[-•*]\s)/m.test(t)) q += 15;
    if (t.split(/\n/).filter(l => l.trim()).length >= 5) q += 5;
    const matched = keywords.filter(kw => t.toLowerCase().includes(kw));
    const ratio = matched.length / keywords.length;
    if (ratio >= 0.5) q += 20; else if (ratio >= 0.25) q += 10; else if (matched.length > 0) q += 5;
    if (/\d{4}[-/]\d{2}|\d{1,2}:\d{2}|hours?|minutes?|AM|PM/i.test(t)) q += 5;
    if (/@|email|phone|contact|notify|team/i.test(t)) q += 5;
    return { present: true, quality: Math.min(100, q) };
  }
  const PLAN_WEIGHTS = { implementation: 0.30, backout: 0.25, testPlan: 0.20, riskAnalysis: 0.15, justification: 0.10 };
  const PLAN_DIM_DEFS = [
    { key: "implementation", label: "Implementation", icon: FileText, field: "implementationPlan" },
    { key: "backout", label: "Backout", icon: RotateCcw, field: "backoutPlan" },
    { key: "testPlan", label: "Test Plan", icon: CheckCircle2, field: "testPlan" },
    { key: "riskAnalysis", label: "Risk Analysis", icon: AlertTriangle, field: "riskAndImpactAnalysis" },
    { key: "justification", label: "Justification", icon: Info, field: "justification" },
  ];
  const planResults = changeRequests.map(cr => {
    const scores: Record<string, { present: boolean; quality: number }> = {};
    PLAN_DIM_DEFS.forEach(d => { scores[d.key] = scorePlanText((cr as Record<string, unknown>)[d.field] as string || "", PLAN_KW[d.key]); });
    const overallScore = Math.round(Object.entries(PLAN_WEIGHTS).reduce((s, [k, w]) => s + (scores[k]?.quality || 0) * w, 0));
    const gapCount = Object.values(scores).filter(s => !s.present).length;
    return { cr, scores, overallScore, gapCount };
  });
  const planCount = planResults.length;
  const avgReadiness = planCount > 0 ? Math.round(planResults.reduce((a, p) => a + p.overallScore, 0) / planCount) : 0;
  const fullCoverage = planResults.filter(p => p.gapCount === 0).length;
  const criticalGaps = planResults.filter(p => p.overallScore < 25).length;
  const pColor = (s: number) => s >= 75 ? "text-green-600" : s >= 50 ? "text-amber-600" : s >= 25 ? "text-orange-600" : "text-red-600";
  const pBg = (s: number) => s >= 75 ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" : s >= 50 ? "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300" : s >= 25 ? "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300" : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300";

  return (
    <>
      <PageHeader title="Dashboard Overview" subtitle={`Software Change & Release Validation — ${new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}`} actions={
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 dark:border-gray-700 dark:bg-gray-800">
            <Calendar className="h-3.5 w-3.5 text-gray-400" />
            <select value={days} onChange={(e) => setDays(Number(e.target.value))} className="bg-transparent text-xs font-medium text-gray-700 outline-none dark:text-gray-300">
              <option value={7}>Last 7 days</option>
              <option value={14}>Last 14 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
            </select>
          </div>
          <span className="flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700 dark:bg-green-900 dark:text-green-300">
            <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
            System Healthy
          </span>
        </div>
      } />
    <div className="space-y-6 p-4 md:p-6">

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        {kpiCards.map((kpi) => (
          <Card key={kpi.label} className="p-4 group relative">
            <div className="flex items-start justify-between">
              <div className={`rounded-lg p-2 ${kpi.bg}`}>
                <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
              </div>
              <div className="relative">
                <Info className="h-3.5 w-3.5 text-gray-300 hover:text-gray-500 cursor-help dark:text-gray-600 dark:hover:text-gray-400" />
                <div className="absolute right-0 top-5 z-50 hidden w-48 rounded-lg bg-gray-900 p-2 text-xs text-white shadow-lg group-hover:block dark:bg-gray-700">
                  {kpi.tooltip}
                  <div className="absolute -top-1 right-2 h-2 w-2 rotate-45 bg-gray-900 dark:bg-gray-700" />
                </div>
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{kpi.value}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{kpi.label}</p>
            </div>
          </Card>
        ))}
      </div>


      {/* ═══ Plan Readiness KPIs ═══ */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-2"><ClipboardCheck className="h-4 w-4 text-teal-500" /><p className="text-xs text-gray-500">Avg Readiness</p></div>
          <p className={`mt-1 text-2xl font-bold ${pColor(avgReadiness)}`}>{avgReadiness}/100</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-500" /><p className="text-xs text-gray-500">Full Plan Coverage</p></div>
          <p className="mt-1 text-2xl font-bold text-green-600">{fullCoverage}<span className="text-sm text-gray-400">/{planCount}</span></p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-red-500" /><p className="text-xs text-gray-500">Critical Gaps</p></div>
          <p className="mt-1 text-2xl font-bold text-red-600">{criticalGaps}</p>
          <p className="text-[11px] text-gray-400">Readiness &lt; 25</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2"><Layers className="h-4 w-4 text-amber-500" /><p className="text-xs text-gray-500">Missing Plans</p></div>
          <p className="mt-1 text-2xl font-bold text-amber-600">{planResults.reduce((a, p) => a + p.gapCount, 0)}</p>
          <p className="text-[11px] text-gray-400">Across all CRs</p>
        </Card>
      </div>

      {/* ═══ Enhanced Chart Grid ═══ */}
      {(() => {
        // State distribution
        const stateMap: Record<string, number> = {};
        changeRequests.forEach(cr => { const s = cr.status || "Unknown"; stateMap[s] = (stateMap[s] || 0) + 1; });
        const stateData = Object.entries(stateMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
        const stateColors = ["#6366f1", "#8b5cf6", "#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#94a3b8", "#06b6d4"];

        // Risk distribution
        const riskBuckets = [
          { name: "Critical (≥80)", value: changeRequests.filter(c => c.impact?.overallRisk >= 80).length, fill: "#ef4444" },
          { name: "High (60-79)", value: changeRequests.filter(c => c.impact?.overallRisk >= 60 && c.impact?.overallRisk < 80).length, fill: "#f97316" },
          { name: "Medium (40-59)", value: changeRequests.filter(c => c.impact?.overallRisk >= 40 && c.impact?.overallRisk < 60).length, fill: "#eab308" },
          { name: "Low (<40)", value: changeRequests.filter(c => c.impact?.overallRisk < 40).length, fill: "#22c55e" },
        ].filter(d => d.value > 0);

        // Category distribution
        const catMap: Record<string, number> = {};
        changeRequests.forEach(cr => { const t = cr.category || "Other"; catMap[t] = (catMap[t] || 0) + 1; });
        const catData = Object.entries(catMap).map(([name, value]) => ({ name: name.length > 18 ? name.slice(0, 16) + "…" : name, value })).sort((a, b) => b.value - a.value).slice(0, 8);
        const catColors = ["#3b82f6", "#8b5cf6", "#f59e0b", "#22c55e", "#ef4444", "#06b6d4", "#ec4899", "#6366f1"];

        // Type distribution (Normal vs Emergency vs Standard)
        const typeMap: Record<string, number> = {};
        changeRequests.forEach(cr => { const t = cr.type || "Unknown"; typeMap[t] = (typeMap[t] || 0) + 1; });
        const typeData = Object.entries(typeMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
        const typeColors = ["#3b82f6", "#f97316", "#22c55e", "#8b5cf6", "#ef4444", "#06b6d4"];

        // Priority distribution
        const prioMap: Record<string, number> = {};
        changeRequests.forEach(cr => { const p = cr.priority || "Unknown"; prioMap[p] = (prioMap[p] || 0) + 1; });
        const prioData = Object.entries(prioMap).map(([name, value]) => ({ name, value })).sort((a, b) => a.name.localeCompare(b.name));
        const prioColors: Record<string, string> = { "1 - Critical": "#ef4444", "2 - High": "#f97316", "3 - Moderate": "#eab308", "4 - Low": "#22c55e" };

        // Plan readiness distribution
        const readinessData = [
          { bucket: "Well Prepared (75-100)", count: planResults.filter(p => p.overallScore >= 75).length, fill: "#22c55e" },
          { bucket: "Adequate (50-74)", count: planResults.filter(p => p.overallScore >= 50 && p.overallScore < 75).length, fill: "#eab308" },
          { bucket: "Gaps Found (25-49)", count: planResults.filter(p => p.overallScore >= 25 && p.overallScore < 50).length, fill: "#f97316" },
          { bucket: "Critical Gaps (0-24)", count: planResults.filter(p => p.overallScore < 25).length, fill: "#ef4444" },
        ];

        // Plan quality radar (avg across all CRs)
        const radarData = PLAN_DIM_DEFS.map(d => ({
          dimension: d.label,
          score: planCount > 0 ? Math.round(planResults.reduce((a, p) => a + (p.scores[d.key]?.quality || 0), 0) / planCount) : 0,
          fullMark: 100,
        }));

        // Readiness by risk level
        const rrMap: Record<string, { total: number; scoreSum: number }> = {};
        planResults.forEach(p => {
          const risk = p.cr.risk || "Unknown";
          if (!rrMap[risk]) rrMap[risk] = { total: 0, scoreSum: 0 };
          rrMap[risk].total++;
          rrMap[risk].scoreSum += p.overallScore;
        });
        const rrData = Object.entries(rrMap).map(([risk, d]) => ({
          risk, avgReadiness: Math.round(d.scoreSum / d.total), count: d.total,
        })).sort((a, b) => a.avgReadiness - b.avgReadiness);
        const rrFill: Record<string, string> = { "Very High": "#ef4444", "High": "#f97316", "Moderate": "#eab308", "Low": "#22c55e", "None": "#94a3b8" };

        return (
          <>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Change Status Distribution */}
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><ClipboardCheck className="h-4 w-4 text-indigo-500" /> Change Status Distribution</CardTitle></CardHeader>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart><Pie data={stateData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`}>{stateData.map((_, i) => <Cell key={i} fill={stateColors[i % stateColors.length]} />)}</Pie><Legend /><Tooltip /></PieChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Risk Level Distribution */}
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Shield className="h-4 w-4 text-red-500" /> Risk Level Distribution</CardTitle></CardHeader>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart><Pie data={riskBuckets} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`}>{riskBuckets.map((d, i) => <Cell key={i} fill={d.fill} />)}</Pie><Legend /><Tooltip /></PieChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Changes by Category */}
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Zap className="h-4 w-4 text-blue-500" /> Changes by Category</CardTitle></CardHeader>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={catData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis type="number" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} stroke="#94a3b8" width={100} />
                    <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0" }} />
                    <Bar dataKey="value" name="Count" radius={[0, 4, 4, 0]}>
                      {catData.map((_, i) => <Cell key={i} fill={catColors[i % catColors.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Change Type Distribution */}
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Zap className="h-4 w-4 text-purple-500" /> Change Type Distribution</CardTitle><CardDescription>Normal vs Emergency vs Standard</CardDescription></CardHeader>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart><Pie data={typeData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`}>{typeData.map((_, i) => <Cell key={i} fill={typeColors[i % typeColors.length]} />)}</Pie><Legend /><Tooltip /></PieChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Priority Distribution */}
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Gauge className="h-4 w-4 text-amber-500" /> Priority Distribution</CardTitle><CardDescription>CRs by priority level</CardDescription></CardHeader>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={prioData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                    <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
                    <Tooltip />
                    <Bar dataKey="value" name="Count" radius={[4, 4, 0, 0]}>
                      {prioData.map((d, i) => <Cell key={i} fill={prioColors[d.name] || "#94a3b8"} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Plan Readiness Distribution */}
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><ClipboardCheck className="h-4 w-4 text-teal-500" /> Plan Readiness Distribution</CardTitle><CardDescription>How prepared are change plans across all CRs</CardDescription></CardHeader>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={readinessData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="bucket" tick={{ fontSize: 9 }} stroke="#94a3b8" />
                    <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
                    <Tooltip />
                    <Bar dataKey="count" name="Changes" radius={[4, 4, 0, 0]}>
                      {readinessData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Plan Quality Radar */}
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><PieChartIcon className="h-4 w-4 text-teal-500" /> Avg Plan Quality by Dimension</CardTitle><CardDescription>Average quality scores across all change request plans</CardDescription></CardHeader>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 11, fontWeight: 600 }} />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10 }} />
                    <Radar name="Avg Quality" dataKey="score" stroke="#0d9488" fill="#0d9488" fillOpacity={0.2} strokeWidth={2} />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Plan Coverage Summary */}
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="h-4 w-4 text-teal-500" /> Plan Coverage Summary</CardTitle><CardDescription>Average quality per plan dimension</CardDescription></CardHeader>
              <div className="space-y-3 px-4 pb-4">
                {PLAN_DIM_DEFS.map(d => {
                  const avg = planCount > 0 ? Math.round(planResults.reduce((a, p) => a + (p.scores[d.key]?.quality || 0), 0) / planCount) : 0;
                  const presentCount = planResults.filter(p => p.scores[d.key]?.present).length;
                  return (
                    <div key={d.key} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <d.icon className="h-3.5 w-3.5 text-teal-500" />
                          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{d.label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-gray-400">{presentCount}/{planCount} present</span>
                          <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${pBg(avg)}`}>{avg}</span>
                        </div>
                      </div>
                      <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800">
                        <div className="h-2 rounded-full transition-all" style={{ width: `${avg}%`, backgroundColor: avg >= 75 ? "#22c55e" : avg >= 50 ? "#eab308" : avg >= 25 ? "#f97316" : "#ef4444" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Readiness by SN Risk Level */}
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-500" /> Readiness by SN Risk Level</CardTitle><CardDescription>Do high-risk CRs have better plans?</CardDescription></CardHeader>
              <div className="space-y-3 px-4 pb-4">
                {rrData.map(d => (
                  <div key={d.risk} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-gray-700 dark:text-gray-300">{d.risk} <span className="text-gray-400 font-normal">({d.count} CRs)</span></span>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${pBg(d.avgReadiness)}`}>{d.avgReadiness}</span>
                    </div>
                    <div className="h-3 rounded-full bg-gray-100 dark:bg-gray-800">
                      <div className="h-3 rounded-full transition-all" style={{ width: `${d.avgReadiness}%`, backgroundColor: rrFill[d.risk] || "#6366f1" }} />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* ═══ Risk vs Readiness Insights ═══ */}
          {(() => {
            const highImpactLowReady = planResults.filter(p => p.overallScore < 50 && (changeRequests.find(c => c.id === p.cr.id || c.number === p.cr.number)?.impact?.overallRisk ?? 0) >= 60);
            const lowImpactHighReady = planResults.filter(p => p.overallScore >= 75 && (changeRequests.find(c => c.id === p.cr.id || c.number === p.cr.number)?.impact?.overallRisk ?? 100) < 40);
            return (
              <Card className="border-amber-200 bg-amber-50/30 dark:border-amber-900 dark:bg-amber-950/20">
                <CardHeader><CardTitle className="flex items-center gap-2"><Info className="h-4 w-4 text-amber-600" /> Risk vs Readiness Insights</CardTitle></CardHeader>
                <div className="grid grid-cols-1 gap-4 px-4 pb-4 md:grid-cols-2">
                  <div className="rounded-lg border border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-950/20 p-3">
                    <p className="text-xs font-bold text-red-700 dark:text-red-400">High Risk + Low Readiness</p>
                    <p className="text-2xl font-bold text-red-600 mt-1">{highImpactLowReady.length}</p>
                    <p className="text-[11px] text-red-600/70 mt-0.5">CRs with risk ≥60 but readiness &lt;50 — need immediate attention</p>
                    {highImpactLowReady.slice(0, 3).map(p => <p key={p.cr.id || p.cr.number} className="text-[10px] text-red-500 mt-1 truncate">• {p.cr.number || p.cr.id}: {p.cr.short_description || p.cr.title}</p>)}
                  </div>
                  <div className="rounded-lg border border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/20 p-3">
                    <p className="text-xs font-bold text-green-700 dark:text-green-400">Low Risk + High Readiness</p>
                    <p className="text-2xl font-bold text-green-600 mt-1">{lowImpactHighReady.length}</p>
                    <p className="text-[11px] text-green-600/70 mt-0.5">CRs with risk &lt;40 and readiness ≥75 — well-prepared, low risk</p>
                    {lowImpactHighReady.slice(0, 3).map(p => <p key={p.cr.id || p.cr.number} className="text-[10px] text-green-500 mt-1 truncate">• {p.cr.number || p.cr.id}: {p.cr.short_description || p.cr.title}</p>)}
                  </div>
                </div>
              </Card>
            );
          })()}

          </>
        );
      })()}
    </div>
    </>
  );
}
