"use client";

import { useState } from "react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, PieChart, Pie, Legend,
  LineChart, Line, AreaChart, Area,
} from "recharts";
import {
  AlertTriangle, TrendingDown, RotateCcw, XCircle, Target, Zap, Clock, Users,
  GitPullRequest, TrendingUp, Timer, BarChart3, Calendar,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/card";
import { PageHeader } from "@/components/page-header";
import { useAnalytics } from "@/hooks/use-analytics";
import { useData } from "@/hooks/use-data";

function riskColor(score: number) {
  if (score >= 80) return "#ef4444";
  if (score >= 60) return "#f97316";
  if (score >= 40) return "#eab308";
  return "#22c55e";
}

type AnalyticsTab = "failures" | "velocity" | "metrics";

/* ─── Tab Button ─── */
function TabButton({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: React.ElementType; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
        active
          ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
          : "text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-300"
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

/* ─── Static data for Metrics tab ─── */
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

export default function AnalyticsPage() {
  const [days, setDays] = useState(7);
  const { failureAnalysis, rollbackIntelligence, velocity, loading: aLoading, error: aError } = useAnalytics(days);
  const { dashboardMetrics, riskTrendData, validationTrendData, deploymentFrequencyData, loading: dLoading, error: dError } = useData(days);
  const [activeTab, setActiveTab] = useState<AnalyticsTab>("failures");

  const loading = aLoading || dLoading;
  const error = aError || dError;

  if (loading) return <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-40 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />)}</div>;
  if (error) return <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">{error}</div>;

  const { totalChanges, deployed, failed, rolledBack, changeFailureRate, failureByTeam, serviceRiskRanking } = failureAnalysis;
  const { teamVelocity, categoryBreakdown, approvalEfficiency } = velocity;
  const totalDeployed = teamVelocity.reduce((s, t) => s + t.deployed, 0);
  const totalChangesVel = teamVelocity.reduce((s, t) => s + t.totalChanges, 0);
  const avgLeadTime = approvalEfficiency.length > 0
    ? Math.round(approvalEfficiency.reduce((s, a) => s + a.leadTimeHours, 0) / approvalEfficiency.length * 10) / 10
    : 0;

  const pieData = [
    { name: "Deployed", value: deployed, fill: "#22c55e" },
    { name: "Failed", value: failed, fill: "#ef4444" },
    { name: "Rolled Back", value: rolledBack, fill: "#f97316" },
    { name: "Other", value: totalChanges - deployed - failed - rolledBack, fill: "#94a3b8" },
  ].filter(d => d.value > 0);

  return (
    <>
      <PageHeader title="Analytics" subtitle="Failure analysis, deployment velocity, and DORA metrics & trends" />
    <div className="space-y-6 p-4 md:p-6">

      {/* Tabs + Date Range */}
      <div className="flex items-center justify-between border-b border-gray-200 pb-0.5 dark:border-gray-800">
        <div className="flex gap-1">
          <TabButton active={activeTab === "failures"} onClick={() => setActiveTab("failures")} icon={AlertTriangle} label="Failure Analysis" />
          <TabButton active={activeTab === "velocity"} onClick={() => setActiveTab("velocity")} icon={Zap} label="Velocity" />
          <TabButton active={activeTab === "metrics"} onClick={() => setActiveTab("metrics")} icon={BarChart3} label="Metrics & Trends" />
        </div>
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

      {/* ═══ TAB: FAILURE ANALYSIS ═══ */}
      {activeTab === "failures" && (
        <div className="space-y-6">
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
            <Card>
              <CardHeader><CardTitle>Deployment Outcomes</CardTitle></CardHeader>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} dataKey="value" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}>
                      {pieData.map((entry, idx) => <Cell key={idx} fill={entry.fill} />)}
                    </Pie>
                    <Tooltip /><Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>
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
              <div className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-red-500" /><CardTitle>Service Regression Risk Ranking</CardTitle></div>
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
                <span className="text-xs text-gray-500 dark:text-gray-400">Rollback rate: <span className="font-bold">{rollbackIntelligence.rollbackRate}%</span></span>
              </div>
            </CardHeader>
            {rollbackIntelligence.rollbackData.length > 0 ? (
              <div className="space-y-3">
                {rollbackIntelligence.rollbackData.map((rb) => (
                  <div key={rb.id} className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-800/50">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{rb.id}: {rb.title}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{rb.team} · {rb.category} · Rollback: {rb.rollbackComplexity}</p>
                    </div>
                    <span className="rounded-full px-2 py-0.5 text-xs font-medium" style={{ backgroundColor: riskColor(rb.risk) + "20", color: riskColor(rb.risk) }}>Risk {rb.risk}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-6 text-center text-sm text-gray-400">No rollbacks recorded — great stability!</p>
            )}
          </Card>
        </div>
      )}

      {/* ═══ TAB: VELOCITY ═══ */}
      {activeTab === "velocity" && (
        <div className="space-y-6">
          {/* KPI Row */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {[
              { label: "Total Changes", value: totalChangesVel, icon: GitPullRequest, color: "#3b82f6" },
              { label: "Deployed", value: totalDeployed, icon: Zap, color: "#22c55e" },
              { label: "Avg Lead Time", value: `${avgLeadTime}h`, icon: Clock, color: "#8b5cf6" },
              { label: "Teams Active", value: teamVelocity.length, icon: Users, color: "#f59e0b" },
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
            <Card>
              <CardHeader><CardTitle>Team Velocity</CardTitle></CardHeader>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={teamVelocity}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="team" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                    <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
                    <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0" }} />
                    <Legend />
                    <Bar dataKey="totalChanges" name="Total" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="deployed" name="Deployed" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
            <Card>
              <CardHeader><CardTitle>Change Category Breakdown</CardTitle></CardHeader>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryBreakdown} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis type="number" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                    <YAxis dataKey="category" type="category" tick={{ fontSize: 10 }} stroke="#94a3b8" width={120} />
                    <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0" }} />
                    <Bar dataKey="count" name="Changes" fill="#8b5cf6" radius={[0, 4, 4, 0]}>
                      {categoryBreakdown.map((_, idx) => {
                        const colors = ["#3b82f6", "#8b5cf6", "#f59e0b", "#22c55e", "#ef4444", "#ec4899", "#06b6d4", "#6366f1"];
                        return <Cell key={idx} fill={colors[idx % colors.length]} />;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          {/* Team Performance Table */}
          <Card>
            <CardHeader><div className="flex items-center gap-2"><TrendingUp className="h-4 w-4 text-blue-500" /><CardTitle>Team Performance</CardTitle></div></CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800">
                    <th className="pb-3 font-medium text-gray-500 dark:text-gray-400">Team</th>
                    <th className="pb-3 font-medium text-gray-500 dark:text-gray-400">Changes</th>
                    <th className="pb-3 font-medium text-gray-500 dark:text-gray-400">Deployed</th>
                    <th className="pb-3 font-medium text-gray-500 dark:text-gray-400">Deploy Rate</th>
                    <th className="pb-3 font-medium text-gray-500 dark:text-gray-400">Avg Risk</th>
                  </tr>
                </thead>
                <tbody>
                  {teamVelocity.map((tv) => (
                    <tr key={tv.team} className="border-b border-gray-50 dark:border-gray-800">
                      <td className="py-3 font-medium text-gray-900 dark:text-gray-100">{tv.team}</td>
                      <td className="py-3 text-gray-600 dark:text-gray-400">{tv.totalChanges}</td>
                      <td className="py-3 text-gray-600 dark:text-gray-400">{tv.deployed}</td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-16 rounded-full bg-gray-100 dark:bg-gray-800"><div className="h-2 rounded-full bg-green-500" style={{ width: `${tv.deployRate}%` }} /></div>
                          <span className="text-xs text-gray-500">{tv.deployRate}%</span>
                        </div>
                      </td>
                      <td className="py-3 text-gray-600 dark:text-gray-400">{tv.avgRisk}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Approval Efficiency */}
          <Card>
            <CardHeader><CardTitle>Change Approval Efficiency</CardTitle></CardHeader>
            {approvalEfficiency.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-800">
                      <th className="pb-3 font-medium text-gray-500 dark:text-gray-400">ID</th>
                      <th className="pb-3 font-medium text-gray-500 dark:text-gray-400">Title</th>
                      <th className="pb-3 font-medium text-gray-500 dark:text-gray-400">Team</th>
                      <th className="pb-3 font-medium text-gray-500 dark:text-gray-400">Approvers</th>
                      <th className="pb-3 font-medium text-gray-500 dark:text-gray-400">Lead Time</th>
                      <th className="pb-3 font-medium text-gray-500 dark:text-gray-400">Category</th>
                    </tr>
                  </thead>
                  <tbody>
                    {approvalEfficiency.map((ae) => (
                      <tr key={ae.id} className="border-b border-gray-50 dark:border-gray-800">
                        <td className="py-3 font-mono text-xs text-gray-400">{ae.id}</td>
                        <td className="py-3 font-medium text-gray-900 dark:text-gray-100">{ae.title}</td>
                        <td className="py-3 text-gray-600 dark:text-gray-400">{ae.team}</td>
                        <td className="py-3 text-gray-600 dark:text-gray-400">{ae.approverCount}</td>
                        <td className="py-3">
                          <span className={`text-sm font-medium ${ae.leadTimeHours > 48 ? "text-red-600" : ae.leadTimeHours > 24 ? "text-amber-600" : "text-green-600"}`}>{ae.leadTimeHours}h</span>
                        </td>
                        <td className="py-3"><span className="rounded bg-gray-100 px-2 py-0.5 text-xs capitalize text-gray-600 dark:bg-gray-800 dark:text-gray-400">{ae.category.replace(/_/g, " ")}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="py-6 text-center text-sm text-gray-400">No deployed changes with lead time data</p>
            )}
          </Card>
        </div>
      )}

      {/* ═══ TAB: METRICS & TRENDS ═══ */}
      {activeTab === "metrics" && (
        <div className="space-y-6">
          {/* DORA Metrics */}
          <div>
            <h2 className="text-sm font-semibold uppercase text-gray-400 mb-3">DORA Metrics</h2>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {[
                { label: "Deployment Frequency", value: "3.2/day", target: "4/day", icon: GitPullRequest, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950", status: "good" },
                { label: "Lead Time for Changes", value: dashboardMetrics?.changeLeadTime || "N/A", target: "< 3 days", icon: Timer, color: "text-purple-600", bg: "bg-purple-50 dark:bg-purple-950", status: "needs_improvement" },
                { label: "Mean Time to Recovery", value: dashboardMetrics?.mttr || "N/A", target: "< 30 min", icon: RotateCcw, color: "text-green-600", bg: "bg-green-50 dark:bg-green-950", status: "good" },
                { label: "Change Failure Rate", value: `${dashboardMetrics?.rollbackRate || 0}%`, target: "< 5%", icon: Target, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950", status: "good" },
              ].map((metric) => (
                <Card key={metric.label} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className={`rounded-lg p-2 ${metric.bg}`}><metric.icon className={`h-4 w-4 ${metric.color}`} /></div>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${metric.status === "good" ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" : "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300"}`}>
                      {metric.status === "good" ? "On Target" : "Needs Improvement"}
                    </span>
                  </div>
                  <div className="mt-3">
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{metric.value}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{metric.label}</p>
                    <p className="mt-1 text-[10px] text-gray-400">Target: {metric.target}</p>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Risk & Validation Trends */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
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
                    <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }} />
                    <Area type="monotone" dataKey="avgRisk" stroke="#2563eb" fill="url(#riskGradient)" strokeWidth={2} name="Avg Risk" />
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
                    <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }} />
                    <Line type="monotone" dataKey="passRate" stroke="#22c55e" strokeWidth={2} dot={{ r: 4, fill: "#22c55e" }} name="Pass Rate %" />
                    <Line type="monotone" dataKey="totalTests" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 4, fill: "#8b5cf6" }} name="Total Tests" yAxisId="right" />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                    <Legend />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          {/* Lead Time & Deployment Frequency */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
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
                    <YAxis type="category" dataKey="stage" tick={{ fontSize: 11 }} stroke="#94a3b8" width={110} />
                    <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0" }}
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      formatter={(value: any) => [`${value} hours`, "Avg Time"]} />
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
                    <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0" }} />
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
            <CardHeader><CardTitle>Weekly Deployment Health Summary</CardTitle></CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800">
                    <th className="pb-3 font-medium text-gray-500 dark:text-gray-400">Week</th>
                    <th className="pb-3 font-medium text-gray-500 dark:text-gray-400">Deployments</th>
                    <th className="pb-3 font-medium text-gray-500 dark:text-gray-400">Success Rate</th>
                    <th className="pb-3 font-medium text-gray-500 dark:text-gray-400">Avg Risk Score</th>
                    <th className="pb-3 font-medium text-gray-500 dark:text-gray-400">MTTR (min)</th>
                    <th className="pb-3 font-medium text-gray-500 dark:text-gray-400">Health</th>
                  </tr>
                </thead>
                <tbody>
                  {weeklyDeployHealth.map((w) => {
                    const health = w.success >= 95 && w.avgRisk < 30 ? "Excellent" : w.success >= 90 && w.avgRisk < 40 ? "Good" : w.success >= 85 ? "Fair" : "Poor";
                    const healthColor = health === "Excellent" ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300" : health === "Good" ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300" : health === "Fair" ? "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300" : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
                    return (
                      <tr key={w.week} className="border-b border-gray-50 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800/50">
                        <td className="py-3 font-medium text-gray-900 dark:text-gray-100">{w.week}</td>
                        <td className="py-3 text-gray-600 dark:text-gray-400">{w.changes}</td>
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-20 rounded-full bg-gray-100 overflow-hidden dark:bg-gray-800">
                              <div className={`h-full rounded-full ${w.success >= 95 ? "bg-green-400" : w.success >= 90 ? "bg-blue-400" : "bg-amber-400"}`} style={{ width: `${w.success}%` }} />
                            </div>
                            <span className="text-gray-700 font-medium dark:text-gray-300">{w.success}%</span>
                          </div>
                        </td>
                        <td className="py-3">
                          <span className={`rounded px-2 py-0.5 text-xs font-semibold ${w.avgRisk >= 40 ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300" : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"}`}>{w.avgRisk}</span>
                        </td>
                        <td className="py-3 text-gray-600 dark:text-gray-400">{w.mttr}m</td>
                        <td className="py-3"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${healthColor}`}>{health}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </div>
    </>
  );
}
