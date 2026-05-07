import {
  activeSteps,
  applyDecision,
  evaluateStep,
  overallApprovalState,
  ApprovalError,
} from "../approval/engine";
import type { Approval, ApprovalStep } from "../schema";

function approval(email: string, decision: Approval["decision"] = "pending"): Approval {
  return {
    id: `a-${email}`,
    changeRequestId: "CHG1",
    stepId: "s1",
    approverEmail: email,
    approverGroup: null,
    decision,
    comment: null,
    delegatedTo: null,
    decidedAt: decision === "pending" ? null : new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };
}

describe("approval engine — evaluateStep", () => {
  it("policy=all requires every approval", () => {
    expect(evaluateStep({ policy: "all", status: "pending" }, [approval("a", "approved")])).toMatchObject({ stepStatus: "approved" });
    expect(evaluateStep({ policy: "all", status: "pending" }, [approval("a", "approved"), approval("b")])).toMatchObject({ stepStatus: "pending" });
    expect(evaluateStep({ policy: "all", status: "pending" }, [approval("a", "approved"), approval("b", "rejected")])).toMatchObject({ stepStatus: "rejected" });
  });

  it("policy=any approves on first yes", () => {
    expect(evaluateStep({ policy: "any", status: "pending" }, [approval("a", "approved"), approval("b")])).toMatchObject({ stepStatus: "approved" });
    expect(evaluateStep({ policy: "any", status: "pending" }, [approval("a", "rejected"), approval("b", "rejected")])).toMatchObject({ stepStatus: "rejected" });
  });

  it("policy=quorum requires N approvals", () => {
    expect(evaluateStep({ policy: "quorum:2", status: "pending" }, [approval("a", "approved"), approval("b", "approved"), approval("c")])).toMatchObject({ stepStatus: "approved" });
    expect(evaluateStep({ policy: "quorum:2", status: "pending" }, [approval("a", "approved"), approval("b", "rejected"), approval("c", "rejected")])).toMatchObject({ stepStatus: "rejected" });
    expect(evaluateStep({ policy: "quorum:2", status: "pending" }, [approval("a", "approved"), approval("b"), approval("c")])).toMatchObject({ stepStatus: "pending" });
  });

  it("rejects an invalid policy string", () => {
    expect(() => evaluateStep({ policy: "wat" as never, status: "pending" }, [approval("a")]))
      .toThrow(ApprovalError);
  });
});

describe("approval engine — applyDecision", () => {
  it("rejects an unknown approver", () => {
    expect(() => applyDecision({ policy: "all", status: "pending" }, [approval("a")], { approverEmail: "z", decision: "approved" }))
      .toThrow(/not assigned/);
  });

  it("rejects double-vote", () => {
    expect(() => applyDecision({ policy: "all", status: "pending" }, [approval("a", "approved")], { approverEmail: "a", decision: "rejected" }))
      .toThrow(/already decided/);
  });

  it("records a vote and re-evaluates", () => {
    const out = applyDecision({ policy: "any", status: "pending" }, [approval("a"), approval("b")], { approverEmail: "a", decision: "approved", comment: "ok" });
    expect(out.evaluation.stepStatus).toBe("approved");
    expect(out.approvals.find((x) => x.approverEmail === "a")?.comment).toBe("ok");
  });
});

describe("approval engine — orchestration", () => {
  it("activeSteps returns parallel group with smallest ordering", () => {
    const steps: ApprovalStep[] = [
      { id: "1", changeRequestId: "x", name: "tech", ordering: 1, policy: "all", status: "approved", startedAt: null, completedAt: null, approvals: [] },
      { id: "2", changeRequestId: "x", name: "sec",  ordering: 2, policy: "any", status: "pending", startedAt: null, completedAt: null, approvals: [] },
      { id: "3", changeRequestId: "x", name: "cab",  ordering: 2, policy: "any", status: "pending", startedAt: null, completedAt: null, approvals: [] },
      { id: "4", changeRequestId: "x", name: "biz",  ordering: 3, policy: "any", status: "pending", startedAt: null, completedAt: null, approvals: [] },
    ];
    const active = activeSteps(steps);
    expect(active.map((s) => s.id).sort()).toEqual(["2", "3"]);
  });

  it("overallApprovalState aggregates across steps", () => {
    expect(overallApprovalState([])).toBe("not_requested");
    expect(overallApprovalState([{ status: "approved" }, { status: "approved" }])).toBe("approved");
    expect(overallApprovalState([{ status: "approved" }, { status: "pending" }])).toBe("pending");
    expect(overallApprovalState([{ status: "approved" }, { status: "rejected" }])).toBe("rejected");
  });
});
