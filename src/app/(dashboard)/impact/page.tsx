"use client";

import { useState, useMemo, useCallback } from "react";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
} from "recharts";
import {
  Shield, AlertTriangle, Gauge, Zap, Layers, Settings2, RotateCcw, Search,
  Info, Brain, RefreshCw,
  ClipboardCheck, FileText, CheckCircle2, XCircle, TrendingUp, Sparkles,
  Save,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/card";
import { RiskBadge } from "@/components/risk-badge";
import { useData } from "@/hooks";
import { getRiskBg } from "@/lib/utils";
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

/* ═══ Shared Risk Helpers ═══ */
function riskColor(s: number) { if (s>=75) return "text-red-600"; if (s>=50) return "text-orange-600"; if (s>=25) return "text-amber-600"; return "text-green-600"; }
function riskBgCls(s: number) { if (s>=75) return "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"; if (s>=50) return "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300"; if (s>=25) return "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300"; return "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"; }

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
  const [days] = useState(7);
  const { changeRequests, loading, error } = useData(days);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [selectedCR, _setSelectedCR] = useState<string | null>(null);
  const [weights, setWeights] = useState<Weights>({ ...DEFAULT_WEIGHTS });
  const [activeTab, setActiveTab] = useState<"plans"|"mlTab">("plans");
  const [weightsOpen, setWeightsOpen] = useState(false);
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [mlRisk, setMlRisk] = useState<Record<string, any> | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [llmQuality, setLlmQuality] = useState<Record<string, any> | null>(null);
  const [mlLoading, setMlLoading] = useState(false);
  const [mlError, setMlError] = useState<string | null>(null);
  const [mlWeights, setMlWeights] = useState({ structure: 0.25, completeness: 0.30, clarity: 0.25, riskAwareness: 0.20 });
  const [mlRecalcFlash, setMlRecalcFlash] = useState(false);
  const [overrides, setOverrides] = useState<Record<string, Partial<DimensionScores>>>({});
  
  // Save Analysis state
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saveDescription, setSaveDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

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

  /* ═══ Save Analysis Function ═══ */
  async function saveCurrentAnalysis() {
    if (!saveName.trim()) { setSaveError("Please enter a name for this analysis"); return; }
    setSaving(true); setSaveError(null); setSaveSuccess(false);
    try {
      // Determine analysis type and gather data based on active tab
      let analysisType = "combined";
      let changeRequestId: string | null = null;
      const repoUrl: string | null = null;
      let overallScore: number | null = null;
      let planReadyScore: number | null = null;
      let mlScore: number | null = null;
      const codeRiskScore: number | null = null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let analysisData: any = {};

      if (activeTab === "plans" && selectedPlanCR) {
        analysisType = "plan";
        changeRequestId = selectedPlanCR;
        const pr = planResults.find(p => p.cr.number === selectedPlanCR);
        if (pr) { planReadyScore = pr.overallScore; analysisData = { planResult: pr, planWeights }; }
      } else if (activeTab === "mlTab" && selectedMlCR && mlAnalysis) {
        analysisType = "ml";
        changeRequestId = selectedMlCR;
        mlScore = mlAnalysis.overallQuality;
        analysisData = { mlAnalysis, mlWeights };
      } else {
        // Combined/overview
        analysisType = "combined";
        const avgScore = scored.length > 0 ? Math.round(scored.reduce((a, s) => a + s.overall, 0) / scored.length) : 0;
        overallScore = avgScore;
        analysisData = { weights, scored: scored.slice(0, 20), planResults: planResults.slice(0, 10), mlAnalysis };
      }

      const res = await fetch("/api/analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: saveName,
          description: saveDescription,
          analysisType,
          changeRequestId,
          repoUrl,
          overallScore,
          planReadyScore,
          mlScore,
          codeRiskScore,
          analysisData,
        }),
      });

      if (res.ok) {
        setSaveSuccess(true);
        setSaveName("");
        setSaveDescription("");
        setTimeout(() => { setSaveModalOpen(false); setSaveSuccess(false); }, 1500);
      } else {
        const data = await res.json();
        setSaveError(data.error || "Failed to save analysis");
      }
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader title="Impact Analysis" subtitle="Computed impact scores from ServiceNow fields — click a row for details, adjust weights for what-if analysis" />
    <div className="space-y-6 p-4 md:p-6">

      {/* ═══ Tabs + Save/Load Buttons ═══ */}
      <div className="flex items-center justify-between gap-4 border-b border-gray-200 pb-0.5 dark:border-gray-800">
        <div className="flex gap-1 overflow-x-auto">
          <button onClick={() => setActiveTab("plans")} className={`flex items-center gap-1.5 rounded-t-lg px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap ${activeTab==="plans" ? "border-b-2 border-teal-600 text-teal-600 bg-teal-50 dark:bg-teal-950/30" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"}`}><ClipboardCheck className="h-4 w-4" />Plan Analysis</button>
          <button onClick={() => setActiveTab("mlTab")} className={`flex items-center gap-1.5 rounded-t-lg px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap ${activeTab==="mlTab" ? "border-b-2 border-indigo-600 text-indigo-600 bg-indigo-50 dark:bg-indigo-950/30" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"}`}><Brain className="h-4 w-4" />ML Analysis</button>
        </div>
        <div className="flex gap-2 shrink-0">
          <button onClick={() => {
            // Generate default name with CR number (if applicable) and timestamp
            const timestamp = new Date().toISOString().slice(0, 16).replace("T", "_").replace(":", "");
            let defaultName = "";
            if (activeTab === "plans" && selectedPlanCR) {
              defaultName = `${selectedPlanCR}-plan-${timestamp}`;
            } else if (activeTab === "mlTab" && selectedMlCR) {
              defaultName = `${selectedMlCR}-ml-${timestamp}`;
            } else {
              defaultName = `impact-analysis-${timestamp}`;
            }
            setSaveName(defaultName);
            setSaveModalOpen(true);
          }} className="flex items-center gap-1.5 rounded-lg border border-green-200 bg-green-50 px-3 py-1.5 text-sm font-medium text-green-700 hover:bg-green-100 dark:border-green-800 dark:bg-green-950 dark:text-green-300 dark:hover:bg-green-900"><Save className="h-4 w-4" />Save</button>
        </div>
      </div>

      {/* ═══ Save Analysis Modal ═══ */}
      {saveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Save Analysis</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label>
                <input type="text" value={saveName} onChange={(e) => setSaveName(e.target.value)} placeholder="e.g., Sprint 28 Risk Assessment" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <textarea value={saveDescription} onChange={(e) => setSaveDescription(e.target.value)} placeholder="Optional notes about this analysis..." rows={3} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100" />
              </div>
              <div className="rounded-lg bg-gray-50 p-3 text-sm text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                <p><strong>Analysis Type:</strong> {activeTab === "plans" ? "Plan" : activeTab === "mlTab" ? "ML" : "Combined"}</p>
                {(activeTab === "plans" && selectedPlanCR) && <p><strong>Change Request:</strong> {selectedPlanCR}</p>}
                {(activeTab === "mlTab" && selectedMlCR) && <p><strong>Change Request:</strong> {selectedMlCR}</p>}
              </div>
              {saveError && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">{saveError}</div>}
              {saveSuccess && <div className="rounded-lg bg-green-50 p-3 text-sm text-green-700 dark:bg-green-950 dark:text-green-300">Analysis saved successfully!</div>}
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => { setSaveModalOpen(false); setSaveError(null); }} className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800">Cancel</button>
              <button onClick={saveCurrentAnalysis} disabled={saving || !saveName.trim()} className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50">{saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{saving ? "Saving..." : "Save Analysis"}</button>
            </div>
          </div>
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
                        <div className="grid grid-cols-3 gap-3 text-center">
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
                <button onClick={() => { setSelectedMlCR(null); setMlAnalysis(null); setMlRisk(null); setLlmQuality(null); setMlError(null); }} className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-700 dark:bg-indigo-700 dark:hover:bg-indigo-600">← Back to List</button>
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
                  setMlRisk(null);
                  setLlmQuality(null);
                  Promise.all([
                    fetch(`/api/data/plan-analysis?number=${encodeURIComponent(crNum)}`)
                      .then(r => r.ok ? r.json() : r.json().then(b => { throw new Error(b.error || `HTTP ${r.status}`); })),
                    fetch(`/api/data/risk-predict`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ number: crNum, includeLLM: true }),
                    }).then(r => r.ok ? r.json() : null).catch(() => null),
                  ])
                    .then(([planData, riskData]) => {
                      setMlAnalysis(planData);
                      if (riskData) {
                        setMlRisk(riskData.mlRisk || null);
                        setLlmQuality(riskData.llmQuality || null);
                      }
                      setMlLoading(false);
                    })
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
              const risk = mlRisk;
              const llm = llmQuality;
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
                    {/* ── Predictive Risk Model card ── */}
                    {risk && (
                      <div className="rounded-lg border border-violet-200 dark:border-violet-800 bg-white dark:bg-gray-900 p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-bold text-violet-700 dark:text-violet-300 flex items-center gap-2"><Shield className="h-4 w-4" />Predictive Risk Model</p>
                          <div className="flex items-center gap-2">
                            <span className={`rounded-full px-3 py-1 text-xs font-bold ${
                              risk.riskTier === "critical" ? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                              : risk.riskTier === "high" ? "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300"
                              : risk.riskTier === "medium" ? "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300"
                              : "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"}`}>{risk.riskTier?.toUpperCase()}</span>
                            <span className={`text-2xl font-bold ${
                              risk.riskScore >= 75 ? "text-red-600" : risk.riskScore >= 50 ? "text-orange-600" : risk.riskScore >= 25 ? "text-amber-600" : "text-green-600"}`}>{risk.riskScore}<span className="text-sm font-normal text-gray-400">/100</span></span>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-3 text-center">
                          <div className="rounded bg-violet-50 dark:bg-violet-950/30 p-2">
                            <p className="text-[11px] text-gray-500">Success Prob.</p>
                            <p className="font-bold text-sm text-violet-700 dark:text-violet-300">{Math.round((risk.successProbability || 0) * 100)}%</p>
                          </div>
                          <div className="rounded bg-violet-50 dark:bg-violet-950/30 p-2">
                            <p className="text-[11px] text-gray-500">Confidence</p>
                            <p className="font-bold text-sm text-violet-700 dark:text-violet-300">{Math.round((risk.confidence || 0) * 100)}%</p>
                          </div>
                          <div className="rounded bg-violet-50 dark:bg-violet-950/30 p-2">
                            <p className="text-[11px] text-gray-500">Model</p>
                            <p className="font-bold text-[11px] text-violet-700 dark:text-violet-300">{risk.modelVersion}</p>
                          </div>
                        </div>
                        <div className="rounded-lg border border-violet-100 dark:border-violet-900 px-3 py-2">
                          <p className={`text-xs font-bold mb-1 ${
                            risk.recommendation === "block-pending-review" ? "text-red-600" : risk.recommendation === "additional-controls" ? "text-orange-600" : risk.recommendation === "review-recommended" ? "text-amber-600" : "text-green-600"}`}>Recommendation: {(risk.recommendation || "").replace(/-/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())}</p>
                        </div>
                        {risk.topRiskFactors?.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-red-600 dark:text-red-400 mb-1">Risk drivers</p>
                            <ul className="space-y-0.5">{(risk.topRiskFactors as string[]).slice(0, 4).map((f: string, i: number) => <li key={i} className="text-xs text-red-500 dark:text-red-400 flex items-start gap-1"><span className="shrink-0 mt-0.5">↑</span>{f}</li>)}</ul>
                          </div>
                        )}
                        {risk.topMitigators?.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-green-600 dark:text-green-400 mb-1">Mitigating factors</p>
                            <ul className="space-y-0.5">{(risk.topMitigators as string[]).slice(0, 3).map((f: string, i: number) => <li key={i} className="text-xs text-green-600 dark:text-green-400 flex items-start gap-1"><span className="shrink-0 mt-0.5">↓</span>{f}</li>)}</ul>
                          </div>
                        )}
                      </div>
                    )}

                    {/* ── LLM Quality Analysis card ── */}
                    {llm && (
                      <div className="rounded-lg border border-teal-200 dark:border-teal-800 bg-white dark:bg-gray-900 p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-bold text-teal-700 dark:text-teal-300 flex items-center gap-2"><Sparkles className="h-4 w-4" />LLM Quality Analysis {!llm.llmUsed && <span className="text-[10px] font-normal text-gray-400">(heuristic)</span>}</p>
                          <span className={`rounded-full px-3 py-1 text-xs font-bold ${
                            llm.qualityScore >= 70 ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                            : llm.qualityScore >= 45 ? "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300"
                            : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"}`}>{llm.qualityScore}/100</span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 italic">&ldquo;{llm.summary}&rdquo;</p>
                        {llm.reviewerFeedback && <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{llm.reviewerFeedback}</p>}
                        {llm.issues?.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-red-600 mb-1">Issues flagged</p>
                            <ul className="space-y-0.5">{(llm.issues as string[]).map((iss: string, i: number) => <li key={i} className="text-xs text-red-500 dark:text-red-400 flex items-start gap-1"><AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />{iss}</li>)}</ul>
                          </div>
                        )}
                        {llm.suggestions?.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-teal-600 mb-1">Suggestions</p>
                            <ul className="space-y-0.5">{(llm.suggestions as string[]).map((s: string, i: number) => <li key={i} className="text-xs text-teal-600 dark:text-teal-400 flex items-start gap-1"><TrendingUp className="h-3 w-3 mt-0.5 shrink-0" />{s}</li>)}</ul>
                          </div>
                        )}
                        <p className="text-[10px] text-gray-400">Provider: {llm.provider}</p>
                      </div>
                    )}

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
