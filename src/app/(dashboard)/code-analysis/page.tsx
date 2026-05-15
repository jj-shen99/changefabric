"use client";

import { useState, useEffect } from "react";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, Legend,
  LineChart, Line,
} from "recharts";
import {
  Shield, AlertTriangle,
  Brain, GitCommitHorizontal, RefreshCw, ExternalLink, FileCode2, User,
  CheckCircle2, TrendingUp, Sparkles, Save, Eye, EyeOff, Key,
  BarChart3,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/card";
import { PageHeader } from "@/components/page-header";

interface GitFile { filename: string; status: string; additions: number; deletions: number; fileRisk?: number; }
interface GitCommit { sha: string; shortSha: string; message: string; author: string; date: string; filesChanged: number; additions: number; deletions: number; riskScore: number; riskLevel: string; files: GitFile[]; }
interface AuthorBreakdown { author: string; commits: number; avgRisk: number; additions: number; deletions: number; }
interface FeatureImpact { feature: string; description: string; impactScore: number; impactLevel: string; filesAffected: number; churn: number; commits: number; riskFactors: string[]; }
interface ProductionConcern { type: string; severity: string; title: string; description: string; evidence: string[]; mitigation: string; }
interface PerformanceInsight { category: string; level: string; score: number; description: string; files: string[]; }
interface GitAnalysisData {
  repoUrl: string; owner: string; repo: string; days: number; sinceDate: string;
  summary: { totalCommits: number; totalFilesChanged: number; totalAdditions: number; totalDeletions: number; avgRisk: number; overallRiskFactor: number; criticalCount: number; highCount: number; mediumCount: number; lowCount: number; };
  commits: GitCommit[]; authorBreakdown: AuthorBreakdown[];
  featureImpact?: FeatureImpact[]; productionConcerns?: ProductionConcern[]; performanceInsights?: PerformanceInsight[];
}

export default function CodeAnalysisPage() {
  const [gitData, setGitData] = useState<GitAnalysisData | null>(null);
  const [gitLoading, setGitLoading] = useState(false);
  const [gitError, setGitError] = useState<string | null>(null);
  const [gitRepo, setGitRepo] = useState("");
  const [gitDays, setGitDays] = useState(14);
  const [expandedCommit, setExpandedCommit] = useState<string | null>(null);

  // Authentication state
  const [gitUser, setGitUser] = useState("");
  const [gitPassword, setGitPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [saveCredentials, setSaveCredentials] = useState(false);
  const [credentialsSaved, setCredentialsSaved] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<{ success: boolean; message: string } | null>(null);

  // Save analysis state
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saveDescription, setSaveDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Load saved credentials on mount
  useEffect(() => {
    loadSavedCredentials();
  }, []);

  async function loadSavedCredentials() {
    try {
      // First check if credentials exist
      const res = await fetch("/api/settings/integrations");
      if (res.ok) {
        const data = await res.json();
        if (data.git?.hasPassword) {
          setCredentialsSaved(true);
          // Load full credentials including decrypted password
          const credRes = await fetch("/api/settings/integrations/credentials?type=git");
          if (credRes.ok) {
            const creds = await credRes.json();
            if (creds.instance) setGitRepo(creds.instance);
            if (creds.user) setGitUser(creds.user);
            if (creds.password) setGitPassword(creds.password);
          }
        } else if (data.git?.user) {
          setGitUser(data.git.user);
        }
        if (data.git?.instance) setGitRepo(data.git.instance);
      }
    } catch { /* ignore */ }
  }

  async function testConnection() {
    setTestingConnection(true);
    setConnectionStatus(null);
    try {
      const res = await fetch("/api/settings/integrations/test-git", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: gitUser, password: gitPassword }),
      });
      const data = await res.json();
      setConnectionStatus({ success: data.success, message: data.message });
    } catch (err) {
      setConnectionStatus({ success: false, message: err instanceof Error ? err.message : "Connection test failed" });
    } finally {
      setTestingConnection(false);
    }
  }

  async function saveCredentialsToServer() {
    try {
      const res = await fetch("/api/settings/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "git", user: gitUser, password: gitPassword }),
      });
      if (res.ok) {
        setCredentialsSaved(true);
        setConnectionStatus({ success: true, message: "Credentials saved successfully" });
      }
    } catch { /* ignore */ }
  }

  async function fetchGitAnalysis() {
    setGitLoading(true);
    setGitError(null);
    try {
      // Build URL with optional credentials
      let url = `/api/data/git-analysis?repo=${encodeURIComponent(gitRepo)}&days=${gitDays}`;
      if (gitUser && gitPassword) {
        url += `&user=${encodeURIComponent(gitUser)}&pass=${encodeURIComponent(gitPassword)}`;
      }
      const res = await fetch(url);
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      setGitData(await res.json());

      // Save credentials if checkbox is checked
      if (saveCredentials && gitUser && gitPassword) {
        await saveCredentialsToServer();
      }
    } catch (err) {
      setGitError(err instanceof Error ? err.message : String(err));
    } finally {
      setGitLoading(false);
    }
  }

  async function saveCurrentAnalysis() {
    if (!saveName.trim()) { setSaveError("Please enter a name"); return; }
    setSaving(true); setSaveError(null); setSaveSuccess(false);
    try {
      const res = await fetch("/api/analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: saveName,
          description: saveDescription,
          analysisType: "code",
          repoUrl: gitRepo,
          codeRiskScore: gitData?.summary.overallRiskFactor,
          analysisData: { gitData, gitDays, gitRepo },
        }),
      });
      if (res.ok) {
        setSaveSuccess(true);
        setSaveName("");
        setSaveDescription("");
        setTimeout(() => { setSaveModalOpen(false); setSaveSuccess(false); }, 1500);
      } else {
        const data = await res.json();
        setSaveError(data.error || "Failed to save");
      }
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  // Helper functions
  const riskColor = (score: number) => score >= 75 ? "text-red-600" : score >= 50 ? "text-orange-500" : score >= 25 ? "text-amber-500" : "text-green-600";
  const riskLbl = (score: number) => score >= 75 ? "Critical" : score >= 50 ? "High" : score >= 25 ? "Medium" : "Low";
  const riskBgCls = (score: number) => score >= 75 ? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300" : score >= 50 ? "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300" : score >= 25 ? "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300" : "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300";

  return (
    <>
      <PageHeader title="Code Analysis" subtitle="Analyze Git repository commits for risk factors and code change patterns" />
      <div className="space-y-6 p-4 md:p-6">
        {/* Repository Input + Authentication */}
        <Card className="border-purple-200 bg-purple-50/30 dark:border-purple-900 dark:bg-purple-950/20">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Brain className="h-5 w-5 text-purple-600" />
              Code Change Analysis
            </CardTitle>
            <CardDescription className="text-sm">
              Pull commits from a Git repository and analyze code changes for risk factors.
            </CardDescription>
          </CardHeader>
          <div className="px-4 pb-4 space-y-4">
            {/* Repository URL and Days */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1">
                <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Repository URL</label>
                <input
                  type="text"
                  value={gitRepo}
                  onChange={(e) => setGitRepo(e.target.value)}
                  placeholder="https://github.com/owner/repo"
                  className="w-full rounded-lg border border-purple-200 bg-white py-2 px-3 text-sm outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 dark:border-purple-800 dark:bg-gray-900 dark:text-gray-100"
                />
              </div>
              <div className="w-32">
                <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Days back</label>
                <select
                  value={gitDays}
                  onChange={(e) => setGitDays(Number(e.target.value))}
                  className="w-full rounded-lg border border-purple-200 bg-white py-2 px-3 text-sm outline-none dark:border-purple-800 dark:bg-gray-900 dark:text-gray-100"
                >
                  <option value={7}>7 days</option>
                  <option value={14}>14 days</option>
                  <option value={30}>30 days</option>
                  <option value={60}>60 days</option>
                </select>
              </div>
            </div>

            {/* Authentication Section */}
            <div className="rounded-lg border border-purple-100 bg-white p-4 dark:border-purple-800 dark:bg-gray-900">
              <div className="flex items-center gap-2 mb-3">
                <Key className="h-4 w-4 text-purple-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Git Authentication</span>
                {credentialsSaved && <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900 dark:text-green-300">Saved</span>}
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Username</label>
                  <input
                    type="text"
                    value={gitUser}
                    onChange={(e) => setGitUser(e.target.value)}
                    placeholder="username"
                    className="w-full rounded-lg border border-gray-200 bg-white py-2 px-3 text-sm outline-none focus:border-purple-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Password / Token</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={gitPassword}
                      onChange={(e) => setGitPassword(e.target.value)}
                      placeholder="password or personal access token"
                      className="w-full rounded-lg border border-gray-200 bg-white py-2 px-3 pr-10 text-sm outline-none focus:border-purple-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <input
                    type="checkbox"
                    checked={saveCredentials}
                    onChange={(e) => setSaveCredentials(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  Save credentials for future use
                </label>
                <button
                  onClick={testConnection}
                  disabled={testingConnection || !gitUser}
                  className="flex items-center gap-1.5 rounded-lg border border-purple-200 px-3 py-1.5 text-xs font-medium text-purple-700 hover:bg-purple-50 disabled:opacity-50 dark:border-purple-700 dark:text-purple-300 dark:hover:bg-purple-900"
                >
                  {testingConnection ? <RefreshCw className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                  Test Connection
                </button>
              </div>
              {connectionStatus && (
                <div className={`mt-2 rounded-lg p-2 text-xs ${connectionStatus.success ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300" : "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"}`}>
                  {connectionStatus.message}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              <button
                onClick={fetchGitAnalysis}
                disabled={gitLoading || !gitRepo}
                className="flex items-center gap-2 rounded-lg bg-purple-600 px-5 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
              >
                {gitLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <GitCommitHorizontal className="h-4 w-4" />}
                {gitLoading ? "Analyzing…" : "Analyze Commits"}
              </button>
              {gitData && (
                <button
                  onClick={() => {
                    // Generate default filename with repo name and timestamp
                    const repoName = gitRepo.split("/").pop()?.replace(".git", "") || "repo";
                    const timestamp = new Date().toISOString().slice(0, 16).replace("T", "_").replace(":", "");
                    setSaveName(`${repoName}-${timestamp}`);
                    setSaveModalOpen(true);
                  }}
                  className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm font-medium text-green-700 hover:bg-green-100 dark:border-green-800 dark:bg-green-950 dark:text-green-300"
                >
                  <Save className="h-4 w-4" />
                  Save Analysis
                </button>
              )}
            </div>
          </div>
        </Card>

        {/* Error Display */}
        {gitError && (
          <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">
            <strong>Error:</strong> {gitError}
          </div>
        )}

        {/* Loading State */}
        {gitLoading && !gitData && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 animate-pulse rounded-xl bg-purple-100/50 dark:bg-purple-900/20" />
            ))}
          </div>
        )}

        {/* Analysis Results */}
        {gitData && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
              <Card className="p-4">
                <div className="flex items-center gap-2">
                  <GitCommitHorizontal className="h-4 w-4 text-purple-500" />
                  <span className="text-sm text-gray-500 dark:text-gray-400">Commits</span>
                </div>
                <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100">{gitData.summary.totalCommits}</p>
                <p className="text-xs text-gray-400">last {gitData.days} days</p>
              </Card>
              <Card className="p-4" title="Formula: (avg_commit_risk × 0.4) + (churn_ratio × 0.3) + (high_risk_ratio × 0.3)">
                <div className="flex items-center gap-2">
                  <Brain className="h-4 w-4 text-purple-500" />
                  <span className="text-sm text-gray-500 dark:text-gray-400">Code Change Risk</span>
                </div>
                <p className={`mt-1 text-2xl font-bold ${riskColor(gitData.summary.overallRiskFactor)}`}>{gitData.summary.overallRiskFactor}</p>
                <p className="text-xs text-gray-400">{riskLbl(gitData.summary.overallRiskFactor)}</p>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  <span className="text-sm text-gray-500 dark:text-gray-400">Avg Commit Risk</span>
                </div>
                <p className={`mt-1 text-2xl font-bold ${riskColor(gitData.summary.avgRisk)}`}>{gitData.summary.avgRisk}</p>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-2">
                  <FileCode2 className="h-4 w-4 text-blue-500" />
                  <span className="text-sm text-gray-500 dark:text-gray-400">Code Churn</span>
                </div>
                <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {(gitData.summary.totalAdditions + gitData.summary.totalDeletions).toLocaleString()}
                </p>
                <p className="text-xs text-gray-400">+{gitData.summary.totalAdditions.toLocaleString()} / −{gitData.summary.totalDeletions.toLocaleString()}</p>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-red-500" />
                  <span className="text-sm text-gray-500 dark:text-gray-400">High Risk Commits</span>
                </div>
                <p className="mt-1 text-2xl font-bold text-red-600">{gitData.summary.criticalCount + gitData.summary.highCount}</p>
              </Card>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-purple-500" /> Commit Risk Distribution
                  </CardTitle>
                </CardHeader>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[
                      { bucket: "Critical", count: gitData.summary.criticalCount, fill: "#ef4444" },
                      { bucket: "High", count: gitData.summary.highCount, fill: "#f97316" },
                      { bucket: "Medium", count: gitData.summary.mediumCount, fill: "#eab308" },
                      { bucket: "Low", count: gitData.summary.lowCount, fill: "#22c55e" },
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="bucket" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                      <YAxis tick={{ fontSize: 13 }} stroke="#94a3b8" />
                      <Tooltip />
                      <Bar dataKey="count" name="Commits" radius={[4, 4, 0, 0]}>
                        {[{ fill: "#ef4444" }, { fill: "#f97316" }, { fill: "#eab308" }, { fill: "#22c55e" }].map((e, i) => (
                          <Cell key={i} fill={e.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-4 w-4 text-blue-500" /> Risk by Author
                  </CardTitle>
                </CardHeader>
                <div className="overflow-x-auto max-h-64 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-white dark:bg-gray-900">
                      <tr className="border-b border-gray-100 dark:border-gray-800">
                        <th className="pb-2 text-left font-medium text-gray-500 dark:text-gray-400">Author</th>
                        <th className="pb-2 text-center font-medium text-gray-500 dark:text-gray-400">Commits</th>
                        <th className="pb-2 text-center font-medium text-gray-500 dark:text-gray-400">Avg Risk</th>
                        <th className="pb-2 text-right font-medium text-gray-500 dark:text-gray-400">Churn</th>
                      </tr>
                    </thead>
                    <tbody>
                      {gitData.authorBreakdown.map((a) => (
                        <tr key={a.author} className="border-b border-gray-50 dark:border-gray-800">
                          <td className="py-2 font-medium text-gray-900 dark:text-gray-100 text-sm">{a.author}</td>
                          <td className="py-2 text-center text-sm">{a.commits}</td>
                          <td className="py-2 text-center">
                            <span className={`inline-block rounded-full px-2 py-0.5 text-sm font-bold ${riskBgCls(a.avgRisk)}`}>{a.avgRisk}</span>
                          </td>
                          <td className="py-2 text-right text-sm text-gray-500">+{a.additions} / −{a.deletions}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>

            {/* Daily Commit Risk Trend */}
            {(() => {
              const dayMap: Record<string, { count: number; riskSum: number }> = {};
              gitData.commits.forEach(c => {
                const day = new Date(c.date).toISOString().slice(0, 10);
                if (!dayMap[day]) dayMap[day] = { count: 0, riskSum: 0 };
                dayMap[day].count++;
                dayMap[day].riskSum += c.riskScore;
              });
              const trendData = Object.entries(dayMap)
                .sort((a, b) => a[0].localeCompare(b[0]))
                .map(([date, d]) => ({
                  date: new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
                  avgRisk: Math.round(d.riskSum / d.count),
                  commits: d.count,
                }));
              return trendData.length > 1 ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-purple-500" /> Daily Commit Risk Trend
                    </CardTitle>
                    <CardDescription>Average risk score per day over the analysis period.</CardDescription>
                  </CardHeader>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={trendData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                        <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" domain={[0, 100]} />
                        <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "13px" }} />
                        <Legend wrapperStyle={{ fontSize: "13px" }} />
                        <Line type="monotone" dataKey="avgRisk" name="Avg Risk" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                        <Line type="monotone" dataKey="commits" name="Commits" stroke="#94a3b8" strokeWidth={1} strokeDasharray="4 4" dot={{ r: 2 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              ) : null;
            })()}

            {/* File Hotspot Map */}
            {(() => {
              const fileMap: Record<string, { risk: number; churn: number; commits: number }> = {};
              gitData.commits.forEach(c => {
                c.files.forEach(f => {
                  const name = f.filename;
                  if (!fileMap[name]) fileMap[name] = { risk: 0, churn: 0, commits: 0 };
                  fileMap[name].risk = Math.max(fileMap[name].risk, f.fileRisk || 0);
                  fileMap[name].churn += f.additions + f.deletions;
                  fileMap[name].commits++;
                });
              });
              const hotspots = Object.entries(fileMap)
                .map(([file, d]) => ({ file, shortName: file.split("/").pop() || file, ...d }))
                .sort((a, b) => b.risk - a.risk)
                .slice(0, 10);
              if (hotspots.length === 0) return null;
              const maxChurn = Math.max(...hotspots.map(h => h.churn), 1);
              return (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileCode2 className="h-4 w-4 text-purple-500" /> File Hotspot Map — Top 10 Riskiest Files
                    </CardTitle>
                    <CardDescription>Size = code churn. Color = max risk score.</CardDescription>
                  </CardHeader>
                  <div className="px-4 pb-4">
                    <div className="flex flex-wrap gap-1">
                      {hotspots.map((h) => {
                        const minSize = 48;
                        const maxSize = 140;
                        const size = Math.round(minSize + (h.churn / maxChurn) * (maxSize - minSize));
                        const bg = h.risk >= 75 ? "bg-red-500" : h.risk >= 50 ? "bg-orange-400" : h.risk >= 25 ? "bg-amber-300" : "bg-green-400";
                        const textColor = h.risk >= 50 ? "text-white" : "text-gray-900";
                        return (
                          <div
                            key={h.file}
                            className={`rounded ${bg} ${textColor} flex flex-col items-center justify-center p-1 overflow-hidden transition-transform hover:scale-105 hover:z-10 hover:shadow-lg cursor-default`}
                            style={{ width: size, height: size }}
                            title={`${h.file}\nRisk: ${h.risk} | Churn: +${h.churn} lines | ${h.commits} commits`}
                          >
                            <span className="text-[10px] font-bold truncate w-full text-center leading-tight">{h.shortName}</span>
                            <span className="text-xs font-bold mt-0.5">{h.risk}</span>
                            <span className="text-[9px] opacity-75">±{h.churn}</span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex justify-center gap-4 mt-3 text-xs text-gray-400">
                      <span className="flex items-center gap-1"><span className="h-2 w-2 rounded bg-red-500" /> Critical (≥75)</span>
                      <span className="flex items-center gap-1"><span className="h-2 w-2 rounded bg-orange-400" /> High (50-74)</span>
                      <span className="flex items-center gap-1"><span className="h-2 w-2 rounded bg-amber-300" /> Medium (25-49)</span>
                      <span className="flex items-center gap-1"><span className="h-2 w-2 rounded bg-green-400" /> Low (&lt;25)</span>
                    </div>
                  </div>
                </Card>
              );
            })()}

            {/* Repository Risk Profile Radar */}
            {(() => {
              const totalCommits = gitData.summary.totalCommits;
              const highRiskPct = totalCommits > 0 ? Math.round((gitData.summary.criticalCount + gitData.summary.highCount) / totalCommits * 100) : 0;
              const avgChurnPerCommit = totalCommits > 0 ? Math.round((gitData.summary.totalAdditions + gitData.summary.totalDeletions) / totalCommits) : 0;
              const uniqueAuthors = gitData.authorBreakdown.length;
              const avgFilesPerCommit = totalCommits > 0 ? Math.round(gitData.summary.totalFilesChanged / totalCommits) : 0;
              const radarData = [
                { factor: "Avg Risk", value: gitData.summary.avgRisk, fullMark: 100 },
                { factor: "High Risk %", value: highRiskPct, fullMark: 100 },
                { factor: "Churn Rate", value: Math.min(100, avgChurnPerCommit / 5), fullMark: 100 },
                { factor: "File Spread", value: Math.min(100, avgFilesPerCommit * 10), fullMark: 100 },
                { factor: "Team Size", value: Math.min(100, uniqueAuthors * 15), fullMark: 100 },
                { factor: "Volume", value: Math.min(100, totalCommits * 3), fullMark: 100 },
              ];
              return (
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-purple-500" /> Repository Risk Profile Radar
                      </CardTitle>
                      <CardDescription>Multi-dimensional risk assessment of the repository&apos;s recent activity.</CardDescription>
                    </CardHeader>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart data={radarData}>
                          <PolarGrid stroke="#e2e8f0" />
                          <PolarAngleAxis dataKey="factor" tick={{ fontSize: 10 }} />
                          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9 }} />
                          <Radar name="Risk Profile" dataKey="value" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.2} />
                          <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "11px" }} />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>

                  {/* AI Code Change Insights */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-purple-500" /> AI Code Change Insights
                      </CardTitle>
                      <CardDescription>Automated intelligence from commit patterns.</CardDescription>
                    </CardHeader>
                    <div className="px-4 pb-4 space-y-2">
                      {(() => {
                        const tc = gitData.summary.totalCommits;
                        const hrc = gitData.summary.criticalCount + gitData.summary.highCount;
                        const avgChurn = tc > 0 ? Math.round((gitData.summary.totalAdditions + gitData.summary.totalDeletions) / tc) : 0;
                        const insights: { icon: string; text: string; severity: string }[] = [];
                        if (hrc > tc * 0.3) insights.push({ icon: "🔴", text: `${Math.round(hrc / tc * 100)}% of commits are high/critical risk`, severity: "critical" });
                        if (avgChurn > 200) insights.push({ icon: "📊", text: `High average churn (${avgChurn} lines/commit)`, severity: "high" });
                        if (gitData.summary.avgRisk < 25) insights.push({ icon: "✅", text: `Low average risk score (${gitData.summary.avgRisk}/100)`, severity: "info" });
                        if (gitData.summary.avgRisk >= 50) insights.push({ icon: "🔥", text: `Elevated average risk (${gitData.summary.avgRisk}/100)`, severity: "high" });
                        const addDeleteRatio = gitData.summary.totalDeletions > 0 ? (gitData.summary.totalAdditions / gitData.summary.totalDeletions).toFixed(1) : "∞";
                        insights.push({ icon: "📈", text: `Add/Delete ratio: ${addDeleteRatio}:1`, severity: "info" });
                        if (insights.length === 0) insights.push({ icon: "✅", text: "No significant concerns detected", severity: "info" });
                        const sevColor = (s: string) => s === "critical" ? "border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/20" : s === "high" ? "border-orange-200 bg-orange-50/50 dark:border-orange-800 dark:bg-orange-950/20" : "border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/20";
                        return insights.map((ins, i) => (
                          <div key={i} className={`rounded-lg border p-2 ${sevColor(ins.severity)}`}>
                            <div className="flex items-start gap-2">
                              <span className="text-sm">{ins.icon}</span>
                              <p className="text-xs text-gray-700 dark:text-gray-300">{ins.text}</p>
                            </div>
                          </div>
                        ));
                      })()}
                    </div>
                  </Card>
                </div>
              );
            })()}

            {/* Commits Table */}
            <Card>
              <CardHeader>
                <CardTitle>All Commits — Risk Assessment ({gitData.commits.length})</CardTitle>
                <CardDescription>Click a row to see file-level details.</CardDescription>
              </CardHeader>
              <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-white dark:bg-gray-900 z-10">
                    <tr className="border-b border-gray-100 dark:border-gray-800">
                      <th className="pb-3 text-left font-medium text-gray-500 dark:text-gray-400">Commit</th>
                      <th className="pb-3 text-center font-medium text-gray-500 dark:text-gray-400">Risk</th>
                      <th className="pb-3 text-center font-medium text-gray-500 dark:text-gray-400">Level</th>
                      <th className="pb-3 text-center font-medium text-gray-500 dark:text-gray-400">Files</th>
                      <th className="pb-3 text-center font-medium text-gray-500 dark:text-gray-400">+/−</th>
                      <th className="pb-3 text-left font-medium text-gray-500 dark:text-gray-400">Author</th>
                      <th className="pb-3 text-left font-medium text-gray-500 dark:text-gray-400">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gitData.commits.map((c) => (
                      <>
                        <tr
                          key={c.sha}
                          className={`cursor-pointer border-b border-gray-50 dark:border-gray-800 hover:bg-purple-50 dark:hover:bg-purple-950/20 ${expandedCommit === c.sha ? "bg-purple-50 dark:bg-purple-950/20" : ""}`}
                          onClick={() => setExpandedCommit(expandedCommit === c.sha ? null : c.sha)}
                        >
                          <td className="py-2.5">
                            <span className="font-mono text-[11px] text-purple-500">{c.shortSha}</span>
                            <p className="font-medium text-gray-900 dark:text-gray-100 text-xs line-clamp-1">{c.message}</p>
                          </td>
                          <td className="py-2.5 text-center">
                            <span className={`inline-block rounded-full px-2.5 py-0.5 text-sm font-bold ${riskBgCls(c.riskScore)}`}>{c.riskScore}</span>
                          </td>
                          <td className="py-2.5 text-center">
                            <span className={`text-xs font-semibold capitalize ${riskColor(c.riskScore)}`}>{c.riskLevel}</span>
                          </td>
                          <td className="py-2.5 text-center text-xs">{c.filesChanged}</td>
                          <td className="py-2.5 text-center text-xs">
                            <span className="text-green-600">+{c.additions}</span> / <span className="text-red-500">−{c.deletions}</span>
                          </td>
                          <td className="py-2.5 text-xs text-gray-600 dark:text-gray-400">{c.author}</td>
                          <td className="py-2.5 text-xs text-gray-400">{new Date(c.date).toLocaleDateString()}</td>
                        </tr>
                        {expandedCommit === c.sha && (
                          <tr key={`${c.sha}-files`}>
                            <td colSpan={7} className="bg-purple-50/50 dark:bg-purple-950/10 p-3">
                              <div className="space-y-1">
                                {c.files.map((f, i) => (
                                  <div key={i} className="flex items-center justify-between text-xs">
                                    <span className="font-mono text-gray-600 dark:text-gray-400 truncate max-w-[400px]">{f.filename}</span>
                                    <div className="flex items-center gap-3">
                                      <span className="text-green-600">+{f.additions}</span>
                                      <span className="text-red-500">−{f.deletions}</span>
                                      {f.fileRisk !== undefined && (
                                        <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${riskBgCls(f.fileRisk)}`}>{f.fileRisk}</span>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Repository Link */}
            <div className="flex items-center gap-3 text-sm text-gray-400">
              <a href={gitData.repoUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-purple-600 hover:underline">
                <ExternalLink className="h-3 w-3" /> {gitData.owner}/{gitData.repo}
              </a>
              <span>·</span>
              <span>Since {new Date(gitData.sinceDate).toLocaleDateString()}</span>
              <span>·</span>
              <span>{gitData.summary.totalFilesChanged} files touched</span>
            </div>
          </>
        )}

        {/* Save Analysis Modal */}
        {saveModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Save Code Analysis</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label>
                  <input
                    type="text"
                    value={saveName}
                    onChange={(e) => setSaveName(e.target.value)}
                    placeholder="e.g., Sprint 28 Code Review"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-purple-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                  <textarea
                    value={saveDescription}
                    onChange={(e) => setSaveDescription(e.target.value)}
                    placeholder="Optional notes..."
                    rows={3}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-purple-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                  />
                </div>
                <div className="rounded-lg bg-gray-50 p-3 text-sm text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                  <p><strong>Repository:</strong> {gitRepo}</p>
                  <p><strong>Risk Score:</strong> {gitData?.summary.overallRiskFactor}</p>
                  <p><strong>Commits:</strong> {gitData?.summary.totalCommits}</p>
                </div>
                {saveError && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">{saveError}</div>}
                {saveSuccess && <div className="rounded-lg bg-green-50 p-3 text-sm text-green-700 dark:bg-green-950 dark:text-green-300">Analysis saved!</div>}
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button onClick={() => { setSaveModalOpen(false); setSaveError(null); }} className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800">Cancel</button>
                <button onClick={saveCurrentAnalysis} disabled={saving || !saveName.trim()} className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50">
                  {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
