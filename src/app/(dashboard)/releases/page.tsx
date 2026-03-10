"use client";

import { useState } from "react";
import { Rocket, Calendar, User, GitPullRequest, AlertTriangle, CheckCircle2, Clock, RotateCcw, ChevronDown, ChevronUp } from "lucide-react";
import { Card } from "@/components/card";
import { RiskBadge } from "@/components/risk-badge";
import { ChangeStatusBadge, ValidationStatusBadge } from "@/components/status-badge";
import { useData } from "@/hooks";
import { formatDate } from "@/lib/utils";

const statusConfig: Record<string, { label: string; className: string; icon: React.ElementType }> = {
  planning: { label: "Planning", className: "bg-gray-100 text-gray-700", icon: Clock },
  staging: { label: "Staging", className: "bg-amber-100 text-amber-800", icon: AlertTriangle },
  canary: { label: "Canary", className: "bg-blue-100 text-blue-800", icon: Rocket },
  rolling_out: { label: "Rolling Out", className: "bg-purple-100 text-purple-800", icon: Rocket },
  completed: { label: "Completed", className: "bg-green-100 text-green-800", icon: CheckCircle2 },
  rolled_back: { label: "Rolled Back", className: "bg-red-100 text-red-800", icon: RotateCcw },
};

export default function ReleasesPage() {
  const { releases, changeRequests, loading, error } = useData();
  const [expandedRelease, setExpandedRelease] = useState<string | null>(null);

  if (loading) return <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-40 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />)}</div>;
  if (error) return <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">{error}</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Releases</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Release timeline, bundled changes, and deployment readiness</p>
      </div>

      {/* Release Timeline */}
      <div className="space-y-6">
        {releases.map((release) => {
          const config = statusConfig[release.status];
          const StatusIcon = config.icon;
          const relatedChanges = changeRequests.filter((cr) =>
            release.changeRequests.includes(cr.id)
          );
          const totalValidations = relatedChanges.flatMap((cr) => cr.validations);
          const passedValidations = totalValidations.filter((v) => v.status === "passed").length;
          const failedValidations = totalValidations.filter((v) => v.status === "failed").length;
          const pendingValidations = totalValidations.filter(
            (v) => v.status === "pending" || v.status === "running"
          ).length;
          const validationPassRate =
            totalValidations.length > 0
              ? Math.round((passedValidations / totalValidations.length) * 100)
              : 0;

          return (
            <Card key={release.id} className="overflow-hidden">
              {/* Release Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className={`rounded-xl p-3 ${
                    release.status === "completed" ? "bg-green-100" :
                    release.status === "staging" ? "bg-amber-100" :
                    "bg-blue-100"
                  }`}>
                    <Rocket className={`h-6 w-6 ${
                      release.status === "completed" ? "text-green-600" :
                      release.status === "staging" ? "text-amber-600" :
                      "text-blue-600"
                    }`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold text-gray-900">{release.name}</h2>
                      <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-mono text-gray-500">
                        v{release.version}
                      </span>
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${config.className}`}>
                        <StatusIcon className="h-3 w-3" />
                        {config.label}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        Scheduled: {formatDate(release.scheduledDate)}
                      </span>
                      {release.actualDate && (
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                          Deployed: {formatDate(release.actualDate)}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <User className="h-3.5 w-3.5" />
                        {release.releaseManager}
                      </span>
                    </div>
                  </div>
                </div>
                <RiskBadge score={release.overallRisk} size="lg" />
              </div>

              {release.notes && (
                <p className="mt-3 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-600">
                  📋 {release.notes}
                </p>
              )}

              {/* Validation Readiness Bar */}
              <div className="mt-4">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-medium text-gray-700">Deployment Readiness</span>
                  <span className="text-gray-500">
                    {passedValidations}/{totalValidations.length} validations passed ({validationPassRate}%)
                  </span>
                </div>
                <div className="flex h-2 rounded-full overflow-hidden bg-gray-100">
                  {totalValidations.length > 0 && (
                    <>
                      <div
                        className="bg-green-400 transition-all"
                        style={{ width: `${(passedValidations / totalValidations.length) * 100}%` }}
                      />
                      <div
                        className="bg-red-400 transition-all"
                        style={{ width: `${(failedValidations / totalValidations.length) * 100}%` }}
                      />
                      <div
                        className="bg-blue-300 animate-pulse transition-all"
                        style={{ width: `${(pendingValidations / totalValidations.length) * 100}%` }}
                      />
                    </>
                  )}
                </div>
                <div className="mt-1 flex gap-4 text-[10px] text-gray-400">
                  <span className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-400" /> {passedValidations} Passed
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-400" /> {failedValidations} Failed
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-300" /> {pendingValidations} Pending/Running
                  </span>
                </div>
              </div>

              {/* Bundled Changes */}
              {relatedChanges.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-xs font-semibold uppercase text-gray-400 mb-2">
                    Bundled Changes ({relatedChanges.length})
                  </h4>
                  <div className="space-y-2">
                    {relatedChanges.map((cr) => (
                      <div
                        key={cr.id}
                        className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 p-3"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <GitPullRequest className="h-3.5 w-3.5 text-gray-400" />
                            <span className="font-mono text-xs text-gray-400">{cr.id}</span>
                            <span className="text-sm font-medium text-gray-900">{cr.title}</span>
                          </div>
                          <div className="mt-1 flex items-center gap-3 text-xs text-gray-400">
                            <span>{cr.team}</span>
                            <span>•</span>
                            <span>{cr.author}</span>
                            <span>•</span>
                            <span className="capitalize">{cr.category.replace(/_/g, " ")}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <ChangeStatusBadge status={cr.status} />
                          <RiskBadge score={cr.impact.overallRisk} size="sm" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {relatedChanges.length === 0 && (
                <p className="mt-4 text-sm text-gray-400 text-center py-2">
                  No change requests bundled in this release
                </p>
              )}

              {/* All Validations for this Release */}
              {totalValidations.length > 0 && (
                <div className="mt-4">
                  <button
                    onClick={() => setExpandedRelease(expandedRelease === release.id ? null : release.id)}
                    className="flex w-full items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-xs font-semibold uppercase text-gray-500 hover:bg-gray-100 dark:bg-gray-800/50 dark:text-gray-400 dark:hover:bg-gray-800"
                  >
                    <span>All Validations ({totalValidations.length})</span>
                    {expandedRelease === release.id ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </button>
                  {expandedRelease === release.id && (
                    <div className="mt-2 space-y-2">
                      {relatedChanges.map((cr) => (
                        <div key={cr.id}>
                          <p className="mb-1 text-[10px] font-semibold uppercase text-gray-400 dark:text-gray-500">
                            {cr.id} — {cr.title}
                          </p>
                          <div className="space-y-1">
                            {cr.validations.map((v) => (
                              <div
                                key={v.id}
                                className="flex items-center justify-between rounded-lg border border-gray-100 p-2 dark:border-gray-800"
                              >
                                <div>
                                  <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{v.name}</p>
                                  <p className="text-[10px] text-gray-400">{v.type.replace(/_/g, " ")}</p>
                                  {v.duration && <p className="text-[10px] text-gray-400">{v.duration}</p>}
                                  {v.details && <p className="mt-0.5 text-[10px] text-gray-500 dark:text-gray-400">{v.details}</p>}
                                </div>
                                <ValidationStatusBadge status={v.status} />
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
