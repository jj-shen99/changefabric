"use client";

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  AreaChart,
  Area,
} from "recharts";
import {
  RotateCcw,
  GitPullRequest,
  Timer,
  Target,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/card";
import { useData } from "@/hooks";

const leadTimeBreakdown = [
  { stage: "Code Review", avgHours: 8.5 },
  { stage: "Automated Tests", avgHours: 1.2 },
  { stage: "Security Scan", avgHours: 0.8 },
  { stage: "UAT/Approval", avgHours: 24 },
  { stage: "Staging Deploy", avgHours: 0.5 },
  { stage: "Canary/Rollout", avgHours: 4 },
  { stage: "Full Deploy", avgHours: 0.3 },
];

const weeklyDeployHealth = [
  { week: "W1 Feb", success: 96, avgRisk: 22, mttr: 18, changes: 12 },
  { week: "W2 Feb", success: 92, avgRisk: 30, mttr: 25, changes: 15 },
  { week: "W3 Feb", success: 100, avgRisk: 18, mttr: 12, changes: 10 },
  { week: "W4 Feb", success: 88, avgRisk: 42, mttr: 35, changes: 18 },
  { week: "W1 Mar", success: 93, avgRisk: 35, mttr: 28, changes: 14 },
  { week: "W2 Mar", success: 90, avgRisk: 38, mttr: 22, changes: 8 },
];

export default function MetricsPage() {
  const { dashboardMetrics, riskTrendData, validationTrendData, deploymentFrequencyData, loading, error } = useData();

  if (loading) return <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-40 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />)}</div>;
  if (error) return <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">{error}</div>;
  if (!dashboardMetrics) return <div className="text-gray-500">No metrics data available</div>;

  const doraMetrics = [
    { label: "Deployment Frequency", value: "3.2/day", target: "4/day", icon: GitPullRequest, color: "text-blue-600", bg: "bg-blue-50", status: "good" },
    { label: "Lead Time for Changes", value: dashboardMetrics.changeLeadTime, target: "< 3 days", icon: Timer, color: "text-purple-600", bg: "bg-purple-50", status: "needs_improvement" },
    { label: "Mean Time to Recovery", value: dashboardMetrics.mttr, target: "< 30 min", icon: RotateCcw, color: "text-green-600", bg: "bg-green-50", status: "good" },
    { label: "Change Failure Rate", value: `${dashboardMetrics.rollbackRate}%`, target: "< 5%", icon: Target, color: "text-amber-600", bg: "bg-amber-50", status: "good" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Metrics & Trends</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          DORA metrics, deployment health trends, and performance insights
        </p>
      </div>

      {/* DORA Metrics */}
      <div>
        <h2 className="text-sm font-semibold uppercase text-gray-400 mb-3">DORA Metrics</h2>
        <div className="grid grid-cols-4 gap-4">
          {doraMetrics.map((metric) => (
            <Card key={metric.label} className="p-4">
              <div className="flex items-start justify-between">
                <div className={`rounded-lg p-2 ${metric.bg}`}>
                  <metric.icon className={`h-4 w-4 ${metric.color}`} />
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    metric.status === "good"
                      ? "bg-green-100 text-green-700"
                      : metric.status === "needs_improvement"
                      ? "bg-amber-100 text-amber-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {metric.status === "good" ? "On Target" : "Needs Improvement"}
                </span>
              </div>
              <div className="mt-3">
                <p className="text-2xl font-bold text-gray-900">{metric.value}</p>
                <p className="text-xs text-gray-500">{metric.label}</p>
                <p className="mt-1 text-[10px] text-gray-400">Target: {metric.target}</p>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Risk & Validation Trends */}
      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Risk Score Trend</CardTitle>
            <CardDescription>Average risk score per week with deployment count</CardDescription>
          </CardHeader>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={riskTrendData}>
                <defs>
                  <linearGradient id="riskGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" domain={[0, 100]} />
                <Tooltip
                  contentStyle={{
                    borderRadius: "8px",
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="avgRisk"
                  stroke="#2563eb"
                  fill="url(#riskGradient)"
                  strokeWidth={2}
                  name="Avg Risk"
                />
                <Legend />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Validation Pass Rate Trend</CardTitle>
            <CardDescription>Weekly test pass rate across all validation types</CardDescription>
          </CardHeader>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={validationTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" domain={[80, 100]} />
                <Tooltip
                  contentStyle={{
                    borderRadius: "8px",
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="passRate"
                  stroke="#22c55e"
                  strokeWidth={2}
                  dot={{ r: 4, fill: "#22c55e" }}
                  name="Pass Rate %"
                />
                <Line
                  type="monotone"
                  dataKey="totalTests"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  dot={{ r: 4, fill: "#8b5cf6" }}
                  name="Total Tests"
                  yAxisId="right"
                />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <Legend />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Lead Time Breakdown & Deployment Frequency */}
      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Lead Time Breakdown by Stage</CardTitle>
            <CardDescription>Average hours spent in each deployment pipeline stage</CardDescription>
          </CardHeader>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={leadTimeBreakdown} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <YAxis
                  type="category"
                  dataKey="stage"
                  tick={{ fontSize: 11 }}
                  stroke="#94a3b8"
                  width={110}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: "8px",
                    border: "1px solid #e2e8f0",
                  }}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(value: any) => [`${value} hours`, "Avg Time"]}
                />
                <Bar dataKey="avgHours" fill="#8b5cf6" radius={[0, 4, 4, 0]} name="Avg Hours" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Deployment Frequency & Outcomes</CardTitle>
            <CardDescription>Weekly deployment success, failures, and rollbacks</CardDescription>
          </CardHeader>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={deploymentFrequencyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{
                    borderRadius: "8px",
                    border: "1px solid #e2e8f0",
                  }}
                />
                <Bar dataKey="successful" stackId="a" fill="#22c55e" name="Successful" />
                <Bar dataKey="failed" stackId="a" fill="#ef4444" name="Failed" />
                <Bar dataKey="rolledBack" stackId="a" fill="#f97316" name="Rolled Back" radius={[4, 4, 0, 0]} />
                <Legend />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Weekly Deploy Health Table */}
      <Card>
        <CardHeader>
          <CardTitle>Weekly Deployment Health Summary</CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="pb-3 font-medium text-gray-500">Week</th>
                <th className="pb-3 font-medium text-gray-500">Deployments</th>
                <th className="pb-3 font-medium text-gray-500">Success Rate</th>
                <th className="pb-3 font-medium text-gray-500">Avg Risk Score</th>
                <th className="pb-3 font-medium text-gray-500">MTTR (min)</th>
                <th className="pb-3 font-medium text-gray-500">Health</th>
              </tr>
            </thead>
            <tbody>
              {weeklyDeployHealth.map((w) => {
                const health =
                  w.success >= 95 && w.avgRisk < 30
                    ? "Excellent"
                    : w.success >= 90 && w.avgRisk < 40
                    ? "Good"
                    : w.success >= 85
                    ? "Fair"
                    : "Poor";
                const healthColor =
                  health === "Excellent"
                    ? "bg-green-100 text-green-800"
                    : health === "Good"
                    ? "bg-blue-100 text-blue-800"
                    : health === "Fair"
                    ? "bg-amber-100 text-amber-800"
                    : "bg-red-100 text-red-800";

                return (
                  <tr key={w.week} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-3 font-medium text-gray-900">{w.week}</td>
                    <td className="py-3 text-gray-600">{w.changes}</td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-20 rounded-full bg-gray-100 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              w.success >= 95 ? "bg-green-400" : w.success >= 90 ? "bg-blue-400" : "bg-amber-400"
                            }`}
                            style={{ width: `${w.success}%` }}
                          />
                        </div>
                        <span className="text-gray-700 font-medium">{w.success}%</span>
                      </div>
                    </td>
                    <td className="py-3">
                      <span
                        className={`rounded px-2 py-0.5 text-xs font-semibold ${
                          w.avgRisk >= 40
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-green-100 text-green-800"
                        }`}
                      >
                        {w.avgRisk}
                      </span>
                    </td>
                    <td className="py-3 text-gray-600">{w.mttr}m</td>
                    <td className="py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${healthColor}`}>
                        {health}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
