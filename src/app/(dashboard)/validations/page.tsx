"use client";

import { useState } from "react";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Filter,
  AlertTriangle,
  TestTube2,
  ShieldCheck,
  Eye,
  Gauge,
  RotateCcw,
  Code2,
  Rocket,
  FlaskConical,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { Card, CardHeader, CardTitle } from "@/components/card";
import { ValidationStatusBadge } from "@/components/status-badge";
import { useData } from "@/hooks";
import { ValidationStatus, ValidationType } from "@/lib/types";

const typeIcons: Record<ValidationType, React.ElementType> = {
  unit_test: TestTube2,
  integration_test: FlaskConical,
  performance_test: Gauge,
  security_scan: ShieldCheck,
  code_review: Code2,
  uat: Eye,
  smoke_test: Rocket,
  regression_test: RotateCcw,
  canary_deploy: Rocket,
  rollback_test: RotateCcw,
};

export default function ValidationsPage() {
  const { changeRequests, loading, error } = useData();
  const [typeFilter, setTypeFilter] = useState<ValidationType | "all">("all");
  const [statusFilter, setStatusFilter] = useState<ValidationStatus | "all">("all");

  if (loading) return <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-32 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />)}</div>;
  if (error) return <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">{error}</div>;

  const allValidations = changeRequests.flatMap((cr) =>
    cr.validations.map((v) => ({ ...v, changeId: cr.id, changeTitle: cr.title, team: cr.team }))
  );

  const filtered = allValidations.filter((v) => {
    const matchType = typeFilter === "all" || v.type === typeFilter;
    const matchStatus = statusFilter === "all" || v.status === statusFilter;
    return matchType && matchStatus;
  });

  // Stats
  const total = allValidations.length;
  const passed = allValidations.filter((v) => v.status === "passed").length;
  const failed = allValidations.filter((v) => v.status === "failed").length;
  const running = allValidations.filter((v) => v.status === "running").length;
  const pending = allValidations.filter((v) => v.status === "pending").length;

  const pieData = [
    { name: "Passed", value: passed, color: "#22c55e" },
    { name: "Failed", value: failed, color: "#ef4444" },
    { name: "Running", value: running, color: "#3b82f6" },
    { name: "Pending", value: pending, color: "#d1d5db" },
  ];

  // Validations by type
  const typeStats = Object.entries(
    allValidations.reduce((acc, v) => {
      if (!acc[v.type]) acc[v.type] = { total: 0, passed: 0 };
      acc[v.type].total++;
      if (v.status === "passed") acc[v.type].passed++;
      return acc;
    }, {} as Record<string, { total: number; passed: number }>)
  ).map(([type, stats]) => ({
    type: type.replace(/_/g, " "),
    passRate: Math.round((stats.passed / stats.total) * 100),
    total: stats.total,
  }));

  // Changes with blockers
  const blockers = allValidations.filter(
    (v) => v.status === "failed" && v.blockers && v.blockers.length > 0
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Validations</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Track test results, approvals, and deployment gates across all change requests
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-5 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-gray-100 p-2">
              <TestTube2 className="h-4 w-4 text-gray-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{total}</p>
              <p className="text-xs text-gray-500">Total Validations</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-green-100 p-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{passed}</p>
              <p className="text-xs text-gray-500">Passed</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-red-100 p-2">
              <XCircle className="h-4 w-4 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">{failed}</p>
              <p className="text-xs text-gray-500">Failed</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-100 p-2">
              <Loader2 className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-600">{running}</p>
              <p className="text-xs text-gray-500">Running</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-gray-100 p-2">
              <Clock className="h-4 w-4 text-gray-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-400">{pending}</p>
              <p className="text-xs text-gray-500">Pending</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Validation Status Distribution</CardTitle>
          </CardHeader>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-4 text-xs">
            {pieData.map((d) => (
              <span key={d.name} className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: d.color }} />
                {d.name} ({d.value})
              </span>
            ))}
          </div>
        </Card>

        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>Pass Rate by Validation Type</CardTitle>
          </CardHeader>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={typeStats}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="type" tick={{ fontSize: 10 }} stroke="#94a3b8" angle={-20} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" domain={[0, 100]} />
                <Tooltip
                  contentStyle={{
                    borderRadius: "8px",
                    border: "1px solid #e2e8f0",
                  }}
                />
                <Bar dataKey="passRate" fill="#2563eb" radius={[4, 4, 0, 0]} name="Pass Rate %" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Blockers */}
      {blockers.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-800">
              <AlertTriangle className="h-4 w-4" />
              Active Blockers ({blockers.length})
            </CardTitle>
          </CardHeader>
          <div className="space-y-2">
            {blockers.map((v) => (
              <div key={v.id} className="rounded-lg bg-white border border-red-200 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-mono text-xs text-gray-400">{v.changeId}</span>
                    <span className="mx-2 text-gray-300">•</span>
                    <span className="text-sm font-medium text-gray-900">{v.name}</span>
                  </div>
                  <ValidationStatusBadge status={v.status} />
                </div>
                {v.blockers?.map((b, i) => (
                  <p key={i} className="mt-1 text-sm text-red-700">⚠ {b}</p>
                ))}
                {v.details && (
                  <p className="mt-1 text-xs text-gray-500">{v.details}</p>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Filters */}
      <Card className="p-4">
        <div className="flex items-center gap-3">
          <Filter className="h-4 w-4 text-gray-400" />
          <select
            aria-label="Filter by validation type"
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as ValidationType | "all")}
          >
            <option value="all">All Types</option>
            <option value="unit_test">Unit Test</option>
            <option value="integration_test">Integration Test</option>
            <option value="performance_test">Performance Test</option>
            <option value="security_scan">Security Scan</option>
            <option value="code_review">Code Review</option>
            <option value="uat">UAT</option>
            <option value="smoke_test">Smoke Test</option>
            <option value="regression_test">Regression Test</option>
            <option value="canary_deploy">Canary Deploy</option>
            <option value="rollback_test">Rollback Test</option>
          </select>
          <select
            aria-label="Filter by validation status"
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as ValidationStatus | "all")}
          >
            <option value="all">All Statuses</option>
            <option value="passed">Passed</option>
            <option value="failed">Failed</option>
            <option value="running">Running</option>
            <option value="pending">Pending</option>
          </select>
          <span className="text-xs text-gray-400">{filtered.length} results</span>
        </div>
      </Card>

      {/* Validation List */}
      <div className="space-y-2">
        {filtered.map((v) => {
          const Icon = typeIcons[v.type] || TestTube2;
          return (
            <Card key={`${v.changeId}-${v.id}`} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-gray-100 p-2">
                    <Icon className="h-4 w-4 text-gray-500" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-gray-900">{v.name}</span>
                      <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500">
                        {v.type.replace(/_/g, " ")}
                      </span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-400">
                      <span className="font-mono">{v.changeId}</span>
                      <span>•</span>
                      <span>{v.team}</span>
                      {v.duration && (
                        <>
                          <span>•</span>
                          <span>Duration: {v.duration}</span>
                        </>
                      )}
                      {v.coverage !== undefined && (
                        <>
                          <span>•</span>
                          <span>Coverage: {v.coverage}%</span>
                        </>
                      )}
                    </div>
                    {v.details && (
                      <p className="mt-1 text-xs text-gray-500">{v.details}</p>
                    )}
                  </div>
                </div>
                <ValidationStatusBadge status={v.status} />
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
