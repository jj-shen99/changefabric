/**
 * Tests for approval auto-transition logic
 * Ensures CRs automatically transition to approved/rejected state after all approvals
 */

import { overallApprovalState, evaluateStep } from "@/core/approval/engine";

// Helper to create mock approvals with all required fields
function createApproval(overrides: {
  id: string;
  approverEmail: string;
  decision: "pending" | "approved" | "rejected" | "delegated";
  decidedAt?: string | null;
}) {
  return {
    id: overrides.id,
    approverEmail: overrides.approverEmail,
    decision: overrides.decision,
    comment: null,
    decidedAt: overrides.decidedAt ?? (overrides.decision !== "pending" ? new Date().toISOString() : null),
    delegatedTo: null,
    approverGroup: null,
    changeRequestId: "CHG0000001",
    createdAt: new Date().toISOString(),
  };
}

describe("Approval Auto-Transition", () => {
  describe("overallApprovalState", () => {
    it("returns 'not_requested' for empty steps", () => {
      expect(overallApprovalState([])).toBe("not_requested");
    });

    it("returns 'approved' when all steps are approved", () => {
      const steps = [
        { status: "approved" as const },
        { status: "approved" as const },
      ];
      expect(overallApprovalState(steps)).toBe("approved");
    });

    it("returns 'approved' when all steps are approved or skipped", () => {
      const steps = [
        { status: "approved" as const },
        { status: "skipped" as const },
      ];
      expect(overallApprovalState(steps)).toBe("approved");
    });

    it("returns 'rejected' when any step is rejected", () => {
      const steps = [
        { status: "approved" as const },
        { status: "rejected" as const },
      ];
      expect(overallApprovalState(steps)).toBe("rejected");
    });

    it("returns 'pending' when some steps are still pending", () => {
      const steps = [
        { status: "approved" as const },
        { status: "pending" as const },
      ];
      expect(overallApprovalState(steps)).toBe("pending");
    });

    it("returns 'rejected' even if some steps are pending (rejection takes precedence)", () => {
      const steps = [
        { status: "rejected" as const },
        { status: "pending" as const },
      ];
      expect(overallApprovalState(steps)).toBe("rejected");
    });
  });

  describe("evaluateStep with 'all' policy", () => {
    const step = { policy: "all" as const, status: "pending" as const };

    it("returns approved when all approvers approve", () => {
      const approvals = [
        createApproval({ id: "1", approverEmail: "a@test.com", decision: "approved" }),
        createApproval({ id: "2", approverEmail: "b@test.com", decision: "approved" }),
      ];
      const result = evaluateStep(step, approvals);
      expect(result.stepStatus).toBe("approved");
      expect(result.resolved).toBe(true);
    });

    it("returns rejected when any approver rejects", () => {
      const approvals = [
        createApproval({ id: "1", approverEmail: "a@test.com", decision: "approved" }),
        createApproval({ id: "2", approverEmail: "b@test.com", decision: "rejected" }),
      ];
      const result = evaluateStep(step, approvals);
      expect(result.stepStatus).toBe("rejected");
      expect(result.resolved).toBe(true);
    });

    it("returns pending when not all have decided", () => {
      const approvals = [
        createApproval({ id: "1", approverEmail: "a@test.com", decision: "approved" }),
        createApproval({ id: "2", approverEmail: "b@test.com", decision: "pending", decidedAt: null }),
      ];
      const result = evaluateStep(step, approvals);
      expect(result.stepStatus).toBe("pending");
      expect(result.resolved).toBe(false);
    });
  });

  describe("evaluateStep with 'any' policy", () => {
    const step = { policy: "any" as const, status: "pending" as const };

    it("returns approved when any approver approves", () => {
      const approvals = [
        createApproval({ id: "1", approverEmail: "a@test.com", decision: "approved" }),
        createApproval({ id: "2", approverEmail: "b@test.com", decision: "pending", decidedAt: null }),
      ];
      const result = evaluateStep(step, approvals);
      expect(result.stepStatus).toBe("approved");
      expect(result.resolved).toBe(true);
    });

    it("returns rejected when all reject", () => {
      const approvals = [
        createApproval({ id: "1", approverEmail: "a@test.com", decision: "rejected" }),
        createApproval({ id: "2", approverEmail: "b@test.com", decision: "rejected" }),
      ];
      const result = evaluateStep(step, approvals);
      expect(result.stepStatus).toBe("rejected");
      expect(result.resolved).toBe(true);
    });
  });

  describe("evaluateStep with 'quorum:N' policy", () => {
    const step = { policy: "quorum:2" as const, status: "pending" as const };

    it("returns approved when quorum is met", () => {
      const approvals = [
        createApproval({ id: "1", approverEmail: "a@test.com", decision: "approved" }),
        createApproval({ id: "2", approverEmail: "b@test.com", decision: "approved" }),
        createApproval({ id: "3", approverEmail: "c@test.com", decision: "pending", decidedAt: null }),
      ];
      const result = evaluateStep(step, approvals);
      expect(result.stepStatus).toBe("approved");
      expect(result.resolved).toBe(true);
    });

    it("returns rejected when quorum cannot be met", () => {
      const approvals = [
        createApproval({ id: "1", approverEmail: "a@test.com", decision: "approved" }),
        createApproval({ id: "2", approverEmail: "b@test.com", decision: "rejected" }),
        createApproval({ id: "3", approverEmail: "c@test.com", decision: "rejected" }),
      ];
      const result = evaluateStep(step, approvals);
      expect(result.stepStatus).toBe("rejected");
      expect(result.resolved).toBe(true);
    });

    it("returns pending when quorum could still be met", () => {
      const approvals = [
        createApproval({ id: "1", approverEmail: "a@test.com", decision: "approved" }),
        createApproval({ id: "2", approverEmail: "b@test.com", decision: "pending", decidedAt: null }),
        createApproval({ id: "3", approverEmail: "c@test.com", decision: "pending", decidedAt: null }),
      ];
      const result = evaluateStep(step, approvals);
      expect(result.stepStatus).toBe("pending");
      expect(result.resolved).toBe(false);
    });
  });

  describe("System context for auto-transition", () => {
    // Simulates the role hierarchy check
    function canActAs(actual: string, required: string): boolean {
      const order = ["requester", "manager", "admin"];
      return order.indexOf(actual) >= order.indexOf(required);
    }

    it("requester cannot perform manager-required transitions", () => {
      expect(canActAs("requester", "manager")).toBe(false);
    });

    it("manager can perform manager-required transitions", () => {
      expect(canActAs("manager", "manager")).toBe(true);
    });

    it("admin can perform any transition", () => {
      expect(canActAs("admin", "manager")).toBe(true);
      expect(canActAs("admin", "admin")).toBe(true);
      expect(canActAs("admin", "requester")).toBe(true);
    });

    it("system context with admin role can auto-transition", () => {
      // This simulates the fix: using admin role for system-triggered transitions
      const systemCtx = { actor: "approver@test.com", actorRole: "admin" };
      const requiredRole = "manager"; // approve transition requires manager
      
      expect(canActAs(systemCtx.actorRole, requiredRole)).toBe(true);
    });
  });
});

describe("Draft CR Visibility", () => {
  // Simulates the visibility logic from the API route
  function canViewCR(
    crState: string,
    userEmail: string,
    crRequestedBy: string,
    isApprover: boolean,
    canViewAllData: boolean,
    isAssigned: boolean
  ): boolean {
    const isOwner = userEmail === crRequestedBy;
    const isDraft = crState === "draft";
    
    // Draft CRs are only visible to owner, assigned user, and admins
    if (isDraft && !canViewAllData && !isOwner && !isAssigned) {
      return false;
    }
    
    // Approvers can only see specific states
    const approverVisibleStates = new Set([
      "awaiting_approval", "approved", "scheduled", "implemented", 
      "rolled_back", "closed", "rejected"
    ]);
    const approverCanView = isApprover && approverVisibleStates.has(crState);
    
    if (!canViewAllData && !isOwner && !isAssigned && !approverCanView) {
      return false;
    }
    
    return true;
  }

  it("owner can see their draft CR", () => {
    expect(canViewCR("draft", "owner@test.com", "owner@test.com", false, false, false)).toBe(true);
  });

  it("admin can see any draft CR", () => {
    expect(canViewCR("draft", "admin@test.com", "owner@test.com", false, true, false)).toBe(true);
  });

  it("approver cannot see draft CR", () => {
    expect(canViewCR("draft", "approver@test.com", "owner@test.com", true, false, false)).toBe(false);
  });

  it("approver cannot see submitted CR", () => {
    expect(canViewCR("submitted", "approver@test.com", "owner@test.com", true, false, false)).toBe(false);
  });

  it("approver can see awaiting_approval CR", () => {
    expect(canViewCR("awaiting_approval", "approver@test.com", "owner@test.com", true, false, false)).toBe(true);
  });

  it("approver can see approved CR", () => {
    expect(canViewCR("approved", "approver@test.com", "owner@test.com", true, false, false)).toBe(true);
  });

  it("approver can see closed CR", () => {
    expect(canViewCR("closed", "approver@test.com", "owner@test.com", true, false, false)).toBe(true);
  });

  it("assigned user can see any CR state", () => {
    expect(canViewCR("draft", "assigned@test.com", "owner@test.com", false, false, true)).toBe(true);
    expect(canViewCR("submitted", "assigned@test.com", "owner@test.com", false, false, true)).toBe(true);
    expect(canViewCR("awaiting_approval", "assigned@test.com", "owner@test.com", false, false, true)).toBe(true);
  });
});
