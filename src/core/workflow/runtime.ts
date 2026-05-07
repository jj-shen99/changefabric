/**
 * Standard runtime: guards + effects referenced by the built-in workflow
 * definitions. Effects mutate the change-request draft passed in via context;
 * persistence is the caller's responsibility.
 */

import type { ChangeRequest } from "../schema";
import type { WorkflowRuntime } from "./state-machine";
import { overallApprovalState } from "../approval/engine";
import type { ApprovalStep } from "../schema";

export interface StandardRuntimeDeps {
  /** Returns the approval steps currently associated with the CR. */
  loadApprovalSteps: (crNumber: string) => Promise<ApprovalStep[]>;
}

export function buildStandardRuntime(
  deps: StandardRuntimeDeps
): WorkflowRuntime<ChangeRequest> {
  return {
    guards: {
      hasPlannedWindow: ({ changeRequest }) => {
        const hasWindow = Boolean(changeRequest.plannedStart && changeRequest.plannedEnd);
        if (!hasWindow) {
          console.warn(`Guard hasPlannedWindow failed: CR ${changeRequest.number} missing plannedStart or plannedEnd`);
        }
        return hasWindow;
      },
      allApprovalStepsApproved: async ({ changeRequest }) => {
        const steps = await deps.loadApprovalSteps(changeRequest.number);
        return overallApprovalState(steps) === "approved";
      },
      hasBackoutPlan: ({ changeRequest }) =>
        changeRequest.backoutPlan.trim().length >= 30,
      hasImplementationPlan: ({ changeRequest }) =>
        changeRequest.implementationPlan.trim().length >= 30,
    },
    effects: {
      // Effects mutate the in-memory CR; the service layer reads these mutations
      // and folds them into the persisted patch.
      startApprovalSteps: ({ changeRequest }) => {
        changeRequest.approvalState = "pending";
      },
      setActualStart: ({ changeRequest }) => {
        if (!changeRequest.actualStart) {
          changeRequest.actualStart = new Date().toISOString();
        }
      },
      setActualEnd: ({ changeRequest }) => {
        if (!changeRequest.actualEnd) {
          changeRequest.actualEnd = new Date().toISOString();
        }
      },
      setClosed: ({ changeRequest, actor }) => {
        changeRequest.closedAt = new Date().toISOString();
        changeRequest.closedBy = actor;
      },
    },
  };
}
