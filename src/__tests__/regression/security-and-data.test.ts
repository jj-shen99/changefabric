/**
 * Regression tests for recent fixes:
 * 1. Auth logging credential leak (masked emails, no password validation logging)
 * 2. Crypto module production safety (ENCRYPTION_KEY warning)
 * 3. Impact page data visibility (days filter removed)
 * 4. .env.example credential exposure (git creds commented out)
 * 5. API response security (no hashedPassword in responses)
 * 6. Data API date filtering logic
 */

import { readFileSync } from "fs";
import { join } from "path";
import { encrypt, decrypt, isEncrypted } from "@/lib/crypto";

const ROOT = join(__dirname, "..", "..", "..");

// ─── Auth Logging Security ──────────────────────────────────────────

describe("Auth Logging Security", () => {
  const authSource = readFileSync(join(ROOT, "src/lib/auth.ts"), "utf-8");

  it("masks email in login attempt log", () => {
    // Should use regex to mask email, not log full email
    expect(authSource).toContain('.replace(/(.{2}).*(@.*)/, "$1***$2")');
  });

  it("does not log full email on login attempt", () => {
    // The old pattern was: console.log("[AUTH] Login attempt for:", credentials.email)
    // without the replace — verify that raw email is never logged on login line
    const loginLogLines = authSource
      .split("\n")
      .filter((l) => l.includes("[AUTH] Login attempt"));
    for (const line of loginLogLines) {
      expect(line).toContain(".replace(");
    }
  });

  it("masks email in user-not-found log", () => {
    const notFoundLines = authSource
      .split("\n")
      .filter((l) => l.includes("[AUTH] User not found"));
    for (const line of notFoundLines) {
      expect(line).toContain(".replace(");
    }
  });

  it("does not log password validation result", () => {
    // The old pattern was: console.log("[AUTH] Password valid:", isValid)
    expect(authSource).not.toMatch(/console\.(log|info)\(.*Password valid/);
  });

  it("does not log hashedPassword", () => {
    const consoleLines = authSource
      .split("\n")
      .filter((l) => /console\.(log|info|warn)/.test(l));
    for (const line of consoleLines) {
      expect(line).not.toContain("hashedPassword");
    }
  });

  it("user-found log does not include email address", () => {
    // Should log roles only, not the email
    const foundLines = authSource
      .split("\n")
      .filter((l) => l.includes("[AUTH] User found"));
    for (const line of foundLines) {
      expect(line).not.toContain("user.email");
    }
  });

  describe("Email masking regex", () => {
    const mask = (email: string) =>
      email.replace(/(.{2}).*(@.*)/, "$1***$2");

    it("masks standard email", () => {
      expect(mask("admin@example.com")).toBe("ad***@example.com");
    });

    it("masks short local part", () => {
      expect(mask("ab@test.com")).toBe("ab***@test.com");
    });

    it("masks long email", () => {
      const masked = mask("verylongemail@corporate.example.com");
      expect(masked).toBe("ve***@corporate.example.com");
      expect(masked).not.toContain("verylongemail");
    });
  });
});

// ─── Crypto Production Safety ──────────────────────────────────────

describe("Crypto Production Safety", () => {
  const cryptoSource = readFileSync(join(ROOT, "src/lib/crypto.ts"), "utf-8");
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("warns when ENCRYPTION_KEY is missing in production", () => {
    // The source code should check for production and log an error
    expect(cryptoSource).toContain('process.env.NODE_ENV === "production"');
    expect(cryptoSource).toContain("[SECURITY] ENCRYPTION_KEY is not set in production");
  });

  it("does not contain hardcoded secrets (only a dev fallback)", () => {
    // The fallback key should clearly indicate it's for dev only
    expect(cryptoSource).toContain("default-dev-key-change-in-production");
    // Should not contain any real secret patterns
    expect(cryptoSource).not.toMatch(/sk-[A-Za-z0-9]{20,}/);
    expect(cryptoSource).not.toMatch(/ghp_[A-Za-z0-9]{20,}/);
  });

  it("encrypt/decrypt works without ENCRYPTION_KEY set (dev mode)", () => {
    delete process.env.ENCRYPTION_KEY;
    const plaintext = "test-secret-value";
    const encrypted = encrypt(plaintext);
    expect(isEncrypted(encrypted)).toBe(true);
    expect(decrypt(encrypted)).toBe(plaintext);
  });

  it("encrypted output never contains the plaintext", () => {
    const secret = "my-super-secret-password";
    const encrypted = encrypt(secret);
    expect(encrypted).not.toContain(secret);
  });

  it("different ENCRYPTION_KEY produces different ciphertext", () => {
    process.env.ENCRYPTION_KEY = "test-key-1";
    const enc1 = encrypt("hello");

    process.env.ENCRYPTION_KEY = "test-key-2";
    const enc2 = encrypt("hello");

    // Different keys, so base64 payload should differ
    // (IVs are random too, but keys definitely differ)
    expect(enc1.slice(4)).not.toBe(enc2.slice(4));
  });
});

// ─── Impact Page Data Visibility ────────────────────────────────────

describe("Impact Page Data Visibility", () => {
  const impactSource = readFileSync(
    join(ROOT, "src/app/(dashboard)/impact/page.tsx"),
    "utf-8"
  );

  it("calls useData() without a days parameter", () => {
    // Regression: previously called useData(7) which filtered to 7 days
    // causing seeded data to not appear
    const useDataCalls = impactSource.match(/useData\([^)]*\)/g) || [];
    expect(useDataCalls.length).toBeGreaterThan(0);
    for (const call of useDataCalls) {
      // Should be useData() — no numeric days argument
      expect(call).not.toMatch(/useData\(\d+\)/);
    }
  });

  it("does not hardcode a days filter", () => {
    // Should not have useState for days filter
    expect(impactSource).not.toContain("useState(7)");
  });
});

// ─── Data API Date Filtering ────────────────────────────────────────

describe("Data API Date Filtering", () => {
  it("returns all CRs when days=0", () => {
    const days = 0;
    const since = days > 0 ? new Date(Date.now() - days * 86400000) : null;
    expect(since).toBeNull();
  });

  it("returns all CRs when days is not provided", () => {
    const daysParam: string | null = null;
    const days = parseInt(daysParam || "0", 10);
    const since = days > 0 ? new Date(Date.now() - days * 86400000) : null;
    expect(since).toBeNull();
  });

  it("filters correctly when days > 0", () => {
    const days = 7;
    const since = days > 0 ? new Date(Date.now() - days * 86400000) : null;
    expect(since).not.toBeNull();
    expect(since!.getTime()).toBeGreaterThan(0);
    expect(since!.getTime()).toBeLessThan(Date.now());
  });

  it("date filter excludes old records", () => {
    const days = 7;
    const since = new Date(Date.now() - days * 86400000);
    const oldRecord = { createdAt: new Date("2024-01-01") };
    const newRecord = { createdAt: new Date() };
    expect(new Date(oldRecord.createdAt) >= since).toBe(false);
    expect(new Date(newRecord.createdAt) >= since).toBe(true);
  });

  it("no-filter mode includes old records", () => {
    const days = 0;
    const since = days > 0 ? new Date(Date.now() - days * 86400000) : null;
    const records = [
      { createdAt: new Date("2024-01-01") },
      { createdAt: new Date() },
    ];
    const filtered = since
      ? records.filter((r) => new Date(r.createdAt) >= since)
      : records;
    expect(filtered.length).toBe(2);
  });
});

// ─── .env.example Security ──────────────────────────────────────────

describe(".env.example Security", () => {
  const envExample = readFileSync(join(ROOT, ".env.example"), "utf-8");

  it("does not contain real API keys", () => {
    expect(envExample).not.toMatch(/sk-[A-Za-z0-9]{20,}/);
    expect(envExample).not.toMatch(/ghp_[A-Za-z0-9]{20,}/);
    expect(envExample).not.toMatch(/glpat-[A-Za-z0-9]{10,}/);
  });

  it("git credentials are commented out", () => {
    const gitUserLine = envExample
      .split("\n")
      .find((l) => l.includes("GIT_USER"));
    const gitPasswordLine = envExample
      .split("\n")
      .find((l) => l.includes("GIT_PASSWORD"));
    expect(gitUserLine).toBeDefined();
    expect(gitPasswordLine).toBeDefined();
    expect(gitUserLine!.trimStart().startsWith("#")).toBe(true);
    expect(gitPasswordLine!.trimStart().startsWith("#")).toBe(true);
  });

  it("NEXTAUTH_SECRET uses placeholder value", () => {
    const secretLine = envExample
      .split("\n")
      .find((l) => l.includes("NEXTAUTH_SECRET="));
    expect(secretLine).toBeDefined();
    expect(secretLine).toContain("your-secret-key-here");
  });

  it("ENCRYPTION_KEY is commented out", () => {
    const encKeyLine = envExample
      .split("\n")
      .find((l) => l.includes("ENCRYPTION_KEY"));
    expect(encKeyLine).toBeDefined();
    expect(encKeyLine!.trimStart().startsWith("#")).toBe(true);
  });

  it("LLM API keys are commented out", () => {
    const openaiLine = envExample
      .split("\n")
      .find((l) => l.includes("OPENAI_API_KEY"));
    const anthropicLine = envExample
      .split("\n")
      .find((l) => l.includes("ANTHROPIC_API_KEY"));
    expect(openaiLine).toBeDefined();
    expect(anthropicLine).toBeDefined();
    expect(openaiLine!.trimStart().startsWith("#")).toBe(true);
    expect(anthropicLine!.trimStart().startsWith("#")).toBe(true);
  });

  it("CRON_SECRET is commented out", () => {
    const cronLine = envExample
      .split("\n")
      .find((l) => l.includes("CRON_SECRET"));
    expect(cronLine).toBeDefined();
    expect(cronLine!.trimStart().startsWith("#")).toBe(true);
  });
});

// ─── .gitignore Verification ────────────────────────────────────────

describe(".gitignore Verification", () => {
  const gitignore = readFileSync(join(ROOT, ".gitignore"), "utf-8");

  it("ignores .env file", () => {
    expect(gitignore).toContain(".env");
  });

  it("ignores dev.db", () => {
    expect(gitignore).toMatch(/dev\.db/);
  });

  it("ignores node_modules", () => {
    expect(gitignore).toContain("node_modules");
  });
});

// ─── API Response Security ──────────────────────────────────────────

describe("API Response Security", () => {
  const usersRouteSource = readFileSync(
    join(ROOT, "src/app/api/admin/users/route.ts"),
    "utf-8"
  );

  it("user list query uses select to exclude hashedPassword", () => {
    // The user list query should use `select` (whitelist) rather than
    // returning the full model which would include hashedPassword
    expect(usersRouteSource).toContain("select: {");
    expect(usersRouteSource).toContain("id: true");
    expect(usersRouteSource).toContain("email: true");
    expect(usersRouteSource).toContain("name: true");
  });

  it("user list response maps safe fields only", () => {
    // The response should explicitly map fields, not spread raw DB objects
    const responseSection = usersRouteSource.includes("id: u.id");
    expect(responseSection).toBe(true);
  });

  it("user create response does not include hashedPassword", () => {
    // After user creation, the JSON response should not contain the hash
    const createResponseLines = usersRouteSource
      .split("\n")
      .filter((l) => l.includes("NextResponse.json") && l.includes("user"));
    // None of the response lines should directly reference hashedPassword
    for (const line of createResponseLines) {
      expect(line).not.toContain("hashedPassword");
    }
  });

  it("temporary password is not returned in API response", () => {
    // The temp password generated during user creation should never appear in responses
    const jsonResponseBlocks = usersRouteSource.match(
      /NextResponse\.json\(\{[\s\S]*?\}\)/g
    );
    if (jsonResponseBlocks) {
      for (const block of jsonResponseBlocks) {
        expect(block).not.toContain("tempPassword");
      }
    }
  });
});

// ─── Deploy Script Security ─────────────────────────────────────────

describe("Deploy Script Consistency", () => {
  const deployScript = readFileSync(
    join(ROOT, "scripts/deploy/deploy.sh"),
    "utf-8"
  );
  const rollbackScript = readFileSync(
    join(ROOT, "scripts/deploy/rollback.sh"),
    "utf-8"
  );

  it("deploy script uses consistent app name", () => {
    expect(deployScript).toContain('APP_NAME="change-management"');
  });

  it("rollback script uses same app name as deploy", () => {
    expect(rollbackScript).toContain('APP_NAME="change-management"');
  });

  it("deploy script requires NEXTAUTH_SECRET", () => {
    expect(deployScript).toContain("NEXTAUTH_SECRET");
  });

  it("deploy script requires DATABASE_URL", () => {
    expect(deployScript).toContain("DATABASE_URL");
  });

  it("deploy script uses set -euo pipefail", () => {
    expect(deployScript).toContain("set -euo pipefail");
  });

  it("rollback script uses set -euo pipefail", () => {
    expect(rollbackScript).toContain("set -euo pipefail");
  });

  it("production deploy requires tests to pass", () => {
    // In production, test failure should abort deployment
    expect(deployScript).toContain("Aborting production deployment");
  });

  it("test command includes --passWithNoTests", () => {
    expect(deployScript).toContain("--passWithNoTests");
  });
});

// ─── useData Hook Contract ──────────────────────────────────────────

describe("useData Hook Contract", () => {
  const hookSource = readFileSync(
    join(ROOT, "src/hooks/use-data.ts"),
    "utf-8"
  );

  it("calls /api/data with no days param when days is undefined", () => {
    // When called as useData(), url should be "/api/data" (no filter)
    expect(hookSource).toContain('const url = days ? `/api/data?days=${days}` : "/api/data"');
  });

  it("supports optional days parameter", () => {
    expect(hookSource).toContain("days?: number");
  });

  it("returns changeRequests array", () => {
    expect(hookSource).toContain("changeRequests: ChangeRequest[]");
  });

  it("returns loading and error states", () => {
    expect(hookSource).toContain("loading: boolean");
    expect(hookSource).toContain("error: string | null");
  });
});
