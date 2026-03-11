"use client";

import { useMemo } from "react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell,
} from "recharts";
import {
  Rocket, Shield, TrendingUp, RotateCcw, Clock, CheckCircle2, XCircle, AlertTriangle, Zap, Target,
  TestTube2, Play, Pause,
} from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/card";
import { PageHeader } from "@/components/page-header";
import { useAnalytics } from "@/hooks/use-analytics";
import { useData } from "@/hooks/use-data";

function confidenceColor(score: number) {
  if (score >= 80) return "#22c55e";
  if (score >= 60) return "#eab308";
  if (score >= 40) return "#f97316";
  return "#ef4444";
}

function riskColor(score: number) {
  if (score >= 80) return "#ef4444";
  if (score >= 60) return "#f97316";
  if (score >= 40) return "#eab308";
  return "#22c55e";
}

export default function ExecutivePage() {
  const { confidenceScores, failureAnalysis, velocity, releaseRiskRadar, loading: aLoading, error: aError } = useAnalytics();
  const { dashboardMetrics, changeRequests, releases, loading: dLoading, error: dError } = useData();

  // Validation readiness per release (before early returns)
  const releaseValidation = useMemo(() => {
    return releases.map((rel) => {
      const relChanges = changeRequests.filter((cr) => cr.releaseId === rel.id);
      const relVals = relChanges.flatMap((cr) => cr.validations);
      const p = relVals.filter((v) => v.status === "passed").length;
      const f = relVals.filter((v) => v.status === "failed").length;
      const hasBlockers = relVals.some((v) => v.status === "failed" && v.blockers && v.blockers.length > 0);
      return {
        id: rel.id, name: rel.name, version: rel.version, status: rel.status,
        total: relVals.length, passed: p, failed: f,
        passRate: relVals.length > 0 ? Math.round((p / relVals.length) * 100) : 0,
        hasBlockers, risk: rel.overallRisk,
      };
    });
  }, [releases, changeRequests]);

  const loading = aLoading || dLoading;
  const error = aError || dError;

  if (loading) return <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-40 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />)}</div>;
  if (error) return <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">{error}</div>;

  const avgConfidence = confidenceScores.length > 0
    ? Math.round(confidenceScores.reduce((s, c) => s + c.confidence, 0) / confidenceScores.length)
    : 0;

  const totalValidations = releaseValidation.reduce((s, r) => s + r.total, 0);
  const totalPassed = releaseValidation.reduce((s, r) => s + r.passed, 0);
  const overallPassRate = totalValidations > 0 ? Math.round((totalPassed / totalValidations) * 100) : 0;
  const blockersCount = releaseValidation.filter((r) => r.hasBlockers).length;

  const topKpis = [
    { label: "Deploy Frequency", value: dashboardMetrics?.deployedToday || 0, sub: "today", icon: Rocket, color: "#3b82f6" },
    { label: "Change Failure Rate", value: `${failureAnalysis.changeFailureRate}%`, sub: "DORA metric", icon: XCircle, color: failureAnalysis.changeFailureRate > 15 ? "#ef4444" : "#22c55e" },
    { label: "MTTR", value: dashboardMetrics?.mttr || "N/A", sub: "mean recovery", icon: Clock, color: "#8b5cf6" },
    { label: "Avg Confidence", value: `${avgConfidence}%`, sub: "release readiness", icon: Shield, color: confidenceColor(avgConfidence) },
    { label: "Rollback Rate", value: `${dashboardMetrics?.rollbackRate || 0}%`, sub: "of deployments", icon: RotateCcw, color: "#f97316" },
    { label: "Validation Pass", value: `${overallPassRate}%`, sub: `${totalPassed}/${totalValidations} tests`, icon: TestTube2, color: "#22c55e" },
    { label: "Lead Time", value: dashboardMetrics?.changeLeadTime || "N/A", sub: "avg for changes", icon: TrendingUp, color: "#06b6d4" },
    { label: "Avg Risk Score", value: dashboardMetrics?.avgRiskScore || 0, sub: "across changes", icon: AlertTriangle, color: "#eab308" },
  ];

  const releaseStatusData = [
    { name: "Continue", value: confidenceScores.filter(c => c.recommendation === "continue").length, fill: "#22c55e" },
    { name: "Pause", value: confidenceScores.filter(c => c.recommendation === "pause").length, fill: "#eab308" },
    { name: "Rollback", value: confidenceScores.filter(c => c.recommendation === "rollback").length, fill: "#ef4444" },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-6">
      <PageHeader title="Release Overview" subtitle="Organization-wide software delivery health — validations, risk, confidence & DORA" actions={
        <div className="flex items-center gap-2">
          {blockersCount > 0 && (
            <span className="flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700 dark:bg-red-900 dark:text-red-300">
              <AlertTriangle className="h-3 w-3" /> {blockersCount} release{blockersCount > 1 ? "s" : ""} with blockers
            </span>
          )}
          <span className="rounded-full bg-blue-50/20 px-3 py-1 text-xs font-medium text-blue-300">
            {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          </span>
        </div>
      } />

      {/* Top KPI Row */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {topKpis.map((kpi) => (
          <Card key={kpi.label} className="p-4">
            <div className="flex items-center gap-2">
              <kpi.icon className="h-4 w-4" style={{ color: kpi.color }} />
              <span className="text-[11px] text-gray-500 dark:text-gray-400">{kpi.label}</span>
            </div>
            <p className="mt-1 text-xl font-bold text-gray-900 dark:text-gray-100">{kpi.value}</p>
            <p className="text-[10px] text-gray-400">{kpi.sub}</p>
          </Card>
        ))}
      </div>

      {/* Release Validation Readiness — NEW */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><TestTube2 className="h-4 w-4 text-blue-500" />Release Validation Readiness</CardTitle></CardHeader>
        <div className="space-y-3">
          {releaseValidation.map((rel) => {
            const cs = confidenceScores.find((c) => c.releaseId === rel.id);
            const rr = releaseRiskRadar.find((r) => r.releaseId === rel.id);
            return (
              <div key={rel.id} className="rounded-lg border border-gray-100 p-4 dark:border-gray-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{rel.name}</span>
                        <span className="text-xs text-gray-400">v{rel.version}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          rel.status === "completed" ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" :
                          rel.status === "staging" ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" :
                          rel.status === "rolled_back" ? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300" :
                          "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                        }`}>{rel.status}</span>
                        {rel.hasBlockers && (
                          <span className="flex items-center gap-0.5 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-700 dark:bg-red-900 dark:text-red-300">
                            <AlertTriangle className="h-3 w-3" /> Blockers
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-gray-400">{rel.total} validations · {rel.passed} passed · {rel.failed} failed</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {/* Confidence gauge */}
                    {cs && (
                      <div className="text-center">
                        <div className="relative flex h-10 w-10 items-center justify-center">
                          <svg className="h-10 w-10 -rotate-90" viewBox="0 0 36 36">
                            <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#e5e7eb" strokeWidth="3" />
                            <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke={confidenceColor(cs.confidence)} strokeWidth="3" strokeDasharray={`${cs.confidence}, 100`} />
                          </svg>
                          <span className="absolute text-[10px] font-bold" style={{ color: confidenceColor(cs.confidence) }}>{cs.confidence}</span>
                        </div>
                        <p className="text-[9px] text-gray-400">confidence</p>
                      </div>
                    )}
                    {/* Risk score */}
                    {rr && (
                      <div className="text-center">
                        <p className="text-lg font-bold" style={{ color: riskColor(rr.overallRisk) }}>{rr.overallRisk}</p>
                        <p className="text-[9px] text-gray-400">risk</p>
                      </div>
                    )}
                    {/* Recommendation */}
                    {cs && (
                      <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        cs.recommendation === "continue" ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" :
                        cs.recommendation === "pause" ? "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300" :
                        "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                      }`}>
                        {cs.recommendation === "continue" ? <Play className="h-3 w-3" /> : cs.recommendation === "pause" ? <Pause className="h-3 w-3" /> : <RotateCcw className="h-3 w-3" />}
                        {cs.recommendation}
                      </span>
                    )}
                    {/* Pass rate */}
                    <div className="text-right">
                      <span className={`text-lg font-bold ${rel.passRate >= 80 ? "text-green-600 dark:text-green-400" : rel.passRate >= 60 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400"}`}>{rel.passRate}%</span>
                      <p className="text-[9px] text-gray-400">pass rate</p>
                    </div>
                  </div>
                </div>
                {/* Progress bar */}
                <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                  {rel.total > 0 && (<>
                    <div className="bg-green-500" style={{ width: `${(rel.passed / rel.total) * 100}%` }} />
                    <div className="bg-red-500" style={{ width: `${(rel.failed / rel.total) * 100}%` }} />
                  </>)}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Middle Section: Decisions + Velocity */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Release Confidence Summary */}
        <Card>
          <CardHeader><CardTitle>Release Decisions</CardTitle></CardHeader>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={releaseStatusData} dataKey="value" cx="50%" cy="50%" outerRadius={65} innerRadius={40}
                  label={({ name, value }) => `${name}: ${value}`}>
                  {releaseStatusData.map((entry, idx) => <Cell key={idx} fill={entry.fill} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2">
            {confidenceScores.map((cs) => (
              <div key={cs.releaseId} className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2 dark:border-gray-800">
                <div>
                  <p className="text-xs font-medium text-gray-900 dark:text-gray-100">{cs.releaseName}</p>
                  <p className="text-[10px] text-gray-400">v{cs.version}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold" style={{ color: confidenceColor(cs.confidence) }}>{cs.confidence}%</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    cs.recommendation === "continue" ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" :
                    cs.recommendation === "pause" ? "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300" :
                    "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                  }`}>{cs.recommendation}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Team Velocity */}
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Team Delivery Velocity</CardTitle></CardHeader>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={velocity.teamVelocity}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="team" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0" }} />
                <Legend />
                <Bar dataKey="totalChanges" name="Total Changes" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="deployed" name="Deployed" fill="#22c55e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Bottom Section: DORA + Release Quality */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* DORA Summary */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-blue-500" />
              <CardTitle>DORA Metrics Summary</CardTitle>
            </div>
          </CardHeader>
          <div className="space-y-4">
            {[
              { label: "Deployment Frequency", value: `${dashboardMetrics?.deployedToday || 0}/day`, target: "4/day", met: (dashboardMetrics?.deployedToday || 0) >= 4 },
              { label: "Lead Time for Changes", value: dashboardMetrics?.changeLeadTime || "N/A", target: "< 3 days", met: true },
              { label: "Change Failure Rate", value: `${failureAnalysis.changeFailureRate}%`, target: "< 15%", met: failureAnalysis.changeFailureRate < 15 },
              { label: "Mean Time to Recovery", value: dashboardMetrics?.mttr || "N/A", target: "< 1 hour", met: true },
            ].map((metric) => (
              <div key={metric.label} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{metric.label}</p>
                  <p className="text-xs text-gray-400">Target: {metric.target}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{metric.value}</span>
                  {metric.met ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Release Risk + Confidence Summary */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-red-500" />
              <CardTitle>Release Quality & Risk</CardTitle>
            </div>
          </CardHeader>
          <div className="space-y-3">
            {releaseRiskRadar.map((rel) => {
              const cs = confidenceScores.find((c) => c.releaseId === rel.releaseId);
              return (
                <div key={rel.releaseId} className="rounded-lg border border-gray-100 p-3 dark:border-gray-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{rel.releaseName}</p>
                      <p className="text-[10px] text-gray-400">v{rel.version} · {rel.changeCount} changes · {rel.servicesImpacted} services</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-lg font-bold" style={{ color: riskColor(rel.overallRisk) }}>{rel.overallRisk}</p>
                        <p className="text-[10px] text-gray-400">risk</p>
                      </div>
                      {cs && (
                        <div className="text-right">
                          <p className="text-lg font-bold" style={{ color: confidenceColor(cs.confidence) }}>{cs.confidence}%</p>
                          <p className="text-[10px] text-gray-400">confidence</p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="mt-2 grid grid-cols-4 gap-2 text-[10px]">
                    <div>
                      <p className="text-gray-400">Pass Rate</p>
                      <p className="font-medium text-gray-700 dark:text-gray-300">{rel.validationPassRate}%</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Coverage</p>
                      <p className="font-medium text-gray-700 dark:text-gray-300">{rel.avgTestCoverage}%</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Code Churn</p>
                      <p className="font-medium text-gray-700 dark:text-gray-300">{rel.totalCodeChurn.toLocaleString()}</p>
                    </div>
                    {cs && (
                      <div>
                        <p className="text-gray-400">Recommendation</p>
                        <p className={`font-medium capitalize ${cs.recommendation === "continue" ? "text-green-600" : cs.recommendation === "pause" ? "text-amber-600" : "text-red-600"}`}>{cs.recommendation}</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
