"use client";

import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, Legend,
} from "recharts";
import { AlertTriangle, GitPullRequest, FileCode2, Server, Shield } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/card";
import { useAnalytics } from "@/hooks/use-analytics";
import { useState } from "react";

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

export default function RiskRadarPage() {
  const { releaseRiskRadar, blastRadius, loading, error } = useAnalytics();
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Release Risk Radar</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Detect risky releases before deployment using multi-dimensional risk analysis</p>
      </div>

      {/* Release selector */}
      <div className="flex flex-wrap gap-3">
        {releaseRiskRadar.map((rel) => (
          <button
            key={rel.releaseId}
            onClick={() => setSelectedRelease(rel.releaseId)}
            className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
              (selectedRelease || releaseRiskRadar[0]?.releaseId) === rel.releaseId
                ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                : "border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
            }`}
          >
            {rel.releaseName} <span className="text-xs opacity-60">v{rel.version}</span>
          </button>
        ))}
      </div>

      {active && (
        <>
          {/* KPI Row */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
            {[
              { label: "Risk Score", value: active.overallRisk, icon: AlertTriangle, color: riskColor(active.overallRisk) },
              { label: "Changes", value: active.changeCount, icon: GitPullRequest, color: "#3b82f6" },
              { label: "Code Churn", value: active.totalCodeChurn.toLocaleString(), icon: FileCode2, color: "#8b5cf6" },
              { label: "Services", value: active.servicesImpacted, icon: Server, color: "#f59e0b" },
              { label: "Pass Rate", value: `${active.validationPassRate}%`, icon: Shield, color: "#22c55e" },
            ].map((kpi) => (
              <Card key={kpi.label} className="p-4">
                <div className="flex items-center gap-2">
                  <kpi.icon className="h-4 w-4" style={{ color: kpi.color }} />
                  <span className="text-xs text-gray-500 dark:text-gray-400">{kpi.label}</span>
                </div>
                <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100">{kpi.value}</p>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Risk Radar Chart */}
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

            {/* Risk Factor Breakdown */}
            <Card>
              <CardHeader><CardTitle>Risk Factor Assessment</CardTitle></CardHeader>
              <div className="space-y-4">
                {Object.entries(active.riskFactors).map(([factor, level]) => (
                  <div key={factor} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium capitalize text-gray-700 dark:text-gray-300">{factor.replace(/([A-Z])/g, " $1").trim()}</p>
                    </div>
                    <span
                      className="rounded-full px-3 py-0.5 text-xs font-semibold capitalize"
                      style={{ backgroundColor: RISK_COLORS[level] + "20", color: RISK_COLORS[level] }}
                    >
                      {level}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-6">
                <h4 className="mb-2 text-xs font-semibold uppercase text-gray-400">Affected Services</h4>
                <div className="flex flex-wrap gap-1.5">
                  {active.servicesList.map((svc) => (
                    <span key={svc} className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">{svc}</span>
                  ))}
                </div>
              </div>
            </Card>
          </div>
        </>
      )}

      {/* Release Risk Comparison Bar Chart */}
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
                {releaseRiskRadar.map((entry) => (
                  <Cell key={entry.releaseId} fill={riskColor(entry.overallRisk)} />
                ))}
              </Bar>
              <Bar dataKey="validationPassRate" name="Pass Rate %" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Blast Radius - Service Impact */}
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
                      <div className="h-2 w-16 rounded-full bg-gray-100 dark:bg-gray-800">
                        <div className="h-2 rounded-full" style={{ width: `${svc.avgRisk}%`, backgroundColor: riskColor(svc.avgRisk) }} />
                      </div>
                      <span className="text-xs text-gray-500">{svc.avgRisk}</span>
                    </div>
                  </td>
                  <td className="py-3">
                    <span className="rounded-full px-2 py-0.5 text-xs font-medium" style={{ backgroundColor: riskColor(svc.avgRisk) + "20", color: riskColor(svc.avgRisk) }}>
                      {svc.avgRisk >= 80 ? "Critical" : svc.avgRisk >= 60 ? "High" : svc.avgRisk >= 40 ? "Medium" : "Low"}
                    </span>
                  </td>
                  <td className="py-3 text-xs text-gray-500 dark:text-gray-400">{svc.releases.join(", ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
