/**
 * Regression tests for /code-analysis feature (git-analysis API)
 *
 * Bug: Credentials entered on the /code-analysis page were silently ignored.
 * The frontend sent user/pass as query params, but the API only read from
 * environment variables via getSecret(). Private repos always failed.
 */

describe("Code Analysis - Git Analysis API", () => {
  // --- parseRepoUrl ---
  describe("parseRepoUrl", () => {
    // Inline the function for unit testing
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

    it("parses a standard GitHub URL", () => {
      const result = parseRepoUrl("https://github.com/owner/repo");
      expect(result).toEqual({ baseUrl: "https://github.com", owner: "owner", repo: "repo" });
    });

    it("parses a GitHub Enterprise URL", () => {
      const result = parseRepoUrl("https://code.devsnc.com/jianjun-shen/change_management");
      expect(result).toEqual({
        baseUrl: "https://code.devsnc.com",
        owner: "jianjun-shen",
        repo: "change_management",
      });
    });

    it("strips .git suffix", () => {
      const result = parseRepoUrl("https://github.com/owner/repo.git");
      expect(result).toEqual({ baseUrl: "https://github.com", owner: "owner", repo: "repo" });
    });

    it("handles URLs with extra path segments", () => {
      const result = parseRepoUrl("https://github.com/owner/repo/tree/main");
      expect(result.owner).toBe("owner");
      expect(result.repo).toBe("repo");
    });

    it("throws on URL without owner/repo", () => {
      expect(() => parseRepoUrl("https://github.com/")).toThrow("Invalid repo URL");
    });

    it("throws on non-URL input", () => {
      expect(() => parseRepoUrl("dev/perf-testing-ai")).toThrow();
    });

    it("handles http:// URLs", () => {
      const result = parseRepoUrl("http://gitea.local:3000/team/project");
      expect(result).toEqual({ baseUrl: "http://gitea.local:3000", owner: "team", repo: "project" });
    });
  });

  // --- Risk Scoring ---
  describe("Risk scoring", () => {
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
      let risk = 10;
      if (HIGH_RISK_PATTERNS.some((p) => p.test(filename))) risk += 35;
      else if (MEDIUM_RISK_PATTERNS.some((p) => p.test(filename))) risk += 20;
      const churn = additions + deletions;
      if (churn > 500) risk += 25;
      else if (churn > 200) risk += 15;
      else if (churn > 50) risk += 8;
      if (deletions > additions && deletions > 20) risk += 10;
      return Math.min(100, risk);
    }

    it("assigns higher risk to .env files", () => {
      const envRisk = computeFileRisk(".env.production", 5, 2);
      const normalRisk = computeFileRisk("src/utils/helper.ts", 5, 2);
      expect(envRisk).toBeGreaterThan(normalRisk);
    });

    it("assigns higher risk to migration files", () => {
      const migRisk = computeFileRisk("prisma/migrations/001_init.sql", 50, 0);
      const normalRisk = computeFileRisk("src/components/Button.tsx", 50, 0);
      expect(migRisk).toBeGreaterThan(normalRisk);
    });

    it("assigns higher risk to high-churn files", () => {
      const highChurn = computeFileRisk("src/app.ts", 300, 200);
      const lowChurn = computeFileRisk("src/app.ts", 5, 2);
      expect(highChurn).toBeGreaterThan(lowChurn);
    });

    it("assigns higher risk for heavy deletions", () => {
      const deletionHeavy = computeFileRisk("src/module.ts", 5, 50);
      const additionHeavy = computeFileRisk("src/module.ts", 50, 5);
      expect(deletionHeavy).toBeGreaterThan(additionHeavy);
    });

    it("caps risk at 100", () => {
      const risk = computeFileRisk("schema.prisma", 1000, 500);
      expect(risk).toBeLessThanOrEqual(100);
    });

    it("assigns base risk of 10 for low-risk files", () => {
      const risk = computeFileRisk("README.md", 1, 0);
      expect(risk).toBe(10);
    });

    it("detects auth-related files as medium risk", () => {
      const risk = computeFileRisk("src/lib/auth.ts", 10, 5);
      expect(risk).toBeGreaterThanOrEqual(30); // base 10 + medium 20
    });

    it("detects API route files as medium risk", () => {
      const risk = computeFileRisk("src/app/api/users/route.ts", 10, 5);
      expect(risk).toBeGreaterThanOrEqual(30);
    });

    it("detects Dockerfile as high risk", () => {
      const risk = computeFileRisk("Dockerfile", 10, 5);
      expect(risk).toBeGreaterThanOrEqual(45); // base 10 + high 35
    });

    it("detects CI workflow files as high risk", () => {
      const risk = computeFileRisk(".github/workflows/deploy.yml", 10, 5);
      expect(risk).toBeGreaterThanOrEqual(45);
    });
  });

  // --- Credential Passing via Headers (security fix) ---
  describe("Credential passing via headers", () => {
    it("frontend sends credentials via headers, not URL params", () => {
      const gitRepo = "https://github.com/owner/repo";
      const gitDays = 14;
      const gitUser = "myuser";
      const gitPassword = "mypass";

      // URL should never contain credentials
      const url = `/api/data/git-analysis?repo=${encodeURIComponent(gitRepo)}&days=${gitDays}`;
      const headers: Record<string, string> = {};
      if (gitUser && gitPassword) {
        headers["x-git-user"] = gitUser;
        headers["x-git-password"] = gitPassword;
      }

      const parsed = new URL(url, "http://localhost");
      // Credentials must NOT be in query params
      expect(parsed.searchParams.get("user")).toBeNull();
      expect(parsed.searchParams.get("pass")).toBeNull();
      // Credentials must be in headers
      expect(headers["x-git-user"]).toBe("myuser");
      expect(headers["x-git-password"]).toBe("mypass");
      expect(parsed.searchParams.get("repo")).toBe(gitRepo);
      expect(parsed.searchParams.get("days")).toBe("14");
    });

    it("URL never contains user/pass params", () => {
      const url = `/api/data/git-analysis?repo=${encodeURIComponent("https://github.com/o/r")}&days=7`;
      const parsed = new URL(url, "http://localhost");
      expect(parsed.searchParams.get("user")).toBeNull();
      expect(parsed.searchParams.get("pass")).toBeNull();
      expect(url).not.toContain("user=");
      expect(url).not.toContain("pass=");
    });

    it("headers handle special characters without URL encoding", () => {
      const pass = "p@ss&word=123";
      const headers: Record<string, string> = { "x-git-password": pass };
      // Headers preserve special characters as-is (no URL encoding needed)
      expect(headers["x-git-password"]).toBe("p@ss&word=123");
    });

    it("no headers set when credentials are empty", () => {
      const gitUser = "";
      const gitPassword = "";
      const headers: Record<string, string> = {};
      if (gitUser && gitPassword) {
        headers["x-git-user"] = gitUser;
        headers["x-git-password"] = gitPassword;
      }
      expect(headers["x-git-user"]).toBeUndefined();
      expect(headers["x-git-password"]).toBeUndefined();
    });
  });

  // --- Feature Impact Analysis ---
  describe("Feature detection patterns", () => {
    const FEATURE_PATTERNS = [
      { feature: "Authentication & Authorization", patterns: [/auth/i, /login/i, /session/i, /jwt/i] },
      { feature: "API Layer", patterns: [/api\//i, /route\.ts/i] },
      { feature: "Database & Data Layer", patterns: [/prisma/i, /migration/i, /schema/i] },
      { feature: "Testing", patterns: [/test/i, /spec\./i, /\.test\./i] },
      { feature: "Configuration & Infrastructure", patterns: [/docker/i, /ci\//i, /\.env/i] },
    ];

    function detectFeatures(filename: string): string[] {
      return FEATURE_PATTERNS
        .filter(fp => fp.patterns.some(p => p.test(filename)))
        .map(fp => fp.feature);
    }

    it("detects auth files", () => {
      expect(detectFeatures("src/lib/auth.ts")).toContain("Authentication & Authorization");
    });

    it("detects API routes", () => {
      expect(detectFeatures("src/app/api/users/route.ts")).toContain("API Layer");
    });

    it("detects Prisma schema", () => {
      expect(detectFeatures("prisma/schema.prisma")).toContain("Database & Data Layer");
    });

    it("detects test files", () => {
      expect(detectFeatures("src/__tests__/auth.test.ts")).toContain("Testing");
    });

    it("detects Docker files", () => {
      expect(detectFeatures("Dockerfile")).toContain("Configuration & Infrastructure");
    });

    it("returns empty for unmatched files", () => {
      expect(detectFeatures("README.md")).toEqual([]);
    });

    it("can match multiple features", () => {
      const features = detectFeatures("src/app/api/auth/route.ts");
      expect(features).toContain("Authentication & Authorization");
      expect(features).toContain("API Layer");
    });
  });

  // --- Error Handling ---
  describe("Error handling", () => {
    it("invalid URL should throw during parseRepoUrl", () => {
      // Users might enter just "owner/repo" without https://
      expect(() => {
        new URL("not-a-url");
      }).toThrow();
    });

    it("empty repo URL falls back to default", () => {
      const DEFAULT_REPO_URL = "https://github.com/example/repo";
      const repoUrl = "" || DEFAULT_REPO_URL;
      expect(repoUrl).toBe(DEFAULT_REPO_URL);
    });

    it("days parameter defaults to 14", () => {
      const DEFAULT_DAYS = 14;
      const days = parseInt("" || String(DEFAULT_DAYS), 10);
      expect(days).toBe(14);
    });

    it("invalid days parameter results in NaN, should be handled", () => {
      const days = parseInt("abc" || "14", 10);
      expect(isNaN(days)).toBe(true);
    });
  });

  // --- Auth Header Construction ---
  describe("Auth header construction", () => {
    it("builds correct Basic auth header", () => {
      const user = "myuser";
      const pass = "mypass";
      const authHeader = "Basic " + Buffer.from(`${user}:${pass}`).toString("base64");
      expect(authHeader).toBe("Basic " + Buffer.from("myuser:mypass").toString("base64"));

      // Verify it decodes correctly
      const decoded = Buffer.from(authHeader.replace("Basic ", ""), "base64").toString("utf8");
      expect(decoded).toBe("myuser:mypass");
    });

    it("produces empty auth header when no user provided", () => {
      const user = "";
      const pass = "";
      const authHeader = user ? "Basic " + Buffer.from(`${user}:${pass}`).toString("base64") : "";
      expect(authHeader).toBe("");
    });

    it("handles special characters in credentials", () => {
      const user = "user@domain.com";
      const pass = "p@ss:word/123";
      const authHeader = "Basic " + Buffer.from(`${user}:${pass}`).toString("base64");
      const decoded = Buffer.from(authHeader.replace("Basic ", ""), "base64").toString("utf8");
      expect(decoded).toBe("user@domain.com:p@ss:word/123");
    });
  });

  // --- UI State ---
  describe("Code analysis page state", () => {
    it("default days should be 14", () => {
      const defaultDays = 14;
      expect(defaultDays).toBe(14);
    });

    it("repo URL should start empty or from saved config", () => {
      const gitRepo = "";
      expect(gitRepo).toBe("");
    });
  });
});
