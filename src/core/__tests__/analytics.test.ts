import { computeDashboardMetrics, impactByCategory, weeklyTrend, approvalAnalytics } from "../analytics";
import type { ChangeRequest } from "../schema";
import { analyzeImpact } from "../impact/analyzer";
import { predictRisk } from "../ml/risk";

function cr(partial: Partial<ChangeRequest>): ChangeRequest {
  return {
    number: "CHG1", externalId: null, externalSource: null, workflowKey: "standard",
    title: "t", description: "", type: "standard", category: "infra",
    priority: "3", riskLevel: "moderate", impactLevel: "3", urgency: "3",
    state: "draft", approvalState: "not_requested",
    justification: "", implementationPlan: "", backoutPlan: "", testPlan: "",
    riskAndImpactAnalysis: "", closeCode: "", closeNotes: "",
    plannedStart: null, plannedEnd: null, actualStart: null, actualEnd: null,
    requestedBy: "u@x", assignedTo: null, assignmentGroup: null,
    configurationItem: null, businessService: null,
    affectedServices: [], tags: [],
    computedRiskScore: 30, computedImpactScore: 30,
    mlRiskScore: 40, mlConfidence: 0.6, mlExplanation: null,
    releaseId: null,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    createdBy: "u@x", closedAt: null, closedBy: null,
    ...partial,
  };
}

describe("analytics", () => {
  it("computes dashboard metrics", () => {
    const m = computeDashboardMetrics([
      cr({ state: "draft" }),
      cr({ number: "C2", state: "awaiting_approval" }),
      cr({ number: "C3", state: "closed", closedAt: new Date().toISOString() }),
      cr({ number: "C4", state: "rejected", type: "emergency" }),
    ]);
    expect(m.totalChanges).toBe(4);
    expect(m.pendingChanges).toBe(2);
    expect(m.closedChanges).toBe(1);
    expect(m.rejectedChanges).toBe(1);
    expect(m.emergencyChanges).toBe(1);
    expect(m.failureRate).toBe(50);
  });

  it("buckets by category", () => {
    const out = impactByCategory([cr({ category: "x" }), cr({ number: "C2", category: "x" }), cr({ number: "C3", category: "y" })]);
    expect(out.find((b) => b.category === "x")?.count).toBe(2);
  });

  it("returns weekly trend", () => {
    const buckets = weeklyTrend([cr({}), cr({ number: "C2" })]);
    expect(buckets.length).toBeGreaterThan(0);
  });

  it("approvalAnalytics aggregates", () => {
    const out = approvalAnalytics([
      { approverEmail: "a@x", decision: "approved", changeRequestId: "C1" },
      { approverEmail: "a@x", decision: "rejected", changeRequestId: "C2" },
      { approverEmail: "b@x", decision: "pending", changeRequestId: "C1" },
    ]);
    expect(out.approved).toBe(1);
    expect(out.rejected).toBe(1);
    expect(out.pending).toBe(1);
    expect(out.topApprovers[0].email).toBe("a@x");
  });
});

describe("impact + ml", () => {
  it("scores a low-risk CR low", () => {
    const c = cr({ riskLevel: "low", impactLevel: "3", priority: "4", backoutPlan: "x".repeat(40), testPlan: "x".repeat(40), implementationPlan: "x".repeat(40) });
    expect(analyzeImpact(c).overallRisk).toBeLessThan(50);
    expect(predictRisk(c).score).toBeLessThan(50);
  });

  it("scores a very-high-risk emergency CR high", () => {
    const c = cr({ riskLevel: "very_high", impactLevel: "1", priority: "1", type: "emergency", affectedServices: ["a", "b", "c", "d", "e"] });
    expect(analyzeImpact(c).overallRisk).toBeGreaterThan(60);
    expect(predictRisk(c).score).toBeGreaterThan(70);
  });
});
