/**
 * Tests for the in_progress state and implementer role
 * 
 * The in_progress state represents a CR that is actively being implemented.
 * Flow: scheduled/approved → implement → in_progress → complete → implemented
 * 
 * The implementer role is a new role between requester and manager that can:
 * - Execute the "implement" action to start implementation
 * - Execute the "complete" action to finish implementation
 */

import { 
  STANDARD_WORKFLOW, 
  EMERGENCY_WORKFLOW, 
  STANDARD_PREAPPROVED_WORKFLOW,
  BUILTIN_WORKFLOWS
} from "@/core/workflow/definitions";
import { availableTransitions, applyTransition } from "@/core/workflow/state-machine";
import type { WorkflowRuntime } from "@/core/workflow/state-machine";

// Mock runtime that passes all guards
function createMockRuntime(): WorkflowRuntime<Record<string, unknown>> {
  return {
    guards: {
      hasPlannedWindow: () => true,
      allApprovalStepsApproved: () => true,
      hasBackoutPlan: () => true,
      hasImplementationPlan: () => true,
      emergencyApprovalGranted: () => true,
    },
    effects: {
      startApprovalSteps: () => {},
      startEmergencyApproval: () => {},
      setActualStart: () => {},
      setActualEnd: () => {},
      setClosed: () => {},
      setRolledBack: () => {},
    },
  };
}

describe("In Progress State", () => {
  describe("Standard Workflow", () => {
    it("has in_progress state defined", () => {
      expect(STANDARD_WORKFLOW.states.in_progress).toBeDefined();
      expect(STANDARD_WORKFLOW.states.in_progress.name).toBe("In Progress");
      expect(STANDARD_WORKFLOW.states.in_progress.tags).toContain("in-flight");
      expect(STANDARD_WORKFLOW.states.in_progress.tags).toContain("no-cancel");
    });

    it("implement transitions to in_progress (not implemented)", async () => {
      const runtime = createMockRuntime();
      const ctx = { changeRequest: { number: "CHG001" }, actor: "impl@test.com", actorRole: "implementer" };
      
      const result = await applyTransition(STANDARD_WORKFLOW, runtime, "scheduled", "implement", ctx);
      expect(result.to).toBe("in_progress");
    });

    it("complete transitions from in_progress to implemented", async () => {
      const runtime = createMockRuntime();
      const ctx = { changeRequest: { number: "CHG001" }, actor: "impl@test.com", actorRole: "implementer" };
      
      const result = await applyTransition(STANDARD_WORKFLOW, runtime, "in_progress", "complete", ctx);
      expect(result.to).toBe("implemented");
    });

    it("can rollback from in_progress state", async () => {
      const runtime = createMockRuntime();
      const ctx = { changeRequest: { number: "CHG001" }, actor: "mgr@test.com", actorRole: "manager" };
      
      const result = await applyTransition(STANDARD_WORKFLOW, runtime, "in_progress", "rollback", ctx);
      expect(result.to).toBe("rolled_back");
    });

    it("cannot cancel from in_progress state", () => {
      const transitions = availableTransitions(STANDARD_WORKFLOW, "in_progress", "admin");
      const cancelTransition = transitions.find(t => t.event === "cancel");
      expect(cancelTransition).toBeUndefined();
    });
  });

  describe("Emergency Workflow", () => {
    it("has in_progress state defined", () => {
      expect(EMERGENCY_WORKFLOW.states.in_progress).toBeDefined();
      expect(EMERGENCY_WORKFLOW.states.in_progress.name).toBe("In Progress");
    });

    it("approve_emergency transitions from emergency_approval to in_progress", async () => {
      const runtime = createMockRuntime();
      const ctx = { changeRequest: { number: "CHG001" }, actor: "mgr@test.com", actorRole: "manager" };
      
      const result = await applyTransition(EMERGENCY_WORKFLOW, runtime, "emergency_approval", "approve_emergency", ctx);
      expect(result.to).toBe("in_progress");
    });

    it("implement transitions from in_progress to implemented", async () => {
      const runtime = createMockRuntime();
      const ctx = { changeRequest: { number: "CHG001" }, actor: "impl@test.com", actorRole: "implementer" };
      
      const result = await applyTransition(EMERGENCY_WORKFLOW, runtime, "in_progress", "implement", ctx);
      expect(result.to).toBe("implemented");
    });
  });

  describe("Pre-Approved Workflow", () => {
    it("has in_progress state defined", () => {
      expect(STANDARD_PREAPPROVED_WORKFLOW.states.in_progress).toBeDefined();
      expect(STANDARD_PREAPPROVED_WORKFLOW.states.in_progress.name).toBe("In Progress");
    });

    it("implement transitions from scheduled to in_progress", async () => {
      const runtime = createMockRuntime();
      const ctx = { changeRequest: { number: "CHG001" }, actor: "impl@test.com", actorRole: "implementer" };
      
      const result = await applyTransition(STANDARD_PREAPPROVED_WORKFLOW, runtime, "scheduled", "implement", ctx);
      expect(result.to).toBe("in_progress");
    });

    it("complete transitions from in_progress to implemented", async () => {
      const runtime = createMockRuntime();
      const ctx = { changeRequest: { number: "CHG001" }, actor: "impl@test.com", actorRole: "implementer" };
      
      const result = await applyTransition(STANDARD_PREAPPROVED_WORKFLOW, runtime, "in_progress", "complete", ctx);
      expect(result.to).toBe("implemented");
    });
  });
});

describe("Implementer Role", () => {
  describe("Role Hierarchy", () => {
    it("implementer can perform implementer-required actions", () => {
      const transitions = availableTransitions(STANDARD_WORKFLOW, "scheduled", "implementer");
      const implementTransition = transitions.find(t => t.event === "implement");
      expect(implementTransition).toBeDefined();
    });

    it("manager can perform implementer-required actions (higher role)", () => {
      const transitions = availableTransitions(STANDARD_WORKFLOW, "scheduled", "manager");
      const implementTransition = transitions.find(t => t.event === "implement");
      expect(implementTransition).toBeDefined();
    });

    it("admin can perform implementer-required actions (highest role)", () => {
      const transitions = availableTransitions(STANDARD_WORKFLOW, "scheduled", "admin");
      const implementTransition = transitions.find(t => t.event === "implement");
      expect(implementTransition).toBeDefined();
    });

    it("requester cannot perform implementer-required actions", () => {
      const transitions = availableTransitions(STANDARD_WORKFLOW, "scheduled", "requester");
      const implementTransition = transitions.find(t => t.event === "implement");
      expect(implementTransition).toBeUndefined();
    });

    it("implementer cannot perform manager-required actions", () => {
      const transitions = availableTransitions(STANDARD_WORKFLOW, "in_progress", "implementer");
      const rollbackTransition = transitions.find(t => t.event === "rollback");
      expect(rollbackTransition).toBeUndefined();
    });
  });

  describe("Implement and Complete Actions", () => {
    const runtime = createMockRuntime();

    it("implementer can start implementation from scheduled state", async () => {
      const ctx = { changeRequest: { number: "CHG001" }, actor: "impl@test.com", actorRole: "implementer" };
      const result = await applyTransition(STANDARD_WORKFLOW, runtime, "scheduled", "implement", ctx);
      expect(result.to).toBe("in_progress");
    });

    it("implementer can start implementation from approved state", async () => {
      const ctx = { changeRequest: { number: "CHG001" }, actor: "impl@test.com", actorRole: "implementer" };
      const result = await applyTransition(STANDARD_WORKFLOW, runtime, "approved", "implement", ctx);
      expect(result.to).toBe("in_progress");
    });

    it("implementer can complete implementation", async () => {
      const ctx = { changeRequest: { number: "CHG001" }, actor: "impl@test.com", actorRole: "implementer" };
      const result = await applyTransition(STANDARD_WORKFLOW, runtime, "in_progress", "complete", ctx);
      expect(result.to).toBe("implemented");
    });

    it("complete action is only available from in_progress state", () => {
      // Check that complete is not available from other states
      const statesWithoutComplete = ["draft", "submitted", "awaiting_approval", "approved", "scheduled", "implemented"];
      
      statesWithoutComplete.forEach(state => {
        const transitions = availableTransitions(STANDARD_WORKFLOW, state, "admin");
        const completeTransition = transitions.find(t => t.event === "complete");
        expect(completeTransition).toBeUndefined();
      });
    });
  });
});

describe("Full Implementation Flow", () => {
  const runtime = createMockRuntime();

  it("standard workflow: scheduled → implement → in_progress → complete → implemented → close → closed", async () => {
    const implCtx = { changeRequest: { number: "CHG001" }, actor: "impl@test.com", actorRole: "implementer" };
    const mgrCtx = { changeRequest: { number: "CHG001" }, actor: "mgr@test.com", actorRole: "manager" };

    // Start implementation
    let result = await applyTransition(STANDARD_WORKFLOW, runtime, "scheduled", "implement", implCtx);
    expect(result.to).toBe("in_progress");

    // Complete implementation
    result = await applyTransition(STANDARD_WORKFLOW, runtime, "in_progress", "complete", implCtx);
    expect(result.to).toBe("implemented");

    // Close (requires manager)
    result = await applyTransition(STANDARD_WORKFLOW, runtime, "implemented", "close", mgrCtx);
    expect(result.to).toBe("closed");
  });

  it("standard workflow: in_progress → rollback → rolled_back (manager can rollback)", async () => {
    const implCtx = { changeRequest: { number: "CHG001" }, actor: "impl@test.com", actorRole: "implementer" };
    const mgrCtx = { changeRequest: { number: "CHG001" }, actor: "mgr@test.com", actorRole: "manager" };

    // Start implementation
    let result = await applyTransition(STANDARD_WORKFLOW, runtime, "scheduled", "implement", implCtx);
    expect(result.to).toBe("in_progress");

    // Rollback (requires manager)
    result = await applyTransition(STANDARD_WORKFLOW, runtime, "in_progress", "rollback", mgrCtx);
    expect(result.to).toBe("rolled_back");
  });

  it("emergency workflow: draft → submit → submitted → emergency_approval → in_progress → implement → implemented", async () => {
    const reqCtx = { changeRequest: { number: "CHG001" }, actor: "req@test.com", actorRole: "requester" };
    const mgrCtx = { changeRequest: { number: "CHG001" }, actor: "mgr@test.com", actorRole: "manager" };
    const implCtx = { changeRequest: { number: "CHG001" }, actor: "impl@test.com", actorRole: "implementer" };

    // Submit emergency CR
    let result = await applyTransition(EMERGENCY_WORKFLOW, runtime, "draft", "submit", reqCtx);
    expect(result.to).toBe("submitted");

    // Request emergency approval
    result = await applyTransition(EMERGENCY_WORKFLOW, runtime, "submitted", "request_emergency_approval", mgrCtx);
    expect(result.to).toBe("emergency_approval");

    // Approve emergency (goes to in_progress)
    result = await applyTransition(EMERGENCY_WORKFLOW, runtime, "emergency_approval", "approve_emergency", mgrCtx);
    expect(result.to).toBe("in_progress");

    // Implement (complete implementation)
    result = await applyTransition(EMERGENCY_WORKFLOW, runtime, "in_progress", "implement", implCtx);
    expect(result.to).toBe("implemented");
  });

  it("pre-approved workflow: scheduled → implement → in_progress → complete → implemented → close → closed", async () => {
    const implCtx = { changeRequest: { number: "CHG001" }, actor: "impl@test.com", actorRole: "implementer" };
    const mgrCtx = { changeRequest: { number: "CHG001" }, actor: "mgr@test.com", actorRole: "manager" };

    // Start implementation
    let result = await applyTransition(STANDARD_PREAPPROVED_WORKFLOW, runtime, "scheduled", "implement", implCtx);
    expect(result.to).toBe("in_progress");

    // Complete implementation
    result = await applyTransition(STANDARD_PREAPPROVED_WORKFLOW, runtime, "in_progress", "complete", implCtx);
    expect(result.to).toBe("implemented");

    // Close (requires manager)
    result = await applyTransition(STANDARD_PREAPPROVED_WORKFLOW, runtime, "implemented", "close", mgrCtx);
    expect(result.to).toBe("closed");
  });
});

describe("Effects", () => {
  it("implement action triggers setActualStart effect", () => {
    const implementTransition = STANDARD_WORKFLOW.transitions.find(
      t => t.event === "implement" && Array.isArray(t.from) && t.from.includes("scheduled")
    );
    expect(implementTransition?.effects).toContain("setActualStart");
    expect(implementTransition?.effects).not.toContain("setActualEnd");
  });

  it("complete action triggers setActualEnd effect", () => {
    const completeTransition = STANDARD_WORKFLOW.transitions.find(t => t.event === "complete");
    expect(completeTransition?.effects).toContain("setActualEnd");
    expect(completeTransition?.effects).not.toContain("setActualStart");
  });
});

describe("All Workflows Have in_progress State", () => {
  BUILTIN_WORKFLOWS.forEach(workflow => {
    it(`${workflow.key} workflow has in_progress state`, () => {
      expect(workflow.states.in_progress).toBeDefined();
      expect(workflow.states.in_progress.name).toBe("In Progress");
    });

    if (workflow.key === "emergency") {
      // Emergency workflow: approve_emergency → in_progress, implement → implemented
      it(`${workflow.key} workflow has approve_emergency → in_progress transition`, () => {
        const approveEmergencyTransition = workflow.transitions.find(t => t.event === "approve_emergency");
        expect(approveEmergencyTransition).toBeDefined();
        expect(approveEmergencyTransition?.to).toBe("in_progress");
      });

      it(`${workflow.key} workflow has implement → implemented transition`, () => {
        const implementTransition = workflow.transitions.find(t => t.event === "implement");
        expect(implementTransition).toBeDefined();
        expect(implementTransition?.from).toBe("in_progress");
        expect(implementTransition?.to).toBe("implemented");
      });
    } else {
      // Standard and pre-approved workflows: implement → in_progress, complete → implemented
      it(`${workflow.key} workflow has implement → in_progress transition`, () => {
        const implementTransition = workflow.transitions.find(t => t.event === "implement");
        expect(implementTransition).toBeDefined();
        expect(implementTransition?.to).toBe("in_progress");
      });

      it(`${workflow.key} workflow has complete → implemented transition`, () => {
        const completeTransition = workflow.transitions.find(t => t.event === "complete");
        expect(completeTransition).toBeDefined();
        expect(completeTransition?.from).toBe("in_progress");
        expect(completeTransition?.to).toBe("implemented");
      });
    }
  });
});
