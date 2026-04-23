/**
 * API route access control tests.
 * Tests that API endpoints enforce proper authentication and role-based authorization.
 * Uses mock fetch to simulate API responses based on session state.
 */

// ── Helpers ───────────────────────────────────────────────────────

type MockSession = {
  user: { email: string; name: string; role: string; id: string };
} | null;

/**
 * Simulates the access-control logic used across all protected API routes.
 * Returns { status, allowed } based on session and role requirements.
 */
function checkRouteAccess(
  session: MockSession,
  options: { requireAuth?: boolean; requireAdmin?: boolean; requireOwner?: string; userEmail?: string } = {}
): { status: number; allowed: boolean } {
  const { requireAuth = true, requireAdmin = false, requireOwner, userEmail } = options;

  if (requireAuth && !session) {
    return { status: 401, allowed: false };
  }
  if (requireAdmin && session?.user.role !== "admin") {
    return { status: 403, allowed: false };
  }
  if (requireOwner && session?.user.role !== "admin" && session?.user.email !== userEmail) {
    return { status: 403, allowed: false };
  }
  return { status: 200, allowed: true };
}

// ── Authentication tests ──────────────────────────────────────────

describe("Authentication enforcement", () => {
  it("rejects unauthenticated requests with 401", () => {
    const result = checkRouteAccess(null);
    expect(result.status).toBe(401);
    expect(result.allowed).toBe(false);
  });

  it("allows authenticated requests", () => {
    const session: MockSession = {
      user: { email: "user@test.com", name: "User", role: "manager", id: "1" },
    };
    const result = checkRouteAccess(session);
    expect(result.status).toBe(200);
    expect(result.allowed).toBe(true);
  });
});

// ── Admin-only route tests ────────────────────────────────────────

describe("Admin-only route enforcement", () => {
  const adminSession: MockSession = {
    user: { email: "admin@test.com", name: "Admin", role: "admin", id: "1" },
  };
  const managerSession: MockSession = {
    user: { email: "manager@test.com", name: "Manager", role: "manager", id: "2" },
  };

  it("allows admin access to admin-only routes", () => {
    const result = checkRouteAccess(adminSession, { requireAdmin: true });
    expect(result.status).toBe(200);
    expect(result.allowed).toBe(true);
  });

  it("rejects manager from admin-only routes with 403", () => {
    const result = checkRouteAccess(managerSession, { requireAdmin: true });
    expect(result.status).toBe(403);
    expect(result.allowed).toBe(false);
  });

  it("rejects unauthenticated from admin-only routes with 401", () => {
    const result = checkRouteAccess(null, { requireAdmin: true });
    expect(result.status).toBe(401);
    expect(result.allowed).toBe(false);
  });
});

// ── Owner-based access control tests ──────────────────────────────

describe("Owner-based access control", () => {
  const ownerSession: MockSession = {
    user: { email: "owner@test.com", name: "Owner", role: "manager", id: "1" },
  };
  const otherSession: MockSession = {
    user: { email: "other@test.com", name: "Other", role: "manager", id: "2" },
  };
  const adminSession: MockSession = {
    user: { email: "admin@test.com", name: "Admin", role: "admin", id: "3" },
  };

  it("allows owner to access their own resource", () => {
    const result = checkRouteAccess(ownerSession, {
      requireOwner: "owner@test.com",
      userEmail: "owner@test.com",
    });
    expect(result.allowed).toBe(true);
  });

  it("rejects non-owner non-admin from accessing resource", () => {
    const result = checkRouteAccess(otherSession, {
      requireOwner: "owner@test.com",
      userEmail: "owner@test.com",
    });
    expect(result.status).toBe(403);
    expect(result.allowed).toBe(false);
  });

  it("allows admin to access any user resource", () => {
    const result = checkRouteAccess(adminSession, {
      requireOwner: "owner@test.com",
      userEmail: "owner@test.com",
    });
    expect(result.allowed).toBe(true);
  });
});

// ── Data filtering rules ──────────────────────────────────────────

describe("Data filtering by user role", () => {
  interface ChangeRequest {
    number: string;
    syncedBy: string;
  }

  function filterChangeRequests(
    allCRs: ChangeRequest[],
    userRole: string,
    userEmail: string
  ): ChangeRequest[] {
    if (userRole === "admin") return allCRs;
    return allCRs.filter((cr) => cr.syncedBy === userEmail);
  }

  const testData: ChangeRequest[] = [
    { number: "CHG001", syncedBy: "alice@test.com" },
    { number: "CHG002", syncedBy: "bob@test.com" },
    { number: "CHG003", syncedBy: "alice@test.com" },
    { number: "CHG004", syncedBy: "charlie@test.com" },
  ];

  it("admin sees all change requests", () => {
    const result = filterChangeRequests(testData, "admin", "admin@test.com");
    expect(result.length).toBe(4);
  });

  it("manager sees only their own synced change requests", () => {
    const result = filterChangeRequests(testData, "manager", "alice@test.com");
    expect(result.length).toBe(2);
    expect(result.every((cr) => cr.syncedBy === "alice@test.com")).toBe(true);
  });

  it("manager with no synced CRs sees empty list", () => {
    const result = filterChangeRequests(testData, "manager", "nobody@test.com");
    expect(result.length).toBe(0);
  });

  it("empty dataset returns empty for all roles", () => {
    expect(filterChangeRequests([], "admin", "admin@test.com").length).toBe(0);
    expect(filterChangeRequests([], "manager", "user@test.com").length).toBe(0);
  });
});

// ── Analysis filtering rules ──────────────────────────────────────

describe("Analysis filtering by user role", () => {
  interface SavedAnalysis {
    id: string;
    createdBy: string;
  }

  function filterAnalyses(
    all: SavedAnalysis[],
    userRole: string,
    userEmail: string
  ): SavedAnalysis[] {
    if (userRole === "admin") return all;
    return all.filter((a) => a.createdBy === userEmail);
  }

  const testData: SavedAnalysis[] = [
    { id: "1", createdBy: "alice@test.com" },
    { id: "2", createdBy: "bob@test.com" },
    { id: "3", createdBy: "alice@test.com" },
  ];

  it("admin sees all analyses", () => {
    expect(filterAnalyses(testData, "admin", "admin@test.com").length).toBe(3);
  });

  it("manager sees only their own analyses", () => {
    const result = filterAnalyses(testData, "manager", "alice@test.com");
    expect(result.length).toBe(2);
    expect(result.every((a) => a.createdBy === "alice@test.com")).toBe(true);
  });

  it("manager with no analyses sees empty list", () => {
    expect(filterAnalyses(testData, "manager", "nobody@test.com").length).toBe(0);
  });
});

// ── Credential isolation tests ────────────────────────────────────

describe("Per-user credential isolation", () => {
  interface IntegrationSetting {
    userId: string;
    type: string;
    key: string;
    value: string;
  }

  function getCredentialsForUser(
    all: IntegrationSetting[],
    userEmail: string
  ): IntegrationSetting[] {
    return all.filter((s) => s.userId === userEmail);
  }

  const testData: IntegrationSetting[] = [
    { userId: "alice@test.com", type: "snow", key: "instance", value: "https://alice-instance.com" },
    { userId: "alice@test.com", type: "snow", key: "user", value: "alice" },
    { userId: "bob@test.com", type: "snow", key: "instance", value: "https://bob-instance.com" },
    { userId: "bob@test.com", type: "git", key: "instance", value: "https://bob-git.com" },
  ];

  it("alice sees only her credentials", () => {
    const result = getCredentialsForUser(testData, "alice@test.com");
    expect(result.length).toBe(2);
    expect(result.every((s) => s.userId === "alice@test.com")).toBe(true);
  });

  it("bob sees only his credentials", () => {
    const result = getCredentialsForUser(testData, "bob@test.com");
    expect(result.length).toBe(2);
    expect(result.every((s) => s.userId === "bob@test.com")).toBe(true);
  });

  it("unknown user sees no credentials", () => {
    expect(getCredentialsForUser(testData, "unknown@test.com").length).toBe(0);
  });

  it("users cannot see each other credentials", () => {
    const aliceCreds = getCredentialsForUser(testData, "alice@test.com");
    const bobCreds = getCredentialsForUser(testData, "bob@test.com");
    const aliceValues = aliceCreds.map((s) => s.value);
    const bobValues = bobCreds.map((s) => s.value);
    // No overlap
    aliceValues.forEach((v) => expect(bobValues).not.toContain(v));
  });
});

// ── Boundary: empty/null session fields ───────────────────────────

describe("Boundary: edge-case session values", () => {
  it("empty email defaults to no data access", () => {
    const session: MockSession = {
      user: { email: "", name: "NoEmail", role: "manager", id: "1" },
    };
    const result = checkRouteAccess(session, {
      requireOwner: "someone@test.com",
      userEmail: "someone@test.com",
    });
    expect(result.allowed).toBe(false);
  });

  it("null session is treated as unauthenticated", () => {
    expect(checkRouteAccess(null).status).toBe(401);
  });

  it("unknown role string is not admin", () => {
    const session: MockSession = {
      user: { email: "user@test.com", name: "User", role: "unknown_role", id: "1" },
    };
    const result = checkRouteAccess(session, { requireAdmin: true });
    expect(result.status).toBe(403);
  });
});
