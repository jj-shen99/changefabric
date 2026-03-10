"use client";

import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, PieChart, Pie, Legend,
} from "recharts";
import { AlertTriangle, TrendingDown, RotateCcw, XCircle, Target } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/card";
import { useAnalytics } from "@/hooks/use-analytics";

function riskColor(score: number) {
  if (score >= 80) return "#ef4444";
  if (score >= 60) return "#f97316";
  if (score >= 40) return "#eab308";
  return "#22c55e";
}

export default function FailureAnalysisPage() {
  const { failureAnalysis, rollbackIntelligence, loading, error } = useAnalytics();

  if (loading) return <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-40 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />)}</div>;
  if (error) return <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">{error}</div>;

  const { totalChanges, deployed, failed, rolledBack, changeFailureRate, failureByTeam, serviceRiskRanking } = failureAnalysis;

  const pieData = [
    { name: "Deployed", value: deployed, fill: "#22c55e" },
    { name: "Failed", value: failed, fill: "#ef4444" },
    { name: "Rolled Back", value: rolledBack, fill: "#f97316" },
    { name: "Other", value: totalChanges - deployed - failed - rolledBack, fill: "#94a3b8" },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Change Failure Analysis</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          DORA-aligned change failure rate tracking with service regression risk analysis
        </p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        {[
          { label: "Total Changes", value: totalChanges, icon: Target, color: "#3b82f6" },
          { label: "Deployed", value: deployed, icon: Target, color: "#22c55e" },
          { label: "Failed", value: failed, icon: XCircle, color: "#ef4444" },
          { label: "Rolled Back", value: rolledBack, icon: RotateCcw, color: "#f97316" },
          { label: "Failure Rate", value: `${changeFailureRate}%`, icon: TrendingDown, color: changeFailureRate > 15 ? "#ef4444" : changeFailureRate > 5 ? "#eab308" : "#22c55e" },
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
        {/* Deployment Outcome Pie */}
        <Card>
          <CardHeader><CardTitle>Deployment Outcomes</CardTitle></CardHeader>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}>
                  {pieData.map((entry, idx) => <Cell key={idx} fill={entry.fill} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Team Failure Rates */}
        <Card>
          <CardHeader><CardTitle>Failure Rate by Team</CardTitle></CardHeader>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={failureByTeam} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 11 }} stroke="#94a3b8" domain={[0, 100]} />
                <YAxis dataKey="team" type="category" tick={{ fontSize: 11 }} stroke="#94a3b8" width={100} />
                <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0" }} />
                <Bar dataKey="avgRisk" name="Avg Risk" radius={[0, 4, 4, 0]}>
                  {failureByTeam.map((entry, idx) => <Cell key={idx} fill={riskColor(entry.avgRisk)} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Service Risk Ranking */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <CardTitle>Service Regression Risk Ranking</CardTitle>
          </div>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <th className="pb-3 font-medium text-gray-500 dark:text-gray-400">Rank</th>
                <th className="pb-3 font-medium text-gray-500 dark:text-gray-400">Service</th>
                <th className="pb-3 font-medium text-gray-500 dark:text-gray-400">Avg Risk Exposure</th>
                <th className="pb-3 font-medium text-gray-500 dark:text-gray-400">Changes Touching Service</th>
                <th className="pb-3 font-medium text-gray-500 dark:text-gray-400">Risk Level</th>
              </tr>
            </thead>
            <tbody>
              {serviceRiskRanking.map((svc, idx) => (
                <tr key={svc.service} className="border-b border-gray-50 dark:border-gray-800">
                  <td className="py-3 font-bold text-gray-400">#{idx + 1}</td>
                  <td className="py-3 font-medium text-gray-900 dark:text-gray-100">{svc.service}</td>
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-20 rounded-full bg-gray-100 dark:bg-gray-800">
                        <div className="h-2 rounded-full" style={{ width: `${svc.avgRiskExposure}%`, backgroundColor: riskColor(svc.avgRiskExposure) }} />
                      </div>
                      <span className="text-xs font-medium">{svc.avgRiskExposure}</span>
                    </div>
                  </td>
                  <td className="py-3 text-gray-600 dark:text-gray-400">{svc.changeCount}</td>
                  <td className="py-3">
                    <span className="rounded-full px-2 py-0.5 text-xs font-medium" style={{ backgroundColor: riskColor(svc.avgRiskExposure) + "20", color: riskColor(svc.avgRiskExposure) }}>
                      {svc.avgRiskExposure >= 80 ? "Critical" : svc.avgRiskExposure >= 60 ? "High" : svc.avgRiskExposure >= 40 ? "Medium" : "Low"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Rollback Intelligence */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Rollback Intelligence</CardTitle>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Rollback rate: <span className="font-bold">{rollbackIntelligence.rollbackRate}%</span>
            </span>
          </div>
        </CardHeader>
        {rollbackIntelligence.rollbackData.length > 0 ? (
          <div className="space-y-3">
            {rollbackIntelligence.rollbackData.map((rb) => (
              <div key={rb.id} className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-800/50">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{rb.id}: {rb.title}</p>
                  <p className="text-xs text-gray-500">{rb.team} · {rb.category} · Rollback: {rb.rollbackComplexity}</p>
                </div>
                <span className="rounded-full px-2 py-0.5 text-xs font-medium" style={{ backgroundColor: riskColor(rb.risk) + "20", color: riskColor(rb.risk) }}>
                  Risk {rb.risk}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="py-6 text-center text-sm text-gray-400">No rollbacks recorded — great stability!</p>
        )}
      </Card>
    </div>
  );
}
