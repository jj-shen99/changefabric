"use client";

import { useState, useMemo, useCallback } from "react";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, Legend,
  PieChart, Pie, ScatterChart, Scatter, ZAxis, LineChart, Line,
} from "recharts";
import {
  Shield, AlertTriangle, Gauge, Zap, Layers, Settings2, RotateCcw, Search,
  LayoutDashboard, BarChart3, PieChart as PieChartIcon, ShieldAlert, Info,
  Brain, GitCommitHorizontal, RefreshCw, ExternalLink, FileCode2, User, Calendar,
  ClipboardCheck, FileText, CheckCircle2, XCircle, AlertCircle,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/card";
import { RiskBadge } from "@/components/risk-badge";
import { useData } from "@/hooks";
import { getRiskBg, getRiskLabel } from "@/lib/utils";
import type { ChangeRequest } from "@/lib/types";
import { PageHeader } from "@/components/page-header";

/* ═══ Impact Score Calculation Engine ═══ */

interface Weights { risk: number; impact: number; urgency: number; priority: number; type: number; scope: number; }
const DEFAULT_WEIGHTS: Weights = { risk: 0.25, impact: 0.25, urgency: 0.15, priority: 0.15, type: 0.10, scope: 0.10 };

function scoreRisk(v: string): number { const l = (v||"").toLowerCase(); if (l==="very high") return 95; if (l==="high") return 75; if (l==="moderate") return 50; if (l==="low") return 25; if (l==="none") return 5; return 40; }
function score123(v: string): number { const s = (v||"").trim(); if (s.startsWith("1")) return 85; if (s.startsWith("2")) return 55; if (s.startsWith("3")) return 25; return 40; }
function scorePriority(v: string): number { const s = (v||"").trim(); if (s.startsWith("1")) return 95; if (s.startsWith("2")) return 75; if (s.startsWith("3")) return 50; if (s.startsWith("4")) return 25; return 40; }
function scoreType(v: string): number { const l = (v||"").toLowerCase(); if (l==="emergency") return 90; if (l==="normal") return 50; if (l==="standard") return 25; return 40; }
function scoreScope(v: string): number { const l = (v||"").toLowerCase(); if (l==="large"||l==="extensive") return 80; if (l==="medium") return 50; if (l==="small") return 25; return 40; }

interface DimensionScores { risk: number; impact: number; urgency: number; priority: number; type: number; scope: number; }

function computeDimensions(cr: ChangeRequest): DimensionScores {
  return { risk: scoreRisk(cr.risk), impact: score123(cr.sn_impact), urgency: score123(cr.urgency), priority: scorePriority(cr.priority), type: scoreType(cr.type), scope: scoreScope(cr.scope) };
}
function computeOverall(dims: DimensionScores, w: Weights): number {
  return Math.round(dims.risk*w.risk + dims.impact*w.impact + dims.urgency*w.urgency + dims.priority*w.priority + dims.type*w.type + dims.scope*w.scope);
}

/* ═══ Git Analysis Types ═══ */
interface GitAnalysisData {
  repoUrl: string; owner: string; repo: string; sinceDate: string; days: number;
  summary: { totalCommits: number; avgRisk: number; maxRisk: number; overallRiskFactor: number; totalAdditions: number; totalDeletions: number; totalFilesChanged: number; criticalCount: number; highCount: number; mediumCount: number; lowCount: number; };
  authorBreakdown: { author: string; commits: number; avgRisk: number; additions: number; deletions: number }[];
  commits: { sha: string; shortSha: string; message: string; author: string; date: string; filesChanged: number; additions: number; deletions: number; riskScore: number; riskLevel: string; riskFactors: string[]; files: { filename: string; additions: number; deletions: number; status: string; fileRisk: number }[]; }[];
}

/* ═══ Shared Risk Helpers ═══ */
function riskColor(s: number) { if (s>=75) return "text-red-600"; if (s>=50) return "text-orange-600"; if (s>=25) return "text-amber-600"; return "text-green-600"; }
function riskBgCls(s: number) { if (s>=75) return "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"; if (s>=50) return "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300"; if (s>=25) return "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300"; return "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"; }
function riskLbl(s: number) { if (s>=75) return "Critical"; if (s>=50) return "High"; if (s>=25) return "Medium"; return "Low"; }

/* ═══ Plan Scoring Helpers ═══ */
function pColor(s: number) { if (s>=75) return "text-green-600"; if (s>=50) return "text-amber-600"; if (s>=25) return "text-orange-600"; return "text-red-600"; }
function pBg(s: number) { if (s>=75) return "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"; if (s>=50) return "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300"; if (s>=25) return "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300"; return "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"; }
function pLabel(s: number) { if (s>=75) return "Well Prepared"; if (s>=50) return "Adequate"; if (s>=25) return "Gaps Found"; return "Critical Gaps"; }
function planRiskLabel(s: number) { if (s>=75) return "Low Risk"; if (s>=50) return "Medium Risk"; if (s>=25) return "High Risk"; return "Critical Risk"; }

const IMPL_KW = ["step","deploy","install","configure","verify","validate","monitor","rollout","pre-check","post-check","approval","schedule"];
const BACK_KW = ["revert","rollback","restore","undo","previous","snapshot","backup","recovery","failover","downtime"];
const TEST_KW = ["test","verify","validate","smoke","regression","acceptance","integration","unit","performance","security","coverage"];
const RISK_KW = ["risk","impact","mitigation","contingency","fallback","probability","severity","exposure","vulnerability","dependency"];
const JUST_KW = ["business","requirement","need","value","benefit","compliance","security","improvement"];

interface PlanScore { present: boolean; length: number; quality: number; factors: string[]; }

function scorePlan(text: string, keywords: string[], planName: string): PlanScore {
  const t = (text||"").trim();
  if (!t || t.length < 5) return { present: false, length: 0, quality: 0, factors: [`No ${planName} provided`] };
  const factors: string[] = [];
  let q = 20;
  const words = t.split(/\s+/).length;
  const lines = t.split(/\n/).filter(l => l.trim()).length;
  if (t.length > 500) { q += 20; factors.push(`Detailed (${words} words)`); }
  else if (t.length > 200) { q += 12; factors.push(`Moderate detail (${words} words)`); }
  else if (t.length > 50) { q += 5; factors.push(`Brief (${words} words)`); }
  else { factors.push(`Very short (${words} words)`); }
  if (/(?:^|\n)\s*(?:\d+[.)\s]|[-•*]\s)/m.test(t)) { q += 15; factors.push("Has structured steps"); }
  if (lines >= 5) q += 5;
  const matched = keywords.filter(kw => t.toLowerCase().includes(kw));
  const ratio = matched.length / keywords.length;
  if (ratio >= 0.5) { q += 20; factors.push(`Good keyword coverage (${matched.length}/${keywords.length})`); }
  else if (ratio >= 0.25) { q += 10; factors.push(`Partial coverage (${matched.length}/${keywords.length})`); }
  else if (matched.length > 0) { q += 5; factors.push(`Minimal keywords (${matched.length})`); }
  else { factors.push("No key terms found"); }
  if (/\d{4}[-/]\d{2}|\d{1,2}:\d{2}|hours?|minutes?|AM|PM/i.test(t)) { q += 5; factors.push("Time references found"); }
  if (/@|email|phone|contact|notify|team/i.test(t)) { q += 5; factors.push("Contact/notification info"); }
  return { present: true, length: t.length, quality: Math.min(100, q), factors };
}

/* ═══════════════════════════════════════════════════════════════════ */

export default function ImpactPage() {
  const [days, setDays] = useState(7);
  const { changeRequests, loading, error } = useData(days);
  const [selectedCR, setSelectedCR] = useState<string | null>(null);
  const [weights, setWeights] = useState<Weights>({ ...DEFAULT_WEIGHTS });
  const [activeTab, setActiveTab] = useState<"overview"|"analysis"|"risk"|"ml"|"plans"|"mlTab">("overview");
  const [weightsOpen, setWeightsOpen] = useState(false);
  const [gitData, setGitData] = useState<GitAnalysisData | null>(null);
  const [gitLoading, setGitLoading] = useState(false);
  const [gitError, setGitError] = useState<string | null>(null);
  const [gitRepo, setGitRepo] = useState("https://code.devsnc.com/dev/perf-testing-ai");
  const [gitDays, setGitDays] = useState(14);
  const [expandedCommit, setExpandedCommit] = useState<string | null>(null);
  const [planSearch, setPlanSearch] = useState("");
  const [selectedPlanCR, setSelectedPlanCR] = useState<string | null>(null);
  const [expandedPlanContent, setExpandedPlanContent] = useState<string | null>(null);
  const [planFilterRisk, setPlanFilterRisk] = useState<string>("all");
  const [planFilterState, setPlanFilterState] = useState<string>("all");
  const [planFilterGroup, setPlanFilterGroup] = useState<string>("all");
  const [riskFormulaOpen, setRiskFormulaOpen] = useState(false);
  const [riskSearch, setRiskSearch] = useState("");
  const [riskFilterRisk, setRiskFilterRisk] = useState<string>("all");
  const [riskFilterState, setRiskFilterState] = useState<string>("all");
  const [riskFilterGroup, setRiskFilterGroup] = useState<string>("all");
  const [planScoringOpen, setPlanScoringOpen] = useState(false);
  const [mlSearch, setMlSearch] = useState("");
  const [mlFilterRisk, setMlFilterRisk] = useState<string>("all");
  const [mlFilterState, setMlFilterState] = useState<string>("all");
  const [mlFilterGroup, setMlFilterGroup] = useState<string>("all");
  const [selectedMlCR, setSelectedMlCR] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [mlAnalysis, setMlAnalysis] = useState<Record<string, any> | null>(null);
  const [mlLoading, setMlLoading] = useState(false);
  const [mlError, setMlError] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<Record<string, Partial<DimensionScores>>>({});

  const setWeight = useCallback((key: keyof Weights, val: number) => { setWeights((p) => ({ ...p, [key]: val })); }, []);
  const resetWeights = useCallback(() => setWeights({ ...DEFAULT_WEIGHTS }), []);

  const scored = useMemo(() => changeRequests.map((cr) => {
    const baseDims = computeDimensions(cr);
    const dims: DimensionScores = { ...baseDims, ...(overrides[cr.number]||{}) };
    return { cr, dims, baseDims, overall: computeOverall(dims, weights) };
  }), [changeRequests, weights, overrides]);

  const uniqueStates = useMemo(() => {
    const fromData = changeRequests.map((c) => c.state).filter(Boolean);
    const standard = ["New", "Open", "In Progress", "Pending", "Closed", "Canceled", "Review", "Scheduled", "Implement", "Assess", "Authorize"];
    return [...new Set([...standard, ...fromData])].sort();
  }, [changeRequests]);
  const uniqueGroups = useMemo(() => {
    const fromData = changeRequests.map((c) => c.assignment_group).filter(Boolean);
    return [...new Set(fromData)].sort();
  }, [changeRequests]);
  const uniqueRiskLevels = useMemo(() => {
    const fromData = changeRequests.map((c) => c.risk).filter(Boolean);
    const standard = ["None", "Low", "Moderate", "High", "Very High"];
    return [...new Set([...standard, ...fromData])].sort();
  }, [changeRequests]);


  const planResults = useMemo(() => changeRequests.map((c) => {
    const implementation = scorePlan(c.implementation_plan, IMPL_KW, "implementation plan");
    const backout = scorePlan(c.backout_plan, BACK_KW, "backout plan");
    const testPlan = scorePlan(c.test_plan, TEST_KW, "test plan");
    const changePlan = scorePlan(c.change_plan, IMPL_KW, "change plan");
    const riskAnalysis = scorePlan(c.risk_impact_analysis, RISK_KW, "risk/impact analysis");
    const justification = scorePlan(c.justification, JUST_KW, "justification");
    const overallScore = Math.round(implementation.quality*0.25 + backout.quality*0.25 + testPlan.quality*0.20 + riskAnalysis.quality*0.15 + changePlan.quality*0.10 + justification.quality*0.05);
    const gapCount = [implementation, backout, testPlan, changePlan, riskAnalysis, justification].filter(p => !p.present).length;
    const riskLevel = overallScore>=75?"low":overallScore>=50?"medium":overallScore>=25?"high":"critical";
    return { cr: c, implementation, backout, testPlan, changePlan, riskAnalysis, justification, overallScore, riskLevel, gapCount };
  }).sort((a, b) => a.overallScore - b.overallScore), [changeRequests]);

  if (loading) return <div className="space-y-4">{[1,2,3].map((i) => <div key={i} className="h-40 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />)}</div>;
  if (error) return <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">{error}</div>;
  if (changeRequests.length === 0) return <div className="text-gray-500">No change requests found</div>;

  const activeNum = selectedCR || changeRequests[0].number;
  const catMap: Record<string, { total: number; count: number }> = {};
  scored.forEach((s) => { const cat = s.cr.category || "Other"; if (!catMap[cat]) catMap[cat] = { total: 0, count: 0 }; catMap[cat].total += s.overall; catMap[cat].count++; });
  const categoryData = Object.entries(catMap).map(([category, d]) => ({ category, avgRisk: Math.round(d.total / d.count), count: d.count })).sort((a, b) => b.avgRisk - a.avgRisk);

  const DIMS: { key: keyof DimensionScores; label: string; snField: string; icon: React.ElementType; formula: string }[] = [
    { key: "risk", label: "Risk", snField: "risk", icon: AlertTriangle, formula: "Very High→95, High→75, Moderate→50, Low→25, None→5" },
    { key: "impact", label: "Impact", snField: "impact", icon: Layers, formula: "1-High→85, 2-Medium→55, 3-Low→25" },
    { key: "urgency", label: "Urgency", snField: "urgency", icon: Zap, formula: "1-High→85, 2-Medium→55, 3-Low→25" },
    { key: "priority", label: "Priority", snField: "priority", icon: Gauge, formula: "1-Critical→95, 2-High→75, 3-Moderate→50, 4-Low→25" },
    { key: "type", label: "Type", snField: "type", icon: Shield, formula: "Emergency→90, Normal→50, Standard→25" },
    { key: "scope", label: "Scope", snField: "scope", icon: Settings2, formula: "Large→80, Medium→50, Small→25" },
  ];

  function handleOverride(dim: keyof DimensionScores, val: number, crNumber?: string) { const num = crNumber || activeNum; setOverrides((p) => ({ ...p, [num]: { ...(p[num]||{}), [dim]: Math.max(0, Math.min(100, val)) } })); }

  /* ═══ Plan Analysis Data ═══ */
  const PLAN_DIMS = [
    { key: "implementation" as const, label: "Implementation Plan", weight: "25%", icon: FileText },
    { key: "backout" as const, label: "Backout Plan", weight: "25%", icon: RotateCcw },
    { key: "testPlan" as const, label: "Test Plan", weight: "20%", icon: CheckCircle2 },
    { key: "riskAnalysis" as const, label: "Risk/Impact Analysis", weight: "15%", icon: AlertTriangle },
    { key: "changePlan" as const, label: "Change Plan", weight: "10%", icon: ClipboardCheck },
    { key: "justification" as const, label: "Justification", weight: "5%", icon: Info },
  ];

  /* ═══ Git Analysis Fetch ═══ */
  async function fetchGitAnalysis() {
    setGitLoading(true); setGitError(null);
    try {
      const res = await fetch(`/api/data/git-analysis?repo=${encodeURIComponent(gitRepo)}&days=${gitDays}`);
      if (!res.ok) { const body = await res.json().catch(() => ({ error: `HTTP ${res.status}` })); throw new Error(body.error || `HTTP ${res.status}`); }
      setGitData(await res.json());
    } catch (err) { setGitError(err instanceof Error ? err.message : String(err)); }
    finally { setGitLoading(false); }
  }

  return (
    <>
      <PageHeader title="Impact Analysis" subtitle="Computed impact scores from ServiceNow fields — click a row for details, adjust weights for what-if analysis" />
    <div className="space-y-6 p-4 md:p-6">

      {/* ═══ Tabs ═══ */}
      <div className="flex gap-1 border-b border-gray-200 pb-0.5 dark:border-gray-800 overflow-x-auto">
        <button onClick={() => setActiveTab("overview")} className={`flex items-center gap-1.5 rounded-t-lg px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap ${activeTab==="overview" ? "border-b-2 border-blue-600 text-blue-600 bg-blue-50 dark:bg-blue-950/30" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"}`}><LayoutDashboard className="h-4 w-4" />Overview</button>
        <button onClick={() => setActiveTab("plans")} className={`flex items-center gap-1.5 rounded-t-lg px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap ${activeTab==="plans" ? "border-b-2 border-teal-600 text-teal-600 bg-teal-50 dark:bg-teal-950/30" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"}`}><ClipboardCheck className="h-4 w-4" />Plan Analysis</button>
        <button onClick={() => setActiveTab("mlTab")} className={`flex items-center gap-1.5 rounded-t-lg px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap ${activeTab==="mlTab" ? "border-b-2 border-indigo-600 text-indigo-600 bg-indigo-50 dark:bg-indigo-950/30" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"}`}><Brain className="h-4 w-4" />ML Analysis</button>
        <button onClick={() => setActiveTab("risk")} className={`flex items-center gap-1.5 rounded-t-lg px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap ${activeTab==="risk" ? "border-b-2 border-blue-600 text-blue-600 bg-blue-50 dark:bg-blue-950/30" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"}`}><ShieldAlert className="h-4 w-4" />Risk Analysis</button>
        <button onClick={() => setActiveTab("ml")} className={`flex items-center gap-1.5 rounded-t-lg px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap ${activeTab==="ml" ? "border-b-2 border-purple-600 text-purple-600 bg-purple-50 dark:bg-purple-950/30" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"}`}><Brain className="h-4 w-4" />Code Change Analysis</button>
      </div>

      {/* ═══ OVERVIEW TAB ═══ */}
      {activeTab === "overview" && (() => {
        const totalCRs = scored.length;
        const avgOverall = totalCRs > 0 ? Math.round(scored.reduce((a, s) => a + s.overall, 0) / totalCRs) : 0;
        const criticalCount = scored.filter((s) => s.overall >= 80).length;
        const highCount = scored.filter((s) => s.overall >= 60 && s.overall < 80).length;
        const lowCount = scored.filter((s) => s.overall < 40).length;
        const riskDistData = [
          { name: "Critical (≥80)", value: criticalCount, fill: "#ef4444" },
          { name: "High (60-79)", value: highCount, fill: "#f97316" },
          { name: "Medium (40-59)", value: scored.filter((s) => s.overall >= 40 && s.overall < 60).length, fill: "#eab308" },
          { name: "Low (<40)", value: lowCount, fill: "#22c55e" },
        ].filter((d) => d.value > 0);
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-500">Showing change requests from the last {days} days</h3>
              <div className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 dark:border-gray-700 dark:bg-gray-800">
                <Calendar className="h-3.5 w-3.5 text-gray-400" />
                <select value={days} onChange={(e) => setDays(Number(e.target.value))} className="bg-transparent text-xs font-medium text-gray-700 outline-none dark:text-gray-300">
                  <option value={7}>Last 7 days</option>
                  <option value={14}>Last 14 days</option>
                  <option value={30}>Last 30 days</option>
                  <option value={90}>Last 90 days</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <Card className="p-5"><p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Changes Analyzed</p><p className="mt-1 text-3xl font-bold text-gray-900 dark:text-gray-100">{totalCRs}</p></Card>
              <Card className="p-5"><p className="text-sm font-medium text-gray-500 dark:text-gray-400">Avg Impact Score</p><p className="mt-1 text-3xl font-bold text-gray-900 dark:text-gray-100">{avgOverall}</p><p className="text-xs text-gray-400">{getRiskLabel(avgOverall)}</p></Card>
              <Card className="p-5"><p className="text-sm font-medium text-gray-500 dark:text-gray-400">Critical / High Risk</p><p className="mt-1 text-3xl font-bold text-red-600">{criticalCount + highCount}</p><p className="text-xs text-gray-400">{criticalCount} critical, {highCount} high</p></Card>
              <Card className="p-5"><p className="text-sm font-medium text-gray-500 dark:text-gray-400">Low Risk</p><p className="mt-1 text-3xl font-bold text-green-600">{lowCount}</p><p className="text-xs text-gray-400">Score below 40</p></Card>
            </div>
            <Card><CardHeader><CardTitle className="flex items-center gap-2"><PieChartIcon className="h-4 w-4 text-blue-500" /> Impact Score Distribution</CardTitle></CardHeader><div className="h-72"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={riskDistData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, value }) => `${name}: ${value}`} /><Legend /><Tooltip /></PieChart></ResponsiveContainer></div></Card>
            <Card><CardHeader><CardTitle>Average Impact Score by Category</CardTitle><CardDescription>Based on computed overall scores with current weights</CardDescription></CardHeader><div className="h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={categoryData} layout="vertical"><CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" /><XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12 }} stroke="#94a3b8" /><YAxis type="category" dataKey="category" tick={{ fontSize: 12 }} stroke="#94a3b8" width={100} /><Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }} // eslint-disable-next-line @typescript-eslint/no-explicit-any
formatter={(value: any) => [`${value} (${getRiskLabel(Number(value))})`, "Avg Impact"]} /><Bar dataKey="avgRisk" radius={[0, 4, 4, 0]}>{categoryData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.avgRisk >= 80 ? "#ef4444" : entry.avgRisk >= 60 ? "#f97316" : entry.avgRisk >= 40 ? "#eab308" : "#22c55e"} />))}</Bar></BarChart></ResponsiveContainer></div></Card>

            {/* ── Plan Readiness Summary ── */}
            {(() => {
              const pn = planResults.length;
              const pAvg = pn>0?Math.round(planResults.reduce((a, p) => a+p.overallScore, 0)/pn):0;
              const pCrit = planResults.filter(p => p.riskLevel==="critical").length;
              const pHigh = planResults.filter(p => p.riskLevel==="high").length;
              const pFull = planResults.filter(p => p.gapCount===0).length;
              const pMissingBack = planResults.filter(p => !p.backout.present).length;
              const pMissingImpl = planResults.filter(p => !p.implementation.present).length;
              const pMissingTest = planResults.filter(p => !p.testPlan.present).length;
              return (<>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
                  <Card className="p-4"><div className="flex items-center gap-2"><ClipboardCheck className="h-4 w-4 text-teal-500" /><span className="text-xs text-gray-500 dark:text-gray-400">Avg Readiness</span></div><p className={`mt-1 text-2xl font-bold ${pColor(pAvg)}`}>{pAvg}</p><p className="text-[11px] text-gray-400">{pLabel(pAvg)}</p></Card>
                  <Card className="p-4"><div className="flex items-center gap-2"><XCircle className="h-4 w-4 text-red-500" /><span className="text-xs text-gray-500 dark:text-gray-400">Critical / High Risk</span></div><p className="mt-1 text-2xl font-bold text-red-600">{pCrit+pHigh}</p><p className="text-[11px] text-gray-400">{pCrit} critical, {pHigh} high</p></Card>
                  <Card className="p-4"><div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-500" /><span className="text-xs text-gray-500 dark:text-gray-400">Full Coverage</span></div><p className="mt-1 text-2xl font-bold text-green-600">{pFull}</p><p className="text-[11px] text-gray-400">All 6 plans present</p></Card>
                  <Card className="p-4"><div className="flex items-center gap-2"><RotateCcw className="h-4 w-4 text-orange-500" /><span className="text-xs text-gray-500 dark:text-gray-400">Missing Backout</span></div><p className="mt-1 text-2xl font-bold text-orange-600">{pMissingBack}</p><p className="text-[11px] text-gray-400">of {pn} changes</p></Card>
                  <Card className="p-4"><div className="flex items-center gap-2"><AlertCircle className="h-4 w-4 text-amber-500" /><span className="text-xs text-gray-500 dark:text-gray-400">Missing Plans</span></div><p className="mt-1 text-2xl font-bold text-amber-600">{pMissingImpl+pMissingBack+pMissingTest}</p><p className="text-[11px] text-gray-400">impl: {pMissingImpl}, backout: {pMissingBack}, test: {pMissingTest}</p></Card>
                </div>
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <Card><CardHeader><CardTitle className="flex items-center gap-2"><BarChart3 className="h-4 w-4 text-teal-500" /> Plan Readiness Distribution</CardTitle></CardHeader><div className="h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={[{ bucket: "Well Prepared (75-100)", count: planResults.filter(p => p.overallScore>=75).length, fill: "#22c55e" },{ bucket: "Adequate (50-74)", count: planResults.filter(p => p.overallScore>=50 && p.overallScore<75).length, fill: "#eab308" },{ bucket: "Gaps Found (25-49)", count: planResults.filter(p => p.overallScore>=25 && p.overallScore<50).length, fill: "#f97316" },{ bucket: "Critical Gaps (0-24)", count: planResults.filter(p => p.overallScore<25).length, fill: "#ef4444" }]}><CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" /><XAxis dataKey="bucket" tick={{ fontSize: 10 }} stroke="#94a3b8" /><YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" /><Tooltip /><Bar dataKey="count" name="Changes" radius={[4, 4, 0, 0]}>{["#22c55e","#eab308","#f97316","#ef4444"].map((fill, idx) => <Cell key={idx} fill={fill} />)}</Bar></BarChart></ResponsiveContainer></div></Card>
                  <Card><CardHeader><CardTitle className="flex items-center gap-2"><FileText className="h-4 w-4 text-teal-500" /> Plan Coverage Summary</CardTitle><CardDescription>Average quality score per plan dimension</CardDescription></CardHeader><div className="space-y-3">{PLAN_DIMS.map((d) => { const avg = pn>0?Math.round(planResults.reduce((a, p) => a+p[d.key].quality, 0)/pn):0; const presentCount = planResults.filter(p => p[d.key].present).length; return (<div key={d.key} className="space-y-1"><div className="flex items-center justify-between"><div className="flex items-center gap-2"><d.icon className="h-3.5 w-3.5 text-teal-500" /><span className="text-xs font-medium text-gray-700 dark:text-gray-300">{d.label}</span></div><div className="flex items-center gap-2"><span className="text-[11px] text-gray-400">{presentCount}/{pn} present</span><span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${pBg(avg)}`}>{avg}</span></div></div><div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800"><div className="h-2 rounded-full transition-all" style={{ width: `${avg}%`, backgroundColor: avg>=75?"#22c55e":avg>=50?"#eab308":avg>=25?"#f97316":"#ef4444" }} /></div></div>); })}</div></Card>
                </div>
              </>);
            })()}

            {/* ── Cross-CR Plan Quality Heatmap ── */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><BarChart3 className="h-4 w-4 text-teal-500" /> Plan Quality Heatmap — All CRs × Dimensions</CardTitle>
                <CardDescription>Each row is a change request, each column a plan dimension. Color intensity shows quality (red=missing/poor, green=strong). Click a row to drill in.</CardDescription>
              </CardHeader>
              <div className="overflow-x-auto max-h-[360px] overflow-y-auto px-4 pb-4">
                <table className="w-full border-collapse text-[10px]">
                  <thead className="sticky top-0 bg-white dark:bg-gray-900 z-10">
                    <tr>
                      <th className="py-1.5 text-left font-medium text-gray-500 min-w-[120px]">CR</th>
                      {PLAN_DIMS.map(d => <th key={d.key} className="py-1.5 text-center font-medium text-gray-500 px-1 min-w-[60px]">{d.label.replace(" Plan","").replace("/Impact Analysis","")}</th>)}
                      <th className="py-1.5 text-center font-medium text-gray-500 px-1 min-w-[50px]">Overall</th>
                    </tr>
                  </thead>
                  <tbody>
                    {planResults.slice(0, 50).map((p) => (
                      <tr key={p.cr.number} className="cursor-pointer hover:ring-1 hover:ring-teal-300" onClick={() => { setSelectedPlanCR(p.cr.number); setExpandedPlanContent(null); setMlAnalysis(null); setMlError(null); setActiveTab("plans"); }}>
                        <td className="py-0.5 font-mono text-gray-500 truncate max-w-[120px]" title={p.cr.short_description}>{p.cr.number.replace("CHG","")}</td>
                        {PLAN_DIMS.map(d => {
                          const q = p[d.key].quality;
                          const present = p[d.key].present;
                          const bg = !present ? "bg-red-500" : q >= 75 ? "bg-green-500" : q >= 50 ? "bg-amber-400" : q >= 25 ? "bg-orange-500" : "bg-red-400";
                          return <td key={d.key} className="py-0.5 px-0.5"><div className={`rounded h-5 flex items-center justify-center text-white text-[9px] font-bold ${bg}`} style={{ opacity: present ? Math.max(0.35, q/100) : 0.6 }}>{present ? q : "—"}</div></td>;
                        })}
                        <td className="py-0.5 px-0.5"><div className={`rounded h-5 flex items-center justify-center text-white text-[9px] font-bold ${p.overallScore >= 75 ? "bg-green-600" : p.overallScore >= 50 ? "bg-amber-500" : p.overallScore >= 25 ? "bg-orange-500" : "bg-red-500"}`}>{p.overallScore}</div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* ── Peer Benchmark: by Team + by Risk Level ── */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* By Team */}
              {(() => {
                const teamMap: Record<string, { total: number; scoreSum: number; gapSum: number }> = {};
                planResults.forEach(p => {
                  const team = p.cr.assignment_group || "Unassigned";
                  if (!teamMap[team]) teamMap[team] = { total: 0, scoreSum: 0, gapSum: 0 };
                  teamMap[team].total++;
                  teamMap[team].scoreSum += p.overallScore;
                  teamMap[team].gapSum += p.gapCount;
                });
                const teamData = Object.entries(teamMap).map(([team, d]) => ({
                  team: team.length > 20 ? team.slice(0, 18) + "…" : team,
                  avgReadiness: Math.round(d.scoreSum / d.total),
                  avgGaps: +(d.gapSum / d.total).toFixed(1),
                  count: d.total,
                })).sort((a, b) => a.avgReadiness - b.avgReadiness);
                return (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2"><User className="h-4 w-4 text-teal-500" /> Plan Readiness by Team</CardTitle>
                      <CardDescription>Average plan readiness score per assignment group. Lower = more risk.</CardDescription>
                    </CardHeader>
                    <div className="h-64 px-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={teamData} layout="vertical" barCategoryGap="20%">
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                          <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} stroke="#94a3b8" />
                          <YAxis type="category" dataKey="team" tick={{ fontSize: 9 }} stroke="#94a3b8" width={110} />
                          <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "11px" }} />
                          <Bar dataKey="avgReadiness" name="Avg Readiness" radius={[0, 4, 4, 0]}>
                            {teamData.map((d, i) => <Cell key={i} fill={d.avgReadiness >= 75 ? "#22c55e" : d.avgReadiness >= 50 ? "#eab308" : d.avgReadiness >= 25 ? "#f97316" : "#ef4444"} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>
                );
              })()}

              {/* By Risk Level */}
              {(() => {
                const riskMap: Record<string, { total: number; scoreSum: number; gapSum: number }> = {};
                planResults.forEach(p => {
                  const risk = p.cr.risk || "Unknown";
                  if (!riskMap[risk]) riskMap[risk] = { total: 0, scoreSum: 0, gapSum: 0 };
                  riskMap[risk].total++;
                  riskMap[risk].scoreSum += p.overallScore;
                  riskMap[risk].gapSum += p.gapCount;
                });
                const riskData = Object.entries(riskMap).map(([risk, d]) => ({
                  risk,
                  avgReadiness: Math.round(d.scoreSum / d.total),
                  avgGaps: +(d.gapSum / d.total).toFixed(1),
                  count: d.total,
                })).sort((a, b) => a.avgReadiness - b.avgReadiness);
                const riskFill: Record<string, string> = { "Very High": "#ef4444", "High": "#f97316", "Moderate": "#eab308", "Low": "#22c55e", "None": "#94a3b8" };
                return (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-500" /> Plan Readiness by SN Risk Level</CardTitle>
                      <CardDescription>Do high-risk CRs have better plans? Compare readiness across risk categories.</CardDescription>
                    </CardHeader>
                    <div className="space-y-3 px-4 pb-4">
                      {riskData.map(d => (
                        <div key={d.risk} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-gray-700 dark:text-gray-300">{d.risk} <span className="text-gray-400 font-normal">({d.count} CRs)</span></span>
                            <div className="flex items-center gap-3">
                              <span className="text-gray-400">Avg gaps: <span className="font-bold text-gray-600 dark:text-gray-300">{d.avgGaps}</span></span>
                              <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${pBg(d.avgReadiness)}`}>{d.avgReadiness}</span>
                            </div>
                          </div>
                          <div className="h-3 rounded-full bg-gray-100 dark:bg-gray-800">
                            <div className="h-3 rounded-full transition-all" style={{ width: `${d.avgReadiness}%`, backgroundColor: riskFill[d.risk] || "#6366f1" }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                );
              })()}
            </div>
          </div>
        );
      })()}


      {/* ═══ RISK ANALYSIS TAB ═══ */}
      {activeTab === "risk" && (() => {
        function likelihoodScore(c: ChangeRequest): number { const p = (c.priority||"").trim(); const pS = p.startsWith("1")?5:p.startsWith("2")?4:p.startsWith("3")?3:p.startsWith("4")?2:3; const u = (c.urgency||"").trim(); const uS = u.startsWith("1")?5:u.startsWith("2")?3:u.startsWith("3")?1:3; return Math.round((pS+uS)/2*10)/10; }
        function impactSeverity(c: ChangeRequest): number { const i = (c.sn_impact||"").trim(); const iS = i.startsWith("1")?5:i.startsWith("2")?3:i.startsWith("3")?1:3; const r = (c.risk||"").toLowerCase(); const rS = r==="very high"?5:r==="high"?4:r==="moderate"?3:r==="low"?2:r==="none"?1:3; const s = (c.scope||"").toLowerCase(); const sS = (s==="large"||s==="extensive")?5:s==="medium"?3:s==="small"?1:3; return Math.round((iS+rS+sS)/3*10)/10; }
        function velocityMod(c: ChangeRequest): number { const t = (c.type||"").toLowerCase(); if (t==="emergency") return 0.8; if (t==="normal") return 0.3; if (t==="standard") return 0.1; return 0.3; }
        function controlCredit(c: ChangeRequest): number { let cc = 0; if (c.backout_plan && c.backout_plan.trim().length > 10) cc += 10; if (c.test_plan && c.test_plan.trim().length > 10) cc += 8; if (c.implementation_plan && c.implementation_plan.trim().length > 10) cc += 7; return cc; }
        function snRiskNumeric(r: string): number { const l = (r||"").toLowerCase(); if (l==="very high") return 90; if (l==="high") return 70; if (l==="moderate") return 50; if (l==="low") return 25; if (l==="none") return 5; return 40; }
        const riskResults = changeRequests.map((c) => { const L = likelihoodScore(c); const I = impactSeverity(c); const V = velocityMod(c); const C = controlCredit(c); const raw = Math.max(0, Math.min(100, Math.round((L*I/25)*100*(1+V) - C))); const snScore = snRiskNumeric(c.risk); const delta = raw - snScore; return { cr: c, L, I, V, C, score: raw, snRisk: c.risk || "—", snScore, delta }; }).sort((a, b) => b.score - a.score);
        const rq = riskSearch.toLowerCase();
        let filteredRisk = rq ? riskResults.filter((r) => r.cr.number.toLowerCase().includes(rq) || r.cr.short_description.toLowerCase().includes(rq) || r.cr.assignment_group.toLowerCase().includes(rq)) : riskResults;
        if (riskFilterRisk !== "all") filteredRisk = filteredRisk.filter((r) => r.cr.risk === riskFilterRisk);
        if (riskFilterState !== "all") filteredRisk = filteredRisk.filter((r) => r.cr.state === riskFilterState);
        if (riskFilterGroup !== "all") filteredRisk = filteredRisk.filter((r) => r.cr.assignment_group === riskFilterGroup);
        const n = riskResults.length;
        const avgScore = n>0?Math.round(riskResults.reduce((a, r) => a+r.score, 0)/n):0;
        const maxScore = n>0?riskResults[0].score:0;
        const critCount = riskResults.filter(r => r.score>=75).length;
        const highCount = riskResults.filter(r => r.score>=50 && r.score<75).length;
        return (
          <div className="space-y-6">
            <Card className="border-purple-200 bg-purple-50/30 dark:border-purple-900 dark:bg-purple-950/20">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2"><Info className="h-5 w-5 text-purple-600" />Risk Assessment Formula (ISO 31000 / NIST SP 800-30)</CardTitle>
                  <button onClick={() => setRiskFormulaOpen(!riskFormulaOpen)} className="flex items-center gap-1 rounded px-2 py-1 text-xs text-purple-600 hover:bg-purple-100 dark:hover:bg-purple-900">{riskFormulaOpen ? "▲ Collapse" : "▼ Expand"}</button>
                </div>
                <CardDescription className="text-sm">Risk = (L × I / 25 × 100) × (1 + V) − C. Industry-standard 5×5 risk matrix approach.</CardDescription>
              </CardHeader>
              {riskFormulaOpen && (<>
                <div className="rounded-lg bg-white dark:bg-gray-900 border border-purple-100 dark:border-purple-900 p-5 space-y-4">
                  <p className="text-lg font-bold font-mono text-purple-700 dark:text-purple-400">Risk Score = (L × I / 25 × 100) × (1 + V) − C</p>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div className="rounded-lg border border-purple-100 dark:border-purple-800 p-3 space-y-1">
                      <p className="text-sm font-bold text-purple-700 dark:text-purple-300">L — Likelihood (1–5)</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Average of <strong>Priority</strong> and <strong>Urgency</strong> scores from the change request, each mapped to a 1–5 scale.</p>
                      <p className="text-[11px] text-gray-400">Priority: 1-Critical → 5, 2-High → 4, 3-Moderate → 3, 4-Low → 2. Urgency: 1-High → 5, 2-Medium → 3, 3-Low → 1.</p>
                    </div>
                    <div className="rounded-lg border border-purple-100 dark:border-purple-800 p-3 space-y-1">
                      <p className="text-sm font-bold text-purple-700 dark:text-purple-300">I — Impact Severity (1–5)</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Average of <strong>Impact</strong>, <strong>Risk</strong>, and <strong>Scope</strong> fields, each mapped to a 1–5 scale.</p>
                      <p className="text-[11px] text-gray-400">Impact: 1-High → 5, 2-Medium → 3, 3-Low → 1. Risk: Very High → 5, High → 4, Moderate → 3, Low → 2, None → 1. Scope: Large/Extensive → 5, Medium → 3, Small → 1.</p>
                    </div>
                    <div className="rounded-lg border border-purple-100 dark:border-purple-800 p-3 space-y-1">
                      <p className="text-sm font-bold text-purple-700 dark:text-purple-300">V — Velocity Modifier (0–0.8)</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Amplifies risk based on <strong>Change Type</strong>. Faster changes have less review time, increasing risk.</p>
                      <p className="text-[11px] text-gray-400">Emergency → 0.8 (80% amplification), Normal → 0.3, Standard → 0.1.</p>
                    </div>
                    <div className="rounded-lg border border-purple-100 dark:border-purple-800 p-3 space-y-1">
                      <p className="text-sm font-bold text-purple-700 dark:text-purple-300">C — Control Credit (0–25)</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Reduces risk when plans are documented. Rewards preparation with a score deduction.</p>
                      <p className="text-[11px] text-gray-400">Backout plan present → −10, Test plan present → −8, Implementation plan present → −7. Max credit: 25.</p>
                    </div>
                  </div>
                  <div className="mt-2 grid grid-cols-4 gap-2 text-center text-xs">
                    <div className="rounded bg-green-100 dark:bg-green-900 p-2"><span className="font-bold text-green-700 dark:text-green-300">0-24</span><p className="text-green-600 dark:text-green-400">Low</p></div>
                    <div className="rounded bg-amber-100 dark:bg-amber-900 p-2"><span className="font-bold text-amber-700 dark:text-amber-300">25-49</span><p className="text-amber-600 dark:text-amber-400">Medium</p></div>
                    <div className="rounded bg-orange-100 dark:bg-orange-900 p-2"><span className="font-bold text-orange-700 dark:text-orange-300">50-74</span><p className="text-orange-600 dark:text-orange-400">High</p></div>
                    <div className="rounded bg-red-100 dark:bg-red-900 p-2"><span className="font-bold text-red-700 dark:text-red-300">75-100</span><p className="text-red-600 dark:text-red-400">Critical</p></div>
                  </div>
                </div>
              </>)}
            </Card>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <Card className="p-5"><p className="text-sm font-medium text-gray-500 dark:text-gray-400">Avg Risk Score</p><p className={`mt-1 text-3xl font-bold ${riskColor(avgScore)}`}>{avgScore}</p><p className="text-xs text-gray-400">{riskLbl(avgScore)}</p></Card>
              <Card className="p-5"><p className="text-sm font-medium text-gray-500 dark:text-gray-400">Max Risk Score</p><p className={`mt-1 text-3xl font-bold ${riskColor(maxScore)}`}>{maxScore}</p></Card>
              <Card className="p-5"><p className="text-sm font-medium text-gray-500 dark:text-gray-400">Critical (≥75)</p><p className="mt-1 text-3xl font-bold text-red-600">{critCount}</p></Card>
              <Card className="p-5"><p className="text-sm font-medium text-gray-500 dark:text-gray-400">High (50-74)</p><p className="mt-1 text-3xl font-bold text-orange-600">{highCount}</p></Card>
            </div>
            {/* ── Score Comparison Chart ── */}
            {(() => {
              const planMap = new Map(planResults.map(p => [p.cr.number, p.overallScore]));
              const chartData = riskResults.slice(0, 30).map((r) => ({
                name: r.cr.number.replace("CHG", ""),
                snScore: r.snScore,
                planScore: planMap.get(r.cr.number) ?? 0,
                riskScore: r.score,
              }));
              return (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><BarChart3 className="h-4 w-4 text-purple-500" /> Score Comparison — SN Risk vs Plan Readiness vs Computed Risk</CardTitle>
                    <CardDescription>Top 30 change requests by computed risk score. Lower plan readiness + higher risk = more concern.</CardDescription>
                  </CardHeader>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} barGap={1} barCategoryGap="15%">
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="name" tick={{ fontSize: 9 }} stroke="#94a3b8" angle={-45} textAnchor="end" height={50} />
                        <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" domain={[0, 100]} />
                        <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "12px" }} />
                        <Legend wrapperStyle={{ fontSize: "12px" }} />
                        <Bar dataKey="snScore" name="SN Risk Score" fill="#6366f1" radius={[2, 2, 0, 0]} />
                        <Bar dataKey="planScore" name="Plan Readiness" fill="#14b8a6" radius={[2, 2, 0, 0]} />
                        <Bar dataKey="riskScore" name="Computed Risk" fill="#ef4444" radius={[2, 2, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              );
            })()}
            {/* ── 5×5 Risk Heatmap Matrix + Scatter Plot ── */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* 5×5 Likelihood × Impact Heatmap */}
              {(() => {
                const matrix: Record<string, typeof riskResults> = {};
                for (let l = 1; l <= 5; l++) for (let i = 1; i <= 5; i++) matrix[`${l}-${i}`] = [];
                riskResults.forEach((r) => {
                  const lBucket = Math.max(1, Math.min(5, Math.round(r.L)));
                  const iBucket = Math.max(1, Math.min(5, Math.round(r.I)));
                  matrix[`${lBucket}-${iBucket}`]?.push(r);
                });
                const cellColor = (l: number, i: number) => {
                  const v = l * i;
                  if (v >= 16) return "bg-red-500 text-white";
                  if (v >= 10) return "bg-orange-400 text-white";
                  if (v >= 5) return "bg-amber-300 text-gray-900";
                  return "bg-green-300 text-gray-900";
                };
                const impLabels = ["", "1-Low", "2", "3", "4", "5-High"];
                const likLabels = ["", "1-Low", "2", "3", "4", "5-High"];
                return (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-purple-500" /> 5×5 Risk Heatmap — Likelihood × Impact</CardTitle>
                      <CardDescription>ISO 31000 risk matrix. Numbers show CR count per cell.</CardDescription>
                    </CardHeader>
                    <div className="px-4 pb-4">
                      <div className="flex">
                        <div className="flex flex-col items-center justify-center mr-1 w-6">
                          <span className="text-[9px] text-gray-400 [writing-mode:vertical-lr] rotate-180">Likelihood →</span>
                        </div>
                        <div className="flex-1">
                          <div className="grid grid-cols-6 gap-0.5">
                            {/* Header row */}
                            <div className="h-8" />
                            {[1,2,3,4,5].map(i => <div key={i} className="h-8 flex items-center justify-center text-[10px] font-semibold text-gray-500">{impLabels[i]}</div>)}
                            {/* Data rows (L from 5 down to 1) */}
                            {[5,4,3,2,1].map(l => (
                              <>{/* row label */}
                                <div key={`l-${l}`} className="h-14 flex items-center justify-center text-[10px] font-semibold text-gray-500">{likLabels[l]}</div>
                                {[1,2,3,4,5].map(i => {
                                  const items = matrix[`${l}-${i}`] || [];
                                  return (
                                    <div key={`${l}-${i}`} className={`h-14 rounded flex flex-col items-center justify-center ${cellColor(l, i)} transition-all hover:scale-105`} title={items.map(r => r.cr.number).join(", ") || "No CRs"}>
                                      <span className="text-lg font-bold">{items.length || ""}</span>
                                      {items.length > 0 && <span className="text-[8px] opacity-75">{items.length === 1 ? "CR" : "CRs"}</span>}
                                    </div>
                                  );
                                })}
                              </>
                            ))}
                          </div>
                          <p className="text-center text-[9px] text-gray-400 mt-1">Impact Severity →</p>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })()}

              {/* Plan Readiness vs Computed Risk Scatter Plot */}
              {(() => {
                const planMap = new Map(planResults.map(p => [p.cr.number, p.overallScore]));
                const scatterData = riskResults.map((r) => ({
                  planReadiness: planMap.get(r.cr.number) ?? 0,
                  riskScore: r.score,
                  name: r.cr.number,
                  desc: r.cr.short_description.slice(0, 40),
                }));
                return (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2"><PieChartIcon className="h-4 w-4 text-teal-500" /> Plan Readiness vs Computed Risk</CardTitle>
                      <CardDescription>Bottom-right quadrant = high risk + weak plans → highest concern.</CardDescription>
                    </CardHeader>
                    <div className="h-72 px-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                          <XAxis type="number" dataKey="planReadiness" name="Plan Readiness" domain={[0, 100]} tick={{ fontSize: 10 }} stroke="#94a3b8" label={{ value: "Plan Readiness →", position: "insideBottom", offset: -5, fontSize: 10, fill: "#94a3b8" }} />
                          <YAxis type="number" dataKey="riskScore" name="Computed Risk" domain={[0, 100]} tick={{ fontSize: 10 }} stroke="#94a3b8" label={{ value: "Risk →", angle: -90, position: "insideLeft", offset: 10, fontSize: 10, fill: "#94a3b8" }} />
                          <ZAxis range={[40, 200]} />
                          <Tooltip cursor={{ strokeDasharray: "3 3" }} contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "11px" }} labelFormatter={(_, payload) => payload?.[0]?.payload?.name || ""} />
                          <Scatter name="Change Requests" data={scatterData} fill="#8b5cf6">
                            {scatterData.map((d, i) => <Cell key={i} fill={d.riskScore >= 75 ? "#ef4444" : d.riskScore >= 50 ? "#f97316" : d.riskScore >= 25 ? "#eab308" : "#22c55e"} />)}
                          </Scatter>
                          {/* Quadrant reference lines */}
                        </ScatterChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex justify-center gap-4 px-4 pb-3 text-[10px] text-gray-400">
                      <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-500" /> Critical (≥75)</span>
                      <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-orange-500" /> High (50-74)</span>
                      <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-400" /> Medium (25-49)</span>
                      <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-green-500" /> Low (&lt;25)</span>
                    </div>
                  </Card>
                );
              })()}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px] max-w-md"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" /><input type="text" placeholder="Search by number, description, group…" className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100" value={riskSearch} onChange={(e) => setRiskSearch(e.target.value)} /></div>
              <select value={riskFilterRisk} onChange={(e) => setRiskFilterRisk(e.target.value)} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100">
                <option value="all">All Risk Levels</option>
                {uniqueRiskLevels.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
              <select value={riskFilterState} onChange={(e) => setRiskFilterState(e.target.value)} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100">
                <option value="all">All States</option>
                {uniqueStates.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <select value={riskFilterGroup} onChange={(e) => setRiskFilterGroup(e.target.value)} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100">
                <option value="all">All Groups</option>
                {uniqueGroups.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <Card><CardHeader><CardTitle>All Change Requests — Risk Assessment ({filteredRisk.length}{rq ? ` of ${n}` : ""})</CardTitle><CardDescription>Computed score vs ServiceNow risk field. Delta shows how much the computed score differs.</CardDescription></CardHeader><div className="overflow-x-auto max-h-[480px] overflow-y-auto"><table className="w-full text-sm"><thead className="sticky top-0 bg-white dark:bg-gray-900 z-10"><tr className="border-b border-gray-100 dark:border-gray-800"><th className="pb-3 text-left font-medium text-gray-500 dark:text-gray-400">Change</th><th className="pb-3 text-center font-medium text-gray-500 dark:text-gray-400">Computed</th><th className="pb-3 text-center font-medium text-gray-500 dark:text-gray-400">Level</th><th className="pb-3 text-center font-medium text-gray-500 dark:text-gray-400">SN Risk</th><th className="pb-3 text-center font-medium text-gray-500 dark:text-gray-400">SN Score</th><th className="pb-3 text-center font-medium text-gray-500 dark:text-gray-400">Delta</th><th className="pb-3 text-center font-medium text-gray-500 dark:text-gray-400" title="Likelihood">L</th><th className="pb-3 text-center font-medium text-gray-500 dark:text-gray-400" title="Impact Severity">I</th><th className="pb-3 text-center font-medium text-gray-500 dark:text-gray-400" title="Velocity Modifier">V</th><th className="pb-3 text-center font-medium text-gray-500 dark:text-gray-400" title="Control Credit">C</th></tr></thead><tbody>{filteredRisk.map((r) => (<tr key={r.cr.number} className="cursor-pointer border-b border-gray-50 dark:border-gray-800 hover:bg-blue-50 dark:hover:bg-blue-950/30" onClick={() => { setSelectedCR(r.cr.number); setActiveTab("analysis"); }}><td className="py-2.5"><span className="font-mono text-[11px] text-gray-400">{r.cr.number}</span><p className="font-medium text-gray-900 dark:text-gray-100 text-xs line-clamp-1">{r.cr.short_description}</p></td><td className="py-2.5 text-center"><span className={`inline-block rounded-full px-2.5 py-0.5 text-sm font-bold ${riskBgCls(r.score)}`}>{r.score}</span></td><td className="py-2.5 text-center"><span className={`text-xs font-semibold capitalize ${riskColor(r.score)}`}>{riskLbl(r.score)}</span></td><td className="py-2.5 text-center text-xs text-gray-600 dark:text-gray-400">{r.snRisk}</td><td className="py-2.5 text-center"><span className={`inline-block rounded-full px-2 py-0.5 text-xs font-bold ${riskBgCls(r.snScore)}`}>{r.snScore}</span></td><td className="py-2.5 text-center"><span className={`text-xs font-bold ${r.delta > 10 ? "text-red-600" : r.delta < -10 ? "text-green-600" : "text-gray-500"}`}>{r.delta > 0 ? "+" : ""}{r.delta}</span></td><td className="py-2.5 text-center text-xs font-mono">{r.L}</td><td className="py-2.5 text-center text-xs font-mono">{r.I}</td><td className="py-2.5 text-center text-xs font-mono">{r.V}</td><td className="py-2.5 text-center text-xs font-mono">{r.C}</td></tr>))}</tbody></table></div></Card>
          </div>
        );
      })()}

      {/* ═══ CODE CHANGE ANALYSIS TAB ═══ */}
      {activeTab === "ml" && (
        <div className="space-y-6">
          <Card className="border-purple-200 bg-purple-50/30 dark:border-purple-900 dark:bg-purple-950/20"><CardHeader><CardTitle className="text-base flex items-center gap-2"><Brain className="h-5 w-5 text-purple-600" />Code Change Analysis</CardTitle><CardDescription className="text-sm">Pull commits from a Git repository and analyze code changes for risk factors.</CardDescription></CardHeader><div className="flex flex-col gap-3 sm:flex-row sm:items-end"><div className="flex-1"><label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Repository URL</label><input type="text" value={gitRepo} onChange={(e) => setGitRepo(e.target.value)} placeholder="https://code.devsnc.com/owner/repo" className="w-full rounded-lg border border-purple-200 bg-white py-2 px-3 text-sm outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 dark:border-purple-800 dark:bg-gray-900 dark:text-gray-100" /></div><div className="w-32"><label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Days back</label><select value={gitDays} onChange={(e) => setGitDays(Number(e.target.value))} className="w-full rounded-lg border border-purple-200 bg-white py-2 px-3 text-sm outline-none dark:border-purple-800 dark:bg-gray-900 dark:text-gray-100"><option value={7}>7 days</option><option value={14}>14 days</option><option value={30}>30 days</option><option value={60}>60 days</option></select></div><button onClick={fetchGitAnalysis} disabled={gitLoading || !gitRepo} className="flex items-center gap-2 rounded-lg bg-purple-600 px-5 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50">{gitLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <GitCommitHorizontal className="h-4 w-4" />}{gitLoading ? "Analyzing…" : "Analyze Commits"}</button></div></Card>
          {gitError && <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950 dark:text-red-400"><strong>Error:</strong> {gitError}</div>}
          {gitLoading && !gitData && <div className="space-y-4">{[1,2,3].map((i) => <div key={i} className="h-32 animate-pulse rounded-xl bg-purple-100/50 dark:bg-purple-900/20" />)}</div>}
          {gitData && (<>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
              <Card className="p-4"><div className="flex items-center gap-2"><GitCommitHorizontal className="h-4 w-4 text-purple-500" /><span className="text-xs text-gray-500 dark:text-gray-400">Commits</span></div><p className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100">{gitData.summary.totalCommits}</p><p className="text-[11px] text-gray-400">last {gitData.days} days</p></Card>
              <Card className="p-4"><div className="flex items-center gap-2"><Brain className="h-4 w-4 text-purple-500" /><span className="text-xs text-gray-500 dark:text-gray-400">Overall Risk Factor</span></div><p className={`mt-1 text-2xl font-bold ${riskColor(gitData.summary.overallRiskFactor)}`}>{gitData.summary.overallRiskFactor}</p><p className="text-[11px] text-gray-400">{riskLbl(gitData.summary.overallRiskFactor)}</p></Card>
              <Card className="p-4"><div className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-orange-500" /><span className="text-xs text-gray-500 dark:text-gray-400">Avg Commit Risk</span></div><p className={`mt-1 text-2xl font-bold ${riskColor(gitData.summary.avgRisk)}`}>{gitData.summary.avgRisk}</p></Card>
              <Card className="p-4"><div className="flex items-center gap-2"><FileCode2 className="h-4 w-4 text-blue-500" /><span className="text-xs text-gray-500 dark:text-gray-400">Code Churn</span></div><p className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100">{(gitData.summary.totalAdditions+gitData.summary.totalDeletions).toLocaleString()}</p><p className="text-[11px] text-gray-400">+{gitData.summary.totalAdditions.toLocaleString()} / −{gitData.summary.totalDeletions.toLocaleString()}</p></Card>
              <Card className="p-4"><div className="flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-red-500" /><span className="text-xs text-gray-500 dark:text-gray-400">High Risk Commits</span></div><p className="mt-1 text-2xl font-bold text-red-600">{gitData.summary.criticalCount+gitData.summary.highCount}</p></Card>
            </div>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Card><CardHeader><CardTitle className="flex items-center gap-2"><BarChart3 className="h-4 w-4 text-purple-500" /> Commit Risk Distribution</CardTitle></CardHeader><div className="h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={[{ bucket: "Critical", count: gitData.summary.criticalCount, fill: "#ef4444" },{ bucket: "High", count: gitData.summary.highCount, fill: "#f97316" },{ bucket: "Medium", count: gitData.summary.mediumCount, fill: "#eab308" },{ bucket: "Low", count: gitData.summary.lowCount, fill: "#22c55e" }]}><CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" /><XAxis dataKey="bucket" tick={{ fontSize: 10 }} stroke="#94a3b8" /><YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" /><Tooltip /><Bar dataKey="count" name="Commits" radius={[4, 4, 0, 0]}>{[{ fill: "#ef4444" },{ fill: "#f97316" },{ fill: "#eab308" },{ fill: "#22c55e" }].map((e, i) => <Cell key={i} fill={e.fill} />)}</Bar></BarChart></ResponsiveContainer></div></Card>
              <Card><CardHeader><CardTitle className="flex items-center gap-2"><User className="h-4 w-4 text-blue-500" /> Risk by Author</CardTitle></CardHeader><div className="overflow-x-auto max-h-64 overflow-y-auto"><table className="w-full text-sm"><thead className="sticky top-0 bg-white dark:bg-gray-900"><tr className="border-b border-gray-100 dark:border-gray-800"><th className="pb-2 text-left font-medium text-gray-500 dark:text-gray-400">Author</th><th className="pb-2 text-center font-medium text-gray-500 dark:text-gray-400">Commits</th><th className="pb-2 text-center font-medium text-gray-500 dark:text-gray-400">Avg Risk</th><th className="pb-2 text-right font-medium text-gray-500 dark:text-gray-400">Churn</th></tr></thead><tbody>{gitData.authorBreakdown.map((a) => (<tr key={a.author} className="border-b border-gray-50 dark:border-gray-800"><td className="py-2 font-medium text-gray-900 dark:text-gray-100 text-xs">{a.author}</td><td className="py-2 text-center text-xs">{a.commits}</td><td className="py-2 text-center"><span className={`inline-block rounded-full px-2 py-0.5 text-xs font-bold ${riskBgCls(a.avgRisk)}`}>{a.avgRisk}</span></td><td className="py-2 text-right text-xs text-gray-500">+{a.additions} / −{a.deletions}</td></tr>))}</tbody></table></div></Card>
            </div>
            {/* ── Daily Commit Risk Trend ── */}
            {(() => {
              const dayMap: Record<string, { count: number; riskSum: number }> = {};
              gitData.commits.forEach(c => {
                const day = new Date(c.date).toISOString().slice(0, 10);
                if (!dayMap[day]) dayMap[day] = { count: 0, riskSum: 0 };
                dayMap[day].count++;
                dayMap[day].riskSum += c.riskScore;
              });
              const trendData = Object.entries(dayMap)
                .sort((a, b) => a[0].localeCompare(b[0]))
                .map(([date, d]) => ({
                  date: new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
                  avgRisk: Math.round(d.riskSum / d.count),
                  commits: d.count,
                }));
              return trendData.length > 1 ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><BarChart3 className="h-4 w-4 text-purple-500" /> Daily Commit Risk Trend</CardTitle>
                    <CardDescription>Average risk score per day over the analysis period. Spikes indicate high-risk commit activity.</CardDescription>
                  </CardHeader>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={trendData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                        <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" domain={[0, 100]} />
                        <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "11px" }} />
                        <Legend wrapperStyle={{ fontSize: "11px" }} />
                        <Line type="monotone" dataKey="avgRisk" name="Avg Risk" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                        <Line type="monotone" dataKey="commits" name="Commits" stroke="#94a3b8" strokeWidth={1} strokeDasharray="4 4" dot={{ r: 2 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              ) : null;
            })()}

            {/* ── File Hotspot Treemap ── */}
            {(() => {
              const fileMap: Record<string, { risk: number; churn: number; commits: number }> = {};
              gitData.commits.forEach(c => {
                c.files.forEach(f => {
                  const name = f.filename;
                  if (!fileMap[name]) fileMap[name] = { risk: 0, churn: 0, commits: 0 };
                  fileMap[name].risk = Math.max(fileMap[name].risk, f.fileRisk || 0);
                  fileMap[name].churn += f.additions + f.deletions;
                  fileMap[name].commits++;
                });
              });
              const hotspots = Object.entries(fileMap)
                .map(([file, d]) => ({ file, shortName: file.split("/").pop() || file, dir: file.split("/").slice(0, -1).join("/") || "/", ...d }))
                .sort((a, b) => b.risk - a.risk)
                .slice(0, 30);
              if (hotspots.length === 0) return null;
              const maxChurn = Math.max(...hotspots.map(h => h.churn), 1);
              return (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><FileCode2 className="h-4 w-4 text-purple-500" /> File Hotspot Map — Top 30 Riskiest Files</CardTitle>
                    <CardDescription>Size = code churn (additions + deletions). Color = max risk score. Hover for details.</CardDescription>
                  </CardHeader>
                  <div className="px-4 pb-4">
                    <div className="flex flex-wrap gap-1">
                      {hotspots.map((h) => {
                        const minSize = 48;
                        const maxSize = 140;
                        const size = Math.round(minSize + (h.churn / maxChurn) * (maxSize - minSize));
                        const bg = h.risk >= 75 ? "bg-red-500" : h.risk >= 50 ? "bg-orange-400" : h.risk >= 25 ? "bg-amber-300" : "bg-green-400";
                        const textColor = h.risk >= 50 ? "text-white" : "text-gray-900";
                        return (
                          <div
                            key={h.file}
                            className={`rounded ${bg} ${textColor} flex flex-col items-center justify-center p-1 overflow-hidden transition-transform hover:scale-105 hover:z-10 hover:shadow-lg cursor-default`}
                            style={{ width: size, height: size }}
                            title={`${h.file}\nRisk: ${h.risk} | Churn: +${h.churn} lines | ${h.commits} commits`}
                          >
                            <span className="text-[8px] font-bold truncate w-full text-center leading-tight">{h.shortName}</span>
                            <span className="text-[10px] font-bold mt-0.5">{h.risk}</span>
                            <span className="text-[7px] opacity-75">±{h.churn}</span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex justify-center gap-4 mt-3 text-[10px] text-gray-400">
                      <span className="flex items-center gap-1"><span className="h-2 w-2 rounded bg-red-500" /> Critical (≥75)</span>
                      <span className="flex items-center gap-1"><span className="h-2 w-2 rounded bg-orange-400" /> High (50-74)</span>
                      <span className="flex items-center gap-1"><span className="h-2 w-2 rounded bg-amber-300" /> Medium (25-49)</span>
                      <span className="flex items-center gap-1"><span className="h-2 w-2 rounded bg-green-400" /> Low (&lt;25)</span>
                    </div>
                  </div>
                </Card>
              );
            })()}

            <div className="flex items-center gap-3 text-xs text-gray-400"><a href={gitData.repoUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-purple-600 hover:underline"><ExternalLink className="h-3 w-3" /> {gitData.owner}/{gitData.repo}</a><span>·</span><span>Since {new Date(gitData.sinceDate).toLocaleDateString()}</span><span>·</span><span>{gitData.summary.totalFilesChanged} files touched</span></div>
            <Card><CardHeader><CardTitle>All Commits — Risk Assessment ({gitData.commits.length})</CardTitle><CardDescription>Click a row to see file-level details and risk factors.</CardDescription></CardHeader><div className="overflow-x-auto max-h-[520px] overflow-y-auto"><table className="w-full text-sm"><thead className="sticky top-0 bg-white dark:bg-gray-900 z-10"><tr className="border-b border-gray-100 dark:border-gray-800"><th className="pb-3 text-left font-medium text-gray-500 dark:text-gray-400">Commit</th><th className="pb-3 text-center font-medium text-gray-500 dark:text-gray-400">Risk</th><th className="pb-3 text-center font-medium text-gray-500 dark:text-gray-400">Level</th><th className="pb-3 text-center font-medium text-gray-500 dark:text-gray-400">Files</th><th className="pb-3 text-center font-medium text-gray-500 dark:text-gray-400">+/−</th><th className="pb-3 text-left font-medium text-gray-500 dark:text-gray-400">Author</th><th className="pb-3 text-left font-medium text-gray-500 dark:text-gray-400">Date</th></tr></thead><tbody>{gitData.commits.map((c) => (<><tr key={c.sha} className={`cursor-pointer border-b border-gray-50 dark:border-gray-800 hover:bg-purple-50 dark:hover:bg-purple-950/20 ${expandedCommit===c.sha?"bg-purple-50 dark:bg-purple-950/20":""}`} onClick={() => setExpandedCommit(expandedCommit===c.sha?null:c.sha)}><td className="py-2.5"><span className="font-mono text-[11px] text-purple-500">{c.shortSha}</span><p className="font-medium text-gray-900 dark:text-gray-100 text-xs line-clamp-1">{c.message}</p></td><td className="py-2.5 text-center"><span className={`inline-block rounded-full px-2.5 py-0.5 text-sm font-bold ${riskBgCls(c.riskScore)}`}>{c.riskScore}</span></td><td className="py-2.5 text-center"><span className={`text-xs font-semibold capitalize ${riskColor(c.riskScore)}`}>{c.riskLevel}</span></td><td className="py-2.5 text-center text-xs">{c.filesChanged}</td><td className="py-2.5 text-center text-xs"><span className="text-green-600">+{c.additions}</span>{" / "}<span className="text-red-500">−{c.deletions}</span></td><td className="py-2.5 text-xs text-gray-600 dark:text-gray-400">{c.author}</td><td className="py-2.5 text-xs text-gray-400">{c.date ? new Date(c.date).toLocaleDateString() : "—"}</td></tr>{expandedCommit===c.sha && (<tr key={`${c.sha}-d`}><td colSpan={7} className="bg-gray-50 dark:bg-gray-800/50 px-4 py-3"><div className="space-y-3"><div><p className="text-xs font-semibold uppercase text-gray-400 mb-1">Risk Factors</p><div className="flex flex-wrap gap-1.5">{c.riskFactors.map((f, i) => <span key={i} className="rounded bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700 dark:bg-purple-900 dark:text-purple-300">{f}</span>)}</div></div>{c.files.length > 0 && (<div><p className="text-xs font-semibold uppercase text-gray-400 mb-1">Files Changed ({c.files.length})</p><div className="max-h-48 overflow-y-auto space-y-1">{c.files.map((f, fi) => (<div key={fi} className="flex items-center justify-between rounded bg-white dark:bg-gray-900 px-3 py-1.5 text-xs"><div className="flex items-center gap-2 min-w-0 flex-1"><FileCode2 className="h-3 w-3 text-gray-400 shrink-0" /><span className="font-mono text-gray-700 dark:text-gray-300 truncate">{f.filename}</span></div><div className="flex items-center gap-3 shrink-0 ml-3"><span className="text-green-600">+{f.additions}</span><span className="text-red-500">−{f.deletions}</span><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${riskBgCls(f.fileRisk)}`}>{f.fileRisk}</span></div></div>))}</div></div>)}</div></td></tr>)}</>))}</tbody></table></div></Card>
          </>)}
        </div>
      )}

      {/* ═══ PLAN ANALYSIS TAB ═══ */}
      {activeTab === "plans" && (() => {
        const pq = planSearch.toLowerCase();
        let filteredPlans = pq ? planResults.filter((p) => p.cr.number.toLowerCase().includes(pq) || p.cr.short_description.toLowerCase().includes(pq) || p.cr.assignment_group.toLowerCase().includes(pq)) : planResults;
        if (planFilterRisk !== "all") filteredPlans = filteredPlans.filter((p) => p.cr.risk === planFilterRisk);
        if (planFilterState !== "all") filteredPlans = filteredPlans.filter((p) => p.cr.state === planFilterState);
        if (planFilterGroup !== "all") filteredPlans = filteredPlans.filter((p) => p.cr.assignment_group === planFilterGroup);
        const selectedPlan = selectedPlanCR ? planResults.find((p) => p.cr.number === selectedPlanCR) : null;
        const n = planResults.length;
        const planRadarData = selectedPlan ? PLAN_DIMS.map((d) => ({ dimension: d.label.replace(" Plan","").replace(" Analysis",""), score: selectedPlan[d.key].quality, fullMark: 100 })) : [];

        // Risk keywords to highlight in plan text
        const HIGHLIGHT_WORDS = ["risk","rollback","revert","downtime","failure","outage","restore","backup","critical","emergency","security","vulnerability","impact","mitigation","contingency","fallback","test","verify","validate"];
        function highlightRisks(text: string) {
          if (!text) return null;
          const regex = new RegExp(`\\b(${HIGHLIGHT_WORDS.join("|")})\\b`, "gi");
          const parts = text.split(regex);
          return parts.map((part, i) => HIGHLIGHT_WORDS.includes(part.toLowerCase()) ? <mark key={i} className="rounded bg-amber-200 px-0.5 dark:bg-amber-800 dark:text-amber-200">{part}</mark> : part);
        }

        return (
          <div className="space-y-6">
            {/* Search bar + filters */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px] max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input type="text" placeholder="Search CR by number, description, group…" className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100" value={planSearch} onChange={(e) => setPlanSearch(e.target.value)} />
              </div>
              <select value={planFilterRisk} onChange={(e) => setPlanFilterRisk(e.target.value)} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-teal-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100">
                <option value="all">All Risk Levels</option>
                {uniqueRiskLevels.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
              <select value={planFilterState} onChange={(e) => setPlanFilterState(e.target.value)} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-teal-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100">
                <option value="all">All States</option>
                {uniqueStates.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <select value={planFilterGroup} onChange={(e) => setPlanFilterGroup(e.target.value)} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-teal-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100">
                <option value="all">All Groups</option>
                {uniqueGroups.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
              {selectedPlanCR && (
                <button onClick={() => { setSelectedPlanCR(null); setExpandedPlanContent(null); setMlAnalysis(null); setMlError(null); }} className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800">← Back to Overview</button>
              )}
            </div>

            {/* ── Plan Scoring Methodology (collapsible) ── */}
            <Card className="border-teal-200 bg-teal-50/30 dark:border-teal-900 dark:bg-teal-950/20">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2"><Info className="h-5 w-5 text-teal-600" />Plan Scoring Methodology</CardTitle>
                  <button onClick={() => setPlanScoringOpen(!planScoringOpen)} className="flex items-center gap-1 rounded px-2 py-1 text-xs text-teal-600 hover:bg-teal-100 dark:hover:bg-teal-900">{planScoringOpen ? "▲ Collapse" : "▼ Expand"}</button>
                </div>
                <CardDescription className="text-sm">Overall = Σ (dimension_quality × weight). Each plan is scored 0–100 based on content analysis.</CardDescription>
              </CardHeader>
              {planScoringOpen && (<>
                <div className="rounded-lg bg-white dark:bg-gray-900 border border-teal-100 dark:border-teal-900 p-5 space-y-4">
                  <p className="text-lg font-bold font-mono text-teal-700 dark:text-teal-400">Readiness = Impl×0.25 + Backout×0.25 + Test×0.20 + Risk×0.15 + Change×0.10 + Justification×0.05</p>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                    <div className="rounded-lg border border-teal-100 dark:border-teal-800 p-3 space-y-1">
                      <p className="text-sm font-bold text-teal-700 dark:text-teal-300">Implementation Plan (25%)</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Scored by length, structured steps, and keyword coverage for: step, deploy, install, configure, verify, validate, monitor, rollout, pre-check, post-check, approval, schedule.</p>
                    </div>
                    <div className="rounded-lg border border-teal-100 dark:border-teal-800 p-3 space-y-1">
                      <p className="text-sm font-bold text-teal-700 dark:text-teal-300">Backout Plan (25%)</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Scored by length, structured steps, and keyword coverage for: revert, rollback, restore, undo, previous, snapshot, backup, recovery, failover, downtime.</p>
                    </div>
                    <div className="rounded-lg border border-teal-100 dark:border-teal-800 p-3 space-y-1">
                      <p className="text-sm font-bold text-teal-700 dark:text-teal-300">Test Plan (20%)</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Scored by length, structured steps, and keyword coverage for: test, verify, validate, smoke, regression, acceptance, integration, unit, performance, security, coverage.</p>
                    </div>
                    <div className="rounded-lg border border-teal-100 dark:border-teal-800 p-3 space-y-1">
                      <p className="text-sm font-bold text-teal-700 dark:text-teal-300">Risk/Impact Analysis (15%)</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Scored by length, structured steps, and keyword coverage for: risk, impact, mitigation, contingency, fallback, probability, severity, exposure, vulnerability, dependency.</p>
                    </div>
                    <div className="rounded-lg border border-teal-100 dark:border-teal-800 p-3 space-y-1">
                      <p className="text-sm font-bold text-teal-700 dark:text-teal-300">Change Plan (10%)</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Uses the same keyword set as Implementation Plan. Evaluates the overall change execution strategy.</p>
                    </div>
                    <div className="rounded-lg border border-teal-100 dark:border-teal-800 p-3 space-y-1">
                      <p className="text-sm font-bold text-teal-700 dark:text-teal-300">Justification (5%)</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Scored by length, structured steps, and keyword coverage for: business, requirement, need, value, benefit, compliance, security, improvement.</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">Scoring Factors (each plan scored 0–100):</p>
                    <div className="grid grid-cols-2 gap-2 md:grid-cols-4 text-xs text-gray-600 dark:text-gray-400">
                      <div className="rounded bg-teal-50 dark:bg-teal-950/30 p-2"><strong>Base:</strong> 20 pts if any content provided</div>
                      <div className="rounded bg-teal-50 dark:bg-teal-950/30 p-2"><strong>Length:</strong> +5 (brief), +12 (moderate), +20 (detailed 500+ chars)</div>
                      <div className="rounded bg-teal-50 dark:bg-teal-950/30 p-2"><strong>Structure:</strong> +15 for numbered/bulleted steps, +5 for 5+ lines</div>
                      <div className="rounded bg-teal-50 dark:bg-teal-950/30 p-2"><strong>Keywords:</strong> +5 (minimal), +10 (partial ≥25%), +20 (good ≥50%)</div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 md:grid-cols-4 text-xs text-gray-600 dark:text-gray-400">
                      <div className="rounded bg-teal-50 dark:bg-teal-950/30 p-2"><strong>Bonus:</strong> +5 for time references, +5 for contact info</div>
                    </div>
                  </div>
                  <div className="mt-2 grid grid-cols-4 gap-2 text-center text-xs">
                    <div className="rounded bg-green-100 dark:bg-green-900 p-2"><span className="font-bold text-green-700 dark:text-green-300">75-100</span><p className="text-green-600 dark:text-green-400">Well Prepared</p></div>
                    <div className="rounded bg-amber-100 dark:bg-amber-900 p-2"><span className="font-bold text-amber-700 dark:text-amber-300">50-74</span><p className="text-amber-600 dark:text-amber-400">Adequate</p></div>
                    <div className="rounded bg-orange-100 dark:bg-orange-900 p-2"><span className="font-bold text-orange-700 dark:text-orange-300">25-49</span><p className="text-orange-600 dark:text-orange-400">Gaps Found</p></div>
                    <div className="rounded bg-red-100 dark:bg-red-900 p-2"><span className="font-bold text-red-700 dark:text-red-300">0-24</span><p className="text-red-600 dark:text-red-400">Critical Gaps</p></div>
                  </div>
                </div>
              </>)}
            </Card>

            {/* ── Single CR Detail View ── */}
            {selectedPlan ? (
              <div className="space-y-6">
                <Card className="border-teal-200 bg-teal-50/30 dark:border-teal-900 dark:bg-teal-950/20">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <ClipboardCheck className="h-5 w-5 text-teal-600" />
                          {selectedPlan.cr.number} — Plan Assessment
                        </CardTitle>
                        <CardDescription className="mt-1">{selectedPlan.cr.short_description}</CardDescription>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-center">
                          <span className={`inline-block rounded-full px-4 py-1.5 text-lg font-bold ${pBg(selectedPlan.overallScore)}`}>{selectedPlan.overallScore}</span>
                          <p className={`text-xs font-semibold mt-1 ${pColor(selectedPlan.overallScore)}`}>{planRiskLabel(selectedPlan.overallScore)}</p>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <div className="grid grid-cols-4 gap-3 text-center">
                    <div className="rounded-lg bg-white dark:bg-gray-900 p-3 border border-teal-100 dark:border-teal-900">
                      <p className="text-xs text-gray-500">Readiness</p>
                      <p className={`text-xl font-bold ${pColor(selectedPlan.overallScore)}`}>{selectedPlan.overallScore}/100</p>
                    </div>
                    <div className="rounded-lg bg-white dark:bg-gray-900 p-3 border border-teal-100 dark:border-teal-900">
                      <p className="text-xs text-gray-500">Missing Plans</p>
                      <p className={`text-xl font-bold ${selectedPlan.gapCount > 0 ? "text-red-600" : "text-green-600"}`}>{selectedPlan.gapCount}</p>
                    </div>
                    <div className="rounded-lg bg-white dark:bg-gray-900 p-3 border border-teal-100 dark:border-teal-900">
                      <p className="text-xs text-gray-500">State</p>
                      <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{selectedPlan.cr.state}</p>
                    </div>
                    <div className="rounded-lg bg-white dark:bg-gray-900 p-3 border border-teal-100 dark:border-teal-900">
                      <p className="text-xs text-gray-500">SN Risk</p>
                      <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{selectedPlan.cr.risk || "—"}</p>
                    </div>
                  </div>
                </Card>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                  {/* Radar chart */}
                  <Card>
                    <CardHeader><CardTitle className="text-sm">Plan Quality Radar</CardTitle></CardHeader>
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart data={planRadarData}>
                          <PolarGrid stroke="#e2e8f0" />
                          <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 13, fontWeight: 600 }} />
                          <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 11 }} />
                          <Radar name="Quality" dataKey="score" stroke="#0d9488" fill="#0d9488" fillOpacity={0.2} strokeWidth={2} />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>

                  {/* Dimension scores */}
                  <Card className="lg:col-span-2">
                    <CardHeader><CardTitle className="text-sm">Plan Dimension Scores</CardTitle><CardDescription>Quality assessment of each plan section</CardDescription></CardHeader>
                    <div className="space-y-3">
                      {PLAN_DIMS.map((d) => {
                        const ps = selectedPlan[d.key];
                        return (
                          <div key={d.key} className="rounded-lg border border-gray-100 dark:border-gray-800 p-3">
                            <div className="flex items-center justify-between mb-1.5">
                              <div className="flex items-center gap-2">
                                <d.icon className="h-4 w-4 text-teal-500" />
                                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{d.label}</span>
                                <span className="text-[10px] text-gray-400">(weight: {d.weight})</span>
                              </div>
                              <div className="flex items-center gap-2">
                                {ps.present ? (
                                  <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${pBg(ps.quality)}`}>{ps.quality}</span>
                                ) : (
                                  <span className="flex items-center gap-1 text-xs text-red-500"><XCircle className="h-3.5 w-3.5" /> Missing</span>
                                )}
                              </div>
                            </div>
                            {ps.present && (
                              <>
                                <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800 mb-1.5">
                                  <div className="h-2 rounded-full transition-all" style={{ width: `${ps.quality}%`, backgroundColor: ps.quality>=75?"#22c55e":ps.quality>=50?"#eab308":ps.quality>=25?"#f97316":"#ef4444" }} />
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {ps.factors.map((f, i) => <span key={i} className="rounded bg-teal-50 px-1.5 py-0.5 text-[10px] text-teal-700 dark:bg-teal-900 dark:text-teal-300">{f}</span>)}
                                </div>
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </Card>
                </div>

                {/* Plan Content Reader */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><FileText className="h-4 w-4 text-teal-500" /> Plan Content &amp; Risk Assessment</CardTitle>
                    <CardDescription>Click a plan section to expand and read its full content. Risk-related keywords are highlighted.</CardDescription>
                  </CardHeader>
                  <div className="space-y-3">
                    {[
                      { key: "implementation_plan", label: "Implementation Plan", score: selectedPlan.implementation, icon: FileText },
                      { key: "backout_plan", label: "Backout Plan", score: selectedPlan.backout, icon: RotateCcw },
                      { key: "test_plan", label: "Test Plan", score: selectedPlan.testPlan, icon: CheckCircle2 },
                      { key: "change_plan", label: "Change Plan", score: selectedPlan.changePlan, icon: ClipboardCheck },
                      { key: "risk_impact_analysis", label: "Risk/Impact Analysis", score: selectedPlan.riskAnalysis, icon: AlertTriangle },
                      { key: "justification", label: "Justification", score: selectedPlan.justification, icon: Info },
                    ].map((plan) => {
                      const text = (selectedPlan.cr as Record<string, unknown>)[plan.key] as string || "";
                      const isExpanded = expandedPlanContent === plan.key;
                      return (
                        <div key={plan.key} className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                          <button
                            onClick={() => setExpandedPlanContent(isExpanded ? null : plan.key)}
                            className="w-full flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
                          >
                            <div className="flex items-center gap-2">
                              <plan.icon className="h-4 w-4 text-teal-500" />
                              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{plan.label}</span>
                              {plan.score.present ? (
                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${pBg(plan.score.quality)}`}>{plan.score.quality}</span>
                              ) : (
                                <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-700 dark:bg-red-900 dark:text-red-300">Missing</span>
                              )}
                            </div>
                            <span className="text-xs text-gray-400">{isExpanded ? "▲ Collapse" : "▼ Expand"}</span>
                          </button>
                          {isExpanded && (
                            <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800/50">
                              {text.trim() ? (
                                <div className="space-y-3">
                                  <div className="flex items-center gap-3 text-xs text-gray-500">
                                    <span>{text.split(/\s+/).length} words</span>
                                    <span>·</span>
                                    <span>{text.length.toLocaleString()} characters</span>
                                    <span>·</span>
                                    <span className={`font-semibold ${pColor(plan.score.quality)}`}>{pLabel(plan.score.quality)}</span>
                                  </div>
                                  <div className="rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-4 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto font-mono">
                                    {highlightRisks(text)}
                                  </div>
                                  {plan.score.factors.length > 0 && (
                                    <div>
                                      <p className="text-xs font-semibold text-gray-500 mb-1">Assessment Factors</p>
                                      <div className="flex flex-wrap gap-1">
                                        {plan.score.factors.map((f, i) => <span key={i} className="rounded bg-teal-50 border border-teal-200 px-2 py-0.5 text-[11px] text-teal-700 dark:bg-teal-900 dark:border-teal-800 dark:text-teal-300">{f}</span>)}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 text-sm text-red-500 py-2">
                                  <XCircle className="h-4 w-4" />
                                  <span>No content provided. This is a <strong>risk gap</strong> — consider requiring this plan before approval.</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </Card>

                {/* ── Weights & Formulas (from Detailed Analysis) ── */}
                <Card className="border-blue-200 bg-blue-50/30 dark:border-blue-900 dark:bg-blue-950/20">
                  <CardHeader><div className="flex items-center justify-between"><CardTitle className="text-base flex items-center gap-2"><Settings2 className="h-5 w-5 text-blue-600" />Weights &amp; Formulas</CardTitle><div className="flex items-center gap-2"><button onClick={resetWeights} className="flex items-center gap-1 rounded px-2 py-1 text-xs text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900"><RotateCcw className="h-3 w-3" /> Reset</button><button onClick={() => setWeightsOpen(!weightsOpen)} className="flex items-center gap-1 rounded px-2 py-1 text-xs text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900">{weightsOpen ? "▲ Collapse" : "▼ Expand"}</button></div></div><CardDescription className="text-sm">Overall = Σ (dimension_score × weight). Adjust weights below.</CardDescription></CardHeader>
                  {weightsOpen && (<>
                    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
                      {DIMS.map((d) => (<div key={d.key} className="rounded-lg border border-blue-100 bg-white p-3 dark:border-blue-900 dark:bg-gray-900"><div className="flex items-center gap-1.5 mb-2"><d.icon className="h-4 w-4 text-blue-500" /><span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{d.label}</span></div><p className="text-xs text-gray-500 dark:text-gray-400 mb-2 leading-snug">{d.formula}</p><label className="text-xs text-gray-500">Weight</label><input type="range" min="0" max="100" value={Math.round(weights[d.key]*100)} onChange={(e) => setWeight(d.key, Number(e.target.value)/100)} className="w-full h-1.5 accent-blue-600" /><span className="text-sm font-mono font-semibold text-blue-700 dark:text-blue-400">{(weights[d.key]*100).toFixed(0)}%</span></div>))}
                    </div>
                    <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">Total weight: {((weights.risk+weights.impact+weights.urgency+weights.priority+weights.type+weights.scope)*100).toFixed(0)}%</p>
                    <div className="mt-4 overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-gray-100 dark:border-gray-800"><th className="pb-3 text-left font-medium text-gray-500 dark:text-gray-400">Dimension</th><th className="pb-3 text-left font-medium text-gray-500 dark:text-gray-400">SN Field</th><th className="pb-3 text-left font-medium text-gray-500 dark:text-gray-400">Mapping</th><th className="pb-3 text-center font-medium text-gray-500 dark:text-gray-400">Current Weight</th></tr></thead><tbody>{DIMS.map((d) => (<tr key={d.key} className="border-b border-gray-50 dark:border-gray-800"><td className="py-3"><div className="flex items-center gap-2"><d.icon className="h-4 w-4 text-blue-500" /><span className="font-medium text-gray-900 dark:text-gray-100">{d.label}</span></div></td><td className="py-3 font-mono text-xs text-gray-500">{d.snField}</td><td className="py-3 text-xs text-gray-600 dark:text-gray-400">{d.formula}</td><td className="py-3 text-center"><span className="rounded bg-blue-100 px-2 py-0.5 text-sm font-bold text-blue-700 dark:bg-blue-900 dark:text-blue-300">{(weights[d.key]*100).toFixed(0)}%</span></td></tr>))}</tbody></table></div>
                  </>)}
                </Card>

                {/* ── Dimensions & Impact ── */}
                {(() => {
                  const planScored = scored.find((s) => s.cr.number === selectedPlan.cr.number) || scored[0];
                  const planDims = planScored.dims;
                  const planOverall = planScored.overall;
                  const planCr = planScored.cr;
                  const planNum = planCr.number;
                  const planHasOverrides = !!overrides[planNum] && Object.keys(overrides[planNum]).length > 0;
                  const planRadarDims = [
                    { dimension: "Risk", score: planDims.risk, fullMark: 100 }, { dimension: "Impact", score: planDims.impact, fullMark: 100 },
                    { dimension: "Urgency", score: planDims.urgency, fullMark: 100 }, { dimension: "Priority", score: planDims.priority, fullMark: 100 },
                    { dimension: "Type", score: planDims.type, fullMark: 100 }, { dimension: "Scope", score: planDims.scope, fullMark: 100 },
                  ];
                  return (
                    <Card>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm flex items-center gap-2"><Gauge className="h-4 w-4 text-blue-500" />Dimensions &amp; Impact — {planNum}</CardTitle>
                          {planHasOverrides && (<button onClick={() => { setOverrides((p) => { const n = { ...p }; delete n[planNum]; return n; }); }} className="flex items-center gap-1 rounded px-2 py-1 text-[10px] text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900"><RotateCcw className="h-3 w-3" /> Reset</button>)}
                        </div>
                      </CardHeader>
                      <div className="h-56">
                        <ResponsiveContainer width="100%" height="100%">
                          <RadarChart data={planRadarDims}><PolarGrid stroke="#e2e8f0" /><PolarAngleAxis dataKey="dimension" tick={{ fontSize: 13, fontWeight: 600 }} /><PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 11 }} /><Radar name="Score" dataKey="score" stroke="#2563eb" fill="#2563eb" fillOpacity={0.2} strokeWidth={2} /></RadarChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="flex justify-center mb-3"><RiskBadge score={planOverall} /></div>
                      <div className="space-y-1.5 px-4 pb-4">
                        {DIMS.map((d) => {
                          const current = planDims[d.key];
                          const snValue = d.key==="risk"?planCr.risk:d.key==="impact"?planCr.sn_impact:d.key==="urgency"?planCr.urgency:d.key==="priority"?planCr.priority:d.key==="type"?planCr.type:planCr.scope;
                          const isOverridden = overrides[planNum]?.[d.key] !== undefined;
                          return (
                            <div key={d.key} className="rounded border border-gray-100 dark:border-gray-800 p-2">
                              <div className="flex items-center justify-between mb-0.5">
                                <div className="flex items-center gap-1.5">
                                  <d.icon className="h-3 w-3 text-gray-400" />
                                  <span className="text-[11px] font-semibold text-gray-700 dark:text-gray-300">{d.label}</span>
                                  <span className="text-[9px] text-gray-400">SN: &quot;{snValue || "—"}&quot;</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <span className={`text-[10px] font-mono font-bold ${getRiskBg(current)} rounded px-1 py-0.5`}>{current}</span>
                                  {isOverridden && <span className="text-[9px] text-amber-500">(was {planScored.baseDims[d.key]})</span>}
                                </div>
                              </div>
                              <input type="range" min="0" max="100" value={current} onChange={(e) => handleOverride(d.key, Number(e.target.value))} className="w-full h-1 accent-blue-600" />
                              <div className="flex justify-between text-[9px] text-gray-400"><span>0</span><span>{(weights[d.key]*100).toFixed(0)}% → {Math.round(current * weights[d.key])} pts</span><span>100</span></div>
                            </div>
                          );
                        })}
                        <div className="rounded bg-gray-50 dark:bg-gray-800 p-2 mt-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Overall Impact</span>
                            <RiskBadge score={planOverall} size="sm" />
                          </div>
                          <p className="text-[9px] text-gray-400 mt-0.5 font-mono">= {DIMS.map((d) => `${planDims[d.key]}×${(weights[d.key]*100).toFixed(0)}%`).join(" + ")} = {planOverall}</p>
                        </div>
                      </div>
                    </Card>
                  );
                })()}

                {/* ── Change Details ── */}
                <Card><CardHeader><CardTitle className="text-sm">Change Details — {selectedPlan.cr.number}</CardTitle></CardHeader><div className="space-y-3 text-sm">{[{ label: "State", value: selectedPlan.cr.state },{ label: "Type", value: selectedPlan.cr.type },{ label: "Category", value: selectedPlan.cr.category },{ label: "Priority", value: selectedPlan.cr.priority },{ label: "Risk", value: selectedPlan.cr.risk },{ label: "Impact", value: selectedPlan.cr.sn_impact },{ label: "Urgency", value: selectedPlan.cr.urgency },{ label: "Scope", value: selectedPlan.cr.scope },{ label: "Approval", value: selectedPlan.cr.approval },{ label: "Opened By", value: selectedPlan.cr.opened_by },{ label: "Assigned To", value: selectedPlan.cr.assigned_to },{ label: "Assignment Group", value: selectedPlan.cr.assignment_group },{ label: "Config Item", value: selectedPlan.cr.cmdb_ci },{ label: "Business Service", value: selectedPlan.cr.business_service },{ label: "Close Code", value: selectedPlan.cr.close_code }].map((row) => row.value ? (<div key={row.label} className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">{row.label}</span><span className="font-medium text-gray-700 dark:text-gray-300 text-right max-w-[200px] truncate">{row.value}</span></div>) : null)}</div></Card>

              </div>
            ) : (
            /* ── Overview Mode ── */
            <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Change Requests — Plan Risk Assessment ({filteredPlans.length}{pq ? ` of ${n}` : ""})</CardTitle>
                <CardDescription>Click a row to view full plan details and content. {pq ? "Filtered by search." : "Sorted by readiness (lowest first = highest risk)."}</CardDescription>
              </CardHeader>
              <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-white dark:bg-gray-900 z-10">
                    <tr className="border-b border-gray-100 dark:border-gray-800">
                      <th className="pb-3 text-left font-medium text-gray-500 dark:text-gray-400">Change</th>
                      <th className="pb-3 text-center font-medium text-gray-500 dark:text-gray-400">Readiness</th>
                      <th className="pb-3 text-center font-medium text-gray-500 dark:text-gray-400">Risk</th>
                      <th className="pb-3 text-center font-medium text-gray-500 dark:text-gray-400">Gaps</th>
                      {PLAN_DIMS.map((d) => (
                        <th key={d.key} className="pb-3 text-center font-medium text-gray-500 dark:text-gray-400" title={d.label}><d.icon className="h-3.5 w-3.5 inline text-gray-400" /></th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPlans.map((p) => (
                      <tr key={p.cr.number} className="cursor-pointer border-b border-gray-50 dark:border-gray-800 hover:bg-teal-50 dark:hover:bg-teal-950/20" onClick={() => { setSelectedPlanCR(p.cr.number); setExpandedPlanContent(null); setMlAnalysis(null); setMlError(null); }}>
                        <td className="py-2.5">
                          <span className="font-mono text-[11px] text-gray-400">{p.cr.number}</span>
                          <p className="font-medium text-gray-900 dark:text-gray-100 text-xs line-clamp-1">{p.cr.short_description}</p>
                          <p className="text-[11px] text-gray-400">{p.cr.assignment_group || "Unassigned"}</p>
                        </td>
                        <td className="py-2.5 text-center"><span className={`inline-block rounded-full px-2.5 py-0.5 text-sm font-bold ${pBg(p.overallScore)}`}>{p.overallScore}</span></td>
                        <td className="py-2.5 text-center"><span className={`text-xs font-semibold ${pColor(p.overallScore)}`}>{planRiskLabel(p.overallScore)}</span></td>
                        <td className="py-2.5 text-center">{p.gapCount > 0 ? <span className="rounded bg-red-100 px-1.5 py-0.5 text-xs font-bold text-red-700 dark:bg-red-900 dark:text-red-300">{p.gapCount} missing</span> : <span className="text-xs text-green-600">None</span>}</td>
                        {PLAN_DIMS.map((d) => (
                          <td key={d.key} className="py-2.5 text-center">{p[d.key].present ? <span className={`inline-block rounded px-1.5 py-0.5 text-[11px] font-bold ${pBg(p[d.key].quality)}`}>{p[d.key].quality}</span> : <XCircle className="h-3.5 w-3.5 inline text-red-400" />}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
            </div>
            )}
          </div>
        );
      })()}

      {/* ═══ ML ANALYSIS TAB ═══ */}
      {activeTab === "mlTab" && (() => {
        const mq = mlSearch.toLowerCase();
        let mlFiltered = mq ? planResults.filter((p) => p.cr.number.toLowerCase().includes(mq) || p.cr.short_description.toLowerCase().includes(mq) || p.cr.assignment_group.toLowerCase().includes(mq)) : planResults;
        if (mlFilterRisk !== "all") mlFiltered = mlFiltered.filter((p) => p.cr.risk === mlFilterRisk);
        if (mlFilterState !== "all") mlFiltered = mlFiltered.filter((p) => p.cr.state === mlFilterState);
        if (mlFilterGroup !== "all") mlFiltered = mlFiltered.filter((p) => p.cr.assignment_group === mlFilterGroup);
        const selectedMlPlan = selectedMlCR ? planResults.find((p) => p.cr.number === selectedMlCR) : null;

        const sevColor = (s: string) => s === "critical" ? "text-red-600 bg-red-50 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800"
          : s === "high" ? "text-orange-600 bg-orange-50 border-orange-200 dark:bg-orange-950 dark:text-orange-400 dark:border-orange-800"
          : s === "medium" ? "text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800"
          : "text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800";

        return (
          <div className="space-y-6">
            {/* Search bar + filters */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px] max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input type="text" placeholder="Search CR by number, description, group…" className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100" value={mlSearch} onChange={(e) => setMlSearch(e.target.value)} />
              </div>
              <select value={mlFilterRisk} onChange={(e) => setMlFilterRisk(e.target.value)} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100">
                <option value="all">All Risk Levels</option>
                {uniqueRiskLevels.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
              <select value={mlFilterState} onChange={(e) => setMlFilterState(e.target.value)} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100">
                <option value="all">All States</option>
                {uniqueStates.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <select value={mlFilterGroup} onChange={(e) => setMlFilterGroup(e.target.value)} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100">
                <option value="all">All Groups</option>
                {uniqueGroups.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
              {selectedMlCR && (
                <button onClick={() => { setSelectedMlCR(null); setMlAnalysis(null); setMlError(null); }} className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800">← Back to List</button>
              )}
            </div>

            {/* ── CR Selection Table ── */}
            {!selectedMlCR && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Brain className="h-4 w-4 text-indigo-500" /> Select a Change Request for ML Analysis ({mlFiltered.length})</CardTitle>
                  <CardDescription>Click a row to run deep ML content analysis on its implementation plan</CardDescription>
                </CardHeader>
                <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-white dark:bg-gray-900 z-10">
                      <tr className="border-b border-gray-100 dark:border-gray-800">
                        <th className="pb-3 text-left font-medium text-gray-500 dark:text-gray-400">Change</th>
                        <th className="pb-3 text-center font-medium text-gray-500 dark:text-gray-400">Readiness</th>
                        <th className="pb-3 text-center font-medium text-gray-500 dark:text-gray-400">Risk</th>
                        <th className="pb-3 text-center font-medium text-gray-500 dark:text-gray-400">Gaps</th>
                        <th className="pb-3 text-center font-medium text-gray-500 dark:text-gray-400">State</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mlFiltered.map((p) => (
                        <tr key={p.cr.number} className="cursor-pointer border-b border-gray-50 dark:border-gray-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/20" onClick={() => { setSelectedMlCR(p.cr.number); setMlAnalysis(null); setMlError(null); }}>
                          <td className="py-2.5">
                            <span className="font-mono text-[11px] text-gray-400">{p.cr.number}</span>
                            <p className="font-medium text-gray-900 dark:text-gray-100 text-xs line-clamp-1">{p.cr.short_description}</p>
                            <p className="text-[11px] text-gray-400">{p.cr.assignment_group || "Unassigned"}</p>
                          </td>
                          <td className="py-2.5 text-center"><span className={`inline-block rounded-full px-2.5 py-0.5 text-sm font-bold ${pBg(p.overallScore)}`}>{p.overallScore}</span></td>
                          <td className="py-2.5 text-center"><span className={`text-xs font-semibold ${pColor(p.overallScore)}`}>{planRiskLabel(p.overallScore)}</span></td>
                          <td className="py-2.5 text-center">{p.gapCount > 0 ? <span className="rounded bg-red-100 px-1.5 py-0.5 text-xs font-bold text-red-700 dark:bg-red-900 dark:text-red-300">{p.gapCount} missing</span> : <span className="text-xs text-green-600">None</span>}</td>
                          <td className="py-2.5 text-center"><span className="text-[10px] font-medium text-gray-500 dark:text-gray-400">{p.cr.state}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            {/* ── ML Analysis Result ── */}
            {selectedMlPlan && (() => {
              const crNum = selectedMlPlan.cr.number;
              const needsFetch = !mlAnalysis || mlAnalysis.number !== crNum;

              if (needsFetch && !mlLoading && !mlError) {
                setTimeout(() => {
                  setMlLoading(true);
                  setMlError(null);
                  fetch(`/api/data/plan-analysis?number=${encodeURIComponent(crNum)}`)
                    .then(r => r.ok ? r.json() : r.json().then(b => { throw new Error(b.error || `HTTP ${r.status}`); }))
                    .then(data => { setMlAnalysis(data); setMlLoading(false); })
                    .catch(err => { setMlError(err.message); setMlLoading(false); });
                }, 0);
              }

              if (mlLoading) return (
                <Card className="border-indigo-200 bg-indigo-50/30 dark:border-indigo-900 dark:bg-indigo-950/20">
                  <CardHeader><CardTitle className="text-base flex items-center gap-2"><Brain className="h-5 w-5 text-indigo-600 animate-pulse" />Analyzing {crNum}…</CardTitle></CardHeader>
                  <div className="space-y-3 p-4">{[1,2,3].map(i => <div key={i} className="h-16 animate-pulse rounded-lg bg-indigo-100/50 dark:bg-indigo-900/20" />)}</div>
                </Card>
              );

              if (mlError) return (
                <Card className="border-red-200 bg-red-50/30 dark:border-red-900 dark:bg-red-950/20">
                  <CardHeader><CardTitle className="text-base flex items-center gap-2"><XCircle className="h-5 w-5 text-red-600" />Analysis Error</CardTitle></CardHeader>
                  <p className="px-6 pb-4 text-sm text-red-600">{mlError}</p>
                </Card>
              );

              if (!mlAnalysis || mlAnalysis.number !== crNum) return null;

              const a = mlAnalysis;
              const pa = a.planAnalysis;
              const cp = a.changeProfile;
              const ap = a.appProfile;
              const recs = a.recommendations as { severity: string; category: string; title: string; detail: string }[];
              const asmt = a.assessment;

              const verdictColor = asmt.verdict === "approve" ? "bg-green-100 text-green-700 border-green-300 dark:bg-green-900 dark:text-green-300 dark:border-green-700"
                : asmt.verdict === "approve-with-conditions" ? "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900 dark:text-amber-300 dark:border-amber-700"
                : asmt.verdict === "needs-rework" ? "bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-900 dark:text-orange-300 dark:border-orange-700"
                : "bg-red-100 text-red-700 border-red-300 dark:bg-red-900 dark:text-red-300 dark:border-red-700";

              const qualityScoreData = [
                { name: "Structure", score: pa.structureScore, fill: "#6366f1" },
                { name: "Completeness", score: pa.completenessScore, fill: "#0d9488" },
                { name: "Clarity", score: pa.clarityScore, fill: "#2563eb" },
                { name: "Risk Awareness", score: pa.riskAwarenessScore, fill: "#dc2626" },
              ];

              return (
                <Card className="border-indigo-200 bg-indigo-50/30 dark:border-indigo-900 dark:bg-indigo-950/20">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base flex items-center gap-2"><Brain className="h-5 w-5 text-indigo-600" />ML Content Analysis — {crNum}</CardTitle>
                        <CardDescription className="text-sm mt-1">{selectedMlPlan.cr.short_description}</CardDescription>
                      </div>
                      <div className={`rounded-lg border px-4 py-2 text-center ${verdictColor}`}>
                        <p className="text-xs font-semibold uppercase tracking-wide">Assessment</p>
                        <p className="text-sm font-bold">{asmt.verdictLabel}</p>
                        <p className="text-[10px] mt-0.5">Confidence: {asmt.confidencePercent}%</p>
                      </div>
                    </div>
                  </CardHeader>

                  <div className="space-y-5 px-6 pb-6">
                    {/* Assessment Summary */}
                    <div className={`rounded-lg border p-4 ${verdictColor}`}>
                      <p className="text-sm leading-relaxed">{asmt.summary}</p>
                      {asmt.riskFactors.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {asmt.riskFactors.map((f: string, i: number) => <span key={i} className="rounded-full bg-white/50 dark:bg-black/20 px-2 py-0.5 text-[10px] font-semibold">{f}</span>)}
                        </div>
                      )}
                    </div>

                    {/* Profile Cards */}
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                      {/* Change Nature */}
                      <div className="rounded-lg border border-indigo-100 dark:border-indigo-800 bg-white dark:bg-gray-900 p-4 space-y-2">
                        <p className="text-sm font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5"><Zap className="h-4 w-4" />Change Nature</p>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div><span className="text-gray-400">Type:</span> <span className="font-semibold text-gray-700 dark:text-gray-300">{cp.changeType}</span></div>
                          <div><span className="text-gray-400">Risk Tier:</span> <span className={`font-semibold ${cp.riskTier==="critical"?"text-red-600":cp.riskTier==="high"?"text-orange-600":cp.riskTier==="medium"?"text-amber-600":"text-green-600"}`}>{cp.riskTier}</span></div>
                          <div><span className="text-gray-400">Complexity:</span> <span className="font-semibold text-gray-700 dark:text-gray-300">{cp.complexity}</span></div>
                          <div><span className="text-gray-400">Category:</span> <span className="font-semibold text-gray-700 dark:text-gray-300">{cp.natureCategory}</span></div>
                        </div>
                        <div className="flex flex-wrap gap-1">{cp.natureTags.map((t: string, i: number) => <span key={i} className="rounded-full bg-indigo-100 dark:bg-indigo-900 px-2 py-0.5 text-[10px] font-semibold text-indigo-700 dark:text-indigo-300">{t}</span>)}</div>
                      </div>

                      {/* Application Profile */}
                      <div className="rounded-lg border border-indigo-100 dark:border-indigo-800 bg-white dark:bg-gray-900 p-4 space-y-2">
                        <p className="text-sm font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5"><Layers className="h-4 w-4" />Application Profile</p>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="col-span-2"><span className="text-gray-400">Application:</span> <span className="font-semibold text-gray-700 dark:text-gray-300">{ap.applicationName}</span></div>
                          <div><span className="text-gray-400">Service:</span> <span className="font-semibold text-gray-700 dark:text-gray-300">{ap.serviceCategory}</span></div>
                          <div><span className="text-gray-400">Criticality:</span> <span className={`font-semibold ${ap.criticality==="mission-critical"?"text-red-600":ap.criticality==="business-critical"?"text-orange-600":"text-gray-600"}`}>{ap.criticality}</span></div>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {ap.environmentTags.map((t: string, i: number) => <span key={i} className="rounded-full bg-blue-100 dark:bg-blue-900 px-2 py-0.5 text-[10px] font-semibold text-blue-700 dark:text-blue-300">{t}</span>)}
                          {ap.technologyStack.map((t: string, i: number) => <span key={i} className="rounded-full bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-[10px] font-semibold text-gray-600 dark:text-gray-400">{t}</span>)}
                        </div>
                      </div>
                    </div>

                    {/* Quality Scores */}
                    <div className="rounded-lg border border-indigo-100 dark:border-indigo-800 bg-white dark:bg-gray-900 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-bold text-indigo-700 dark:text-indigo-300">Plan Quality Breakdown</p>
                        <span className={`rounded-full px-3 py-1 text-sm font-bold ${pa.overallQuality>=65?"bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300":pa.overallQuality>=40?"bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300":"bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"}`}>Overall: {pa.overallQuality}/100</span>
                      </div>
                      <div className="h-40">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={qualityScoreData} layout="vertical" barCategoryGap="20%">
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                            <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} stroke="#94a3b8" />
                            <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} stroke="#94a3b8" width={100} />
                            <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "12px" }} />
                            <Bar dataKey="score" radius={[0, 4, 4, 0]}>{qualityScoreData.map((d, i) => <Cell key={i} fill={d.fill} />)}</Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="grid grid-cols-2 gap-2 md:grid-cols-4 text-xs text-center">
                        <div className="rounded bg-indigo-50 dark:bg-indigo-950/30 p-2"><span className="text-gray-400">Words</span><p className="font-bold text-gray-700 dark:text-gray-300">{pa.wordCount}</p></div>
                        <div className="rounded bg-indigo-50 dark:bg-indigo-950/30 p-2"><span className="text-gray-400">Steps</span><p className="font-bold text-gray-700 dark:text-gray-300">{pa.stepCount}</p></div>
                        <div className="rounded bg-indigo-50 dark:bg-indigo-950/30 p-2"><span className="text-gray-400">Tech Depth</span><p className="font-bold text-gray-700 dark:text-gray-300 capitalize">{pa.technicalDepth}</p></div>
                        <div className="rounded bg-indigo-50 dark:bg-indigo-950/30 p-2"><span className="text-gray-400">Confidence</span><p className="font-bold text-gray-700 dark:text-gray-300 capitalize">{pa.confidenceLevel}</p></div>
                      </div>
                      {/* Element checklist */}
                      <div className="grid grid-cols-2 gap-1 md:grid-cols-4 text-[11px]">
                        {[
                          ["Pre-checks", pa.hasPreChecks], ["Post-checks", pa.hasPostChecks],
                          ["Verification", pa.hasVerificationSteps], ["Timeline", pa.hasTimeline],
                          ["Contacts", pa.hasContactInfo], ["Rollback Ref", pa.hasRollbackReference],
                          ["Approval Gates", pa.hasApprovalGates], ["Monitoring", pa.hasMonitoringSteps],
                        ].map(([label, val]) => (
                          <div key={label as string} className="flex items-center gap-1.5">
                            {val ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> : <XCircle className="h-3.5 w-3.5 text-red-400" />}
                            <span className={val ? "text-green-700 dark:text-green-400" : "text-red-500 dark:text-red-400"}>{label as string}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Detected Actions & Risks */}
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                      {pa.detectedActions.length > 0 && (
                        <div className="rounded-lg border border-blue-100 dark:border-blue-800 bg-white dark:bg-gray-900 p-4 space-y-2">
                          <p className="text-sm font-bold text-blue-700 dark:text-blue-300">Detected Actions</p>
                          <div className="flex flex-wrap gap-1">{pa.detectedActions.map((act: string, i: number) => <span key={i} className="rounded bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 px-2 py-0.5 text-[11px] text-blue-700 dark:text-blue-300">{act}</span>)}</div>
                        </div>
                      )}
                      {pa.detectedRisks.length > 0 && (
                        <div className="rounded-lg border border-red-100 dark:border-red-800 bg-white dark:bg-gray-900 p-4 space-y-2">
                          <p className="text-sm font-bold text-red-700 dark:text-red-300">Detected Risks &amp; Gaps</p>
                          <ul className="space-y-1">{pa.detectedRisks.map((r: string, i: number) => <li key={i} className="flex items-start gap-1.5 text-[11px] text-red-600 dark:text-red-400"><AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />{r}</li>)}</ul>
                        </div>
                      )}
                    </div>

                    {/* Recommendations */}
                    {recs.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-bold text-indigo-700 dark:text-indigo-300">Recommendations ({recs.filter((r: { severity: string }) => r.severity !== "info").length} action items)</p>
                        <div className="space-y-2">
                          {recs.map((r: { severity: string; category: string; title: string; detail: string }, i: number) => (
                            <div key={i} className={`rounded-lg border p-3 ${sevColor(r.severity)}`}>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase">{r.severity}</span>
                                <span className="text-[10px] text-gray-400">{r.category}</span>
                              </div>
                              <p className="text-xs font-semibold">{r.title}</p>
                              <p className="text-[11px] mt-0.5 opacity-80">{r.detail}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              );
            })()}
          </div>
        );
      })()}

    </div>
    </>
  );
}
