"use client";

import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  GitPullRequest,
  Rocket,
  TrendingDown,
  TrendingUp,
  XCircle,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from "recharts";
import { Card, CardHeader, CardTitle } from "@/components/card";
import { RiskBadge } from "@/components/risk-badge";
import { ChangeStatusBadge } from "@/components/status-badge";
import { RiskGauge } from "@/components/risk-gauge";
import { useData } from "@/hooks";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import DashboardLoading from "./loading";

export default function OverviewPage() {
  const { changeRequests, dashboardMetrics, riskTrendData, deploymentFrequencyData, loading, error } = useData();

  if (loading) return <DashboardLoading />;
  if (error) return <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">{error}</div>;
  if (!dashboardMetrics) return <div className="text-gray-500">No data available</div>;

  const kpiCards = [
    { label: "Total Changes", value: dashboardMetrics.totalChanges, icon: GitPullRequest, color: "text-blue-600", bg: "bg-blue-50", trend: "+12%", trendUp: true },
    { label: "Pending Review", value: dashboardMetrics.pendingChanges, icon: Clock, color: "text-amber-600", bg: "bg-amber-50", trend: "-3", trendUp: false },
    { label: "Deployed Today", value: dashboardMetrics.deployedToday, icon: Rocket, color: "text-green-600", bg: "bg-green-50", trend: "+2", trendUp: true },
    { label: "Failed Deployments", value: dashboardMetrics.failedDeployments, icon: XCircle, color: "text-red-600", bg: "bg-red-50", trend: "+1", trendUp: true },
    { label: "Avg Risk Score", value: dashboardMetrics.avgRiskScore, icon: AlertTriangle, color: "text-yellow-600", bg: "bg-yellow-50", trend: "-5", trendUp: false },
    { label: "Validation Pass Rate", value: `${dashboardMetrics.validationPassRate}%`, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50", trend: "+1.2%", trendUp: true },
    { label: "Avg Deploy Time", value: dashboardMetrics.avgDeployTime, icon: Activity, color: "text-purple-600", bg: "bg-purple-50", trend: "-2m", trendUp: false },
    { label: "Rollback Rate", value: `${dashboardMetrics.rollbackRate}%`, icon: TrendingDown, color: "text-orange-600", bg: "bg-orange-50", trend: "-0.8%", trendUp: false },
  ];

  const highRiskChanges = changeRequests.filter((cr) => cr.impact.overallRisk >= 60);
  const recentChanges = [...changeRequests].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  ).slice(0, 5);

  const avgScore = (fn: (cr: typeof changeRequests[0]) => number) =>
    changeRequests.length > 0 ? Math.round(changeRequests.reduce((a, c) => a + fn(c), 0) / changeRequests.length) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Dashboard Overview</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Software Change & Release Validation — {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700 dark:bg-green-900 dark:text-green-300">
            <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
            System Healthy
          </span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        {kpiCards.map((kpi) => (
          <Card key={kpi.label} className="p-4">
            <div className="flex items-start justify-between">
              <div className={`rounded-lg p-2 ${kpi.bg}`}>
                <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
              </div>
              <span
                className={`flex items-center gap-0.5 text-xs font-medium ${
                  kpi.label === "Failed Deployments" || kpi.label === "Rollback Rate"
                    ? kpi.trendUp
                      ? "text-red-600"
                      : "text-green-600"
                    : kpi.trendUp
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                {kpi.trendUp ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {kpi.trend}
              </span>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{kpi.value}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{kpi.label}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* High Risk Changes & Risk Gauges */}
      <div className="grid grid-cols-3 gap-6">
        <Card className="col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>
                <span className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  High Risk Changes Requiring Attention
                </span>
              </CardTitle>
              <Link href="/impact" className="text-xs font-medium text-blue-600 hover:underline">
                View All →
              </Link>
            </div>
          </CardHeader>
          <div className="space-y-3">
            {highRiskChanges.map((cr) => (
              <div
                key={cr.id}
                className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-800/50"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-gray-400">{cr.id}</span>
                    <span className="font-medium text-sm text-gray-900 dark:text-gray-100">{cr.title}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                    <span>{cr.team}</span>
                    <span>•</span>
                    <span>{cr.author}</span>
                    <span>•</span>
                    <span>{cr.impact.affectedServices.length} services affected</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <ChangeStatusBadge status={cr.status} />
                  <RiskBadge score={cr.impact.overallRisk} />
                </div>
              </div>
            ))}
            {highRiskChanges.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">No high risk changes — looking good!</p>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Risk Overview</CardTitle>
          </CardHeader>
          <div className="flex flex-wrap justify-center gap-4">
            <RiskGauge score={dashboardMetrics.avgRiskScore} label="Overall" size="lg" />
            <div className="grid grid-cols-2 gap-3">
              <RiskGauge score={avgScore((c) => c.impact.outageRisk)} label="Outage" />
              <RiskGauge score={avgScore((c) => c.impact.performanceRisk)} label="Performance" />
              <RiskGauge score={avgScore((c) => c.impact.functionalityRisk)} label="Functionality" />
              <RiskGauge score={avgScore((c) => c.impact.securityRisk)} label="Security" />
            </div>
          </div>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Risk Score Trend</CardTitle>
          </CardHeader>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={riskTrendData}>
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
                <Line type="monotone" dataKey="avgRisk" stroke="#2563eb" strokeWidth={2} dot={{ r: 4, fill: "#2563eb" }} name="Avg Risk Score" />
                <Line type="monotone" dataKey="deployments" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 4, fill: "#8b5cf6" }} name="Deployments" />
                <Legend />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Deployment Frequency</CardTitle>
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
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                  }}
                />
                <Bar dataKey="successful" stackId="a" fill="#22c55e" name="Successful" radius={[0, 0, 0, 0]} />
                <Bar dataKey="failed" stackId="a" fill="#ef4444" name="Failed" />
                <Bar dataKey="rolledBack" stackId="a" fill="#f97316" name="Rolled Back" radius={[4, 4, 0, 0]} />
                <Legend />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Recent Changes Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Recent Change Requests</CardTitle>
            <Link href="/changes" className="text-xs font-medium text-blue-600 hover:underline">
              View All →
            </Link>
          </div>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <th className="pb-3 font-medium text-gray-500 dark:text-gray-400">ID</th>
                <th className="pb-3 font-medium text-gray-500 dark:text-gray-400">Title</th>
                <th className="pb-3 font-medium text-gray-500 dark:text-gray-400">Team</th>
                <th className="pb-3 font-medium text-gray-500 dark:text-gray-400">Category</th>
                <th className="pb-3 font-medium text-gray-500 dark:text-gray-400">Status</th>
                <th className="pb-3 font-medium text-gray-500 dark:text-gray-400">Risk</th>
                <th className="pb-3 font-medium text-gray-500 dark:text-gray-400">Created</th>
              </tr>
            </thead>
            <tbody>
              {recentChanges.map((cr) => (
                <tr key={cr.id} className="border-b border-gray-50 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800/50">
                  <td className="py-3 font-mono text-xs text-gray-400">{cr.id}</td>
                  <td className="py-3 font-medium text-gray-900 dark:text-gray-100">{cr.title}</td>
                  <td className="py-3 text-gray-600 dark:text-gray-400">{cr.team}</td>
                  <td className="py-3">
                    <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                      {cr.category.replace("_", " ")}
                    </span>
                  </td>
                  <td className="py-3">
                    <ChangeStatusBadge status={cr.status} />
                  </td>
                  <td className="py-3">
                    <RiskBadge score={cr.impact.overallRisk} size="sm" />
                  </td>
                  <td className="py-3 text-gray-500">{formatDate(cr.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
