import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSecret } from "@/lib/crypto";

/* ─── Configuration ─── */
// Configure via GIT_DEFAULT_REPO env var or pass repoUrl in request
const DEFAULT_REPO_URL = process.env.GIT_DEFAULT_REPO || "https://github.com/example/repo";
const DEFAULT_DAYS = 14;

/* ─── Gitea / GitHub-compatible REST API helpers ─── */

interface GitCommit {
  sha: string;
  message: string;
  author: string;
  date: string;
  filesChanged: number;
  additions: number;
  deletions: number;
  files: { filename: string; additions: number; deletions: number; status: string }[];
}

interface CommitRisk {
  sha: string;
  shortSha: string;
  message: string;
  author: string;
  date: string;
  filesChanged: number;
  additions: number;
  deletions: number;
  riskScore: number;
  riskLevel: string;
  riskFactors: string[];
  files: { filename: string; additions: number; deletions: number; status: string; fileRisk: number }[];
}

/** Parse owner/repo from a full URL */
function parseRepoUrl(url: string): { baseUrl: string; owner: string; repo: string } {
  const u = new URL(url.replace(/\.git$/, ""));
  const parts = u.pathname.split("/").filter(Boolean);
  if (parts.length < 2) throw new Error("Invalid repo URL: need owner/repo");
  return {
    baseUrl: `${u.protocol}//${u.host}`,
    owner: parts[0],
    repo: parts[1],
  };
}

/** Search GHE for a repo by name when direct access returns 404 */
async function searchRepo(
  baseUrl: string,
  repoName: string,
  requestUser?: string,
  requestPass?: string
): Promise<{ owner: string; repo: string } | null> {
  const user = requestUser || getSecret("GIT_USER");
  const pass = requestPass || getSecret("GIT_PASSWORD");
  const authHeader = user ? "Basic " + Buffer.from(`${user}:${pass}`).toString("base64") : "";
  try {
    const headers: Record<string, string> = { Accept: "application/json" };
    if (authHeader) headers.Authorization = authHeader;
    const res = await fetch(`${baseUrl}/api/v3/search/repositories?q=${encodeURIComponent(repoName)}`, { headers });
    if (!res.ok) return null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = (await res.json()) as any;
    if (data.total_count > 0 && data.items?.[0]) {
      return { owner: data.items[0].owner?.login || "", repo: data.items[0].name || "" };
    }
  } catch { /* ignore */ }
  return null;
}

/** Fetch commits from a Gitea/GitHub-compatible API */
async function fetchCommits(
  baseUrl: string,
  owner: string,
  repo: string,
  since: string,
  requestUser?: string,
  requestPass?: string
): Promise<GitCommit[]> {
  // Try GitHub Enterprise API first, then Gitea API
  const endpoints = [
    `${baseUrl}/api/v3/repos/${owner}/${repo}/commits?since=${since}&per_page=50`,
    `${baseUrl}/api/v1/repos/${owner}/${repo}/commits?since=${since}&limit=50&stat=true`,
  ];

  const user = requestUser || getSecret("GIT_USER");
  const pass = requestPass || getSecret("GIT_PASSWORD");
  const authHeader = user ? "Basic " + Buffer.from(`${user}:${pass}`).toString("base64") : "";

  for (const url of endpoints) {
    try {
      const headers: Record<string, string> = { Accept: "application/json" };
      if (authHeader) headers.Authorization = authHeader;

      const res = await fetch(url, { headers });

      if (!res.ok) continue;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = (await res.json()) as any[];
      if (!Array.isArray(data) || data.length === 0) continue;

      return data.map((c) => {
        // GitHub Enterprise / GitHub format (has c.commit)
        if (c.commit) {
          return {
            sha: c.sha || c.id || "",
            message: c.commit?.message || "",
            author: c.commit?.author?.name || c.commit?.author?.email || c.author?.login || "unknown",
            date: c.commit?.author?.date || c.created || "",
            filesChanged: c.stats?.total ?? c.files?.length ?? 0,
            additions: c.stats?.additions ?? 0,
            deletions: c.stats?.deletions ?? 0,
            files: (c.files || []).map((f: { filename?: string; additions?: number; deletions?: number; status?: string }) => ({
              filename: f.filename || "",
              additions: f.additions || 0,
              deletions: f.deletions || 0,
              status: f.status || "modified",
            })),
          };
        }
        // Flat / Gitea format
        return {
          sha: c.sha || c.id || "",
          message: c.message || "",
          author: c.author?.name || c.author?.login || "unknown",
          date: c.author?.date || c.created_at || "",
          filesChanged: c.stats?.total || c.files?.length || 0,
          additions: c.stats?.additions || 0,
          deletions: c.stats?.deletions || 0,
          files: [],
        };
      });
    } catch {
      continue;
    }
  }

  return [];
}

/** Fetch detailed file-level diff for a single commit */
async function fetchCommitDetail(
  baseUrl: string,
  owner: string,
  repo: string,
  sha: string,
  requestUser?: string,
  requestPass?: string
): Promise<{ filesChanged: number; additions: number; deletions: number; files: { filename: string; additions: number; deletions: number; status: string }[] }> {
  const user = requestUser || getSecret("GIT_USER");
  const pass = requestPass || getSecret("GIT_PASSWORD");
  const authHeader = user ? "Basic " + Buffer.from(`${user}:${pass}`).toString("base64") : "";

  // GitHub Enterprise first, then Gitea
  const urls = [
    `${baseUrl}/api/v3/repos/${owner}/${repo}/commits/${sha}`,
    `${baseUrl}/api/v1/repos/${owner}/${repo}/git/commits/${sha}`,
  ];

  for (const url of urls) {
    try {
      const headers: Record<string, string> = { Accept: "application/json" };
      if (authHeader) headers.Authorization = authHeader;
      const res = await fetch(url, { headers });
      if (!res.ok) continue;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = (await res.json()) as any;
      const files = (data.files || []).map((f: { filename?: string; additions?: number; deletions?: number; status?: string }) => ({
        filename: f.filename || "",
        additions: f.additions || 0,
        deletions: f.deletions || 0,
        status: f.status || "modified",
      }));
      return {
        filesChanged: files.length || data.stats?.total || 0,
        additions: data.stats?.additions || files.reduce((a: number, f: { additions: number }) => a + f.additions, 0),
        deletions: data.stats?.deletions || files.reduce((a: number, f: { deletions: number }) => a + f.deletions, 0),
        files,
      };
    } catch {
      continue;
    }
  }
  return { filesChanged: 0, additions: 0, deletions: 0, files: [] };
}

/* ─── Risk Scoring Engine ─── */

const HIGH_RISK_PATTERNS = [
  /\.(env|secret|key|pem|cert)/i,
  /config\/(prod|production)/i,
  /migration/i,
  /schema\.(prisma|sql|graphql)/i,
  /docker(file|compose)/i,
  /\.github\/workflows/i,
  /ci\/|\.ci\./i,
  /package\.json$/i,
  /package-lock\.json$/i,
  /yarn\.lock$/i,
];

const MEDIUM_RISK_PATTERNS = [
  /auth/i,
  /security/i,
  /middleware/i,
  /route\.ts$/i,
  /api\//i,
  /database|db\//i,
  /model/i,
];

function computeFileRisk(filename: string, additions: number, deletions: number): number {
  let risk = 10; // base

  // Pattern-based risk
  if (HIGH_RISK_PATTERNS.some((p) => p.test(filename))) risk += 35;
  else if (MEDIUM_RISK_PATTERNS.some((p) => p.test(filename))) risk += 20;

  // Churn-based risk
  const churn = additions + deletions;
  if (churn > 500) risk += 25;
  else if (churn > 200) risk += 15;
  else if (churn > 50) risk += 8;

  // Deletion-heavy = higher risk (removing code is risky)
  if (deletions > additions && deletions > 20) risk += 10;

  return Math.min(100, risk);
}

function computeCommitRisk(commit: GitCommit): CommitRisk {
  const factors: string[] = [];
  let risk = 0;

  // File count factor
  const fileCount = commit.filesChanged || commit.files.length;
  if (fileCount > 20) { risk += 25; factors.push(`Large changeset (${fileCount} files)`); }
  else if (fileCount > 10) { risk += 15; factors.push(`Medium changeset (${fileCount} files)`); }
  else if (fileCount > 5) { risk += 8; factors.push(`${fileCount} files changed`); }
  else { risk += 3; }

  // Total churn factor
  const totalChurn = commit.additions + commit.deletions;
  if (totalChurn > 1000) { risk += 20; factors.push(`High code churn (${totalChurn} lines)`); }
  else if (totalChurn > 300) { risk += 12; factors.push(`Moderate churn (${totalChurn} lines)`); }
  else if (totalChurn > 50) { risk += 5; }

  // Deletion ratio
  if (commit.deletions > 0 && commit.deletions > commit.additions * 0.8) {
    risk += 10;
    factors.push("Heavy deletions (refactoring risk)");
  }

  // File-level pattern analysis
  const highRiskFiles = commit.files.filter((f) => HIGH_RISK_PATTERNS.some((p) => p.test(f.filename)));
  const medRiskFiles = commit.files.filter((f) => MEDIUM_RISK_PATTERNS.some((p) => p.test(f.filename)));

  if (highRiskFiles.length > 0) {
    risk += 20;
    factors.push(`Critical files touched: ${highRiskFiles.map((f) => f.filename.split("/").pop()).join(", ")}`);
  }
  if (medRiskFiles.length > 0) {
    risk += 10;
    factors.push(`Sensitive files: ${medRiskFiles.length} auth/API/DB files`);
  }

  // Commit message analysis
  const msg = commit.message.toLowerCase();
  if (msg.includes("hotfix") || msg.includes("emergency")) { risk += 15; factors.push("Hotfix/emergency commit"); }
  if (msg.includes("revert")) { risk += 12; factors.push("Revert commit"); }
  if (msg.includes("wip") || msg.includes("hack") || msg.includes("fixme")) { risk += 10; factors.push("WIP/hack detected in message"); }
  if (msg.includes("breaking") || msg.includes("breaking change")) { risk += 18; factors.push("Breaking change indicated"); }
  if (msg.includes("merge")) { risk += 5; factors.push("Merge commit"); }

  const finalRisk = Math.min(100, Math.max(0, risk));
  const riskLevel = finalRisk >= 75 ? "critical" : finalRisk >= 50 ? "high" : finalRisk >= 25 ? "medium" : "low";

  if (factors.length === 0) factors.push("Low-risk change");

  return {
    sha: commit.sha,
    shortSha: commit.sha.substring(0, 7),
    message: commit.message.split("\n")[0].substring(0, 120),
    author: commit.author,
    date: commit.date,
    filesChanged: fileCount,
    additions: commit.additions,
    deletions: commit.deletions,
    riskScore: finalRisk,
    riskLevel,
    riskFactors: factors,
    files: commit.files.map((f) => ({
      ...f,
      fileRisk: computeFileRisk(f.filename, f.additions, f.deletions),
    })),
  };
}

/* ─── ML Feature Impact Analysis Engine ─── */

interface FeatureImpact {
  feature: string;
  impactScore: number;        // 0–100
  impactLevel: "critical" | "high" | "medium" | "low";
  filesAffected: number;
  churn: number;
  commits: number;
  riskFactors: string[];
  description: string;
}

interface ProductionConcern {
  type: "outage" | "performance" | "data_integrity" | "security" | "availability";
  severity: "critical" | "high" | "medium" | "low";
  title: string;
  description: string;
  evidence: string[];
  mitigation: string;
}

interface PerformanceInsight {
  category: string;
  score: number;              // 0–100 (higher = more concern)
  level: "critical" | "high" | "medium" | "low";
  description: string;
  files: string[];
}

// Feature detection patterns: map file paths to application features
const FEATURE_PATTERNS: { feature: string; patterns: RegExp[]; description: string }[] = [
  { feature: "Authentication & Authorization", patterns: [/auth/i, /login/i, /session/i, /jwt/i, /oauth/i, /permission/i, /rbac/i, /credential/i, /token/i], description: "User authentication, session management, and access control" },
  { feature: "API Layer", patterns: [/api\//i, /route\.ts/i, /endpoint/i, /handler/i, /controller/i, /graphql/i, /rest/i], description: "REST/GraphQL API endpoints and request handling" },
  { feature: "Database & Data Layer", patterns: [/prisma/i, /migration/i, /schema/i, /model/i, /database/i, /db\//i, /sql/i, /query/i, /orm/i, /seed/i], description: "Database schema, migrations, ORM models, and data access" },
  { feature: "UI Components", patterns: [/component/i, /\.tsx$/i, /widget/i, /button/i, /form/i, /modal/i, /dialog/i, /layout/i], description: "Frontend React/UI component library" },
  { feature: "Page / Views", patterns: [/page\.tsx/i, /pages?\//i, /views?\//i, /screen/i, /dashboard/i], description: "Application pages and view layer" },
  { feature: "Configuration & Infrastructure", patterns: [/config/i, /docker/i, /ci\//i, /\.ci\./i, /\.github/i, /nginx/i, /terraform/i, /helm/i, /k8s/i, /kubernetes/i, /\.env/i], description: "Build, deployment, CI/CD, and infrastructure configuration" },
  { feature: "Testing", patterns: [/test/i, /spec\./i, /\.test\./i, /\.spec\./i, /jest/i, /cypress/i, /playwright/i, /coverage/i, /mock/i, /fixture/i], description: "Unit tests, integration tests, E2E tests, and test utilities" },
  { feature: "Middleware & Hooks", patterns: [/middleware/i, /hook/i, /interceptor/i, /plugin/i, /use[A-Z]/], description: "Request middleware, React hooks, and interceptors" },
  { feature: "Styling & Assets", patterns: [/\.css$/i, /\.scss$/i, /\.less$/i, /style/i, /theme/i, /font/i, /icon/i, /image/i, /asset/i, /static/i, /public\//i], description: "CSS, themes, fonts, icons, and static assets" },
  { feature: "Utilities & Libraries", patterns: [/util/i, /helper/i, /lib\//i, /common/i, /shared/i, /constant/i, /type/i], description: "Shared utility functions, types, and constants" },
  { feature: "Security", patterns: [/secur/i, /crypt/i, /cert/i, /\.pem/i, /\.key/i, /cve/i, /vulnerab/i, /sanitiz/i, /xss/i, /csrf/i], description: "Security modules, encryption, certificates, and vulnerability patches" },
  { feature: "Monitoring & Logging", patterns: [/log/i, /monitor/i, /metric/i, /trace/i, /telemetry/i, /sentry/i, /datadog/i, /alert/i], description: "Logging, monitoring, observability, and alerting" },
  { feature: "Caching", patterns: [/cache/i, /redis/i, /memcache/i, /memoiz/i, /swr/i], description: "Caching layer, Redis, and memoization" },
  { feature: "Notification & Messaging", patterns: [/notification/i, /email/i, /sms/i, /webhook/i, /queue/i, /pubsub/i, /kafka/i, /rabbit/i, /message/i], description: "Email, push notifications, webhooks, and message queues" },
];

// Production outage risk patterns
const OUTAGE_PATTERNS: { pattern: RegExp; concern: string; severity: "critical" | "high" | "medium" }[] = [
  { pattern: /migration|schema.*change|alter.*table/i, concern: "Database schema migration", severity: "critical" },
  { pattern: /docker|kubernetes|k8s|helm|deploy/i, concern: "Infrastructure/deployment change", severity: "high" },
  { pattern: /\.env|secret|credential|password/i, concern: "Secrets/environment configuration change", severity: "critical" },
  { pattern: /rollback|revert|downgrade/i, concern: "Rollback/revert pattern detected", severity: "high" },
  { pattern: /breaking|incompatible|deprecated/i, concern: "Breaking change introduced", severity: "critical" },
  { pattern: /delete.*table|drop.*table|truncate/i, concern: "Destructive database operation", severity: "critical" },
  { pattern: /service.*worker|cron|scheduler|job/i, concern: "Background job/worker modification", severity: "high" },
  { pattern: /circuit.*breaker|retry|timeout|fallback/i, concern: "Resilience pattern modification", severity: "high" },
  { pattern: /load.*balancer|proxy|gateway|ingress/i, concern: "Network/routing infrastructure change", severity: "critical" },
  { pattern: /dns|domain|certificate|tls|ssl/i, concern: "DNS/TLS/certificate change", severity: "critical" },
  { pattern: /singleton|global.*state|shared.*resource/i, concern: "Global state/singleton modification", severity: "medium" },
  { pattern: /concurren|thread|lock|mutex|semaphore|deadlock/i, concern: "Concurrency control change", severity: "high" },
];

// Performance concern patterns
const PERF_PATTERNS: { pattern: RegExp; category: string; description: string }[] = [
  { pattern: /n\+1|eager.*load|lazy.*load|include|populate|join/i, category: "Query Optimization", description: "Database query pattern change — potential N+1 or loading strategy impact" },
  { pattern: /cache|memoiz|swr|stale/i, category: "Caching Strategy", description: "Cache layer modification — may affect response times and staleness" },
  { pattern: /index|compound.*index|unique.*index/i, category: "Database Indexing", description: "Index change — affects query performance on large datasets" },
  { pattern: /batch|bulk|pagina|limit|offset|cursor/i, category: "Data Pagination", description: "Pagination/batching change — affects memory usage and response size" },
  { pattern: /async|await|promise|concurrent|parallel/i, category: "Async Processing", description: "Asynchronous processing change — may affect throughput and latency" },
  { pattern: /image|video|media|asset|upload|blob|stream/i, category: "Media/Asset Handling", description: "Large media handling change — affects bandwidth and load times" },
  { pattern: /websocket|sse|realtime|polling|socket/i, category: "Real-time Communication", description: "Real-time protocol change — affects connection scalability" },
  { pattern: /memory|heap|buffer|gc|garbage/i, category: "Memory Management", description: "Memory-related change — potential leak or excessive allocation risk" },
  { pattern: /loop|recursion|iteration|while|for\s*\(/i, category: "Algorithmic Complexity", description: "Loop/recursion change — may affect CPU time on large inputs" },
  { pattern: /bundle|chunk|split|lazy|dynamic.*import|code.*split/i, category: "Bundle Size", description: "Code splitting/bundling change — affects initial load time" },
  { pattern: /timeout|throttle|debounce|rate.*limit/i, category: "Rate Limiting", description: "Throttling/rate limit change — affects request handling capacity" },
  { pattern: /connection.*pool|pool.*size|max.*connection/i, category: "Connection Pooling", description: "Connection pool change — affects concurrent request capacity" },
];

function analyzeFeatureImpact(analyzed: CommitRisk[]): FeatureImpact[] {
  const featureMap: Record<string, { files: Set<string>; churn: number; commits: Set<string>; maxRisk: number; riskFactors: Set<string> }> = {};

  for (const commit of analyzed) {
    for (const file of commit.files) {
      for (const fp of FEATURE_PATTERNS) {
        if (fp.patterns.some(p => p.test(file.filename))) {
          if (!featureMap[fp.feature]) featureMap[fp.feature] = { files: new Set(), churn: 0, commits: new Set(), maxRisk: 0, riskFactors: new Set() };
          featureMap[fp.feature].files.add(file.filename);
          featureMap[fp.feature].churn += file.additions + file.deletions;
          featureMap[fp.feature].commits.add(commit.sha);
          featureMap[fp.feature].maxRisk = Math.max(featureMap[fp.feature].maxRisk, file.fileRisk);
          commit.riskFactors.forEach(rf => featureMap[fp.feature].riskFactors.add(rf));
        }
      }
    }
  }

  const totalChurn = analyzed.reduce((a, c) => a + c.additions + c.deletions, 0) || 1;
  const totalCommits = analyzed.length || 1;

  return Object.entries(featureMap)
    .map(([feature, d]) => {
      const churnWeight = d.churn / totalChurn;
      const commitWeight = d.commits.size / totalCommits;
      const fileWeight = d.files.size / Math.max(1, new Set(analyzed.flatMap(c => c.files.map(f => f.filename))).size);
      const impactScore = Math.min(100, Math.round(
        d.maxRisk * 0.3 +
        churnWeight * 100 * 0.3 +
        commitWeight * 100 * 0.2 +
        fileWeight * 100 * 0.2
      ));
      const impactLevel = impactScore >= 70 ? "critical" as const : impactScore >= 45 ? "high" as const : impactScore >= 20 ? "medium" as const : "low" as const;
      const desc = FEATURE_PATTERNS.find(fp => fp.feature === feature)?.description || "";
      return {
        feature,
        impactScore,
        impactLevel,
        filesAffected: d.files.size,
        churn: d.churn,
        commits: d.commits.size,
        riskFactors: Array.from(d.riskFactors).slice(0, 5),
        description: desc,
      };
    })
    .sort((a, b) => b.impactScore - a.impactScore);
}

function detectProductionConcerns(analyzed: CommitRisk[]): ProductionConcern[] {
  const concerns: ProductionConcern[] = [];
  const allFiles = analyzed.flatMap(c => c.files);
  const allMessages = analyzed.map(c => c.message);

  // Scan files for outage risk patterns
  for (const op of OUTAGE_PATTERNS) {
    const matchingFiles = allFiles.filter(f => op.pattern.test(f.filename));
    const matchingMessages = allMessages.filter(m => op.pattern.test(m));
    if (matchingFiles.length > 0 || matchingMessages.length > 0) {
      const evidence: string[] = [];
      matchingFiles.slice(0, 3).forEach(f => evidence.push(`File: ${f.filename} (±${f.additions + f.deletions} lines)`));
      matchingMessages.slice(0, 2).forEach(m => evidence.push(`Commit: "${m.substring(0, 80)}"`));

      const sev = op.severity;
      const type = op.concern.toLowerCase().includes("database") ? "data_integrity" as const
        : op.concern.toLowerCase().includes("secret") || op.concern.toLowerCase().includes("dns") || op.concern.toLowerCase().includes("tls") ? "security" as const
        : op.concern.toLowerCase().includes("deploy") || op.concern.toLowerCase().includes("infra") || op.concern.toLowerCase().includes("load") || op.concern.toLowerCase().includes("route") ? "availability" as const
        : "outage" as const;

      concerns.push({
        type,
        severity: sev,
        title: op.concern,
        description: `${matchingFiles.length} file(s) and ${matchingMessages.length} commit message(s) match this pattern.`,
        evidence,
        mitigation: sev === "critical"
          ? "Requires thorough review, staged rollout, and immediate rollback plan."
          : sev === "high"
          ? "Review carefully. Ensure monitoring is in place before deployment."
          : "Monitor post-deployment. Verify in staging first.",
      });
    }
  }

  // Check for large-scale changes that could cause outages
  const totalChurn = analyzed.reduce((a, c) => a + c.additions + c.deletions, 0);
  const totalFiles = new Set(allFiles.map(f => f.filename)).size;
  if (totalChurn > 2000) {
    concerns.push({
      type: "outage",
      severity: totalChurn > 5000 ? "critical" : "high",
      title: "Massive code change volume",
      description: `${totalChurn.toLocaleString()} total lines changed across ${totalFiles} files — large blast radius increases outage risk.`,
      evidence: [`Total additions: +${analyzed.reduce((a, c) => a + c.additions, 0).toLocaleString()}`, `Total deletions: −${analyzed.reduce((a, c) => a + c.deletions, 0).toLocaleString()}`],
      mitigation: "Consider breaking this into smaller, independently deployable changes.",
    });
  }

  // Check for multiple critical/high risk commits
  const critHigh = analyzed.filter(c => c.riskLevel === "critical" || c.riskLevel === "high");
  if (critHigh.length >= 3) {
    concerns.push({
      type: "availability",
      severity: critHigh.length >= 5 ? "critical" : "high",
      title: `${critHigh.length} high/critical risk commits in one release`,
      description: "Multiple high-risk changes deployed together amplify failure probability. Consider staggering deployments.",
      evidence: critHigh.slice(0, 3).map(c => `${c.shortSha}: "${c.message}" (risk: ${c.riskScore})`),
      mitigation: "Deploy high-risk changes individually with monitoring between each.",
    });
  }

  // Single-author concentration risk
  const authorCommits: Record<string, number> = {};
  analyzed.forEach(c => { authorCommits[c.author] = (authorCommits[c.author] || 0) + 1; });
  const topAuthor = Object.entries(authorCommits).sort((a, b) => b[1] - a[1])[0];
  if (topAuthor && analyzed.length >= 5 && topAuthor[1] / analyzed.length > 0.8) {
    concerns.push({
      type: "availability",
      severity: "medium",
      title: "Single-author concentration risk",
      description: `${topAuthor[0]} authored ${Math.round(topAuthor[1] / analyzed.length * 100)}% of commits — bus factor risk if issues arise post-deploy.`,
      evidence: [`${topAuthor[0]}: ${topAuthor[1]} of ${analyzed.length} commits`],
      mitigation: "Ensure another team member reviews and understands all changes.",
    });
  }

  return concerns.sort((a, b) => {
    const sevOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return sevOrder[a.severity] - sevOrder[b.severity];
  });
}

function analyzePerformanceImpact(analyzed: CommitRisk[]): PerformanceInsight[] {
  const insights: PerformanceInsight[] = [];
  const allFiles = analyzed.flatMap(c => c.files);

  for (const pp of PERF_PATTERNS) {
    const matchFiles = allFiles.filter(f => pp.pattern.test(f.filename) || pp.pattern.test(f.filename.split("/").pop() || ""));
    // Also check commit messages
    const matchMessages = analyzed.filter(c => pp.pattern.test(c.message));
    const totalMatches = matchFiles.length + matchMessages.length;

    if (totalMatches > 0) {
      const totalChurn = matchFiles.reduce((a, f) => a + f.additions + f.deletions, 0);
      const maxRisk = matchFiles.length > 0 ? Math.max(...matchFiles.map(f => f.fileRisk)) : 0;
      const score = Math.min(100, Math.round(
        maxRisk * 0.4 +
        Math.min(100, totalChurn / 5) * 0.3 +
        Math.min(100, totalMatches * 15) * 0.3
      ));
      const level = score >= 70 ? "critical" as const : score >= 45 ? "high" as const : score >= 20 ? "medium" as const : "low" as const;

      insights.push({
        category: pp.category,
        score,
        level,
        description: pp.description,
        files: Array.from(new Set(matchFiles.map(f => f.filename))).slice(0, 5),
      });
    }
  }

  return insights.sort((a, b) => b.score - a.score);
}

/* ─── API Handler ─── */

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const repoUrl = searchParams.get("repo") || DEFAULT_REPO_URL;
  const days = parseInt(searchParams.get("days") || String(DEFAULT_DAYS), 10);
  const reqUser = searchParams.get("user") || undefined;
  const reqPass = searchParams.get("pass") || undefined;

  try {
    const { baseUrl, owner, repo } = parseRepoUrl(repoUrl);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    // 1. Fetch commits list
    let commits = await fetchCommits(baseUrl, owner, repo, since, reqUser, reqPass);

    // 1b. If no commits found, try searching for the repo by name (owner may be wrong)
    let resolvedOwner = owner;
    let resolvedRepo = repo;
    if (commits.length === 0) {
      const found = await searchRepo(baseUrl, repo, reqUser, reqPass);
      if (found && (found.owner !== owner || found.repo !== repo)) {
        resolvedOwner = found.owner;
        resolvedRepo = found.repo;
        commits = await fetchCommits(baseUrl, resolvedOwner, resolvedRepo, since, reqUser, reqPass);
      }
    }

    if (commits.length === 0) {
      return NextResponse.json(
        { error: `No commits found for ${owner}/${repo}. The repository may not exist, may be private, or may have no commits in the last ${days} days. Verify the repo URL is correct (e.g. https://github.com/owner/repo).` },
        { status: 404 }
      );
    }

    // 2. Enrich commits that lack file details
    const enriched: GitCommit[] = [];
    for (const c of commits.slice(0, 50)) {
      if (c.files.length === 0 && c.sha) {
        const detail = await fetchCommitDetail(baseUrl, resolvedOwner, resolvedRepo, c.sha, reqUser, reqPass);
        enriched.push({ ...c, ...detail });
      } else {
        enriched.push(c);
      }
    }
    commits = enriched;

    // 3. Compute risk scores
    const analyzed = commits.map(computeCommitRisk).sort((a, b) => b.riskScore - a.riskScore);

    // 4. Aggregate summary
    const totalCommits = analyzed.length;
    const avgRisk = totalCommits > 0 ? Math.round(analyzed.reduce((a, c) => a + c.riskScore, 0) / totalCommits) : 0;
    const maxRisk = totalCommits > 0 ? analyzed[0].riskScore : 0;
    const totalAdditions = analyzed.reduce((a, c) => a + c.additions, 0);
    const totalDeletions = analyzed.reduce((a, c) => a + c.deletions, 0);
    const totalFilesChanged = analyzed.reduce((a, c) => a + c.filesChanged, 0);
    const criticalCount = analyzed.filter((c) => c.riskLevel === "critical").length;
    const highCount = analyzed.filter((c) => c.riskLevel === "high").length;
    const mediumCount = analyzed.filter((c) => c.riskLevel === "medium").length;
    const lowCount = analyzed.filter((c) => c.riskLevel === "low").length;

    // Author breakdown
    const authorMap: Record<string, { commits: number; totalRisk: number; additions: number; deletions: number }> = {};
    analyzed.forEach((c) => {
      if (!authorMap[c.author]) authorMap[c.author] = { commits: 0, totalRisk: 0, additions: 0, deletions: 0 };
      authorMap[c.author].commits++;
      authorMap[c.author].totalRisk += c.riskScore;
      authorMap[c.author].additions += c.additions;
      authorMap[c.author].deletions += c.deletions;
    });
    const authorBreakdown = Object.entries(authorMap)
      .map(([author, d]) => ({
        author,
        commits: d.commits,
        avgRisk: Math.round(d.totalRisk / d.commits),
        additions: d.additions,
        deletions: d.deletions,
      }))
      .sort((a, b) => b.avgRisk - a.avgRisk);

    // Overall risk factor (for the release)
    const overallRiskFactor = Math.min(100, Math.round(
      avgRisk * 0.4 +
      Math.min(100, totalCommits * 2) * 0.2 +
      Math.min(100, (totalAdditions + totalDeletions) / 50) * 0.2 +
      (criticalCount + highCount) / Math.max(1, totalCommits) * 100 * 0.2
    ));

    // 5. ML Feature Impact Analysis
    const featureImpact = analyzeFeatureImpact(analyzed);
    const productionConcerns = detectProductionConcerns(analyzed);
    const performanceInsights = analyzePerformanceImpact(analyzed);

    return NextResponse.json({
      repoUrl: resolvedOwner !== owner ? `${baseUrl}/${resolvedOwner}/${resolvedRepo}` : repoUrl,
      owner: resolvedOwner,
      repo: resolvedRepo,
      sinceDate: since,
      days,
      summary: {
        totalCommits,
        avgRisk,
        maxRisk,
        overallRiskFactor,
        totalAdditions,
        totalDeletions,
        totalFilesChanged,
        criticalCount,
        highCount,
        mediumCount,
        lowCount,
      },
      authorBreakdown,
      commits: analyzed,
      featureImpact,
      productionConcerns,
      performanceInsights,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
