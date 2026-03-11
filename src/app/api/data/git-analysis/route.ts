import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSecret } from "@/lib/crypto";

/* ─── Configuration ─── */
const DEFAULT_REPO_URL = "https://code.devsnc.com/dev/perf-testing-ai";
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
  repoName: string
): Promise<{ owner: string; repo: string } | null> {
  const user = getSecret("GIT_USER");
  const pass = getSecret("GIT_PASSWORD");
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
  since: string
): Promise<GitCommit[]> {
  // Try GitHub Enterprise API first, then Gitea API
  const endpoints = [
    `${baseUrl}/api/v3/repos/${owner}/${repo}/commits?since=${since}&per_page=50`,
    `${baseUrl}/api/v1/repos/${owner}/${repo}/commits?since=${since}&limit=50&stat=true`,
  ];

  const user = getSecret("GIT_USER");
  const pass = getSecret("GIT_PASSWORD");
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
  sha: string
): Promise<{ filesChanged: number; additions: number; deletions: number; files: { filename: string; additions: number; deletions: number; status: string }[] }> {
  const user = getSecret("GIT_USER");
  const pass = getSecret("GIT_PASSWORD");
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

/* ─── API Handler ─── */

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const repoUrl = searchParams.get("repo") || DEFAULT_REPO_URL;
  const days = parseInt(searchParams.get("days") || String(DEFAULT_DAYS), 10);

  try {
    const { baseUrl, owner, repo } = parseRepoUrl(repoUrl);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    // 1. Fetch commits list
    let commits = await fetchCommits(baseUrl, owner, repo, since);

    // 1b. If no commits found, try searching for the repo by name (owner may be wrong)
    let resolvedOwner = owner;
    let resolvedRepo = repo;
    if (commits.length === 0) {
      const found = await searchRepo(baseUrl, repo);
      if (found && (found.owner !== owner || found.repo !== repo)) {
        resolvedOwner = found.owner;
        resolvedRepo = found.repo;
        commits = await fetchCommits(baseUrl, resolvedOwner, resolvedRepo, since);
      }
    }

    if (commits.length === 0) {
      return NextResponse.json(
        { error: `No commits found for ${owner}/${repo}. The repository may not exist, may be private, or may have no commits in the last ${days} days. Verify the repo URL is correct (e.g. https://code.devsnc.com/owner/repo).` },
        { status: 404 }
      );
    }

    // 2. Enrich commits that lack file details
    const enriched: GitCommit[] = [];
    for (const c of commits.slice(0, 50)) {
      if (c.files.length === 0 && c.sha) {
        const detail = await fetchCommitDetail(baseUrl, resolvedOwner, resolvedRepo, c.sha);
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
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
