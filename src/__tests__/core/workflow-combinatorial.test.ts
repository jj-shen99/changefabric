/**
 * Combinatorial Testing for Workflow Actions
 * 
 * This file implements pairwise (2-way) combinatorial testing for workflow transitions.
 * Combinatorial testing ensures that all pairs of input parameters are tested together
 * at least once, providing good coverage with fewer test cases than exhaustive testing.
 * 
 * Parameters tested:
 * - Workflow type: standard, emergency, standard_preapproved
 * - User role: requester, manager, admin
 * - Current state: all states in each workflow
 * - Target event: all events in each workflow
 * - Guard conditions: met, not met
 */

import { 
  STANDARD_WORKFLOW, 
  EMERGENCY_WORKFLOW, 
  STANDARD_PREAPPROVED_WORKFLOW,
  BUILTIN_WORKFLOWS 
} from "@/core/workflow/definitions";
import { availableTransitions, applyTransition, WorkflowError } from "@/core/workflow/state-machine";
import type { WorkflowDefinition, WorkflowRuntime } from "@/core/workflow/state-machine";

// Mock runtime for testing
function createMockRuntime(guardResults: Record<string, boolean> = {}): WorkflowRuntime<Record<string, unknown>> {
  return {
    guards: {
      hasPlannedWindow: () => guardResults.hasPlannedWindow ?? true,
      allApprovalStepsApproved: () => guardResults.allApprovalStepsApproved ?? true,
      hasBackoutPlan: () => guardResults.hasBackoutPlan ?? true,
      hasImplementationPlan: () => guardResults.hasImplementationPlan ?? true,
    },
    effects: {
      startApprovalSteps: () => {},
      setActualStart: () => {},
      setActualEnd: () => {},
      setClosed: () => {},
      setRolledBack: () => {},
    },
  };
}

describe("Workflow Combinatorial Testing", () => {
  describe("Pairwise Coverage: Workflow × Role", () => {
    const workflows = BUILTIN_WORKFLOWS;
    const roles = ["requester", "manager", "admin"] as const;

    // Test all workflow-role combinations
    workflows.forEach((workflow) => {
      roles.forEach((role) => {
        it(`${workflow.key} workflow with ${role} role - initial state transitions`, () => {
          const transitions = availableTransitions(workflow, workflow.initial, role);
          
          // Verify transitions are returned (may be empty for requester)
          expect(Array.isArray(transitions)).toBe(true);
          
          // All returned transitions should be valid from initial state
          transitions.forEach((t) => {
            expect(t.from).toBe(workflow.initial);
            expect(workflow.states[t.to]).toBeDefined();
          });
        });
      });
    });
  });

  describe("Pairwise Coverage: State × Event", () => {
    // Standard workflow state-event pairs
    const standardStateEventPairs = [
      { state: "draft", event: "submit", expectedTo: "submitted", shouldSucceed: true },
      { state: "draft", event: "cancel", expectedTo: "canceled", shouldSucceed: true },
      { state: "submitted", event: "request_approval", expectedTo: "awaiting_approval", shouldSucceed: true },
      { state: "submitted", event: "return_to_draft", expectedTo: "draft", shouldSucceed: true },
      { state: "submitted", event: "cancel", expectedTo: "canceled", shouldSucceed: true },
      { state: "awaiting_approval", event: "approve", expectedTo: "approved", shouldSucceed: true },
      { state: "awaiting_approval", event: "reject", expectedTo: "rejected", shouldSucceed: true },
      { state: "awaiting_approval", event: "cancel", expectedTo: "canceled", shouldSucceed: true },
      { state: "approved", event: "schedule", expectedTo: "scheduled", shouldSucceed: true },
      { state: "approved", event: "implement", expectedTo: "implemented", shouldSucceed: true },
      { state: "approved", event: "cancel", expectedTo: "canceled", shouldSucceed: true },
      { state: "scheduled", event: "implement", expectedTo: "implemented", shouldSucceed: true },
      { state: "scheduled", event: "cancel", expectedTo: "canceled", shouldSucceed: true },
      { state: "implemented", event: "close", expectedTo: "closed", shouldSucceed: true },
      { state: "implemented", event: "rollback", expectedTo: "rolled_back", shouldSucceed: true },
      // Invalid transitions
      { state: "draft", event: "approve", expectedTo: null, shouldSucceed: false },
      { state: "closed", event: "submit", expectedTo: null, shouldSucceed: false },
      { state: "rejected", event: "approve", expectedTo: null, shouldSucceed: false },
    ];

    standardStateEventPairs.forEach(({ state, event, expectedTo, shouldSucceed }) => {
      it(`standard workflow: ${state} + ${event} → ${shouldSucceed ? expectedTo : "error"}`, async () => {
        const runtime = createMockRuntime();
        const ctx = { changeRequest: { number: "CHG001" }, actor: "test@test.com", actorRole: "admin" };

        if (shouldSucceed) {
          const result = await applyTransition(STANDARD_WORKFLOW, runtime, state, event, ctx);
          expect(result.to).toBe(expectedTo);
        } else {
          await expect(
            applyTransition(STANDARD_WORKFLOW, runtime, state, event, ctx)
          ).rejects.toThrow(WorkflowError);
        }
      });
    });
  });

  describe("Pairwise Coverage: Role × Guard Condition", () => {
    const roleGuardPairs = [
      { role: "admin", guard: "hasPlannedWindow", guardMet: true },
      { role: "admin", guard: "hasPlannedWindow", guardMet: false },
      { role: "admin", guard: "allApprovalStepsApproved", guardMet: true },
      { role: "admin", guard: "allApprovalStepsApproved", guardMet: false },
      { role: "manager", guard: "hasPlannedWindow", guardMet: true },
      { role: "manager", guard: "hasPlannedWindow", guardMet: false },
      { role: "manager", guard: "allApprovalStepsApproved", guardMet: true },
      { role: "manager", guard: "allApprovalStepsApproved", guardMet: false },
      { role: "requester", guard: "hasPlannedWindow", guardMet: true },
      { role: "requester", guard: "allApprovalStepsApproved", guardMet: true },
    ];

    roleGuardPairs.forEach(({ role, guard, guardMet }) => {
      it(`${role} role with ${guard}=${guardMet}`, async () => {
        const guardResults = { [guard]: guardMet };
        const runtime = createMockRuntime(guardResults);
        
        // Test schedule transition (requires hasPlannedWindow)
        if (guard === "hasPlannedWindow") {
          const ctx = { changeRequest: { number: "CHG001" }, actor: "test@test.com", actorRole: role };
          
          if (role === "requester") {
            // Requester can't perform schedule (requires manager)
            await expect(
              applyTransition(STANDARD_WORKFLOW, runtime, "approved", "schedule", ctx)
            ).rejects.toThrow(WorkflowError);
          } else if (guardMet) {
            const result = await applyTransition(STANDARD_WORKFLOW, runtime, "approved", "schedule", ctx);
            expect(result.to).toBe("scheduled");
          } else {
            await expect(
              applyTransition(STANDARD_WORKFLOW, runtime, "approved", "schedule", ctx)
            ).rejects.toThrow(WorkflowError);
          }
        }
        
        // Test approve transition (requires allApprovalStepsApproved)
        if (guard === "allApprovalStepsApproved") {
          const ctx = { changeRequest: { number: "CHG001" }, actor: "test@test.com", actorRole: role };
          
          if (role === "requester") {
            // Requester can't perform approve (requires manager)
            await expect(
              applyTransition(STANDARD_WORKFLOW, runtime, "awaiting_approval", "approve", ctx)
            ).rejects.toThrow(WorkflowError);
          } else if (guardMet) {
            const result = await applyTransition(STANDARD_WORKFLOW, runtime, "awaiting_approval", "approve", ctx);
            expect(result.to).toBe("approved");
          } else {
            await expect(
              applyTransition(STANDARD_WORKFLOW, runtime, "awaiting_approval", "approve", ctx)
            ).rejects.toThrow(WorkflowError);
          }
        }
      });
    });
  });

  describe("Pairwise Coverage: Workflow × Terminal State", () => {
    const workflowTerminalPairs = [
      { workflow: STANDARD_WORKFLOW, terminal: "closed" },
      { workflow: STANDARD_WORKFLOW, terminal: "rejected" },
      { workflow: STANDARD_WORKFLOW, terminal: "canceled" },
      { workflow: STANDARD_WORKFLOW, terminal: "rolled_back" },
      { workflow: EMERGENCY_WORKFLOW, terminal: "closed" },
      { workflow: EMERGENCY_WORKFLOW, terminal: "rejected" },
      { workflow: EMERGENCY_WORKFLOW, terminal: "canceled" },
      { workflow: EMERGENCY_WORKFLOW, terminal: "rolled_back" },
      { workflow: STANDARD_PREAPPROVED_WORKFLOW, terminal: "closed" },
      { workflow: STANDARD_PREAPPROVED_WORKFLOW, terminal: "canceled" },
      { workflow: STANDARD_PREAPPROVED_WORKFLOW, terminal: "rolled_back" },
    ];

    workflowTerminalPairs.forEach(({ workflow, terminal }) => {
      it(`${workflow.key} workflow: ${terminal} is terminal (no outgoing transitions)`, async () => {
        const runtime = createMockRuntime();
        const ctx = { changeRequest: { number: "CHG001" }, actor: "test@test.com", actorRole: "admin" };

        // Verify state is marked as terminal
        expect(workflow.states[terminal]?.terminal).toBe(true);

        // Verify no transitions are available from terminal state
        const transitions = availableTransitions(workflow, terminal, "admin");
        expect(transitions).toHaveLength(0);

        // Verify attempting any transition throws error
        await expect(
          applyTransition(workflow, runtime, terminal, "submit", ctx)
        ).rejects.toThrow(WorkflowError);
      });
    });
  });

  describe("3-way Combinatorial: Workflow × State × Role", () => {
    // Selected 3-way combinations for critical paths
    const threeWayCombinations = [
      // Standard workflow combinations
      { workflow: "standard", state: "draft", role: "admin", canTransition: true },
      { workflow: "standard", state: "draft", role: "manager", canTransition: true },
      { workflow: "standard", state: "draft", role: "requester", canTransition: false },
      { workflow: "standard", state: "awaiting_approval", role: "admin", canTransition: true },
      { workflow: "standard", state: "awaiting_approval", role: "manager", canTransition: true },
      { workflow: "standard", state: "awaiting_approval", role: "requester", canTransition: false },
      // Emergency workflow combinations
      { workflow: "emergency", state: "draft", role: "admin", canTransition: true },
      { workflow: "emergency", state: "draft", role: "manager", canTransition: true },
      { workflow: "emergency", state: "draft", role: "requester", canTransition: false },
      { workflow: "emergency", state: "awaiting_approval", role: "admin", canTransition: true },
      { workflow: "emergency", state: "awaiting_approval", role: "manager", canTransition: true },
      // Pre-approved workflow combinations
      { workflow: "standard_preapproved", state: "draft", role: "admin", canTransition: true },
      { workflow: "standard_preapproved", state: "draft", role: "manager", canTransition: true },
      { workflow: "standard_preapproved", state: "draft", role: "requester", canTransition: false },
    ];

    threeWayCombinations.forEach(({ workflow: wfKey, state, role, canTransition }) => {
      it(`${wfKey} + ${state} + ${role} → ${canTransition ? "has transitions" : "no transitions"}`, () => {
        const workflow = BUILTIN_WORKFLOWS.find((w) => w.key === wfKey)!;
        const transitions = availableTransitions(workflow, state, role);
        
        if (canTransition) {
          expect(transitions.length).toBeGreaterThan(0);
        } else {
          expect(transitions.length).toBe(0);
        }
      });
    });
  });

  describe("Boundary Value Analysis", () => {
    it("handles empty workflow gracefully", () => {
      const emptyWorkflow: WorkflowDefinition = {
        key: "empty",
        name: "Empty",
        description: "Test",
        version: 1,
        initial: "start",
        states: { start: { name: "Start" } },
        transitions: [],
      };
      
      const transitions = availableTransitions(emptyWorkflow, "start", "admin");
      expect(transitions).toHaveLength(0);
    });

    it("handles unknown state gracefully", () => {
      const transitions = availableTransitions(STANDARD_WORKFLOW, "nonexistent_state", "admin");
      expect(transitions).toHaveLength(0);
    });

    it("handles undefined role gracefully", () => {
      const transitions = availableTransitions(STANDARD_WORKFLOW, "draft", undefined);
      // Should return all transitions without role filtering
      expect(transitions.length).toBeGreaterThan(0);
    });
  });
});
