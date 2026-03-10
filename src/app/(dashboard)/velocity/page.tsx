"use client";

import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, Legend,
} from "recharts";
import { Zap, Clock, Users, GitPullRequest, TrendingUp } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/card";
import { useAnalytics } from "@/hooks/use-analytics";

export default function VelocityPage() {
  const { velocity, loading, error } = useAnalytics();

  if (loading) return <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-40 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />)}</div>;
  if (error) return <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">{error}</div>;

  const { teamVelocity, categoryBreakdown, approvalEfficiency } = velocity;
  const totalDeployed = teamVelocity.reduce((s, t) => s + t.deployed, 0);
  const totalChanges = teamVelocity.reduce((s, t) => s + t.totalChanges, 0);
  const avgLeadTime = approvalEfficiency.length > 0
    ? Math.round(approvalEfficiency.reduce((s, a) => s + a.leadTimeHours, 0) / approvalEfficiency.length * 10) / 10
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Deployment Velocity</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Track delivery speed per team, identify bottlenecks, and measure approval efficiency
        </p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { label: "Total Changes", value: totalChanges, icon: GitPullRequest, color: "#3b82f6" },
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
        {/* Team Velocity Chart */}
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

        {/* Category Breakdown Chart */}
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

      {/* Team Deployment Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-blue-500" />
            <CardTitle>Team Performance</CardTitle>
          </div>
        </CardHeader>
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
                      <div className="h-2 w-16 rounded-full bg-gray-100 dark:bg-gray-800">
                        <div className="h-2 rounded-full bg-green-500" style={{ width: `${tv.deployRate}%` }} />
                      </div>
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
                      <span className={`text-sm font-medium ${ae.leadTimeHours > 48 ? "text-red-600" : ae.leadTimeHours > 24 ? "text-amber-600" : "text-green-600"}`}>
                        {ae.leadTimeHours}h
                      </span>
                    </td>
                    <td className="py-3">
                      <span className="rounded bg-gray-100 px-2 py-0.5 text-xs capitalize text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                        {ae.category.replace(/_/g, " ")}
                      </span>
                    </td>
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
  );
}
