/**
 * Comprehensive tests for workflow state transitions
 * Validates that all transitions are correctly defined and work as expected
 */

import {
  STANDARD_WORKFLOW,
  EMERGENCY_WORKFLOW,
  STANDARD_PREAPPROVED_WORKFLOW,
} from "@/core/workflow/definitions";
import type { WorkflowDefinition } from "@/core/workflow/state-machine";

describe("Workflow Transition Validation", () => {
  describe("Standard Workflow Transitions", () => {
    const workflow = STANDARD_WORKFLOW;

    it("has all required transitions", () => {
      const events = workflow.transitions.map((t) => t.event);
      expect(events).toContain("submit");
      expect(events).toContain("request_approval");
      expect(events).toContain("approve");
      expect(events).toContain("reject");
      expect(events).toContain("schedule");
      expect(events).toContain("implement");
      expect(events).toContain("rollback");
      expect(events).toContain("close");
      expect(events).toContain("cancel");
      expect(events).toContain("return_to_draft");
    });

    it("does NOT have start_implementation or complete_implementation events", () => {
      const events = workflow.transitions.map((t) => t.event);
      expect(events).not.toContain("start_implementation");
      expect(events).not.toContain("complete_implementation");
    });

    it("implement transition goes directly to implemented", () => {
      const implementTransition = workflow.transitions.find(
        (t) => t.event === "implement"
      );
      expect(implementTransition).toBeDefined();
      expect(implementTransition?.to).toBe("implemented");
      // Can implement from scheduled or approved
      expect(implementTransition?.from).toContain("scheduled");
      expect(implementTransition?.from).toContain("approved");
    });

    it("implement transition has both setActualStart and setActualEnd effects", () => {
      const implementTransition = workflow.transitions.find(
        (t) => t.event === "implement"
      );
      expect(implementTransition?.effects).toContain("setActualStart");
      expect(implementTransition?.effects).toContain("setActualEnd");
    });

    it("cancel is not allowed from implemented state", () => {
      const cancelTransition = workflow.transitions.find(
        (t) => t.event === "cancel"
      );
      expect(cancelTransition).toBeDefined();
      const fromStates = Array.isArray(cancelTransition?.from)
        ? cancelTransition?.from
        : [cancelTransition?.from];
      expect(fromStates).not.toContain("implemented");
      expect(fromStates).not.toContain("rolled_back");
      expect(fromStates).not.toContain("closed");
    });

    it("rollback is only allowed from implemented state", () => {
      const rollbackTransition = workflow.transitions.find(
        (t) => t.event === "rollback"
      );
      expect(rollbackTransition).toBeDefined();
      expect(rollbackTransition?.from).toBe("implemented");
      expect(rollbackTransition?.to).toBe("rolled_back");
    });
  });

  describe("Emergency Workflow Transitions", () => {
    const workflow = EMERGENCY_WORKFLOW;

    it("can implement directly from draft", () => {
      const implementTransition = workflow.transitions.find(
        (t) => t.event === "implement"
      );
      expect(implementTransition).toBeDefined();
      expect(implementTransition?.from).toBe("draft");
      expect(implementTransition?.to).toBe("implemented");
    });

    it("has retrospective approval after implementation", () => {
      const requestApprovalTransition = workflow.transitions.find(
        (t) => t.event === "request_approval"
      );
      expect(requestApprovalTransition).toBeDefined();
      expect(requestApprovalTransition?.from).toBe("implemented");
      expect(requestApprovalTransition?.to).toBe("awaiting_approval");
    });

    it("approve goes directly to closed (no scheduling needed)", () => {
      const approveTransition = workflow.transitions.find(
        (t) => t.event === "approve"
      );
      expect(approveTransition).toBeDefined();
      expect(approveTransition?.from).toBe("awaiting_approval");
      expect(approveTransition?.to).toBe("closed");
    });

    it("does NOT have in_progress state", () => {
      const stateKeys = Object.keys(workflow.states);
      expect(stateKeys).not.toContain("in_progress");
    });
  });

  describe("Pre-Approved Workflow Transitions", () => {
    const workflow = STANDARD_PREAPPROVED_WORKFLOW;

    it("skips approval and goes directly to scheduled", () => {
      const scheduleTransition = workflow.transitions.find(
        (t) => t.event === "schedule"
      );
      expect(scheduleTransition).toBeDefined();
      expect(scheduleTransition?.from).toBe("draft");
      expect(scheduleTransition?.to).toBe("scheduled");
    });

    it("does NOT have awaiting_approval state", () => {
      const stateKeys = Object.keys(workflow.states);
      expect(stateKeys).not.toContain("awaiting_approval");
      expect(stateKeys).not.toContain("approved");
      expect(stateKeys).not.toContain("rejected");
    });

    it("does NOT have in_progress state", () => {
      const stateKeys = Object.keys(workflow.states);
      expect(stateKeys).not.toContain("in_progress");
    });

    it("implement goes from scheduled to implemented", () => {
      const implementTransition = workflow.transitions.find(
        (t) => t.event === "implement"
      );
      expect(implementTransition).toBeDefined();
      expect(implementTransition?.from).toBe("scheduled");
      expect(implementTransition?.to).toBe("implemented");
    });
  });

  describe("All Workflows - Common Validations", () => {
    const workflows: WorkflowDefinition[] = [
      STANDARD_WORKFLOW,
      EMERGENCY_WORKFLOW,
      STANDARD_PREAPPROVED_WORKFLOW,
    ];

    workflows.forEach((workflow) => {
      describe(`${workflow.name}`, () => {
        it("has no in_progress state", () => {
          const stateKeys = Object.keys(workflow.states);
          expect(stateKeys).not.toContain("in_progress");
        });

        it("has implemented state", () => {
          expect(workflow.states.implemented).toBeDefined();
        });

        it("has rolled_back as terminal state", () => {
          expect(workflow.states.rolled_back).toBeDefined();
          expect(workflow.states.rolled_back.terminal).toBe(true);
        });

        it("has closed as terminal state", () => {
          expect(workflow.states.closed).toBeDefined();
          expect(workflow.states.closed.terminal).toBe(true);
        });

        it("implemented state has no-cancel tag", () => {
          expect(workflow.states.implemented.tags).toContain("no-cancel");
        });

        it("all transitions have valid from states", () => {
          const stateKeys = Object.keys(workflow.states);
          workflow.transitions.forEach((transition) => {
            const fromStates = Array.isArray(transition.from)
              ? transition.from
              : transition.from === "*"
              ? stateKeys
              : [transition.from];
            fromStates.forEach((state) => {
              expect(stateKeys).toContain(state);
            });
          });
        });

        it("all transitions have valid to states", () => {
          const stateKeys = Object.keys(workflow.states);
          workflow.transitions.forEach((transition) => {
            expect(stateKeys).toContain(transition.to);
          });
        });

        it("has version 3 or higher", () => {
          expect(workflow.version).toBeGreaterThanOrEqual(3);
        });
      });
    });
  });

  describe("State Transition Paths", () => {
    it("standard workflow: draft -> submitted -> awaiting_approval -> approved -> scheduled -> implemented -> closed", () => {
      const workflow = STANDARD_WORKFLOW;
      
      // draft -> submitted
      const submitT = workflow.transitions.find(t => t.event === "submit" && t.from === "draft");
      expect(submitT?.to).toBe("submitted");
      
      // submitted -> awaiting_approval
      const requestApprovalT = workflow.transitions.find(t => t.event === "request_approval" && t.from === "submitted");
      expect(requestApprovalT?.to).toBe("awaiting_approval");
      
      // awaiting_approval -> approved
      const approveT = workflow.transitions.find(t => t.event === "approve" && t.from === "awaiting_approval");
      expect(approveT?.to).toBe("approved");
      
      // approved -> scheduled
      const scheduleT = workflow.transitions.find(t => t.event === "schedule");
      expect(scheduleT?.from).toBe("approved");
      expect(scheduleT?.to).toBe("scheduled");
      
      // scheduled -> implemented (via implement)
      const implementT = workflow.transitions.find(t => t.event === "implement");
      expect(implementT?.from).toContain("scheduled");
      expect(implementT?.to).toBe("implemented");
      
      // implemented -> closed
      const closeT = workflow.transitions.find(t => t.event === "close");
      expect(closeT?.from).toBe("implemented");
      expect(closeT?.to).toBe("closed");
    });

    it("standard workflow: approved can go directly to implemented (skip scheduling)", () => {
      const workflow = STANDARD_WORKFLOW;
      const implementT = workflow.transitions.find(t => t.event === "implement");
      expect(implementT?.from).toContain("approved");
    });

    it("emergency workflow: draft -> implemented -> awaiting_approval -> closed", () => {
      const workflow = EMERGENCY_WORKFLOW;
      
      // draft -> implemented
      const implementT = workflow.transitions.find(t => t.event === "implement");
      expect(implementT?.from).toBe("draft");
      expect(implementT?.to).toBe("implemented");
      
      // implemented -> awaiting_approval (retrospective)
      const requestApprovalT = workflow.transitions.find(t => t.event === "request_approval");
      expect(requestApprovalT?.from).toBe("implemented");
      expect(requestApprovalT?.to).toBe("awaiting_approval");
      
      // awaiting_approval -> closed
      const approveT = workflow.transitions.find(t => t.event === "approve");
      expect(approveT?.from).toBe("awaiting_approval");
      expect(approveT?.to).toBe("closed");
    });

    it("pre-approved workflow: draft -> scheduled -> implemented -> closed", () => {
      const workflow = STANDARD_PREAPPROVED_WORKFLOW;
      
      // draft -> scheduled
      const scheduleT = workflow.transitions.find(t => t.event === "schedule");
      expect(scheduleT?.from).toBe("draft");
      expect(scheduleT?.to).toBe("scheduled");
      
      // scheduled -> implemented
      const implementT = workflow.transitions.find(t => t.event === "implement");
      expect(implementT?.from).toBe("scheduled");
      expect(implementT?.to).toBe("implemented");
      
      // implemented -> closed
      const closeT = workflow.transitions.find(t => t.event === "close");
      expect(closeT?.from).toBe("implemented");
      expect(closeT?.to).toBe("closed");
    });
  });
});
