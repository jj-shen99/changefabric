"use client";

import { useState, useEffect } from "react";
import {
  FileText, Trash2, RefreshCw, Calendar, Brain, Code2, ClipboardCheck,
  BarChart3, ChevronDown, Download, Eye,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/card";
import { PageHeader } from "@/components/page-header";

interface SavedAnalysis {
  id: string;
  name: string;
  description: string | null;
  analysisType: string;
  changeRequestId: string | null;
  repoUrl: string | null;
  analysisDate: string;
  overallScore: number | null;
  planReadyScore: number | null;
  mlScore: number | null;
  codeRiskScore: number | null;
  createdBy: string;
  createdAt: string;
}

const typeConfig: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  plan: { label: "Plan Analysis", icon: ClipboardCheck, color: "bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300" },
  ml: { label: "ML Analysis", icon: Brain, color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300" },
  code: { label: "Code Analysis", icon: Code2, color: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300" },
  combined: { label: "Combined", icon: BarChart3, color: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" },
};

export default function ReportsPage() {
  const [analyses, setAnalyses] = useState<SavedAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"date" | "name" | "score">("date");

  useEffect(() => {
    loadAnalyses();
  }, []);

  async function loadAnalyses() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/analysis");
      if (!res.ok) { throw new Error("Failed to load analyses"); }
      const data = await res.json();
      setAnalyses(data.analyses || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  async function deleteAnalysis(id: string) {
    if (!confirm("Are you sure you want to delete this analysis?")) { return; }
    try {
      const res = await fetch(`/api/analysis?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setAnalyses(prev => prev.filter(a => a.id !== id));
      }
    } catch { /* ignore */ }
  }


  const filtered = analyses.filter(a => filterType === "all" || a.analysisType === filterType);
  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === "date") { return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(); }
    if (sortBy === "name") { return a.name.localeCompare(b.name); }
    const scoreA = a.overallScore ?? a.planReadyScore ?? a.mlScore ?? a.codeRiskScore ?? 0;
    const scoreB = b.overallScore ?? b.planReadyScore ?? b.mlScore ?? b.codeRiskScore ?? 0;
    return scoreB - scoreA;
  });

  const stats = {
    total: analyses.length,
    plan: analyses.filter(a => a.analysisType === "plan").length,
    ml: analyses.filter(a => a.analysisType === "ml").length,
    code: analyses.filter(a => a.analysisType === "code").length,
    combined: analyses.filter(a => a.analysisType === "combined").length,
  };

  return (
    <>
      <PageHeader title="Reports" subtitle="View and manage saved analysis results" />
      <div className="space-y-6 p-4 md:p-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="p-4">
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.total}</div>
            <div className="text-sm text-gray-500">Total Reports</div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-teal-600" />
              <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.plan}</span>
            </div>
            <div className="text-sm text-gray-500">Plan Analysis</div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-indigo-600" />
              <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.ml}</span>
            </div>
            <div className="text-sm text-gray-500">ML Analysis</div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2">
              <Code2 className="h-5 w-5 text-purple-600" />
              <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.code}</span>
            </div>
            <div className="text-sm text-gray-500">Code Analysis</div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.combined}</span>
            </div>
            <div className="text-sm text-gray-500">Combined</div>
          </Card>
        </div>

        {/* Filters and Actions */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="appearance-none rounded-lg border border-gray-200 bg-white pl-3 pr-8 py-2 text-sm outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              >
                <option value="all">All Types</option>
                <option value="plan">Plan Analysis</option>
                <option value="ml">ML Analysis</option>
                <option value="code">Code Analysis</option>
                <option value="combined">Combined</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as "date" | "name" | "score")}
                className="appearance-none rounded-lg border border-gray-200 bg-white pl-3 pr-8 py-2 text-sm outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              >
                <option value="date">Sort by Date</option>
                <option value="name">Sort by Name</option>
                <option value="score">Sort by Score</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>
          <button
            onClick={loadAnalyses}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {/* Reports List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Saved Analysis Reports
            </CardTitle>
            <CardDescription>
              {sorted.length} report{sorted.length !== 1 ? "s" : ""} found
            </CardDescription>
          </CardHeader>
          <div className="p-4 pt-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
              </div>
            ) : error ? (
              <div className="rounded-lg bg-red-50 p-4 text-center text-red-700 dark:bg-red-950 dark:text-red-300">
                {error}
              </div>
            ) : sorted.length === 0 ? (
              <div className="py-12 text-center text-gray-500">
                <FileText className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                <p className="text-lg font-medium">No saved analyses</p>
                <p className="text-sm">Save an analysis from the Impact Analysis or Code Analysis pages</p>
              </div>
            ) : (
              <div className="space-y-3">
                {sorted.map((analysis) => {
                  const config = typeConfig[analysis.analysisType] || typeConfig.combined;
                  const Icon = config.icon;
                  const score = analysis.overallScore ?? analysis.planReadyScore ?? analysis.mlScore ?? analysis.codeRiskScore;

                  return (
                    <div key={analysis.id} className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                      <div className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          <div className={`rounded-lg p-2 ${config.color}`}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-gray-900 dark:text-gray-100 truncate">{analysis.name}</span>
                              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${config.color}`}>
                                {config.label}
                              </span>
                            </div>
                            {analysis.description && (
                              <p className="text-sm text-gray-500 truncate mt-0.5">{analysis.description}</p>
                            )}
                            <div className="flex items-center gap-4 mt-1 text-xs text-gray-400">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {new Date(analysis.createdAt).toLocaleDateString()}
                              </span>
                              {analysis.changeRequestId && <span>CR: {analysis.changeRequestId}</span>}
                              {analysis.repoUrl && <span className="truncate max-w-[200px]">{analysis.repoUrl.split("/").slice(-2).join("/")}</span>}
                              <span>by {analysis.createdBy}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 ml-4">
                          {score !== null && (
                            <div className={`text-lg font-bold ${score >= 75 ? "text-green-600" : score >= 50 ? "text-yellow-600" : "text-red-600"}`}>
                              {Math.round(score)}
                            </div>
                          )}
                          <button
                            onClick={() => {
                              // Preview HTML report in new tab (no download param = preview)
                              window.open(`/api/analysis/${analysis.id}/html`, "_blank");
                            }}
                            className="rounded-lg p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950"
                            title="Preview Report"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              // Download HTML report (download=true triggers attachment header)
                              const link = document.createElement("a");
                              link.href = `/api/analysis/${analysis.id}/html?download=true`;
                              link.click();
                            }}
                            className="rounded-lg p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-950"
                            title="Download HTML Report"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => deleteAnalysis(analysis.id)}
                            className="rounded-lg p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Card>
      </div>
    </>
  );
}
