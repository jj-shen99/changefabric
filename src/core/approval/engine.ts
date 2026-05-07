/**
 * Multi-person approval engine.
 *
 * Supports:
 *   - Multiple approval steps per change (e.g. Tech, Security, CAB)
 *   - Sequential ordering (lower `ordering` runs first) AND parallel
 *     (steps with the same ordering run concurrently)
 *   - Per-step policy: "all" (unanimous), "any" (first decides),
 *     "quorum:N" (at least N approvals)
 *   - Delegation
 *
 * The engine is pure: it takes the current step + approvals state and
 * returns the next state. Persistence is handled by the caller.
 */

import type {
  Approval,
  ApprovalDecision,
  ApprovalPolicy,
  ApprovalStep,
  ApprovalStepStatus,
} from "../schema";

export interface ApprovalDecisionInput {
  approverEmail: string;
  decision: Exclude<ApprovalDecision, "pending">;
  comment?: string;
  delegatedTo?: string;
}

export interface ApprovalEvaluation {
  stepStatus: ApprovalStepStatus;
  /** True if this step is now resolved (approved/rejected/skipped). */
  resolved: boolean;
}

export class ApprovalError extends Error {
  constructor(
    msg: string,
    public readonly code:
      | "approver_not_found"
      | "already_decided"
      | "step_not_active"
      | "invalid_policy"
  ) {
    super(msg);
    this.name = "ApprovalError";
  }
}

function parseQuorum(policy: ApprovalPolicy): number | null {
  if (typeof policy === "string" && policy.startsWith("quorum:")) {
    const n = parseInt(policy.slice("quorum:".length), 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  return null;
}

/** Evaluate the status of a single approval step from its approvals. */
export function evaluateStep(
  step: Pick<ApprovalStep, "policy" | "status">,
  approvals: Approval[]
): ApprovalEvaluation {
  if (step.status !== "pending") {
    return { stepStatus: step.status, resolved: true };
  }

  const total = approvals.length;
  const approved = approvals.filter((a) => a.decision === "approved").length;
  const rejected = approvals.filter((a) => a.decision === "rejected").length;
  const decided = approvals.filter((a) => a.decision !== "pending" && a.decision !== "delegated").length;

  switch (step.policy) {
    case "all": {
      if (rejected > 0) return { stepStatus: "rejected", resolved: true };
      if (approved === total && total > 0) return { stepStatus: "approved", resolved: true };
      return { stepStatus: "pending", resolved: false };
    }
    case "any": {
      if (approved >= 1) return { stepStatus: "approved", resolved: true };
      if (decided === total && total > 0) return { stepStatus: "rejected", resolved: true };
      return { stepStatus: "pending", resolved: false };
    }
    default: {
      const n = parseQuorum(step.policy);
      if (n === null) {
        throw new ApprovalError(`Invalid policy: ${step.policy}`, "invalid_policy");
      }
      if (approved >= n) return { stepStatus: "approved", resolved: true };
      // If even all remaining "yes" votes can't reach quorum, mark rejected.
      const remaining = approvals.filter((a) => a.decision === "pending").length;
      if (approved + remaining < n) return { stepStatus: "rejected", resolved: true };
      return { stepStatus: "pending", resolved: false };
    }
  }
}

/**
 * Apply one approver decision. Returns the updated approval list and the new
 * step status. Caller is responsible for persisting + advancing workflow.
 */
export function applyDecision(
  step: Pick<ApprovalStep, "policy" | "status">,
  approvals: Approval[],
  input: ApprovalDecisionInput,
  now: Date = new Date()
): { approvals: Approval[]; evaluation: ApprovalEvaluation } {
  if (step.status !== "pending") {
    throw new ApprovalError(`Step is ${step.status}, not pending`, "step_not_active");
  }

  const idx = approvals.findIndex(
    (a) => a.approverEmail.toLowerCase() === input.approverEmail.toLowerCase()
  );
  if (idx < 0) {
    throw new ApprovalError(
      `Approver ${input.approverEmail} not assigned to this step`,
      "approver_not_found"
    );
  }
  const current = approvals[idx];
  if (current.decision !== "pending") {
    throw new ApprovalError(
      `Approver ${input.approverEmail} already decided (${current.decision})`,
      "already_decided"
    );
  }

  const updated: Approval = {
    ...current,
    decision: input.decision,
    comment: input.comment ?? current.comment,
    delegatedTo: input.delegatedTo ?? current.delegatedTo,
    decidedAt: now.toISOString(),
  };
  const next = approvals.slice();
  next[idx] = updated;

  return { approvals: next, evaluation: evaluateStep(step, next) };
}

/**
 * Determine which approval steps are currently "active" — i.e. should be
 * collecting approvals — based on ordering. Steps with the lowest pending
 * ordering value are active in parallel; later groups wait their turn.
 */
export function activeSteps<T extends Pick<ApprovalStep, "ordering" | "status">>(
  steps: T[]
): T[] {
  const pending = steps.filter((s) => s.status === "pending");
  if (pending.length === 0) return [];
  const minOrder = Math.min(...pending.map((s) => s.ordering));
  return pending.filter((s) => s.ordering === minOrder);
}

/** Overall approval state for a change request given its steps. */
export function overallApprovalState(
  steps: Pick<ApprovalStep, "status">[]
): "not_requested" | "pending" | "approved" | "rejected" {
  if (steps.length === 0) return "not_requested";
  if (steps.some((s) => s.status === "rejected")) return "rejected";
  if (steps.every((s) => s.status === "approved" || s.status === "skipped"))
    return "approved";
  return "pending";
}
