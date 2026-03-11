"use client";

import { useState } from "react";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, Legend,
} from "recharts";
import {
  AlertTriangle, GitPullRequest, FileCode2, Server, Shield,
  CheckCircle2, XCircle, Pause, Play, RotateCcw, Radar as RadarIcon, ShieldCheck,
} from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/card";
import { PageHeader } from "@/components/page-header";
import { useAnalytics } from "@/hooks/use-analytics";

const RISK_COLORS: Record<string, string> = {
  low: "#22c55e",
  medium: "#eab308",
  high: "#f97316",
  critical: "#ef4444",
};

function riskColor(score: number) {
  if (score >= 80) return "#ef4444";
  if (score >= 60) return "#f97316";
  if (score >= 40) return "#eab308";
  return "#22c55e";
}

function confidenceColor(score: number) {
  if (score >= 80) return "#22c55e";
  if (score >= 60) return "#eab308";
  if (score >= 40) return "#f97316";
  return "#ef4444";
}

const recConfig: Record<string, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  continue: { label: "Continue Rollout", icon: Play, color: "text-green-700 dark:text-green-400", bg: "bg-green-50 dark:bg-green-950" },
  pause: { label: "Pause & Investigate", icon: Pause, color: "text-amber-700 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950" },
  rollback: { label: "Recommend Rollback", icon: RotateCcw, color: "text-red-700 dark:text-red-400", bg: "bg-red-50 dark:bg-red-950" },
};

type PageTab = "risk-radar" | "confidence";

function TabButton({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: React.ElementType; label: string }) {
  return (
    <button onClick={onClick} className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${active ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300" : "text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-300"}`}>
      <Icon className="h-4 w-4" />{label}
    </button>
  );
}

export default function RiskRadarPage() {
  const { releaseRiskRadar, blastRadius, confidenceScores, loading, error } = useAnalytics();
  const [activeTab, setActiveTab] = useState<PageTab>("risk-radar");
  const [selectedRelease, setSelectedRelease] = useState<string | null>(null);

  if (loading) return <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-40 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />)}</div>;
  if (error) return <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">{error}</div>;

  const active = selectedRelease ? releaseRiskRadar.find(r => r.releaseId === selectedRelease) : releaseRiskRadar[0];

  const radarData = active ? [
    { dimension: "Overall Risk", value: active.overallRisk },
    { dimension: "Code Churn", value: Math.min(100, Math.round(active.totalCodeChurn / 50)) },
    { dimension: "Service Spread", value: Math.min(100, active.servicesImpacted * 15) },
    { dimension: "Test Coverage", value: Math.round(100 - active.avgTestCoverage) },
    { dimension: "Change Volume", value: Math.min(100, active.changeCount * 25) },
  ] : [];

  const confidenceChartData = confidenceScores.map((cs) => ({
    name: cs.releaseName,
    confidence: cs.confidence,
    passRate: cs.breakdown.testPassRate,
  }));

  return (
    <div className="space-y-6">
      <PageHeader title="Risk & Confidence" subtitle="Multi-dimensional risk analysis and release confidence scoring" />

      {/* Top-Level Tabs */}
      <div className="flex gap-1 border-b border-gray-200 pb-0.5 dark:border-gray-800">
        <TabButton active={activeTab === "risk-radar"} onClick={() => setActiveTab("risk-radar")} icon={RadarIcon} label="Risk Radar" />
        <TabButton active={activeTab === "confidence"} onClick={() => setActiveTab("confidence")} icon={ShieldCheck} label="Confidence" />
      </div>

      {/* ═══ TAB: RISK RADAR ═══ */}
      {activeTab === "risk-radar" && (
        <div className="space-y-6">
          {/* Release selector */}
          <div className="flex flex-wrap gap-3">
            {releaseRiskRadar.map((rel) => (
              <button key={rel.releaseId} onClick={() => setSelectedRelease(rel.releaseId)}
                className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${(selectedRelease || releaseRiskRadar[0]?.releaseId) === rel.releaseId ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300" : "border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"}`}>
                {rel.releaseName} <span className="text-xs opacity-60">v{rel.version}</span>
              </button>
            ))}
          </div>

          {active && (<>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
              {[
                { label: "Risk Score", value: active.overallRisk, icon: AlertTriangle, color: riskColor(active.overallRisk) },
                { label: "Changes", value: active.changeCount, icon: GitPullRequest, color: "#3b82f6" },
                { label: "Code Churn", value: active.totalCodeChurn.toLocaleString(), icon: FileCode2, color: "#8b5cf6" },
                { label: "Services", value: active.servicesImpacted, icon: Server, color: "#f59e0b" },
                { label: "Pass Rate", value: `${active.validationPassRate}%`, icon: Shield, color: "#22c55e" },
              ].map((kpi) => (
                <Card key={kpi.label} className="p-4">
                  <div className="flex items-center gap-2"><kpi.icon className="h-4 w-4" style={{ color: kpi.color }} /><span className="text-xs text-gray-500 dark:text-gray-400">{kpi.label}</span></div>
                  <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100">{kpi.value}</p>
                </Card>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader><CardTitle>Risk Radar — {active.releaseName}</CardTitle></CardHeader>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="#e2e8f0" />
                      <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                      <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                      <Radar dataKey="value" stroke="#ef4444" fill="#ef4444" fillOpacity={0.25} strokeWidth={2} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card>
                <CardHeader><CardTitle>Risk Factor Assessment</CardTitle></CardHeader>
                <div className="space-y-4">
                  {Object.entries(active.riskFactors).map(([factor, level]) => (
                    <div key={factor} className="flex items-center justify-between">
                      <p className="text-sm font-medium capitalize text-gray-700 dark:text-gray-300">{factor.replace(/([A-Z])/g, " $1").trim()}</p>
                      <span className="rounded-full px-3 py-0.5 text-xs font-semibold capitalize" style={{ backgroundColor: RISK_COLORS[level] + "20", color: RISK_COLORS[level] }}>{level}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-6">
                  <h4 className="mb-2 text-xs font-semibold uppercase text-gray-400">Affected Services</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {active.servicesList.map((svc) => (<span key={svc} className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">{svc}</span>))}
                  </div>
                </div>
              </Card>
            </div>
          </>)}

          <Card>
            <CardHeader><CardTitle>Release Risk Comparison</CardTitle></CardHeader>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={releaseRiskRadar}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="releaseName" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                  <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" domain={[0, 100]} />
                  <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0" }} />
                  <Legend />
                  <Bar dataKey="overallRisk" name="Risk Score" radius={[4, 4, 0, 0]}>
                    {releaseRiskRadar.map((entry) => (<Cell key={entry.releaseId} fill={riskColor(entry.overallRisk)} />))}
                  </Bar>
                  <Bar dataKey="validationPassRate" name="Pass Rate %" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card>
            <CardHeader><CardTitle>Service Blast Radius</CardTitle></CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800">
                    <th className="pb-3 font-medium text-gray-500 dark:text-gray-400">Service</th>
                    <th className="pb-3 font-medium text-gray-500 dark:text-gray-400">Changes</th>
                    <th className="pb-3 font-medium text-gray-500 dark:text-gray-400">Avg Risk</th>
                    <th className="pb-3 font-medium text-gray-500 dark:text-gray-400">Risk Level</th>
                    <th className="pb-3 font-medium text-gray-500 dark:text-gray-400">Releases</th>
                  </tr>
                </thead>
                <tbody>
                  {blastRadius.map((svc) => (
                    <tr key={svc.service} className="border-b border-gray-50 dark:border-gray-800">
                      <td className="py-3 font-medium text-gray-900 dark:text-gray-100">{svc.service}</td>
                      <td className="py-3 text-gray-600 dark:text-gray-400">{svc.changeCount}</td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-16 rounded-full bg-gray-100 dark:bg-gray-800"><div className="h-2 rounded-full" style={{ width: `${svc.avgRisk}%`, backgroundColor: riskColor(svc.avgRisk) }} /></div>
                          <span className="text-xs text-gray-500">{svc.avgRisk}</span>
                        </div>
                      </td>
                      <td className="py-3"><span className="rounded-full px-2 py-0.5 text-xs font-medium" style={{ backgroundColor: riskColor(svc.avgRisk) + "20", color: riskColor(svc.avgRisk) }}>{svc.avgRisk >= 80 ? "Critical" : svc.avgRisk >= 60 ? "High" : svc.avgRisk >= 40 ? "Medium" : "Low"}</span></td>
                      <td className="py-3 text-xs text-gray-500 dark:text-gray-400">{svc.releases.join(", ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ═══ TAB: CONFIDENCE ═══ */}
      {activeTab === "confidence" && (
        <div className="space-y-6">
          {/* Confidence Cards */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {confidenceScores.map((cs) => {
              const rec = recConfig[cs.recommendation];
              const RecIcon = rec.icon;
              return (
                <Card key={cs.releaseId} className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100">{cs.releaseName}</h3>
                      <p className="text-xs text-gray-400">v{cs.version} · {cs.status}</p>
                    </div>
                    <div className="relative flex h-16 w-16 items-center justify-center">
                      <svg className="h-16 w-16 -rotate-90" viewBox="0 0 36 36">
                        <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#e5e7eb" strokeWidth="3" />
                        <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke={confidenceColor(cs.confidence)} strokeWidth="3" strokeDasharray={`${cs.confidence}, 100`} />
                      </svg>
                      <span className="absolute text-sm font-bold" style={{ color: confidenceColor(cs.confidence) }}>{cs.confidence}</span>
                    </div>
                  </div>

                  <div className={`mt-4 flex items-center gap-2 rounded-lg px-3 py-2 ${rec.bg}`}>
                    <RecIcon className={`h-4 w-4 ${rec.color}`} />
                    <span className={`text-sm font-medium ${rec.color}`}>{rec.label}</span>
                  </div>

                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between text-xs"><span className="text-gray-500 dark:text-gray-400">Test Pass Rate</span><span className="font-medium text-gray-700 dark:text-gray-300">{cs.breakdown.testPassRate}%</span></div>
                    <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-800"><div className="h-1.5 rounded-full bg-blue-500" style={{ width: `${cs.breakdown.testPassRate}%` }} /></div>
                    <div className="flex items-center justify-between text-xs"><span className="text-gray-500 dark:text-gray-400">Test Coverage</span><span className="font-medium text-gray-700 dark:text-gray-300">{cs.breakdown.testCoverage}%</span></div>
                    <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-800"><div className="h-1.5 rounded-full bg-purple-500" style={{ width: `${cs.breakdown.testCoverage}%` }} /></div>
                    <div className="flex items-center justify-between text-xs"><span className="text-gray-500 dark:text-gray-400">Risk Score</span><span className="font-medium text-gray-700 dark:text-gray-300">{cs.breakdown.riskScore}/100</span></div>
                    <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-800"><div className="h-1.5 rounded-full" style={{ width: `${cs.breakdown.riskScore}%`, backgroundColor: confidenceColor(100 - cs.breakdown.riskScore) }} /></div>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2 border-t border-gray-100 pt-3 dark:border-gray-800">
                    <div className="text-center"><div className="flex items-center justify-center gap-1"><CheckCircle2 className="h-3 w-3 text-green-500" /><span className="text-sm font-bold text-gray-900 dark:text-gray-100">{cs.passedValidations}</span></div><p className="text-[10px] text-gray-400">Passed</p></div>
                    <div className="text-center"><div className="flex items-center justify-center gap-1"><XCircle className="h-3 w-3 text-red-500" /><span className="text-sm font-bold text-gray-900 dark:text-gray-100">{cs.failedValidations}</span></div><p className="text-[10px] text-gray-400">Failed</p></div>
                    <div className="text-center"><div className="flex items-center justify-center gap-1"><Shield className="h-3 w-3 text-amber-500" /><span className="text-sm font-bold text-gray-900 dark:text-gray-100">{cs.breakdown.rollbackComplexity}</span></div><p className="text-[10px] text-gray-400">Rollback</p></div>
                  </div>

                  {cs.breakdown.hasBlockers && (
                    <div className="mt-3 flex items-center gap-1.5 rounded bg-red-50 px-2 py-1 text-xs text-red-700 dark:bg-red-950 dark:text-red-400"><AlertTriangle className="h-3 w-3" />Active blockers detected</div>
                  )}
                </Card>
              );
            })}
          </div>

          {/* Confidence Comparison Chart */}
          <Card>
            <CardHeader><CardTitle>Confidence Score Comparison</CardTitle></CardHeader>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={confidenceChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                  <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" domain={[0, 100]} />
                  <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0" }} />
                  <Bar dataKey="confidence" name="Confidence" radius={[4, 4, 0, 0]}>
                    {confidenceChartData.map((entry, idx) => (<Cell key={idx} fill={confidenceColor(entry.confidence)} />))}
                  </Bar>
                  <Bar dataKey="passRate" name="Pass Rate %" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Score Formula */}
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Confidence Score Formula</h3>
            <div className="grid grid-cols-2 gap-4 text-xs md:grid-cols-4">
              <div className="rounded-lg bg-blue-50 p-3 dark:bg-blue-950"><p className="font-bold text-blue-700 dark:text-blue-300">40%</p><p className="text-blue-600 dark:text-blue-400">Test Pass Rate</p></div>
              <div className="rounded-lg bg-purple-50 p-3 dark:bg-purple-950"><p className="font-bold text-purple-700 dark:text-purple-300">25%</p><p className="text-purple-600 dark:text-purple-400">Test Coverage</p></div>
              <div className="rounded-lg bg-amber-50 p-3 dark:bg-amber-950"><p className="font-bold text-amber-700 dark:text-amber-300">20%</p><p className="text-amber-600 dark:text-amber-400">Inverse Risk Score</p></div>
              <div className="rounded-lg bg-green-50 p-3 dark:bg-green-950"><p className="font-bold text-green-700 dark:text-green-300">15%</p><p className="text-green-600 dark:text-green-400">No Blockers</p></div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
