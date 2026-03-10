"use client";

import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from "recharts";
import { Shield, Users, Clock, Layers } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/card";
import { RiskBadge } from "@/components/risk-badge";
import { RiskGauge } from "@/components/risk-gauge";
import { useData } from "@/hooks";
import { getRiskBg, getRiskLabel } from "@/lib/utils";
import { useState } from "react";

export default function ImpactPage() {
  const { changeRequests, impactByCategory, loading, error } = useData();
  const [selectedCR, setSelectedCR] = useState<string | null>(null);

  if (loading) return <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-40 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />)}</div>;
  if (error) return <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">{error}</div>;
  if (changeRequests.length === 0) return <div className="text-gray-500">No change requests found</div>;

  const activeId = selectedCR || changeRequests[0].id;
  const cr = changeRequests.find((c) => c.id === activeId) || changeRequests[0];

  const radarData = [
    { dimension: "Outage", score: cr.impact.outageRisk, fullMark: 100 },
    { dimension: "Performance", score: cr.impact.performanceRisk, fullMark: 100 },
    { dimension: "Functionality", score: cr.impact.functionalityRisk, fullMark: 100 },
    { dimension: "Security", score: cr.impact.securityRisk, fullMark: 100 },
    { dimension: "Data Integrity", score: cr.impact.dataIntegrityRisk, fullMark: 100 },
  ];

  const sortedByRisk = [...changeRequests].sort(
    (a, b) => b.impact.overallRisk - a.impact.overallRisk
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Impact Analysis</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Comprehensive risk assessment across outage, performance, functionality, security, and data integrity</p>
      </div>

      {/* Risk Heatmap - All Changes */}
      <Card>
        <CardHeader>
          <CardTitle>Risk Heatmap — All Change Requests</CardTitle>
          <CardDescription>Click a row to view detailed impact analysis</CardDescription>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="pb-3 text-left font-medium text-gray-500">Change</th>
                <th className="pb-3 text-center font-medium text-gray-500">Overall</th>
                <th className="pb-3 text-center font-medium text-gray-500">Outage</th>
                <th className="pb-3 text-center font-medium text-gray-500">Performance</th>
                <th className="pb-3 text-center font-medium text-gray-500">Functionality</th>
                <th className="pb-3 text-center font-medium text-gray-500">Security</th>
                <th className="pb-3 text-center font-medium text-gray-500">Data Integrity</th>
                <th className="pb-3 text-center font-medium text-gray-500">Blast Radius</th>
                <th className="pb-3 text-center font-medium text-gray-500">Rollback</th>
              </tr>
            </thead>
            <tbody>
              {sortedByRisk.map((c) => (
                <tr
                  key={c.id}
                  className={`cursor-pointer border-b border-gray-50 transition-colors hover:bg-blue-50 ${
                    selectedCR === c.id ? "bg-blue-50" : ""
                  }`}
                  onClick={() => setSelectedCR(c.id)}
                >
                  <td className="py-3">
                    <div>
                      <span className="font-mono text-xs text-gray-400">{c.id}</span>
                      <p className="font-medium text-gray-900 text-xs">{c.title}</p>
                    </div>
                  </td>
                  <td className="py-3 text-center">
                    <RiskBadge score={c.impact.overallRisk} size="sm" />
                  </td>
                  {[
                    c.impact.outageRisk,
                    c.impact.performanceRisk,
                    c.impact.functionalityRisk,
                    c.impact.securityRisk,
                    c.impact.dataIntegrityRisk,
                  ].map((score, i) => (
                    <td key={i} className="py-3 text-center">
                      <span
                        className={`inline-block rounded px-2 py-0.5 text-xs font-semibold ${getRiskBg(score)}`}
                      >
                        {score}
                      </span>
                    </td>
                  ))}
                  <td className="py-3 text-center">
                    <span className={`text-xs font-medium capitalize ${
                      c.impact.blastRadius === "critical" ? "text-red-600" :
                      c.impact.blastRadius === "high" ? "text-orange-600" :
                      c.impact.blastRadius === "medium" ? "text-yellow-600" :
                      "text-green-600"
                    }`}>
                      {c.impact.blastRadius}
                    </span>
                  </td>
                  <td className="py-3 text-center">
                    <span className={`text-xs font-medium capitalize ${
                      c.impact.rollbackComplexity === "critical" ? "text-red-600" :
                      c.impact.rollbackComplexity === "high" ? "text-orange-600" :
                      c.impact.rollbackComplexity === "medium" ? "text-yellow-600" :
                      "text-green-600"
                    }`}>
                      {c.impact.rollbackComplexity}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Selected Change Detail */}
      <div className="grid grid-cols-3 gap-6">
        {/* Radar Chart */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle className="text-sm">Risk Radar — {cr.id}</CardTitle>
          </CardHeader>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 11 }} />
                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10 }} />
                <Radar
                  name="Risk Score"
                  dataKey="score"
                  stroke="#2563eb"
                  fill="#2563eb"
                  fillOpacity={0.2}
                  strokeWidth={2}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Risk Gauges */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle className="text-sm">Individual Risk Scores</CardTitle>
          </CardHeader>
          <div className="grid grid-cols-2 gap-4">
            <RiskGauge score={cr.impact.outageRisk} label="Outage Risk" size="sm" />
            <RiskGauge score={cr.impact.performanceRisk} label="Performance Risk" size="sm" />
            <RiskGauge score={cr.impact.functionalityRisk} label="Functionality Risk" size="sm" />
            <RiskGauge score={cr.impact.securityRisk} label="Security Risk" size="sm" />
            <RiskGauge score={cr.impact.dataIntegrityRisk} label="Data Integrity" size="sm" />
            <RiskGauge score={cr.impact.overallRisk} label="Overall Risk" size="sm" />
          </div>
        </Card>

        {/* Impact Summary */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle className="text-sm">Impact Summary — {cr.id}</CardTitle>
          </CardHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-3">
              <Users className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-xs text-gray-500">Affected Users</p>
                <p className="text-lg font-bold text-gray-900">{cr.impact.affectedUsers.toLocaleString()}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-3">
              <Clock className="h-5 w-5 text-amber-500" />
              <div>
                <p className="text-xs text-gray-500">Estimated Downtime</p>
                <p className="text-lg font-bold text-gray-900">{cr.impact.estimatedDowntime}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-3">
              <Layers className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-xs text-gray-500">Affected Services</p>
                <p className="text-lg font-bold text-gray-900">{cr.impact.affectedServices.length}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-3">
              <Shield className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-xs text-gray-500">Blast Radius</p>
                <p className="text-lg font-bold text-gray-900 capitalize">{cr.impact.blastRadius}</p>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-gray-400 mb-1">Services Impacted</p>
              <div className="flex flex-wrap gap-1">
                {cr.impact.affectedServices.map((s) => (
                  <span key={s} className="rounded bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Risk by Category */}
      <Card>
        <CardHeader>
          <CardTitle>Average Risk Score by Change Category</CardTitle>
        </CardHeader>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={impactByCategory} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12 }} stroke="#94a3b8" />
              <YAxis type="category" dataKey="category" tick={{ fontSize: 12 }} stroke="#94a3b8" width={100} />
              <Tooltip
                contentStyle={{
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
                  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                }}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(value: any) => [`${value} (${getRiskLabel(Number(value))})`, "Avg Risk"]}
              />
              <Bar dataKey="avgRisk" radius={[0, 4, 4, 0]}>
                {impactByCategory.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={
                      entry.avgRisk >= 80 ? "#ef4444" :
                      entry.avgRisk >= 60 ? "#f97316" :
                      entry.avgRisk >= 40 ? "#eab308" :
                      "#22c55e"
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
