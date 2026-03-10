"use client";

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from "recharts";
import { CheckCircle2, AlertTriangle, XCircle, Pause, Play, RotateCcw, Shield } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/card";
import { useAnalytics } from "@/hooks/use-analytics";

function confidenceColor(score: number) {
  if (score >= 80) return "#22c55e";
  if (score >= 60) return "#eab308";
  if (score >= 40) return "#f97316";
  return "#ef4444";
}

const recConfig: Record<string, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  continue: { label: "Continue Rollout", icon: Play, color: "text-green-700", bg: "bg-green-50 dark:bg-green-950" },
  pause: { label: "Pause & Investigate", icon: Pause, color: "text-amber-700", bg: "bg-amber-50 dark:bg-amber-950" },
  rollback: { label: "Recommend Rollback", icon: RotateCcw, color: "text-red-700", bg: "bg-red-50 dark:bg-red-950" },
};

export default function ConfidencePage() {
  const { confidenceScores, loading, error } = useAnalytics();

  if (loading) return <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-40 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />)}</div>;
  if (error) return <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">{error}</div>;

  const chartData = confidenceScores.map((cs) => ({
    name: cs.releaseName,
    confidence: cs.confidence,
    passRate: cs.breakdown.testPassRate,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Release Confidence Scores</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Composite confidence scoring with automated continue / pause / rollback recommendations
        </p>
      </div>

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
                {/* Confidence gauge */}
                <div className="relative flex h-16 w-16 items-center justify-center">
                  <svg className="h-16 w-16 -rotate-90" viewBox="0 0 36 36">
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none" stroke="#e5e7eb" strokeWidth="3"
                    />
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none" stroke={confidenceColor(cs.confidence)} strokeWidth="3"
                      strokeDasharray={`${cs.confidence}, 100`}
                    />
                  </svg>
                  <span className="absolute text-sm font-bold" style={{ color: confidenceColor(cs.confidence) }}>
                    {cs.confidence}
                  </span>
                </div>
              </div>

              {/* Recommendation */}
              <div className={`mt-4 flex items-center gap-2 rounded-lg px-3 py-2 ${rec.bg}`}>
                <RecIcon className={`h-4 w-4 ${rec.color}`} />
                <span className={`text-sm font-medium ${rec.color}`}>{rec.label}</span>
              </div>

              {/* Breakdown */}
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500 dark:text-gray-400">Test Pass Rate</span>
                  <span className="font-medium text-gray-700 dark:text-gray-300">{cs.breakdown.testPassRate}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-800">
                  <div className="h-1.5 rounded-full bg-blue-500" style={{ width: `${cs.breakdown.testPassRate}%` }} />
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500 dark:text-gray-400">Test Coverage</span>
                  <span className="font-medium text-gray-700 dark:text-gray-300">{cs.breakdown.testCoverage}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-800">
                  <div className="h-1.5 rounded-full bg-purple-500" style={{ width: `${cs.breakdown.testCoverage}%` }} />
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500 dark:text-gray-400">Risk Score</span>
                  <span className="font-medium text-gray-700 dark:text-gray-300">{cs.breakdown.riskScore}/100</span>
                </div>
                <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-800">
                  <div className="h-1.5 rounded-full" style={{ width: `${cs.breakdown.riskScore}%`, backgroundColor: confidenceColor(100 - cs.breakdown.riskScore) }} />
                </div>
              </div>

              {/* Summary stats */}
              <div className="mt-4 grid grid-cols-3 gap-2 border-t border-gray-100 pt-3 dark:border-gray-800">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{cs.passedValidations}</span>
                  </div>
                  <p className="text-[10px] text-gray-400">Passed</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <XCircle className="h-3 w-3 text-red-500" />
                    <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{cs.failedValidations}</span>
                  </div>
                  <p className="text-[10px] text-gray-400">Failed</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Shield className="h-3 w-3 text-amber-500" />
                    <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{cs.breakdown.rollbackComplexity}</span>
                  </div>
                  <p className="text-[10px] text-gray-400">Rollback</p>
                </div>
              </div>

              {cs.breakdown.hasBlockers && (
                <div className="mt-3 flex items-center gap-1.5 rounded bg-red-50 px-2 py-1 text-xs text-red-700 dark:bg-red-950 dark:text-red-400">
                  <AlertTriangle className="h-3 w-3" />
                  Active blockers detected
                </div>
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
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#94a3b8" />
              <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" domain={[0, 100]} />
              <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0" }} />
              <Bar dataKey="confidence" name="Confidence" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, idx) => (
                  <Cell key={idx} fill={confidenceColor(entry.confidence)} />
                ))}
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
          <div className="rounded-lg bg-blue-50 p-3 dark:bg-blue-950">
            <p className="font-bold text-blue-700 dark:text-blue-300">40%</p>
            <p className="text-blue-600 dark:text-blue-400">Test Pass Rate</p>
          </div>
          <div className="rounded-lg bg-purple-50 p-3 dark:bg-purple-950">
            <p className="font-bold text-purple-700 dark:text-purple-300">25%</p>
            <p className="text-purple-600 dark:text-purple-400">Test Coverage</p>
          </div>
          <div className="rounded-lg bg-amber-50 p-3 dark:bg-amber-950">
            <p className="font-bold text-amber-700 dark:text-amber-300">20%</p>
            <p className="text-amber-600 dark:text-amber-400">Inverse Risk Score</p>
          </div>
          <div className="rounded-lg bg-green-50 p-3 dark:bg-green-950">
            <p className="font-bold text-green-700 dark:text-green-300">15%</p>
            <p className="text-green-600 dark:text-green-400">No Blockers</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
