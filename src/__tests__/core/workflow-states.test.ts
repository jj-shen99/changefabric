/**
 * Tests for workflow state transitions and cancellation rules
 */
import { STANDARD_WORKFLOW, EMERGENCY_WORKFLOW, STANDARD_PREAPPROVED_WORKFLOW } from "@/core/workflow/definitions";

describe("Workflow State Definitions", () => {
  describe("Standard Workflow", () => {
    const workflow = STANDARD_WORKFLOW;

    it("has correct states defined", () => {
      const stateKeys = Object.keys(workflow.states);
      expect(stateKeys).toContain("draft");
      expect(stateKeys).toContain("submitted");
      expect(stateKeys).toContain("awaiting_approval");
      expect(stateKeys).toContain("approved");
      expect(stateKeys).toContain("scheduled");
      expect(stateKeys).toContain("in_progress");
      expect(stateKeys).toContain("implemented");
      expect(stateKeys).toContain("rolled_back");
      expect(stateKeys).toContain("closed");
      expect(stateKeys).toContain("rejected");
      expect(stateKeys).toContain("canceled");
    });

    it("does NOT have assessing or reviewing states", () => {
      const stateKeys = Object.keys(workflow.states);
      expect(stateKeys).not.toContain("assessing");
      expect(stateKeys).not.toContain("reviewing");
    });

    it("has in_progress state with no-cancel tag", () => {
      expect(workflow.states.in_progress).toBeDefined();
      expect(workflow.states.in_progress.tags).toContain("no-cancel");
    });

    it("has rolled_back as terminal state", () => {
      expect(workflow.states.rolled_back.terminal).toBe(true);
    });

    it("has no-cancel tag on implemented", () => {
      expect(workflow.states.implemented.tags).toContain("no-cancel");
    });

    it("has rollback transition from in_progress and implemented", () => {
      const rollbackTransition = workflow.transitions.find(t => t.event === "rollback");
      expect(rollbackTransition).toBeDefined();
      expect(rollbackTransition?.from).toContain("in_progress");
      expect(rollbackTransition?.from).toContain("implemented");
      expect(rollbackTransition?.to).toBe("rolled_back");
    });

    it("cancel transition excludes implemented and later states", () => {
      const cancelTransition = workflow.transitions.find(t => t.event === "cancel");
      expect(cancelTransition).toBeDefined();
      expect(cancelTransition?.from).not.toContain("implemented");
      expect(cancelTransition?.from).not.toContain("rolled_back");
      expect(cancelTransition?.from).not.toContain("closed");
    });
  });

  describe("Emergency Workflow", () => {
    const workflow = EMERGENCY_WORKFLOW;

    it("has rolled_back state", () => {
      expect(workflow.states.rolled_back).toBeDefined();
      expect(workflow.states.rolled_back.terminal).toBe(true);
    });

    it("has rollback transition", () => {
      const rollbackTransition = workflow.transitions.find(t => t.event === "rollback");
      expect(rollbackTransition).toBeDefined();
      expect(rollbackTransition?.to).toBe("rolled_back");
    });
  });

  describe("Pre-Approved Workflow", () => {
    const workflow = STANDARD_PREAPPROVED_WORKFLOW;

    it("has rolled_back state", () => {
      expect(workflow.states.rolled_back).toBeDefined();
      expect(workflow.states.rolled_back.terminal).toBe(true);
    });

    it("has rollback transition", () => {
      const rollbackTransition = workflow.transitions.find(t => t.event === "rollback");
      expect(rollbackTransition).toBeDefined();
      expect(rollbackTransition?.to).toBe("rolled_back");
    });

    it("cancel allowed from draft and scheduled", () => {
      const cancelTransition = workflow.transitions.find(t => t.event === "cancel");
      expect(cancelTransition).toBeDefined();
      expect(cancelTransition?.from).toContain("draft");
      expect(cancelTransition?.from).toContain("scheduled");
    });
  });
});

describe("Workflow Terminal States", () => {
  describe("Standard Workflow", () => {
    const workflow = STANDARD_WORKFLOW;

    it("closed is terminal", () => {
      expect(workflow.states.closed.terminal).toBe(true);
    });

    it("rejected is terminal", () => {
      expect(workflow.states.rejected.terminal).toBe(true);
    });

    it("canceled is terminal", () => {
      expect(workflow.states.canceled.terminal).toBe(true);
    });

    it("rolled_back is terminal", () => {
      expect(workflow.states.rolled_back.terminal).toBe(true);
    });
  });

  describe("Emergency Workflow", () => {
    const workflow = EMERGENCY_WORKFLOW;

    it("closed is terminal", () => {
      expect(workflow.states.closed.terminal).toBe(true);
    });

    it("rejected is terminal", () => {
      expect(workflow.states.rejected.terminal).toBe(true);
    });

    it("canceled is terminal", () => {
      expect(workflow.states.canceled.terminal).toBe(true);
    });

    it("rolled_back is terminal", () => {
      expect(workflow.states.rolled_back.terminal).toBe(true);
    });
  });

  describe("Pre-Approved Workflow", () => {
    const workflow = STANDARD_PREAPPROVED_WORKFLOW;

    it("closed is terminal", () => {
      expect(workflow.states.closed.terminal).toBe(true);
    });

    it("canceled is terminal", () => {
      expect(workflow.states.canceled.terminal).toBe(true);
    });

    it("rolled_back is terminal", () => {
      expect(workflow.states.rolled_back.terminal).toBe(true);
    });

    it("does not have rejected state (no approval needed)", () => {
      expect(workflow.states.rejected).toBeUndefined();
    });
  });
});
