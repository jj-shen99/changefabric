"use client";

import { useState, useMemo, useCallback } from "react";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, Legend,
  PieChart, Pie, LineChart, Line, AreaChart, Area,
} from "recharts";
import {
  Shield, AlertTriangle, Gauge, Zap, Layers, Settings2, RotateCcw, Search,
  LayoutDashboard, BarChart3, PieChart as PieChartIcon, ShieldAlert, Info,
  Brain, GitCommitHorizontal, RefreshCw, ExternalLink, FileCode2, User, Calendar,
  ClipboardCheck, FileText, CheckCircle2, XCircle, AlertCircle, TrendingUp, Sparkles,
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
interface FeatureImpact {
  feature: string; impactScore: number; impactLevel: "critical" | "high" | "medium" | "low";
  filesAffected: number; churn: number; commits: number; riskFactors: string[]; description: string;
}
interface ProductionConcern {
  type: "outage" | "performance" | "data_integrity" | "security" | "availability";
  severity: "critical" | "high" | "medium" | "low"; title: string; description: string;
  evidence: string[]; mitigation: string;
}
interface PerformanceInsight {
  category: string; score: number; level: "critical" | "high" | "medium" | "low";
  description: string; files: string[];
}
interface GitAnalysisData {
  repoUrl: string; owner: string; repo: string; sinceDate: string; days: number;
  summary: { totalCommits: number; avgRisk: number; maxRisk: number; overallRiskFactor: number; totalAdditions: number; totalDeletions: number; totalFilesChanged: number; criticalCount: number; highCount: number; mediumCount: number; lowCount: number; };
  authorBreakdown: { author: string; commits: number; avgRisk: number; additions: number; deletions: number }[];
  commits: { sha: string; shortSha: string; message: string; author: string; date: string; filesChanged: number; additions: number; deletions: number; riskScore: number; riskLevel: string; riskFactors: string[]; files: { filename: string; additions: number; deletions: number; status: string; fileRisk: number }[]; }[];
  featureImpact: FeatureImpact[];
  productionConcerns: ProductionConcern[];
  performanceInsights: PerformanceInsight[];
}

/* ═══ Shared Risk Helpers ═══ */
function riskColor(s: number) { if (s>=75) return "text-red-600"; if (s>=50) return "text-orange-600"; if (s>=25) return "text-amber-600"; return "text-green-600"; }
function riskBgCls(s: number) { if (s>=75) return "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"; if (s>=50) return "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300"; if (s>=25) return "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300"; return "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"; }
function riskLbl(s: number) { if (s>=75) return "Critical"; if (s>=50) return "High"; if (s>=25) return "Medium"; return "Low"; }

/* ═══ Weight Redistribution Helper ═══ */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function redistributeWeights(prev: any, changedKey: string, newVal: number): any {
  const keys = Object.keys(prev);
  const otherKeys = keys.filter(k => k !== changedKey);
  const clamped = Math.max(0, Math.min(1, newVal));
  const remaining = 1 - clamped;
  const otherTotal = otherKeys.reduce((sum, k) => sum + (prev[k] as number), 0);
  const result = { ...prev, [changedKey]: clamped };
  if (otherTotal > 0) {
    otherKeys.forEach(k => { result[k] = Math.max(0, (prev[k] as number) / otherTotal * remaining); });
  } else {
    const share = remaining / otherKeys.length;
    otherKeys.forEach(k => { result[k] = share; });
  }
  return result;
}

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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [selectedCR, _setSelectedCR] = useState<string | null>(null);
  const [weights, setWeights] = useState<Weights>({ ...DEFAULT_WEIGHTS });
  const [activeTab, setActiveTab] = useState<"overview"|"ml"|"plans"|"mlTab">("overview");
  const [weightsOpen, setWeightsOpen] = useState(false);
  const [gitData, setGitData] = useState<GitAnalysisData | null>(null);
  const [gitLoading, setGitLoading] = useState(false);
  const [gitError, setGitError] = useState<string | null>(null);
  const [gitRepo, setGitRepo] = useState("https://code.devsnc.com/dev/perf-testing-ai");
  const [gitDays, setGitDays] = useState(14);
  const [expandedCommit, setExpandedCommit] = useState<string | null>(null);
  const [planWeights, setPlanWeights] = useState({ implementation: 0.25, backout: 0.25, testPlan: 0.20, riskAnalysis: 0.15, changePlan: 0.10, justification: 0.05 });
  const [planSearch, setPlanSearch] = useState("");
  const [selectedPlanCR, setSelectedPlanCR] = useState<string | null>(null);
  const [expandedPlanContent, setExpandedPlanContent] = useState<string | null>(null);
  const [planFilterRisk, setPlanFilterRisk] = useState<string>("all");
  const [planFilterState, setPlanFilterState] = useState<string>("all");
  const [planFilterGroup, setPlanFilterGroup] = useState<string>("all");
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
  const [mlWeights, setMlWeights] = useState({ structure: 0.25, completeness: 0.30, clarity: 0.25, riskAwareness: 0.20 });
  const [mlRecalcFlash, setMlRecalcFlash] = useState(false);
  const [overrides, setOverrides] = useState<Record<string, Partial<DimensionScores>>>({});

  const setWeight = useCallback((key: keyof Weights, val: number) => { setWeights((p) => redistributeWeights(p, key, val)); }, []);
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
    const standard = ["CAB Approval", "Change Management", "Database", "Hardware", "Network", "Security", "Service Desk", "Software"];
    return [...new Set([...standard, ...fromData])].sort();
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
    const overallScore = Math.round(implementation.quality*planWeights.implementation + backout.quality*planWeights.backout + testPlan.quality*planWeights.testPlan + riskAnalysis.quality*planWeights.riskAnalysis + changePlan.quality*planWeights.changePlan + justification.quality*planWeights.justification);
    const gapCount = [implementation, backout, testPlan, changePlan, riskAnalysis, justification].filter(p => !p.present).length;
    const riskLevel = overallScore>=75?"low":overallScore>=50?"medium":overallScore>=25?"high":"critical";
    return { cr: c, implementation, backout, testPlan, changePlan, riskAnalysis, justification, overallScore, riskLevel, gapCount };
  }).sort((a, b) => a.overallScore - b.overallScore), [changeRequests, planWeights]);

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
    { key: "implementation" as const, label: "Implementation Plan", icon: FileText },
    { key: "backout" as const, label: "Backout Plan", icon: RotateCcw },
    { key: "testPlan" as const, label: "Test Plan", icon: CheckCircle2 },
    { key: "riskAnalysis" as const, label: "Risk/Impact Analysis", icon: AlertTriangle },
    { key: "changePlan" as const, label: "Change Plan", icon: ClipboardCheck },
    { key: "justification" as const, label: "Justification", icon: Info },
  ];
  const planWeightTotal = Object.values(planWeights).reduce((a, b) => a + b, 0);
  const setPlanWeight = (key: keyof typeof planWeights, val: number) => setPlanWeights(prev => redistributeWeights(prev, key, val));
  const resetPlanWeights = () => setPlanWeights({ implementation: 0.25, backout: 0.25, testPlan: 0.20, riskAnalysis: 0.15, changePlan: 0.10, justification: 0.05 });

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
        /* ── Risk Analysis summary KPIs for overview ── */
        const riskScores = scored.map(s => {
          const c = s.cr;
          const p = (c.priority||"").trim(); const pS = p.startsWith("1")?5:p.startsWith("2")?4:p.startsWith("3")?3:p.startsWith("4")?2:3;
          const u = (c.urgency||"").trim(); const uS = u.startsWith("1")?5:u.startsWith("2")?3:u.startsWith("3")?1:3;
          const L = Math.round((pS+uS)/2*10)/10;
          const imp = (c.sn_impact||"").trim(); const iS = imp.startsWith("1")?5:imp.startsWith("2")?3:imp.startsWith("3")?1:3;
          const r = (c.risk||"").toLowerCase(); const rS = r==="very high"?5:r==="high"?4:r==="moderate"?3:r==="low"?2:r==="none"?1:3;
          const sc = (c.scope||"").toLowerCase(); const sS = (sc==="large"||sc==="extensive")?5:sc==="medium"?3:sc==="small"?1:3;
          const I = Math.round((iS+rS+sS)/3*10)/10;
          const t = (c.type||"").toLowerCase(); const V = t==="emergency"?0.8:t==="normal"?0.3:t==="standard"?0.1:0.3;
          let C = 0; if (c.backout_plan && c.backout_plan.trim().length > 10) C += 10; if (c.test_plan && c.test_plan.trim().length > 10) C += 8; if (c.implementation_plan && c.implementation_plan.trim().length > 10) C += 7;
          return Math.max(0, Math.min(100, Math.round((L*I/25)*100*(1+V) - C)));
        });
        const avgRiskScore = riskScores.length > 0 ? Math.round(riskScores.reduce((a, b) => a+b, 0) / riskScores.length) : 0;
        const maxRiskScore = riskScores.length > 0 ? Math.max(...riskScores) : 0;
        const riskCritCount = riskScores.filter(s => s >= 75).length;

        /* ── Plan Readiness KPIs ── */
        const pn = planResults.length;
        const pAvg = pn>0?Math.round(planResults.reduce((a, p) => a+p.overallScore, 0)/pn):0;
        const pFull = planResults.filter(p => p.gapCount===0).length;
        const pMissingBack = planResults.filter(p => !p.backout.present).length;
        const pMissingImpl = planResults.filter(p => !p.implementation.present).length;
        const pMissingTest = planResults.filter(p => !p.testPlan.present).length;

        /* ── State distribution ── */
        const stateMap: Record<string, number> = {};
        changeRequests.forEach(c => { const st = c.state || "Unknown"; stateMap[st] = (stateMap[st] || 0) + 1; });
        const stateData = Object.entries(stateMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
        const stateColors = ["#6366f1", "#8b5cf6", "#a855f7", "#c084fc", "#d8b4fe", "#e9d5ff", "#f3e8ff", "#94a3b8"];

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

            {/* ═══ ALL KPIs AT TOP ═══ */}
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-5">
              <Card className="p-4"><p className="text-xs font-medium text-gray-500 dark:text-gray-400">Total CRs</p><p className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100">{totalCRs}</p></Card>
              <Card className="p-4"><p className="text-xs font-medium text-gray-500 dark:text-gray-400">Avg Impact Score</p><p className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100">{avgOverall}</p><p className="text-[11px] text-gray-400">{getRiskLabel(avgOverall)}</p></Card>
              <Card className="p-4"><p className="text-xs font-medium text-gray-500 dark:text-gray-400">Critical / High Impact</p><p className="mt-1 text-2xl font-bold text-red-600">{criticalCount + highCount}</p><p className="text-[11px] text-gray-400">{criticalCount} crit, {highCount} high</p></Card>
              <Card className="p-4"><p className="text-xs font-medium text-gray-500 dark:text-gray-400">Low Impact</p><p className="mt-1 text-2xl font-bold text-green-600">{lowCount}</p><p className="text-[11px] text-gray-400">Score &lt; 40</p></Card>
              <Card className="p-4"><p className="text-xs font-medium text-gray-500 dark:text-gray-400">Avg Risk Score</p><p className={`mt-1 text-2xl font-bold ${riskColor(avgRiskScore)}`}>{avgRiskScore}</p><p className="text-[11px] text-gray-400">{riskLbl(avgRiskScore)}</p></Card>
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-5">
              <Card className="p-4"><div className="flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-red-500" /><span className="text-xs text-gray-500 dark:text-gray-400">Max Risk Score</span></div><p className={`mt-1 text-2xl font-bold ${riskColor(maxRiskScore)}`}>{maxRiskScore}</p></Card>
              <Card className="p-4"><div className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-red-500" /><span className="text-xs text-gray-500 dark:text-gray-400">Risk Critical</span></div><p className="mt-1 text-2xl font-bold text-red-600">{riskCritCount}</p><p className="text-[11px] text-gray-400">Score ≥ 75</p></Card>
              <Card className="p-4"><div className="flex items-center gap-2"><ClipboardCheck className="h-4 w-4 text-teal-500" /><span className="text-xs text-gray-500 dark:text-gray-400">Avg Readiness</span></div><p className={`mt-1 text-2xl font-bold ${pColor(pAvg)}`}>{pAvg}</p><p className="text-[11px] text-gray-400">{pLabel(pAvg)}</p></Card>
              <Card className="p-4"><div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-500" /><span className="text-xs text-gray-500 dark:text-gray-400">Full Plan Coverage</span></div><p className="mt-1 text-2xl font-bold text-green-600">{pFull}</p><p className="text-[11px] text-gray-400">All 6 plans</p></Card>
              <Card className="p-4"><div className="flex items-center gap-2"><AlertCircle className="h-4 w-4 text-amber-500" /><span className="text-xs text-gray-500 dark:text-gray-400">Missing Plans</span></div><p className="mt-1 text-2xl font-bold text-amber-600">{pMissingImpl+pMissingBack+pMissingTest}</p><p className="text-[11px] text-gray-400">impl:{pMissingImpl} back:{pMissingBack} test:{pMissingTest}</p></Card>
            </div>

            {/* ═══ ALL PLOTS IN 2-COL GRID ═══ */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Impact Score Distribution Pie */}
              <Card><CardHeader><CardTitle className="flex items-center gap-2"><PieChartIcon className="h-4 w-4 text-blue-500" /> Impact Score Distribution</CardTitle></CardHeader><div className="h-64"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={riskDistData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`} /><Legend /><Tooltip /></PieChart></ResponsiveContainer></div></Card>

              {/* Average Impact by Category */}
              <Card><CardHeader><CardTitle>Avg Impact Score by Category</CardTitle><CardDescription>Computed overall scores with current weights</CardDescription></CardHeader><div className="h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={categoryData} layout="vertical"><CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" /><XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12 }} stroke="#94a3b8" /><YAxis type="category" dataKey="category" tick={{ fontSize: 12 }} stroke="#94a3b8" width={100} /><Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }} // eslint-disable-next-line @typescript-eslint/no-explicit-any
formatter={(value: any) => [`${value} (${getRiskLabel(Number(value))})`, "Avg Impact"]} /><Bar dataKey="avgRisk" radius={[0, 4, 4, 0]}>{categoryData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.avgRisk >= 80 ? "#ef4444" : entry.avgRisk >= 60 ? "#f97316" : entry.avgRisk >= 40 ? "#eab308" : "#22c55e"} />))}</Bar></BarChart></ResponsiveContainer></div></Card>

              {/* Plan Readiness Distribution */}
              <Card><CardHeader><CardTitle className="flex items-center gap-2"><BarChart3 className="h-4 w-4 text-teal-500" /> Plan Readiness Distribution</CardTitle></CardHeader><div className="h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={[{ bucket: "Well Prepared (75-100)", count: planResults.filter(p => p.overallScore>=75).length, fill: "#22c55e" },{ bucket: "Adequate (50-74)", count: planResults.filter(p => p.overallScore>=50 && p.overallScore<75).length, fill: "#eab308" },{ bucket: "Gaps Found (25-49)", count: planResults.filter(p => p.overallScore>=25 && p.overallScore<50).length, fill: "#f97316" },{ bucket: "Critical Gaps (0-24)", count: planResults.filter(p => p.overallScore<25).length, fill: "#ef4444" }]}><CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" /><XAxis dataKey="bucket" tick={{ fontSize: 10 }} stroke="#94a3b8" /><YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" /><Tooltip /><Bar dataKey="count" name="Changes" radius={[4, 4, 0, 0]}>{["#22c55e","#eab308","#f97316","#ef4444"].map((fill, idx) => <Cell key={idx} fill={fill} />)}</Bar></BarChart></ResponsiveContainer></div></Card>

              {/* Plan Coverage Summary */}
              <Card><CardHeader><CardTitle className="flex items-center gap-2"><FileText className="h-4 w-4 text-teal-500" /> Plan Coverage Summary</CardTitle><CardDescription>Average quality per plan dimension</CardDescription></CardHeader><div className="space-y-3 px-4 pb-4">{PLAN_DIMS.map((d) => { const avg = pn>0?Math.round(planResults.reduce((a, p) => a+p[d.key].quality, 0)/pn):0; const presentCount = planResults.filter(p => p[d.key].present).length; return (<div key={d.key} className="space-y-1"><div className="flex items-center justify-between"><div className="flex items-center gap-2"><d.icon className="h-3.5 w-3.5 text-teal-500" /><span className="text-xs font-medium text-gray-700 dark:text-gray-300">{d.label}</span></div><div className="flex items-center gap-2"><span className="text-[11px] text-gray-400">{presentCount}/{pn} present</span><span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${pBg(avg)}`}>{avg}</span></div></div><div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800"><div className="h-2 rounded-full transition-all" style={{ width: `${avg}%`, backgroundColor: avg>=75?"#22c55e":avg>=50?"#eab308":avg>=25?"#f97316":"#ef4444" }} /></div></div>); })}</div></Card>

              {/* Plan Readiness by Team */}
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
                    <CardHeader><CardTitle className="flex items-center gap-2"><User className="h-4 w-4 text-teal-500" /> Plan Readiness by Team</CardTitle><CardDescription>Average readiness per assignment group</CardDescription></CardHeader>
                    <div className="h-64 px-2"><ResponsiveContainer width="100%" height="100%"><BarChart data={teamData} layout="vertical" barCategoryGap="20%"><CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} /><XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} stroke="#94a3b8" /><YAxis type="category" dataKey="team" tick={{ fontSize: 9 }} stroke="#94a3b8" width={110} /><Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "11px" }} /><Bar dataKey="avgReadiness" name="Avg Readiness" radius={[0, 4, 4, 0]}>{teamData.map((d, i) => <Cell key={i} fill={d.avgReadiness >= 75 ? "#22c55e" : d.avgReadiness >= 50 ? "#eab308" : d.avgReadiness >= 25 ? "#f97316" : "#ef4444"} />)}</Bar></BarChart></ResponsiveContainer></div>
                  </Card>
                );
              })()}

              {/* Plan Readiness by SN Risk Level */}
              {(() => {
                const rrMap: Record<string, { total: number; scoreSum: number; gapSum: number }> = {};
                planResults.forEach(p => {
                  const risk = p.cr.risk || "Unknown";
                  if (!rrMap[risk]) rrMap[risk] = { total: 0, scoreSum: 0, gapSum: 0 };
                  rrMap[risk].total++;
                  rrMap[risk].scoreSum += p.overallScore;
                  rrMap[risk].gapSum += p.gapCount;
                });
                const rrData = Object.entries(rrMap).map(([risk, d]) => ({
                  risk,
                  avgReadiness: Math.round(d.scoreSum / d.total),
                  avgGaps: +(d.gapSum / d.total).toFixed(1),
                  count: d.total,
                })).sort((a, b) => a.avgReadiness - b.avgReadiness);
                const rrFill: Record<string, string> = { "Very High": "#ef4444", "High": "#f97316", "Moderate": "#eab308", "Low": "#22c55e", "None": "#94a3b8" };
                return (
                  <Card>
                    <CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-500" /> Readiness by SN Risk Level</CardTitle><CardDescription>Do high-risk CRs have better plans?</CardDescription></CardHeader>
                    <div className="space-y-3 px-4 pb-4">
                      {rrData.map(d => (
                        <div key={d.risk} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-gray-700 dark:text-gray-300">{d.risk} <span className="text-gray-400 font-normal">({d.count} CRs)</span></span>
                            <div className="flex items-center gap-3">
                              <span className="text-gray-400">Avg gaps: <span className="font-bold text-gray-600 dark:text-gray-300">{d.avgGaps}</span></span>
                              <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${pBg(d.avgReadiness)}`}>{d.avgReadiness}</span>
                            </div>
                          </div>
                          <div className="h-3 rounded-full bg-gray-100 dark:bg-gray-800"><div className="h-3 rounded-full transition-all" style={{ width: `${d.avgReadiness}%`, backgroundColor: rrFill[d.risk] || "#6366f1" }} /></div>
                        </div>
                      ))}
                    </div>
                  </Card>
                );
              })()}

              {/* State Distribution (new from cross-tab data) */}
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><PieChartIcon className="h-4 w-4 text-indigo-500" /> CR State Distribution</CardTitle><CardDescription>How CRs are distributed across states</CardDescription></CardHeader>
                <div className="h-64"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={stateData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`}>{stateData.map((_, i) => <Cell key={i} fill={stateColors[i % stateColors.length]} />)}</Pie><Legend /><Tooltip /></PieChart></ResponsiveContainer></div>
              </Card>

              {/* Risk Score Distribution (new from risk analysis data) */}
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-purple-500" /> Risk Score Distribution</CardTitle><CardDescription>Computed risk scores across all CRs</CardDescription></CardHeader>
                <div className="h-64"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={[{ name: "Critical (≥75)", value: riskCritCount, fill: "#ef4444" },{ name: "High (50-74)", value: riskScores.filter(s => s>=50 && s<75).length, fill: "#f97316" },{ name: "Medium (25-49)", value: riskScores.filter(s => s>=25 && s<50).length, fill: "#eab308" },{ name: "Low (<25)", value: riskScores.filter(s => s<25).length, fill: "#22c55e" }].filter(d => d.value > 0)} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`} /><Legend /><Tooltip /></PieChart></ResponsiveContainer></div>
              </Card>

              {/* Change Type Distribution */}
              {(() => {
                const typeMap: Record<string, number> = {};
                changeRequests.forEach(c => { const t = c.type || "Unknown"; typeMap[t] = (typeMap[t] || 0) + 1; });
                const typeData = Object.entries(typeMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
                const typeColors = ["#3b82f6", "#8b5cf6", "#f59e0b", "#ef4444", "#22c55e", "#06b6d4"];
                return (
                  <Card>
                    <CardHeader><CardTitle className="flex items-center gap-2"><Zap className="h-4 w-4 text-blue-500" /> Change Type Distribution</CardTitle><CardDescription>Normal vs Emergency vs Standard</CardDescription></CardHeader>
                    <div className="h-64"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={typeData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`}>{typeData.map((_, i) => <Cell key={i} fill={typeColors[i % typeColors.length]} />)}</Pie><Legend /><Tooltip /></PieChart></ResponsiveContainer></div>
                  </Card>
                );
              })()}

              {/* Priority Distribution */}
              {(() => {
                const prioMap: Record<string, number> = {};
                changeRequests.forEach(c => { const p = c.priority || "Unknown"; prioMap[p] = (prioMap[p] || 0) + 1; });
                const prioData = Object.entries(prioMap).map(([name, value]) => ({ name, value })).sort((a, b) => a.name.localeCompare(b.name));
                const prioColors: Record<string, string> = { "1 - Critical": "#ef4444", "2 - High": "#f97316", "3 - Moderate": "#eab308", "4 - Low": "#22c55e" };
                return (
                  <Card>
                    <CardHeader><CardTitle className="flex items-center gap-2"><Gauge className="h-4 w-4 text-amber-500" /> Priority Distribution</CardTitle><CardDescription>CRs by ServiceNow priority level</CardDescription></CardHeader>
                    <div className="h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={prioData}><CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" /><XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="#94a3b8" /><YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" /><Tooltip /><Bar dataKey="value" name="Count" radius={[4, 4, 0, 0]}>{prioData.map((d, i) => <Cell key={i} fill={prioColors[d.name] || "#94a3b8"} />)}</Bar></BarChart></ResponsiveContainer></div>
                  </Card>
                );
              })()}
            </div>

            {/* ═══ Top Risk CRs Table ═══ */}
            {(() => {
              const topRisk = scored.slice().sort((a, b) => b.overall - a.overall).slice(0, 8);
              return (
                <Card>
                  <CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-red-500" /> Top Risk Change Requests</CardTitle><CardDescription>Highest computed impact scores — click to open Plan Analysis</CardDescription></CardHeader>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead><tr className="border-b border-gray-100 dark:border-gray-800"><th className="pb-3 text-left font-medium text-gray-500 dark:text-gray-400">Change</th><th className="pb-3 text-center font-medium text-gray-500 dark:text-gray-400">Impact</th><th className="pb-3 text-center font-medium text-gray-500 dark:text-gray-400">Readiness</th><th className="pb-3 text-center font-medium text-gray-500 dark:text-gray-400">SN Risk</th><th className="pb-3 text-center font-medium text-gray-500 dark:text-gray-400">State</th><th className="pb-3 text-center font-medium text-gray-500 dark:text-gray-400">Type</th></tr></thead>
                      <tbody>
                        {topRisk.map((s) => {
                          const pr = planResults.find(p => p.cr.number === s.cr.number);
                          return (
                            <tr key={s.cr.number} className="cursor-pointer border-b border-gray-50 dark:border-gray-800 hover:bg-blue-50 dark:hover:bg-blue-950/20" onClick={() => { setSelectedPlanCR(s.cr.number); setActiveTab("plans"); }}>
                              <td className="py-2.5"><span className="font-mono text-[11px] text-gray-400">{s.cr.number}</span><p className="font-medium text-gray-900 dark:text-gray-100 text-xs line-clamp-1">{s.cr.short_description}</p><p className="text-[11px] text-gray-400">{s.cr.assignment_group || "Unassigned"}</p></td>
                              <td className="py-2.5 text-center"><span className={`inline-block rounded-full px-2.5 py-0.5 text-sm font-bold ${getRiskBg(s.overall)}`}>{s.overall}</span></td>
                              <td className="py-2.5 text-center">{pr ? <span className={`inline-block rounded-full px-2.5 py-0.5 text-sm font-bold ${pBg(pr.overallScore)}`}>{pr.overallScore}</span> : <span className="text-gray-400">—</span>}</td>
                              <td className="py-2.5 text-center"><span className="text-xs text-gray-600 dark:text-gray-400">{s.cr.risk || "—"}</span></td>
                              <td className="py-2.5 text-center"><span className="text-[10px] font-medium text-gray-500 dark:text-gray-400">{s.cr.state}</span></td>
                              <td className="py-2.5 text-center"><span className="text-[10px] font-medium text-gray-500 dark:text-gray-400">{s.cr.type}</span></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </Card>
              );
            })()}

            {/* ═══ Risk vs Readiness Correlation ═══ */}
            {(() => {
              const highImpactLowReady = planResults.filter(p => {
                const s = scored.find(sc => sc.cr.number === p.cr.number);
                return s && s.overall >= 60 && p.overallScore < 50;
              });
              const lowImpactHighReady = planResults.filter(p => {
                const s = scored.find(sc => sc.cr.number === p.cr.number);
                return s && s.overall < 40 && p.overallScore >= 75;
              });
              return (
                <Card className="border-amber-200 bg-amber-50/30 dark:border-amber-900 dark:bg-amber-950/20">
                  <CardHeader><CardTitle className="flex items-center gap-2"><Info className="h-4 w-4 text-amber-600" /> Risk vs Readiness Insights</CardTitle></CardHeader>
                  <div className="grid grid-cols-1 gap-4 px-4 pb-4 md:grid-cols-2">
                    <div className="rounded-lg border border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-950/20 p-3">
                      <p className="text-xs font-bold text-red-700 dark:text-red-400">High Impact + Low Readiness</p>
                      <p className="text-2xl font-bold text-red-600 mt-1">{highImpactLowReady.length}</p>
                      <p className="text-[11px] text-red-600/70 mt-0.5">CRs with impact ≥60 but readiness &lt;50 — need immediate attention</p>
                      {highImpactLowReady.slice(0, 3).map(p => <p key={p.cr.number} className="text-[10px] text-red-500 mt-1 truncate">• {p.cr.number}: {p.cr.short_description}</p>)}
                    </div>
                    <div className="rounded-lg border border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/20 p-3">
                      <p className="text-xs font-bold text-green-700 dark:text-green-400">Low Impact + High Readiness</p>
                      <p className="text-2xl font-bold text-green-600 mt-1">{lowImpactHighReady.length}</p>
                      <p className="text-[11px] text-green-600/70 mt-0.5">CRs with impact &lt;40 and readiness ≥75 — well-prepared, low risk</p>
                      {lowImpactHighReady.slice(0, 3).map(p => <p key={p.cr.number} className="text-[10px] text-green-500 mt-1 truncate">• {p.cr.number}: {p.cr.short_description}</p>)}
                    </div>
                  </div>
                </Card>
              );
            })()}
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
              <Card className="p-4"><div className="flex items-center gap-2"><GitCommitHorizontal className="h-4 w-4 text-purple-500" /><span className="text-sm text-gray-500 dark:text-gray-400">Commits</span></div><p className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100">{gitData.summary.totalCommits}</p><p className="text-xs text-gray-400">last {gitData.days} days</p></Card>
              <Card className="p-4" title="Formula: (avg_commit_risk × 0.4) + (churn_ratio × 0.3) + (high_risk_ratio × 0.3)"><div className="flex items-center gap-2"><Brain className="h-4 w-4 text-purple-500" /><span className="text-sm text-gray-500 dark:text-gray-400">Code Change Risk</span></div><p className={`mt-1 text-2xl font-bold ${riskColor(gitData.summary.overallRiskFactor)}`}>{gitData.summary.overallRiskFactor}</p><p className="text-xs text-gray-400">{riskLbl(gitData.summary.overallRiskFactor)}</p></Card>
              <Card className="p-4"><div className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-orange-500" /><span className="text-sm text-gray-500 dark:text-gray-400">Avg Commit Risk</span></div><p className={`mt-1 text-2xl font-bold ${riskColor(gitData.summary.avgRisk)}`}>{gitData.summary.avgRisk}</p></Card>
              <Card className="p-4"><div className="flex items-center gap-2"><FileCode2 className="h-4 w-4 text-blue-500" /><span className="text-sm text-gray-500 dark:text-gray-400">Code Churn</span></div><p className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100">{(gitData.summary.totalAdditions+gitData.summary.totalDeletions).toLocaleString()}</p><p className="text-xs text-gray-400">+{gitData.summary.totalAdditions.toLocaleString()} / −{gitData.summary.totalDeletions.toLocaleString()}</p></Card>
              <Card className="p-4"><div className="flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-red-500" /><span className="text-sm text-gray-500 dark:text-gray-400">High Risk Commits</span></div><p className="mt-1 text-2xl font-bold text-red-600">{gitData.summary.criticalCount+gitData.summary.highCount}</p></Card>
            </div>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Card><CardHeader><CardTitle className="flex items-center gap-2"><BarChart3 className="h-4 w-4 text-purple-500" /> Commit Risk Distribution</CardTitle></CardHeader><div className="h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={[{ bucket: "Critical", count: gitData.summary.criticalCount, fill: "#ef4444" },{ bucket: "High", count: gitData.summary.highCount, fill: "#f97316" },{ bucket: "Medium", count: gitData.summary.mediumCount, fill: "#eab308" },{ bucket: "Low", count: gitData.summary.lowCount, fill: "#22c55e" }]}><CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" /><XAxis dataKey="bucket" tick={{ fontSize: 12 }} stroke="#94a3b8" /><YAxis tick={{ fontSize: 13 }} stroke="#94a3b8" /><Tooltip /><Bar dataKey="count" name="Commits" radius={[4, 4, 0, 0]}>{[{ fill: "#ef4444" },{ fill: "#f97316" },{ fill: "#eab308" },{ fill: "#22c55e" }].map((e, i) => <Cell key={i} fill={e.fill} />)}</Bar></BarChart></ResponsiveContainer></div></Card>
              <Card><CardHeader><CardTitle className="flex items-center gap-2"><User className="h-4 w-4 text-blue-500" /> Risk by Author</CardTitle></CardHeader><div className="overflow-x-auto max-h-64 overflow-y-auto"><table className="w-full text-sm"><thead className="sticky top-0 bg-white dark:bg-gray-900"><tr className="border-b border-gray-100 dark:border-gray-800"><th className="pb-2 text-left font-medium text-gray-500 dark:text-gray-400">Author</th><th className="pb-2 text-center font-medium text-gray-500 dark:text-gray-400">Commits</th><th className="pb-2 text-center font-medium text-gray-500 dark:text-gray-400">Avg Risk</th><th className="pb-2 text-right font-medium text-gray-500 dark:text-gray-400">Churn</th></tr></thead><tbody>{gitData.authorBreakdown.map((a) => (<tr key={a.author} className="border-b border-gray-50 dark:border-gray-800"><td className="py-2 font-medium text-gray-900 dark:text-gray-100 text-sm">{a.author}</td><td className="py-2 text-center text-sm">{a.commits}</td><td className="py-2 text-center"><span className={`inline-block rounded-full px-2 py-0.5 text-sm font-bold ${riskBgCls(a.avgRisk)}`}>{a.avgRisk}</span></td><td className="py-2 text-right text-sm text-gray-500">+{a.additions} / −{a.deletions}</td></tr>))}</tbody></table></div></Card>
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
                        <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                        <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" domain={[0, 100]} />
                        <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "13px" }} />
                        <Legend wrapperStyle={{ fontSize: "13px" }} />
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
                .slice(0, 10);
              if (hotspots.length === 0) return null;
              const maxChurn = Math.max(...hotspots.map(h => h.churn), 1);
              return (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><FileCode2 className="h-4 w-4 text-purple-500" /> File Hotspot Map — Top 10 Riskiest Files</CardTitle>
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
                            <span className="text-[10px] font-bold truncate w-full text-center leading-tight">{h.shortName}</span>
                            <span className="text-xs font-bold mt-0.5">{h.risk}</span>
                            <span className="text-[9px] opacity-75">±{h.churn}</span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex justify-center gap-4 mt-3 text-xs text-gray-400">
                      <span className="flex items-center gap-1"><span className="h-2 w-2 rounded bg-red-500" /> Critical (≥75)</span>
                      <span className="flex items-center gap-1"><span className="h-2 w-2 rounded bg-orange-400" /> High (50-74)</span>
                      <span className="flex items-center gap-1"><span className="h-2 w-2 rounded bg-amber-300" /> Medium (25-49)</span>
                      <span className="flex items-center gap-1"><span className="h-2 w-2 rounded bg-green-400" /> Low (&lt;25)</span>
                    </div>
                  </div>
                </Card>
              );
            })()}

            {/* ── File Type Risk Breakdown ── */}
            {(() => {
              const extMap: Record<string, { count: number; riskSum: number; churn: number }> = {};
              gitData.commits.forEach(c => {
                c.files.forEach(f => {
                  const ext = (f.filename.split(".").pop() || "other").toLowerCase();
                  if (!extMap[ext]) extMap[ext] = { count: 0, riskSum: 0, churn: 0 };
                  extMap[ext].count++;
                  extMap[ext].riskSum += f.fileRisk || 0;
                  extMap[ext].churn += f.additions + f.deletions;
                });
              });
              const extData = Object.entries(extMap)
                .map(([ext, d]) => ({ ext: `.${ext}`, files: d.count, avgRisk: Math.round(d.riskSum / d.count), churn: d.churn }))
                .sort((a, b) => b.avgRisk - a.avgRisk)
                .slice(0, 12);
              if (extData.length === 0) return null;
              return (
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2"><FileCode2 className="h-4 w-4 text-purple-500" /> File Type Risk Breakdown</CardTitle>
                      <CardDescription>Average risk score by file extension. Higher risk types need extra review.</CardDescription>
                    </CardHeader>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={extData} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                          <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12 }} stroke="#94a3b8" />
                          <YAxis type="category" dataKey="ext" tick={{ fontSize: 12 }} stroke="#94a3b8" width={60} />
                          <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "13px" }} />
                          <Bar dataKey="avgRisk" name="Avg Risk" radius={[0, 4, 4, 0]}>
                            {extData.map((e, i) => <Cell key={i} fill={e.avgRisk >= 60 ? "#ef4444" : e.avgRisk >= 40 ? "#f97316" : e.avgRisk >= 20 ? "#eab308" : "#22c55e"} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>
                  {/* ── Commit Message Pattern Analysis ── */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2"><Brain className="h-4 w-4 text-purple-500" /> Commit Message Pattern Analysis</CardTitle>
                      <CardDescription>AI-detected patterns in commit messages indicating change intent and risk signals.</CardDescription>
                    </CardHeader>
                    <div className="px-4 pb-4 space-y-3">
                      {(() => {
                        const patterns: { label: string; regex: RegExp; color: string; severity: string }[] = [
                          { label: "Feature / Enhancement", regex: /feat|feature|add|implement|enhance|new/i, color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300", severity: "info" },
                          { label: "Bug Fix", regex: /fix|bug|patch|resolve|issue|defect/i, color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300", severity: "info" },
                          { label: "Refactor / Cleanup", regex: /refactor|clean|restructure|reorganize|simplify/i, color: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-300", severity: "low" },
                          { label: "Hotfix / Emergency", regex: /hotfix|emergency|urgent|critical|asap/i, color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300", severity: "critical" },
                          { label: "Revert / Rollback", regex: /revert|rollback|undo|back.?out/i, color: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300", severity: "high" },
                          { label: "Config / Infra", regex: /config|infra|ci|cd|deploy|docker|pipeline|build/i, color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300", severity: "medium" },
                          { label: "Docs / Tests", regex: /doc|readme|test|spec|coverage/i, color: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300", severity: "info" },
                          { label: "WIP / Incomplete", regex: /wip|work.?in.?progress|todo|hack|fixme|temp/i, color: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300", severity: "high" },
                          { label: "Breaking Change", regex: /break|breaking|incompatible|migration|deprecat/i, color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300", severity: "critical" },
                          { label: "Security", regex: /secur|auth|cve|vulnerab|encrypt|permission|access/i, color: "bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-300", severity: "high" },
                          { label: "Performance", regex: /perf|optimi|speed|cache|latency|throughput/i, color: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300", severity: "medium" },
                          { label: "Merge Commit", regex: /^merge|merge.*branch|merge.*pull/i, color: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300", severity: "low" },
                        ];
                        const results = patterns.map(p => ({
                          ...p,
                          count: gitData.commits.filter(c => p.regex.test(c.message)).length,
                          avgRisk: (() => { const matching = gitData.commits.filter(c => p.regex.test(c.message)); return matching.length > 0 ? Math.round(matching.reduce((s, c) => s + c.riskScore, 0) / matching.length) : 0; })(),
                        })).filter(r => r.count > 0).sort((a, b) => b.count - a.count);
                        return results.length > 0 ? (
                          <div className="space-y-2">
                            {results.map(r => (
                              <div key={r.label} className="flex items-center gap-3">
                                <span className={`rounded-full px-2.5 py-0.5 text-sm font-medium whitespace-nowrap ${r.color}`}>{r.label}</span>
                                <div className="flex-1 h-2.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                                  <div className="h-full rounded-full bg-purple-500 transition-all" style={{ width: `${Math.min(100, (r.count / gitData.commits.length) * 100)}%` }} />
                                </div>
                                <span className="text-sm font-mono text-gray-500 w-8 text-right">{r.count}</span>
                                <span className={`text-sm font-bold w-6 text-right ${r.avgRisk >= 50 ? "text-red-600" : r.avgRisk >= 25 ? "text-amber-600" : "text-green-600"}`}>{r.avgRisk}</span>
                              </div>
                            ))}
                            <p className="text-xs text-gray-400 mt-2">Count = matching commits. Score = avg risk of those commits.</p>
                          </div>
                        ) : <p className="text-sm text-gray-400">No recognizable patterns detected in commit messages.</p>;
                      })()}
                    </div>
                  </Card>
                </div>
              );
            })()}

            {/* ── Cumulative Risk Trend + Directory Risk ── */}
            {(() => {
              // Cumulative risk trend
              const sorted = [...gitData.commits].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
              let cumRisk = 0;
              const cumData = sorted.map((c, i) => {
                cumRisk += c.riskScore;
                return { idx: i + 1, date: new Date(c.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }), cumRisk, avg: Math.round(cumRisk / (i + 1)), sha: c.shortSha };
              });
              // Directory risk
              const dirMap: Record<string, { risk: number; files: number; churn: number }> = {};
              gitData.commits.forEach(c => {
                c.files.forEach(f => {
                  const parts = f.filename.split("/");
                  const dir = parts.length > 1 ? parts.slice(0, Math.min(2, parts.length - 1)).join("/") : "/";
                  if (!dirMap[dir]) dirMap[dir] = { risk: 0, files: 0, churn: 0 };
                  dirMap[dir].risk = Math.max(dirMap[dir].risk, f.fileRisk || 0);
                  dirMap[dir].files++;
                  dirMap[dir].churn += f.additions + f.deletions;
                });
              });
              const dirData = Object.entries(dirMap)
                .map(([dir, d]) => ({ dir: dir.length > 20 ? "…" + dir.slice(-18) : dir, fullDir: dir, ...d }))
                .sort((a, b) => b.risk - a.risk)
                .slice(0, 10);
              return (
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  {cumData.length > 1 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2"><TrendingUp className="h-4 w-4 text-purple-500" /> Cumulative Risk Trend</CardTitle>
                        <CardDescription>Running average risk score across commits. Rising trend = increasing risk exposure.</CardDescription>
                      </CardHeader>
                      <div className="h-56">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={cumData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                            <defs>
                              <linearGradient id="cumRiskGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2} />
                                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey="idx" tick={{ fontSize: 12 }} stroke="#94a3b8" label={{ value: "Commit #", position: "insideBottom", offset: -2, fontSize: 12 }} />
                            <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" domain={[0, 100]} />
                            <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "13px" }} />
                            <Area type="monotone" dataKey="avg" name="Running Avg Risk" stroke="#8b5cf6" fill="url(#cumRiskGrad)" strokeWidth={2} dot={{ r: 2 }} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </Card>
                  )}
                  {dirData.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Layers className="h-4 w-4 text-purple-500" /> Directory Risk Heatmap</CardTitle>
                        <CardDescription>Risk concentration by directory path. Wider bars = more file changes.</CardDescription>
                      </CardHeader>
                      <div className="px-4 pb-4 space-y-1.5">
                        {dirData.map(d => {
                          const pct = Math.min(100, (d.files / Math.max(...dirData.map(x => x.files), 1)) * 100);
                          const bg = d.risk >= 60 ? "bg-red-500" : d.risk >= 40 ? "bg-orange-400" : d.risk >= 20 ? "bg-amber-400" : "bg-green-400";
                          return (
                            <div key={d.fullDir} className="flex items-center gap-2" title={`${d.fullDir} — Risk: ${d.risk}, Files: ${d.files}, Churn: ±${d.churn}`}>
                              <span className="text-xs font-mono text-gray-500 dark:text-gray-400 w-36 truncate text-right">{d.dir}</span>
                              <div className="flex-1 h-5 rounded bg-gray-100 dark:bg-gray-800 overflow-hidden relative">
                                <div className={`h-full rounded ${bg} transition-all`} style={{ width: `${pct}%` }} />
                                <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-gray-700 dark:text-gray-300">{d.risk} risk · {d.files} files</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </Card>
                  )}
                </div>
              );
            })()}

            {/* ── Author Activity Heatmap + Risk Factor Radar ── */}
            {(() => {
              // Author activity by day of week
              const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
              const authorDayMap: Record<string, number[]> = {};
              gitData.commits.forEach(c => {
                if (!authorDayMap[c.author]) authorDayMap[c.author] = new Array(7).fill(0);
                const day = new Date(c.date).getDay();
                authorDayMap[c.author][day]++;
              });
              const topAuthors = Object.entries(authorDayMap)
                .map(([author, days]) => ({ author, days, total: days.reduce((a, b) => a + b, 0) }))
                .sort((a, b) => b.total - a.total)
                .slice(0, 8);
              const maxCommitsInCell = Math.max(...topAuthors.flatMap(a => a.days), 1);

              // Risk factor radar for the repo
              const totalCommits = gitData.summary.totalCommits;
              const highRiskPct = totalCommits > 0 ? Math.round((gitData.summary.criticalCount + gitData.summary.highCount) / totalCommits * 100) : 0;
              const avgChurnPerCommit = totalCommits > 0 ? Math.round((gitData.summary.totalAdditions + gitData.summary.totalDeletions) / totalCommits) : 0;
              const uniqueAuthors = gitData.authorBreakdown.length;
              const avgFilesPerCommit = totalCommits > 0 ? Math.round(gitData.summary.totalFilesChanged / totalCommits) : 0;
              // Normalize to 0-100 scale for radar
              const radarData = [
                { factor: "Avg Risk", value: gitData.summary.avgRisk, fullMark: 100 },
                { factor: "High Risk %", value: highRiskPct, fullMark: 100 },
                { factor: "Churn Rate", value: Math.min(100, avgChurnPerCommit / 5), fullMark: 100 },
                { factor: "File Spread", value: Math.min(100, avgFilesPerCommit * 10), fullMark: 100 },
                { factor: "Team Size", value: Math.min(100, uniqueAuthors * 15), fullMark: 100 },
                { factor: "Volume", value: Math.min(100, totalCommits * 3), fullMark: 100 },
              ];

              return (
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  {topAuthors.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2"><User className="h-4 w-4 text-purple-500" /> Author Activity Heatmap</CardTitle>
                        <CardDescription>Commit frequency by author and day of week. Darker = more commits.</CardDescription>
                      </CardHeader>
                      <div className="px-4 pb-4 overflow-x-auto">
                        <table className="w-full text-[11px]">
                          <thead>
                            <tr>
                              <th className="text-left font-medium text-gray-400 pb-1 pr-2">Author</th>
                              {dayNames.map(d => <th key={d} className="text-center font-medium text-gray-400 pb-1 w-10">{d}</th>)}
                              <th className="text-center font-medium text-gray-400 pb-1 w-10">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {topAuthors.map(a => (
                              <tr key={a.author}>
                                <td className="py-0.5 pr-2 font-medium text-gray-700 dark:text-gray-300 truncate max-w-[120px]">{a.author}</td>
                                {a.days.map((count, i) => {
                                  const intensity = count / maxCommitsInCell;
                                  const bg = count === 0 ? "bg-gray-50 dark:bg-gray-800" : intensity > 0.7 ? "bg-purple-600 text-white" : intensity > 0.4 ? "bg-purple-400 text-white" : intensity > 0 ? "bg-purple-200 dark:bg-purple-900 text-purple-800 dark:text-purple-200" : "";
                                  return <td key={i} className={`text-center py-0.5 ${bg} rounded-sm`}>{count > 0 ? count : ""}</td>;
                                })}
                                <td className="text-center py-0.5 font-bold text-purple-600">{a.total}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </Card>
                  )}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2"><Shield className="h-4 w-4 text-purple-500" /> Repository Risk Profile Radar</CardTitle>
                      <CardDescription>Multi-dimensional risk assessment of the repository&apos;s recent activity.</CardDescription>
                    </CardHeader>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart data={radarData}>
                          <PolarGrid stroke="#e2e8f0" />
                          <PolarAngleAxis dataKey="factor" tick={{ fontSize: 10 }} />
                          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9 }} />
                          <Radar name="Risk Profile" dataKey="value" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.2} />
                          <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "11px" }} />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>
                </div>
              );
            })()}

            {/* ── Code Change Summary Intelligence ── */}
            {(() => {
              const tc = gitData.summary.totalCommits;
              const hrc = gitData.summary.criticalCount + gitData.summary.highCount;
              const avgChurn = tc > 0 ? Math.round((gitData.summary.totalAdditions + gitData.summary.totalDeletions) / tc) : 0;
              const hotAuthors = gitData.authorBreakdown.filter(a => a.avgRisk >= 50);
              const insights: { icon: string; text: string; severity: "critical" | "high" | "medium" | "info" }[] = [];
              if (hrc > tc * 0.3) insights.push({ icon: "🔴", text: `${Math.round(hrc / tc * 100)}% of commits are high/critical risk — code review process may need strengthening`, severity: "critical" });
              if (avgChurn > 200) insights.push({ icon: "📊", text: `High average churn (${avgChurn} lines/commit) — large changesets increase review difficulty and merge conflict risk`, severity: "high" });
              if (hotAuthors.length > 0) insights.push({ icon: "👤", text: `${hotAuthors.length} author(s) have avg risk ≥50: ${hotAuthors.map(a => a.author).join(", ")} — may need mentoring or paired review`, severity: "high" });
              if (gitData.commits.some(c => /wip|hack|fixme|todo/i.test(c.message))) insights.push({ icon: "⚠️", text: "WIP/hack/fixme commits detected — ensure these are resolved before production merge", severity: "medium" });
              if (gitData.commits.some(c => /revert/i.test(c.message))) insights.push({ icon: "↩️", text: "Revert commits detected — investigate root cause of reverted changes", severity: "medium" });
              const weekendCommits = gitData.commits.filter(c => { const d = new Date(c.date).getDay(); return d === 0 || d === 6; });
              if (weekendCommits.length > 0) insights.push({ icon: "📅", text: `${weekendCommits.length} weekend commit(s) detected — may indicate urgent fixes or on-call activity`, severity: "info" });
              if (gitData.summary.avgRisk < 25) insights.push({ icon: "✅", text: `Low average risk score (${gitData.summary.avgRisk}/100) — codebase changes are well-controlled`, severity: "info" });
              if (gitData.summary.avgRisk >= 50) insights.push({ icon: "🔥", text: `Elevated average risk (${gitData.summary.avgRisk}/100) — consider adding automated gates or pre-commit hooks`, severity: "high" });
              const addDeleteRatio = gitData.summary.totalDeletions > 0 ? (gitData.summary.totalAdditions / gitData.summary.totalDeletions).toFixed(1) : "∞";
              insights.push({ icon: "📈", text: `Add/Delete ratio: ${addDeleteRatio}:1 — ${Number(addDeleteRatio) > 3 ? "codebase growing rapidly" : Number(addDeleteRatio) < 0.5 ? "significant code removal (cleanup or refactor)" : "balanced growth and maintenance"}`, severity: "info" });

              if (insights.length === 0) return null;
              const sevColor = (s: string) => s === "critical" ? "border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/20" : s === "high" ? "border-orange-200 bg-orange-50/50 dark:border-orange-800 dark:bg-orange-950/20" : s === "medium" ? "border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20" : "border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/20";
              return (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-purple-500" /> AI Code Change Insights</CardTitle>
                    <CardDescription>Automated intelligence derived from commit patterns, risk signals, and code change behavior.</CardDescription>
                  </CardHeader>
                  <div className="px-4 pb-4 grid grid-cols-1 gap-2 md:grid-cols-2">
                    {insights.map((ins, i) => (
                      <div key={i} className={`rounded-lg border p-3 ${sevColor(ins.severity)}`}>
                        <div className="flex items-start gap-2">
                          <span className="text-base mt-0.5">{ins.icon}</span>
                          <p className="text-sm text-gray-700 dark:text-gray-300">{ins.text}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              );
            })()}

            {/* ── ML Feature Impact Analysis ── */}
            {gitData.featureImpact && gitData.featureImpact.length > 0 && (() => {
              const impLvlColor = (l: string) => l === "critical" ? "bg-red-500" : l === "high" ? "bg-orange-400" : l === "medium" ? "bg-amber-400" : "bg-green-400";
              const impLvlBadge = (l: string) => l === "critical" ? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300" : l === "high" ? "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300" : l === "medium" ? "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300" : "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300";
              const maxImpact = Math.max(...gitData.featureImpact.map(f => f.impactScore), 1);
              const radarFeatures = gitData.featureImpact.slice(0, 8).map(f => ({ feature: f.feature.length > 18 ? f.feature.slice(0, 16) + "…" : f.feature, impact: f.impactScore, fullMark: 100 }));
              return (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mt-2">
                    <Brain className="h-5 w-5 text-purple-600" />
                    <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">ML Feature Impact Analysis</h3>
                    <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-sm font-medium text-purple-700 dark:bg-purple-900 dark:text-purple-300">{gitData.featureImpact.length} features detected</span>
                  </div>
                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    {/* Feature Impact Bar Chart */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2"><BarChart3 className="h-4 w-4 text-purple-500" /> Feature Impact Scores</CardTitle>
                        <CardDescription>Degree of impact per application feature area. Higher = more affected by code changes.</CardDescription>
                      </CardHeader>
                      <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={gitData.featureImpact.slice(0, 10)} layout="vertical" margin={{ left: 10, right: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12 }} stroke="#94a3b8" />
                            <YAxis type="category" dataKey="feature" tick={{ fontSize: 12 }} stroke="#94a3b8" width={140} />
                            <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "13px" }} />
                            <Bar dataKey="impactScore" name="Impact" radius={[0, 4, 4, 0]}>
                              {gitData.featureImpact.slice(0, 10).map((f, i) => <Cell key={i} fill={f.impactLevel === "critical" ? "#ef4444" : f.impactLevel === "high" ? "#f97316" : f.impactLevel === "medium" ? "#eab308" : "#22c55e"} />)}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </Card>
                    {/* Feature Impact Radar */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Shield className="h-4 w-4 text-purple-500" /> Feature Impact Radar</CardTitle>
                        <CardDescription>Multi-dimensional view of which features are most impacted by recent code changes.</CardDescription>
                      </CardHeader>
                      <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                          <RadarChart data={radarFeatures}>
                            <PolarGrid stroke="#e2e8f0" />
                            <PolarAngleAxis dataKey="feature" tick={{ fontSize: 11 }} />
                            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 11 }} />
                            <Radar name="Impact" dataKey="impact" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.25} />
                            <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "13px" }} />
                          </RadarChart>
                        </ResponsiveContainer>
                      </div>
                    </Card>
                  </div>
                  {/* Feature Detail Cards */}
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {gitData.featureImpact.map((f) => (
                      <Card key={f.feature} className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-base font-bold text-gray-900 dark:text-gray-100 truncate">{f.feature}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{f.description}</p>
                          </div>
                          <span className={`ml-2 shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold uppercase ${impLvlBadge(f.impactLevel)}`}>{f.impactLevel}</span>
                        </div>
                        <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden mb-2">
                          <div className={`h-full rounded-full ${impLvlColor(f.impactLevel)} transition-all`} style={{ width: `${(f.impactScore / maxImpact) * 100}%` }} />
                        </div>
                        <div className="flex gap-4 text-xs text-gray-500 dark:text-gray-400">
                          <span><strong>{f.filesAffected}</strong> files</span>
                          <span><strong>±{f.churn.toLocaleString()}</strong> lines</span>
                          <span><strong>{f.commits}</strong> commits</span>
                          <span className="font-bold text-purple-600">{f.impactScore}/100</span>
                        </div>
                        {f.riskFactors.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {f.riskFactors.slice(0, 3).map((rf, i) => (
                              <span key={i} className="rounded bg-gray-100 px-1.5 py-0.5 text-[11px] text-gray-500 dark:bg-gray-800 dark:text-gray-400">{rf}</span>
                            ))}
                          </div>
                        )}
                      </Card>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* ── Production Outage & Availability Concerns ── */}
            {gitData.productionConcerns && gitData.productionConcerns.length > 0 && (() => {
              const typeIcon = (t: string) => t === "outage" ? "🔴" : t === "security" ? "🔒" : t === "data_integrity" ? "🗄️" : t === "availability" ? "🌐" : "⚡";
              const sevBorder = (s: string) => s === "critical" ? "border-red-300 bg-red-50/60 dark:border-red-800 dark:bg-red-950/30" : s === "high" ? "border-orange-300 bg-orange-50/60 dark:border-orange-800 dark:bg-orange-950/30" : s === "medium" ? "border-amber-300 bg-amber-50/60 dark:border-amber-800 dark:bg-amber-950/30" : "border-blue-300 bg-blue-50/60 dark:border-blue-800 dark:bg-blue-950/30";
              const sevBadge = (s: string) => s === "critical" ? "bg-red-600 text-white" : s === "high" ? "bg-orange-500 text-white" : s === "medium" ? "bg-amber-500 text-white" : "bg-blue-500 text-white";
              const critCount = gitData.productionConcerns.filter(c => c.severity === "critical").length;
              const highCount = gitData.productionConcerns.filter(c => c.severity === "high").length;
              return (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mt-2">
                    <ShieldAlert className="h-5 w-5 text-red-600" />
                    <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">Production Outage & Availability Concerns</h3>
                    {critCount > 0 && <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-sm font-bold text-red-700 dark:bg-red-900 dark:text-red-300">{critCount} critical</span>}
                    {highCount > 0 && <span className="rounded-full bg-orange-100 px-2.5 py-0.5 text-sm font-bold text-orange-700 dark:bg-orange-900 dark:text-orange-300">{highCount} high</span>}
                  </div>
                  {/* Concern summary KPIs */}
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
                    {(["outage", "security", "data_integrity", "availability", "performance"] as const).map(t => {
                      const count = gitData.productionConcerns.filter(c => c.type === t).length;
                      const label = t === "data_integrity" ? "Data Integrity" : t.charAt(0).toUpperCase() + t.slice(1);
                      const icon = typeIcon(t);
                      return (
                        <Card key={t} className="p-3 text-center">
                          <span className="text-lg">{icon}</span>
                          <p className="text-2xl font-bold mt-1 text-gray-900 dark:text-gray-100">{count}</p>
                          <p className="text-xs text-gray-400">{label}</p>
                        </Card>
                      );
                    })}
                  </div>
                  {/* Concern detail cards */}
                  <div className="space-y-3">
                    {gitData.productionConcerns.map((c, i) => (
                      <Card key={i} className={`border ${sevBorder(c.severity)}`}>
                        <div className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-sm">{typeIcon(c.type)}</span>
                              <p className="text-base font-bold text-gray-900 dark:text-gray-100">{c.title}</p>
                            </div>
                            <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold uppercase ${sevBadge(c.severity)}`}>{c.severity}</span>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{c.description}</p>
                          {c.evidence.length > 0 && (
                            <div className="mb-2 rounded bg-gray-100 dark:bg-gray-800 p-2">
                              <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Evidence:</p>
                              {c.evidence.map((e, j) => <p key={j} className="text-xs text-gray-500 dark:text-gray-400 font-mono truncate">{e}</p>)}
                            </div>
                          )}
                          <div className="flex items-start gap-1.5">
                            <Shield className="h-3 w-3 text-teal-600 mt-0.5 shrink-0" />
                            <p className="text-sm text-teal-700 dark:text-teal-400 font-medium">{c.mitigation}</p>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* ── Performance Impact Analysis ── */}
            {gitData.performanceInsights && gitData.performanceInsights.length > 0 && (() => {
              const perfLvlColor = (l: string) => l === "critical" ? "#ef4444" : l === "high" ? "#f97316" : l === "medium" ? "#eab308" : "#22c55e";
              const perfBg = (l: string) => l === "critical" ? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300" : l === "high" ? "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300" : l === "medium" ? "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300" : "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300";
              const critPerf = gitData.performanceInsights.filter(p => p.level === "critical" || p.level === "high").length;
              return (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mt-2">
                    <Zap className="h-5 w-5 text-amber-600" />
                    <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">Performance Impact Analysis</h3>
                    {critPerf > 0 && <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-sm font-bold text-amber-700 dark:bg-amber-900 dark:text-amber-300">{critPerf} concern{critPerf > 1 ? "s" : ""}</span>}
                  </div>
                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    {/* Performance concern bar chart */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2"><BarChart3 className="h-4 w-4 text-amber-500" /> Performance Concern Scores</CardTitle>
                        <CardDescription>Areas where code changes may introduce performance regressions or bottlenecks.</CardDescription>
                      </CardHeader>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={gitData.performanceInsights.slice(0, 8)} layout="vertical" margin={{ left: 10, right: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12 }} stroke="#94a3b8" />
                            <YAxis type="category" dataKey="category" tick={{ fontSize: 12 }} stroke="#94a3b8" width={130} />
                            <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "13px" }} />
                            <Bar dataKey="score" name="Concern Score" radius={[0, 4, 4, 0]}>
                              {gitData.performanceInsights.slice(0, 8).map((p, i) => <Cell key={i} fill={perfLvlColor(p.level)} />)}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </Card>
                    {/* Performance insight details */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-500" /> Performance Risk Details</CardTitle>
                        <CardDescription>Detailed breakdown of detected performance-sensitive changes and affected files.</CardDescription>
                      </CardHeader>
                      <div className="px-4 pb-4 space-y-3 max-h-64 overflow-y-auto">
                        {gitData.performanceInsights.map((p, i) => (
                          <div key={i} className="rounded-lg border border-gray-100 dark:border-gray-800 p-3">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{p.category}</span>
                              <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${perfBg(p.level)}`}>{p.score}/100</span>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">{p.description}</p>
                            {p.files.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {p.files.map((f, j) => (
                                  <span key={j} className="rounded bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 text-[11px] font-mono text-gray-500 dark:text-gray-400 truncate max-w-[200px]">{f.split("/").pop()}</span>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </Card>
                  </div>
                  {/* AI Performance Intelligence Summary */}
                  <Card className="border-amber-200 bg-amber-50/30 dark:border-amber-900 dark:bg-amber-950/20">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-amber-600" /> AI Performance Intelligence</CardTitle>
                      <CardDescription>Automated synthesis of performance risk signals from code change patterns.</CardDescription>
                    </CardHeader>
                    <div className="px-4 pb-4 grid grid-cols-1 gap-2 md:grid-cols-2">
                      {(() => {
                        const perfInsights: { icon: string; text: string; sev: string }[] = [];
                        const critPerfInsights = gitData.performanceInsights.filter(p => p.level === "critical");
                        const highPerfInsights = gitData.performanceInsights.filter(p => p.level === "high");
                        if (critPerfInsights.length > 0) perfInsights.push({ icon: "🔴", text: `${critPerfInsights.length} critical performance area(s) affected: ${critPerfInsights.map(p => p.category).join(", ")}. Load testing strongly recommended before deployment.`, sev: "critical" });
                        if (highPerfInsights.length > 0) perfInsights.push({ icon: "🟠", text: `${highPerfInsights.length} high-concern area(s): ${highPerfInsights.map(p => p.category).join(", ")}. Monitor response times post-deployment.`, sev: "high" });
                        const dbPerf = gitData.performanceInsights.filter(p => p.category.toLowerCase().includes("query") || p.category.toLowerCase().includes("index") || p.category.toLowerCase().includes("pool"));
                        if (dbPerf.length > 0) perfInsights.push({ icon: "🗄️", text: `Database performance impact: ${dbPerf.map(p => p.category).join(", ")}. Run EXPLAIN on changed queries and verify index coverage.`, sev: "high" });
                        const cachePerf = gitData.performanceInsights.find(p => p.category.toLowerCase().includes("cach"));
                        if (cachePerf) perfInsights.push({ icon: "⚡", text: `Caching layer modified (score: ${cachePerf.score}/100). Verify cache invalidation strategy and TTL settings to avoid stale data or cache stampedes.`, sev: "medium" });
                        const asyncPerf = gitData.performanceInsights.find(p => p.category.toLowerCase().includes("async"));
                        if (asyncPerf) perfInsights.push({ icon: "🔄", text: `Async processing patterns changed. Verify Promise chains, error handling, and concurrent request limits to prevent thread starvation.`, sev: "medium" });
                        const bundlePerf = gitData.performanceInsights.find(p => p.category.toLowerCase().includes("bundle"));
                        if (bundlePerf) perfInsights.push({ icon: "📦", text: `Bundle size may be affected. Run bundle analysis to check if initial load time has increased beyond acceptable thresholds.`, sev: "medium" });
                        const totalPerfScore = gitData.performanceInsights.length > 0 ? Math.round(gitData.performanceInsights.reduce((a, p) => a + p.score, 0) / gitData.performanceInsights.length) : 0;
                        if (totalPerfScore < 30) perfInsights.push({ icon: "✅", text: `Overall performance impact is low (avg: ${totalPerfScore}/100). Code changes are unlikely to cause noticeable degradation.`, sev: "info" });
                        else if (totalPerfScore >= 60) perfInsights.push({ icon: "🔥", text: `High average performance concern (${totalPerfScore}/100). Recommend staging load test before production deployment.`, sev: "critical" });
                        if (perfInsights.length === 0) perfInsights.push({ icon: "✅", text: "No significant performance concerns detected in this changeset.", sev: "info" });
                        const pSevColor = (s: string) => s === "critical" ? "border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/20" : s === "high" ? "border-orange-200 bg-orange-50/50 dark:border-orange-800 dark:bg-orange-950/20" : s === "medium" ? "border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20" : "border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/20";
                        return perfInsights.map((ins, i) => (
                          <div key={i} className={`rounded-lg border p-3 ${pSevColor(ins.sev)}`}>
                            <div className="flex items-start gap-2">
                              <span className="text-base mt-0.5">{ins.icon}</span>
                              <p className="text-sm text-gray-700 dark:text-gray-300">{ins.text}</p>
                            </div>
                          </div>
                        ));
                      })()}
                    </div>
                  </Card>
                </div>
              );
            })()}

            <div className="flex items-center gap-3 text-sm text-gray-400"><a href={gitData.repoUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-purple-600 hover:underline"><ExternalLink className="h-3 w-3" /> {gitData.owner}/{gitData.repo}</a><span>·</span><span>Since {new Date(gitData.sinceDate).toLocaleDateString()}</span><span>·</span><span>{gitData.summary.totalFilesChanged} files touched</span></div>
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
              {!selectedPlanCR && (<>
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
              </>)}
              {selectedPlanCR && (
                <button onClick={() => { setSelectedPlanCR(null); setExpandedPlanContent(null); setMlAnalysis(null); setMlError(null); }} className="rounded-lg bg-teal-600 px-4 py-2 text-xs font-medium text-white hover:bg-teal-700 dark:bg-teal-700 dark:hover:bg-teal-600">← Back to List</button>
              )}
            </div>

            {/* ── Plan Scoring Methodology (collapsible) — only on individual CR view ── */}
            {selectedPlanCR && (() => {
              const planScoreBadge = selectedPlan ? selectedPlan.overallScore : (planResults.length > 0 ? Math.round(planResults.reduce((s, c) => s + c.overallScore, 0) / planResults.length) : 0);
              const planScoreLabel = selectedPlan ? selectedPlan.cr.number : "Avg";
              return (
            <Card className="border-teal-200 bg-teal-50/30 dark:border-teal-900 dark:bg-teal-950/20">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2"><Info className="h-5 w-5 text-teal-600" />Plan Scoring Methodology</CardTitle>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-3 py-1 text-sm font-bold transition-all duration-300 ${pBg(planScoreBadge)}`}>{planScoreLabel}: {planScoreBadge}/100</span>
                    <button onClick={() => setPlanScoringOpen(!planScoringOpen)} className="flex items-center gap-1 rounded px-2 py-1 text-xs text-teal-600 hover:bg-teal-100 dark:hover:bg-teal-900">{planScoringOpen ? "▲ Collapse" : "▼ Expand"}</button>
                  </div>
                </div>
                <CardDescription className="text-sm">Overall = Σ (dimension_quality × weight). Each plan is scored 0–100 based on content analysis.</CardDescription>
              </CardHeader>
              {planScoringOpen && (<>
                <div className="rounded-lg bg-white dark:bg-gray-900 border border-teal-100 dark:border-teal-900 p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold font-mono text-teal-700 dark:text-teal-400">Readiness = {PLAN_DIMS.map(d => `${d.label.split(" ")[0]}×${(planWeights[d.key]*100).toFixed(0)}%`).join(" + ")}</p>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-mono ${Math.abs(planWeightTotal - 1) > 0.01 ? "text-red-600 font-bold" : "text-gray-400"}`}>Total: {(planWeightTotal*100).toFixed(0)}%</span>
                      <button onClick={resetPlanWeights} className="flex items-center gap-1 rounded px-2 py-1 text-xs text-teal-600 hover:bg-teal-100 dark:hover:bg-teal-900"><RotateCcw className="h-3 w-3" /> Reset</button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {[
                      { key: "implementation" as const, label: "Implementation Plan", desc: "step, deploy, install, configure, verify, validate, monitor, rollout, pre-check, post-check, approval, schedule" },
                      { key: "backout" as const, label: "Backout Plan", desc: "revert, rollback, restore, undo, previous, snapshot, backup, recovery, failover, downtime" },
                      { key: "testPlan" as const, label: "Test Plan", desc: "test, verify, validate, smoke, regression, acceptance, integration, unit, performance, security, coverage" },
                      { key: "riskAnalysis" as const, label: "Risk/Impact Analysis", desc: "risk, impact, mitigation, contingency, fallback, probability, severity, exposure, vulnerability, dependency" },
                      { key: "changePlan" as const, label: "Change Plan", desc: "Same keywords as Implementation. Overall change execution strategy." },
                      { key: "justification" as const, label: "Justification", desc: "business, requirement, need, value, benefit, compliance, security, improvement" },
                    ].map(dim => (
                      <div key={dim.key} className="rounded-lg border border-teal-100 dark:border-teal-800 p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-bold text-teal-700 dark:text-teal-300">{dim.label}</p>
                          <span className="text-sm font-mono font-bold text-teal-600 dark:text-teal-400">{(planWeights[dim.key]*100).toFixed(0)}%</span>
                        </div>
                        <input type="range" min="0" max="50" value={Math.round(planWeights[dim.key]*100)} onChange={(e) => setPlanWeight(dim.key, Number(e.target.value)/100)} className="w-full h-1.5 accent-teal-600" />
                        <p className="text-[11px] text-gray-500 dark:text-gray-400">Keywords: {dim.desc}</p>
                      </div>
                    ))}
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
              );
            })()}

            {/* ── Dimension Scoring Formula (collapsible) — only on individual CR view ── */}
            {selectedPlanCR && (() => {
              const dimImpactCr = selectedPlan ? scored.find(s => s.cr.number === selectedPlan.cr.number) : null;
              const dimImpactScore = dimImpactCr ? dimImpactCr.overall : (scored.length > 0 ? Math.round(scored.reduce((s, c) => s + c.overall, 0) / scored.length) : 0);
              const dimImpactLabel = dimImpactCr ? dimImpactCr.cr.number : "Avg";
              const wTotal = weights.risk+weights.impact+weights.urgency+weights.priority+weights.type+weights.scope;
              return (
            <Card className="border-blue-200 bg-blue-50/30 dark:border-blue-900 dark:bg-blue-950/20">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2"><Settings2 className="h-5 w-5 text-blue-600" />Dimension Scoring Formula</CardTitle>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-3 py-1 text-sm font-bold transition-all duration-300 ${riskBgCls(dimImpactScore)}`}>{dimImpactLabel}: {dimImpactScore}/100</span>
                    <button onClick={() => setWeightsOpen(!weightsOpen)} className="flex items-center gap-1 rounded px-2 py-1 text-xs text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900">{weightsOpen ? "▲ Collapse" : "▼ Expand"}</button>
                  </div>
                </div>
                <CardDescription className="text-sm">Overall = Σ (dimension_score × weight). Each dimension is scored 0–100 based on ServiceNow field values.</CardDescription>
              </CardHeader>
              {weightsOpen && (<>
                <div className="rounded-lg bg-white dark:bg-gray-900 border border-blue-100 dark:border-blue-900 p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold font-mono text-blue-700 dark:text-blue-400">Dimension Score = {DIMS.map(d => `${d.label}×${(weights[d.key]*100).toFixed(0)}%`).join(" + ")}</p>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-mono ${Math.abs(wTotal - 1) > 0.01 ? "text-red-600 font-bold" : "text-gray-400"}`}>Total: {(wTotal*100).toFixed(0)}%</span>
                      <button onClick={resetWeights} className="flex items-center gap-1 rounded px-2 py-1 text-xs text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900"><RotateCcw className="h-3 w-3" /> Reset</button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {DIMS.map((d) => (
                      <div key={d.key} className="rounded-lg border border-blue-100 dark:border-blue-800 p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-bold text-blue-700 dark:text-blue-300 flex items-center gap-1.5"><d.icon className="h-4 w-4" />{d.label}</p>
                          <span className="text-sm font-mono font-bold text-blue-600 dark:text-blue-400">{(weights[d.key]*100).toFixed(0)}%</span>
                        </div>
                        <input type="range" min="0" max="100" value={Math.round(weights[d.key]*100)} onChange={(e) => setWeight(d.key, Number(e.target.value)/100)} className="w-full h-1.5 accent-blue-600" />
                        <p className="text-[11px] text-gray-500 dark:text-gray-400">SN Field: <span className="font-mono">{d.snField}</span> — {d.formula}</p>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">Dimension Score Mapping:</p>
                    <div className="grid grid-cols-2 gap-2 md:grid-cols-3 text-xs text-gray-600 dark:text-gray-400">
                      <div className="rounded bg-blue-50 dark:bg-blue-950/30 p-2"><strong>Risk:</strong> Very High→95, High→75, Moderate→50, Low→25, None→5</div>
                      <div className="rounded bg-blue-50 dark:bg-blue-950/30 p-2"><strong>Impact/Urgency:</strong> 1-High→85, 2-Medium→55, 3-Low→25</div>
                      <div className="rounded bg-blue-50 dark:bg-blue-950/30 p-2"><strong>Priority:</strong> 1-Critical→95, 2-High→75, 3-Moderate→50, 4-Low→25</div>
                      <div className="rounded bg-blue-50 dark:bg-blue-950/30 p-2"><strong>Type:</strong> Emergency→90, Normal→50, Standard→25</div>
                      <div className="rounded bg-blue-50 dark:bg-blue-950/30 p-2"><strong>Scope:</strong> Large→80, Medium→50, Small→25</div>
                    </div>
                  </div>
                  <div className="mt-2 grid grid-cols-4 gap-2 text-center text-xs">
                    <div className="rounded bg-red-100 dark:bg-red-900 p-2"><span className="font-bold text-red-700 dark:text-red-300">75-100</span><p className="text-red-600 dark:text-red-400">Critical</p></div>
                    <div className="rounded bg-orange-100 dark:bg-orange-900 p-2"><span className="font-bold text-orange-700 dark:text-orange-300">50-74</span><p className="text-orange-600 dark:text-orange-400">High</p></div>
                    <div className="rounded bg-amber-100 dark:bg-amber-900 p-2"><span className="font-bold text-amber-700 dark:text-amber-300">25-49</span><p className="text-amber-600 dark:text-amber-400">Medium</p></div>
                    <div className="rounded bg-green-100 dark:bg-green-900 p-2"><span className="font-bold text-green-700 dark:text-green-300">0-24</span><p className="text-green-600 dark:text-green-400">Low</p></div>
                  </div>
                </div>
              </>)}
            </Card>
              );
            })()}

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
                      <p className={`text-xs font-semibold ${pColor(selectedPlan.overallScore)}`}>{planRiskLabel(selectedPlan.overallScore)}</p>
                    </div>
                  </CardHeader>
                  {(() => {
                    const cachedMl = mlAnalysis && mlAnalysis.number === selectedPlan.cr.number ? mlAnalysis : null;
                    const mlScore = cachedMl ? cachedMl.planAnalysis.overallQuality : null;
                    const mlColor = (s: number) => s >= 65 ? "text-green-600" : s >= 40 ? "text-amber-600" : "text-red-600";
                    const impactScored = scored.find(s => s.cr.number === selectedPlan.cr.number);
                    const impactScore = impactScored ? impactScored.overall : 0;
                    return (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 text-center">
                          <div className="rounded-lg bg-white dark:bg-gray-900 p-3 border border-teal-100 dark:border-teal-900">
                            <p className="text-xs text-gray-500">Readiness</p>
                            <p className={`text-xl font-bold ${pColor(selectedPlan.overallScore)}`}>{selectedPlan.overallScore}/100</p>
                          </div>
                          <div className="rounded-lg bg-white dark:bg-gray-900 p-3 border border-teal-100 dark:border-teal-900">
                            <p className="text-xs text-gray-500">Dimension</p>
                            <p className={`text-xl font-bold ${riskColor(impactScore)}`}>{impactScore}/100</p>
                          </div>
                          <div className="rounded-lg bg-white dark:bg-gray-900 p-3 border border-teal-100 dark:border-teal-900">
                            <p className="text-xs text-gray-500">ML Quality</p>
                            {mlScore !== null ? (
                              <p className={`text-xl font-bold ${mlColor(mlScore)}`}>{mlScore}/100</p>
                            ) : (
                              <button onClick={() => { setSelectedMlCR(selectedPlan.cr.number); setMlAnalysis(null); setMlError(null); setMlLoading(true); fetch(`/api/data/plan-analysis?number=${encodeURIComponent(selectedPlan.cr.number)}`).then(r => r.ok ? r.json() : r.json().then(b => { throw new Error(b.error); })).then(data => { setMlAnalysis(data); setMlLoading(false); }).catch(err => { setMlError(err.message); setMlLoading(false); }); }} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium mt-1">{mlLoading ? "Analyzing…" : "Run Analysis"}</button>
                            )}
                          </div>
                          <div className="rounded-lg bg-white dark:bg-gray-900 p-3 border border-teal-100 dark:border-teal-900" title="Formula: (avg_commit_risk × 0.4) + (churn_ratio × 0.3) + (high_risk_ratio × 0.3)">
                            <p className="text-xs text-gray-500">Code Change Risk</p>
                            <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{gitData?.summary?.overallRiskFactor ?? "—"}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </Card>

                {/* ── Two-column layout: Left = Radar + Plan Content, Right = Dimensions & Impact ── */}
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
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                      {/* Left column: Plan Quality Radar + Plan Content & Risk Assessment */}
                      <div className="space-y-6">
                        <Card>
                          <CardHeader><CardTitle className="text-sm">Plan Quality Radar</CardTitle></CardHeader>
                          <div className="h-96">
                            <ResponsiveContainer width="100%" height="100%">
                              <RadarChart data={planRadarData}>
                                <PolarGrid stroke="#e2e8f0" />
                                <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 14, fontWeight: 700 }} />
                                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 12 }} />
                                <Radar name="Quality" dataKey="score" stroke="#0d9488" fill="#0d9488" fillOpacity={0.2} strokeWidth={2} />
                              </RadarChart>
                            </ResponsiveContainer>
                          </div>
                        </Card>

                        {/* Plan Content & Risk Assessment */}
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
                        {/* ── Change Details (ServiceNow fields) ── */}
                        <Card>
                          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><FileText className="h-4 w-4 text-teal-500" />Change Details — {selectedPlan.cr.number}</CardTitle></CardHeader>
                          <div className="space-y-1 text-sm px-1">
                            {[
                              { label: "Short Description", value: selectedPlan.cr.short_description },
                              { label: "State", value: selectedPlan.cr.state },
                              { label: "Type", value: selectedPlan.cr.type },
                              { label: "Category", value: selectedPlan.cr.category },
                              { label: "Priority", value: selectedPlan.cr.priority },
                              { label: "Risk", value: selectedPlan.cr.risk },
                              { label: "Impact", value: selectedPlan.cr.sn_impact },
                              { label: "Urgency", value: selectedPlan.cr.urgency },
                              { label: "Scope", value: selectedPlan.cr.scope },
                              { label: "Approval", value: selectedPlan.cr.approval },
                              { label: "Opened By", value: selectedPlan.cr.opened_by },
                              { label: "Opened At", value: selectedPlan.cr.opened_at },
                              { label: "Assigned To", value: selectedPlan.cr.assigned_to },
                              { label: "Assignment Group", value: selectedPlan.cr.assignment_group },
                              { label: "Config Item", value: selectedPlan.cr.cmdb_ci },
                              { label: "Business Service", value: selectedPlan.cr.business_service },
                              { label: "Close Code", value: selectedPlan.cr.close_code },
                              { label: "Close Notes", value: selectedPlan.cr.close_notes },
                              { label: "Closed At", value: selectedPlan.cr.closed_at },
                              { label: "Start Date", value: selectedPlan.cr.start_date },
                              { label: "End Date", value: selectedPlan.cr.end_date },
                              { label: "Description", value: selectedPlan.cr.description },
                            ].map((row) => row.value ? (
                              <div key={row.label} className="flex gap-3 py-1.5 border-b border-gray-100 dark:border-gray-800 last:border-0">
                                <span className="text-xs text-gray-400 dark:text-gray-500 w-28 shrink-0 pt-0.5">{row.label}</span>
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 break-words whitespace-pre-wrap">{row.value.length > 300 ? row.value.slice(0, 300) + "…" : row.value}</span>
                              </div>
                            ) : null)}
                          </div>
                        </Card>
                      </div>

                      {/* Right column: Dimensions & Impact Radar */}
                      <Card>
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-sm flex items-center gap-2"><Gauge className="h-4 w-4 text-blue-500" />Dimensions &amp; Impact — {planNum}</CardTitle>
                            {planHasOverrides && (<button onClick={() => { setOverrides((p) => { const nn = { ...p }; delete nn[planNum]; return nn; }); }} className="flex items-center gap-1 rounded px-2 py-1 text-[10px] text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900"><RotateCcw className="h-3 w-3" /> Reset</button>)}
                          </div>
                        </CardHeader>
                        <div className="h-80">
                          <ResponsiveContainer width="100%" height="100%">
                            <RadarChart data={planRadarDims}><PolarGrid stroke="#e2e8f0" /><PolarAngleAxis dataKey="dimension" tick={{ fontSize: 14, fontWeight: 700 }} /><PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 12 }} /><Radar name="Score" dataKey="score" stroke="#2563eb" fill="#2563eb" fillOpacity={0.2} strokeWidth={2} /></RadarChart>
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
                    </div>
                  );
                })()}

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
                      <th className="pb-3 text-center font-medium text-gray-500 dark:text-gray-400">State</th>
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
                        <td className="py-2.5 text-center"><span className="text-[10px] font-medium text-gray-500 dark:text-gray-400">{p.cr.state}</span></td>
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
              {!selectedMlCR && (<>
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
              </>)}
              {selectedMlCR && (
                <button onClick={() => { setSelectedMlCR(null); setMlAnalysis(null); setMlError(null); }} className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-700 dark:bg-indigo-700 dark:hover:bg-indigo-600">← Back to List</button>
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

              const mlWTotal = mlWeights.structure + mlWeights.completeness + mlWeights.clarity + mlWeights.riskAwareness;
              const mlCustomOverall = Math.round(
                (pa.structureScore * mlWeights.structure + pa.completenessScore * mlWeights.completeness + pa.clarityScore * mlWeights.clarity + pa.riskAwarenessScore * mlWeights.riskAwareness)
                / (mlWTotal || 1)
              );
              const qualityScoreData = [
                { name: "Structure", score: pa.structureScore, weight: mlWeights.structure, fill: "#6366f1" },
                { name: "Completeness", score: pa.completenessScore, weight: mlWeights.completeness, fill: "#0d9488" },
                { name: "Clarity", score: pa.clarityScore, weight: mlWeights.clarity, fill: "#2563eb" },
                { name: "Risk Awareness", score: pa.riskAwarenessScore, weight: mlWeights.riskAwareness, fill: "#dc2626" },
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
                      <p className="text-base leading-relaxed">{asmt.summary}</p>
                      {asmt.riskFactors.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {asmt.riskFactors.map((f: string, i: number) => <span key={i} className="rounded-full bg-white/50 dark:bg-black/20 px-2.5 py-1 text-xs font-semibold">{f}</span>)}
                        </div>
                      )}
                    </div>

                    {/* Profile Cards */}
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                      {/* Change Nature */}
                      <div className="rounded-lg border border-indigo-100 dark:border-indigo-800 bg-white dark:bg-gray-900 p-4 space-y-2">
                        <p className="text-base font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5"><Zap className="h-5 w-5" />Change Nature</p>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div><span className="text-gray-400">Type:</span> <span className="font-semibold text-gray-700 dark:text-gray-300">{cp.changeType}</span></div>
                          <div><span className="text-gray-400">Risk Tier:</span> <span className={`font-semibold ${cp.riskTier==="critical"?"text-red-600":cp.riskTier==="high"?"text-orange-600":cp.riskTier==="medium"?"text-amber-600":"text-green-600"}`}>{cp.riskTier}</span></div>
                          <div><span className="text-gray-400">Complexity:</span> <span className="font-semibold text-gray-700 dark:text-gray-300">{cp.complexity}</span></div>
                          <div><span className="text-gray-400">Category:</span> <span className="font-semibold text-gray-700 dark:text-gray-300">{cp.natureCategory}</span></div>
                        </div>
                        <div className="flex flex-wrap gap-1.5">{cp.natureTags.map((t: string, i: number) => <span key={i} className="rounded-full bg-indigo-100 dark:bg-indigo-900 px-2.5 py-1 text-xs font-semibold text-indigo-700 dark:text-indigo-300">{t}</span>)}</div>
                      </div>

                      {/* Application Profile */}
                      <div className="rounded-lg border border-indigo-100 dark:border-indigo-800 bg-white dark:bg-gray-900 p-4 space-y-2">
                        <p className="text-base font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5"><Layers className="h-5 w-5" />Application Profile</p>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="col-span-2"><span className="text-gray-400">Application:</span> <span className="font-semibold text-gray-700 dark:text-gray-300">{ap.applicationName}</span></div>
                          <div><span className="text-gray-400">Service:</span> <span className="font-semibold text-gray-700 dark:text-gray-300">{ap.serviceCategory}</span></div>
                          <div><span className="text-gray-400">Criticality:</span> <span className={`font-semibold ${ap.criticality==="mission-critical"?"text-red-600":ap.criticality==="business-critical"?"text-orange-600":"text-gray-600"}`}>{ap.criticality}</span></div>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {ap.environmentTags.map((t: string, i: number) => <span key={i} className="rounded-full bg-blue-100 dark:bg-blue-900 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:text-blue-300">{t}</span>)}
                          {ap.technologyStack.map((t: string, i: number) => <span key={i} className="rounded-full bg-gray-100 dark:bg-gray-800 px-2.5 py-1 text-xs font-semibold text-gray-600 dark:text-gray-400">{t}</span>)}
                        </div>
                      </div>
                    </div>

                    {/* Score Methodology — Editable Weights */}
                    <div className="rounded-lg border border-indigo-100 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/20 p-5 space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-base font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5"><Info className="h-5 w-5" />ML Overall Score Calculation</p>
                        <div className="flex items-center gap-2">
                          <span className={`rounded-full px-4 py-1.5 text-base font-bold transition-all duration-500 ${mlRecalcFlash ? "ring-2 ring-indigo-400 scale-110" : ""} ${mlCustomOverall>=65?"bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300":mlCustomOverall>=40?"bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300":"bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"}`}>Score: {mlCustomOverall}/100</span>
                          <button onClick={() => { setMlRecalcFlash(true); setTimeout(() => setMlRecalcFlash(false), 800); }} className="flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 dark:bg-indigo-700 dark:hover:bg-indigo-600"><RefreshCw className={`h-3.5 w-3.5 ${mlRecalcFlash ? "animate-spin" : ""}`} /> Re-calculate</button>
                          <button onClick={() => setMlWeights({ structure: 0.25, completeness: 0.30, clarity: 0.25, riskAwareness: 0.20 })} className="flex items-center gap-1 rounded px-2 py-1 text-xs text-indigo-600 hover:bg-indigo-100 dark:hover:bg-indigo-900"><RotateCcw className="h-3 w-3" /> Reset</button>
                        </div>
                      </div>
                      <p className="text-sm font-mono font-bold text-indigo-600 dark:text-indigo-400">Overall = {qualityScoreData.map(d => `${d.name.split(" ")[0]}×${(d.weight / (mlWTotal||1) * 100).toFixed(0)}%`).join(" + ")} = {mlCustomOverall}</p>
                      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                        {([
                          { key: "structure" as const, label: "Structure", score: pa.structureScore, desc: "Numbered steps, bullets, line count, pre/post checks", color: "#6366f1" },
                          { key: "completeness" as const, label: "Completeness", score: pa.completenessScore, desc: "Element checklist coverage (8 elements), word count depth", color: "#0d9488" },
                          { key: "clarity" as const, label: "Clarity", score: pa.clarityScore, desc: "Words-per-line ratio, sequence words, conditionals", color: "#2563eb" },
                          { key: "riskAwareness" as const, label: "Risk Awareness", score: pa.riskAwarenessScore, desc: "Rollback refs, risk keywords, monitoring, backups", color: "#dc2626" },
                        ]).map((dim) => (
                          <div key={dim.key} className="rounded-lg bg-white dark:bg-gray-900 p-3 border border-indigo-100 dark:border-indigo-900 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-bold" style={{ color: dim.color }}>{dim.label}</span>
                              <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{dim.score}/100</span>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 leading-snug">{dim.desc}</p>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-400 w-12">Weight</span>
                              <input type="range" min="0" max="100" value={Math.round(mlWeights[dim.key] * 100)} onChange={(e) => setMlWeights(prev => redistributeWeights(prev, dim.key, Number(e.target.value) / 100))} className="flex-1 h-1.5 accent-indigo-600" />
                              <span className="text-sm font-mono font-bold text-indigo-700 dark:text-indigo-400 w-10 text-right">{(mlWeights[dim.key] / (mlWTotal||1) * 100).toFixed(0)}%</span>
                            </div>
                            <p className="text-xs font-mono text-gray-400">→ {dim.score} × {(mlWeights[dim.key] / (mlWTotal||1) * 100).toFixed(0)}% = {Math.round(dim.score * mlWeights[dim.key] / (mlWTotal||1))} pts</p>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-gray-400">Adjust the sliders above to explore how different weight distributions affect the overall ML quality score. The score recalculates live.</p>
                    </div>

                    {/* Quality Scores + Radar — side by side */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {/* Bar Chart */}
                      <div className="rounded-lg border border-indigo-100 dark:border-indigo-800 bg-white dark:bg-gray-900 p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-bold text-indigo-700 dark:text-indigo-300">Plan Quality Breakdown</p>
                          <span className={`rounded-full px-3 py-1 text-sm font-bold ${mlCustomOverall>=65?"bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300":mlCustomOverall>=40?"bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300":"bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"}`}>Overall: {mlCustomOverall}/100</span>
                        </div>
                        <div className="h-52">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={qualityScoreData} layout="vertical" barCategoryGap="20%">
                              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 13, fontWeight: 600 }} stroke="#94a3b8" />
                              <YAxis type="category" dataKey="name" tick={{ fontSize: 14, fontWeight: 700 }} stroke="#94a3b8" width={120} />
                              <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "13px" }} />
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
                      </div>

                      {/* Radar Chart */}
                      <div className="rounded-lg border border-indigo-100 dark:border-indigo-800 bg-white dark:bg-gray-900 p-4 space-y-3">
                        <p className="text-sm font-bold text-indigo-700 dark:text-indigo-300">Quality Dimensions Radar</p>
                        <div className="h-52">
                          <ResponsiveContainer width="100%" height="100%">
                            <RadarChart data={qualityScoreData.map(d => ({ ...d, fullMark: 100 }))}>
                              <PolarGrid stroke="#e2e8f0" />
                              <PolarAngleAxis dataKey="name" tick={{ fontSize: 14, fontWeight: 700 }} />
                              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 12 }} />
                              <Radar name="Score" dataKey="score" stroke="#6366f1" fill="#6366f1" fillOpacity={0.2} strokeWidth={2} />
                              <Tooltip contentStyle={{ fontSize: "13px" }} />
                            </RadarChart>
                          </ResponsiveContainer>
                        </div>
                        {/* Element checklist */}
                        <div className="grid grid-cols-2 gap-1 text-[12px]">
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
                    </div>

                    {/* ML Quality vs Plan Readiness Comparison */}
                    {(() => {
                      const planReady = selectedMlPlan.overallScore;
                      const mlQual = mlCustomOverall;
                      const gap = mlQual - planReady;
                      return (
                        <div className="rounded-lg border border-indigo-100 dark:border-indigo-800 bg-white dark:bg-gray-900 p-4 space-y-3">
                          <p className="text-sm font-bold text-indigo-700 dark:text-indigo-300">ML Quality vs Plan Readiness</p>
                          <div className="grid grid-cols-3 gap-3 text-center">
                            <div className="rounded-lg bg-indigo-50 dark:bg-indigo-950/30 p-3">
                              <p className="text-[11px] text-gray-500">ML Quality</p>
                              <p className={`text-2xl font-bold ${mlQual>=65?"text-green-600":mlQual>=40?"text-amber-600":"text-red-600"}`}>{mlQual}</p>
                              <p className="text-[10px] text-gray-400">Content analysis</p>
                            </div>
                            <div className="rounded-lg bg-teal-50 dark:bg-teal-950/30 p-3">
                              <p className="text-[11px] text-gray-500">Plan Readiness</p>
                              <p className={`text-2xl font-bold ${pColor(planReady)}`}>{planReady}</p>
                              <p className="text-[10px] text-gray-400">Weighted dimensions</p>
                            </div>
                            <div className="rounded-lg bg-gray-50 dark:bg-gray-800 p-3">
                              <p className="text-[11px] text-gray-500">Gap</p>
                              <p className={`text-2xl font-bold ${gap>0?"text-green-600":gap<-10?"text-red-600":"text-gray-600"}`}>{gap>0?"+":""}{gap}</p>
                              <p className="text-[10px] text-gray-400">{gap > 10 ? "ML rates higher" : gap < -10 ? "Plan scores higher" : "Closely aligned"}</p>
                            </div>
                          </div>
                          <p className="text-[11px] text-gray-500 dark:text-gray-400">
                            {Math.abs(gap) <= 10 ? "ML content analysis and weighted plan readiness scores are well-aligned for this CR." :
                             gap > 10 ? "ML content analysis rates plan quality higher than the weighted dimension score — the plan text may be better than structure suggests." :
                             "Weighted plan readiness exceeds ML quality — the plan has good structural coverage but ML detected content gaps."}
                          </p>
                        </div>
                      );
                    })()}

                    {/* Detected Actions & Risks */}
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                      {pa.detectedActions.length > 0 && (
                        <div className="rounded-lg border border-blue-100 dark:border-blue-800 bg-white dark:bg-gray-900 p-5 space-y-3">
                          <p className="text-base font-bold text-blue-700 dark:text-blue-300">Detected Actions ({pa.detectedActions.length})</p>
                          <div className="flex flex-wrap gap-1.5">{pa.detectedActions.map((act: string, i: number) => <span key={i} className="rounded bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 px-2.5 py-1 text-sm text-blue-700 dark:text-blue-300">{act}</span>)}</div>
                        </div>
                      )}
                      {pa.detectedRisks.length > 0 && (
                        <div className="rounded-lg border border-red-100 dark:border-red-800 bg-white dark:bg-gray-900 p-5 space-y-3">
                          <p className="text-base font-bold text-red-700 dark:text-red-300">Detected Risks &amp; Gaps ({pa.detectedRisks.length})</p>
                          <ul className="space-y-1.5">{pa.detectedRisks.map((r: string, i: number) => <li key={i} className="flex items-start gap-2 text-sm text-red-600 dark:text-red-400"><AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />{r}</li>)}</ul>
                        </div>
                      )}
                    </div>

                    {/* AI Change Nature Insights & Backout Analysis */}
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                      {pa.changeNatureInsights && pa.changeNatureInsights.length > 0 && (
                        <div className="rounded-lg border border-purple-100 dark:border-purple-800 bg-white dark:bg-gray-900 p-5 space-y-3">
                          <p className="text-base font-bold text-purple-700 dark:text-purple-300 flex items-center gap-2"><Sparkles className="h-4 w-4" />AI Change Nature Insights ({pa.changeNatureInsights.length})</p>
                          <ul className="space-y-1.5">{pa.changeNatureInsights.map((insight: string, i: number) => <li key={i} className="flex items-start gap-2 text-sm text-purple-600 dark:text-purple-400"><span className="mt-0.5 shrink-0">🔍</span>{insight}</li>)}</ul>
                        </div>
                      )}
                      {pa.backoutAnalysis && (
                        <div className={`rounded-lg border ${pa.backoutAnalysis.gaps.length > 0 ? "border-amber-100 dark:border-amber-800" : "border-green-100 dark:border-green-800"} bg-white dark:bg-gray-900 p-5 space-y-3`}>
                          <p className={`text-base font-bold ${pa.backoutAnalysis.gaps.length > 0 ? "text-amber-700 dark:text-amber-300" : "text-green-700 dark:text-green-300"} flex items-center gap-2`}><Shield className="h-4 w-4" />Backout Plan Analysis</p>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div className="flex items-center gap-1.5">{pa.backoutAnalysis.hasDuration ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> : <AlertTriangle className="h-3.5 w-3.5 text-red-500" />}<span>Duration Estimate</span></div>
                            <div className="flex items-center gap-1.5">{pa.backoutAnalysis.hasSteps ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> : <AlertTriangle className="h-3.5 w-3.5 text-red-500" />}<span>Sequential Steps</span></div>
                            <div className="flex items-center gap-1.5">{pa.backoutAnalysis.hasTriggerCriteria ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> : <AlertTriangle className="h-3.5 w-3.5 text-red-500" />}<span>Trigger Criteria</span></div>
                            <div className="flex items-center gap-1.5">{pa.backoutAnalysis.hasEscalation ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> : <AlertTriangle className="h-3.5 w-3.5 text-red-500" />}<span>Escalation Path</span></div>
                          </div>
                          {pa.backoutAnalysis.estimatedDuration && <p className="text-sm font-medium text-green-600 dark:text-green-400">Estimated rollback time: {pa.backoutAnalysis.estimatedDuration}</p>}
                          {pa.backoutAnalysis.gaps.length > 0 && (
                            <ul className="space-y-1">{pa.backoutAnalysis.gaps.map((g: string, i: number) => <li key={i} className="flex items-start gap-2 text-xs text-amber-600 dark:text-amber-400"><AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />{g}</li>)}</ul>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Recommendations */}
                    {recs.length > 0 && (
                      <div className="space-y-3">
                        <p className="text-base font-bold text-indigo-700 dark:text-indigo-300">Recommendations ({recs.filter((r: { severity: string }) => r.severity !== "info").length} action items)</p>
                        <div className="space-y-2">
                          {recs.map((r: { severity: string; category: string; title: string; detail: string }, i: number) => (
                            <div key={i} className={`rounded-lg border p-4 ${sevColor(r.severity)}`}>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="rounded px-2 py-0.5 text-xs font-bold uppercase">{r.severity}</span>
                                <span className="text-xs text-gray-400">{r.category}</span>
                              </div>
                              <p className="text-sm font-semibold">{r.title}</p>
                              <p className="text-sm mt-0.5 opacity-80">{r.detail}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* CR Insights — Actionable Intelligence */}
                    {(() => {
                      const planReady = selectedMlPlan.overallScore;
                      const critRecs = recs.filter((r: { severity: string }) => r.severity === "critical").length;
                      const highRecs = recs.filter((r: { severity: string }) => r.severity === "high").length;
                      const riskCount = pa.detectedRisks.length;
                      const actionCount = pa.detectedActions.length;
                      const missingElements = ["Pre-checks","Post-checks","Verification","Timeline","Contacts","Rollback Ref","Approval Gates","Monitoring"].filter((_, idx) => ![pa.hasPreChecks,pa.hasPostChecks,pa.hasVerificationSteps,pa.hasTimeline,pa.hasContactInfo,pa.hasRollbackReference,pa.hasApprovalGates,pa.hasMonitoringSteps][idx]);
                      const strengths: string[] = [];
                      const concerns: string[] = [];
                      if (pa.structureScore >= 70) strengths.push("Well-structured plan with clear steps");
                      if (pa.completenessScore >= 70) strengths.push("Comprehensive coverage of required elements");
                      if (pa.clarityScore >= 70) strengths.push("Clear and readable plan content");
                      if (pa.riskAwarenessScore >= 70) strengths.push("Strong risk awareness and mitigation planning");
                      if (pa.hasRollbackReference && pa.hasPreChecks && pa.hasPostChecks) strengths.push("Good operational readiness (rollback + pre/post checks)");
                      if (pa.structureScore < 40) concerns.push("Plan lacks clear structure — add numbered steps and sections");
                      if (pa.completenessScore < 40) concerns.push("Significant content gaps — many required elements are missing");
                      if (pa.clarityScore < 40) concerns.push("Plan clarity is low — simplify language and add sequence indicators");
                      if (pa.riskAwarenessScore < 40) concerns.push("Minimal risk awareness — add rollback, monitoring, and communication plans");
                      if (missingElements.length >= 4) concerns.push(`Missing ${missingElements.length} of 8 key elements: ${missingElements.join(", ")}`);
                      if (critRecs > 0) concerns.push(`${critRecs} critical recommendation(s) require immediate attention`);
                      if (riskCount > 3) concerns.push(`${riskCount} risks/gaps detected — higher than typical`);
                      const overallVerdict = mlCustomOverall >= 75 && planReady >= 75 ? "ready" : mlCustomOverall >= 50 && planReady >= 50 ? "conditional" : "not-ready";
                      return (
                        <div className="rounded-lg border-2 border-indigo-200 dark:border-indigo-700 bg-gradient-to-br from-indigo-50/80 to-white dark:from-indigo-950/30 dark:to-gray-900 p-5 space-y-4">
                          <div className="flex items-center justify-between">
                            <p className="text-base font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-2"><TrendingUp className="h-5 w-5" />CR Insights &amp; Readiness Summary</p>
                            <span className={`rounded-full px-4 py-1.5 text-sm font-bold ${overallVerdict==="ready"?"bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300":overallVerdict==="conditional"?"bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300":"bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"}`}>{overallVerdict==="ready"?"Release Ready":overallVerdict==="conditional"?"Conditional Approval":"Needs Rework"}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-3 md:grid-cols-5 text-center">
                            <div className="rounded-lg bg-white dark:bg-gray-900 border border-indigo-100 dark:border-indigo-800 p-3">
                              <p className="text-xs text-gray-500">ML Score</p>
                              <p className={`text-xl font-bold ${mlCustomOverall>=65?"text-green-600":mlCustomOverall>=40?"text-amber-600":"text-red-600"}`}>{mlCustomOverall}</p>
                            </div>
                            <div className="rounded-lg bg-white dark:bg-gray-900 border border-indigo-100 dark:border-indigo-800 p-3">
                              <p className="text-xs text-gray-500">Plan Readiness</p>
                              <p className={`text-xl font-bold ${pColor(planReady)}`}>{planReady}</p>
                            </div>
                            <div className="rounded-lg bg-white dark:bg-gray-900 border border-indigo-100 dark:border-indigo-800 p-3">
                              <p className="text-xs text-gray-500">Risks Found</p>
                              <p className={`text-xl font-bold ${riskCount>3?"text-red-600":riskCount>0?"text-amber-600":"text-green-600"}`}>{riskCount}</p>
                            </div>
                            <div className="rounded-lg bg-white dark:bg-gray-900 border border-indigo-100 dark:border-indigo-800 p-3">
                              <p className="text-xs text-gray-500">Actions</p>
                              <p className="text-xl font-bold text-blue-600">{actionCount}</p>
                            </div>
                            <div className="rounded-lg bg-white dark:bg-gray-900 border border-indigo-100 dark:border-indigo-800 p-3">
                              <p className="text-xs text-gray-500">Action Items</p>
                              <p className={`text-xl font-bold ${critRecs+highRecs>0?"text-red-600":"text-green-600"}`}>{critRecs+highRecs}</p>
                            </div>
                          </div>
                          {strengths.length > 0 && (
                            <div>
                              <p className="text-sm font-bold text-green-700 dark:text-green-400 mb-1.5">Strengths</p>
                              <ul className="space-y-1">{strengths.map((s, i) => <li key={i} className="flex items-start gap-2 text-sm text-green-700 dark:text-green-400"><CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />{s}</li>)}</ul>
                            </div>
                          )}
                          {concerns.length > 0 && (
                            <div>
                              <p className="text-sm font-bold text-red-700 dark:text-red-400 mb-1.5">Concerns &amp; Action Required</p>
                              <ul className="space-y-1">{concerns.map((c, i) => <li key={i} className="flex items-start gap-2 text-sm text-red-700 dark:text-red-400"><AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />{c}</li>)}</ul>
                            </div>
                          )}
                          {strengths.length === 0 && concerns.length === 0 && (
                            <p className="text-sm text-gray-500">This change request has average scores across all dimensions with no standout strengths or concerns.</p>
                          )}
                        </div>
                      );
                    })()}
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
