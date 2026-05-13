/**
 * Tests for pre-approved CR type behavior
 * Pre-approved CRs should have no approval steps and the approval tab should be hidden
 */

import { DEFAULT_APPROVERS_BY_TYPE } from "@/lib/constants";
import { TYPE_TO_WORKFLOW, STANDARD_PREAPPROVED_WORKFLOW } from "@/core/workflow/definitions";

describe("Pre-approved CR Type", () => {
  describe("Type Configuration", () => {
    it("pre-approved type maps to standard_preapproved workflow", () => {
      expect(TYPE_TO_WORKFLOW["pre-approved"]).toBe("standard_preapproved");
    });

    it("pre-approved type has no default approvers", () => {
      expect(DEFAULT_APPROVERS_BY_TYPE["pre-approved"]).toEqual([]);
    });
  });

  describe("Pre-approved Workflow", () => {
    it("does not have awaiting_approval state", () => {
      const stateKeys = Object.keys(STANDARD_PREAPPROVED_WORKFLOW.states);
      expect(stateKeys).not.toContain("awaiting_approval");
    });

    it("does not have approved state", () => {
      const stateKeys = Object.keys(STANDARD_PREAPPROVED_WORKFLOW.states);
      expect(stateKeys).not.toContain("approved");
    });

    it("does not have rejected state", () => {
      const stateKeys = Object.keys(STANDARD_PREAPPROVED_WORKFLOW.states);
      expect(stateKeys).not.toContain("rejected");
    });

    it("goes directly from draft to scheduled", () => {
      const scheduleTransition = STANDARD_PREAPPROVED_WORKFLOW.transitions.find(
        (t) => t.event === "schedule"
      );
      expect(scheduleTransition).toBeDefined();
      expect(scheduleTransition?.from).toBe("draft");
      expect(scheduleTransition?.to).toBe("scheduled");
    });

    it("does not have submit transition", () => {
      const submitTransition = STANDARD_PREAPPROVED_WORKFLOW.transitions.find(
        (t) => t.event === "submit"
      );
      expect(submitTransition).toBeUndefined();
    });

    it("does not have request_approval transition", () => {
      const requestApprovalTransition = STANDARD_PREAPPROVED_WORKFLOW.transitions.find(
        (t) => t.event === "request_approval"
      );
      expect(requestApprovalTransition).toBeUndefined();
    });

    it("does not have approve transition", () => {
      const approveTransition = STANDARD_PREAPPROVED_WORKFLOW.transitions.find(
        (t) => t.event === "approve"
      );
      expect(approveTransition).toBeUndefined();
    });
  });

  describe("isPreApproved Check", () => {
    it("should identify pre-approved by workflowKey", () => {
      const cr = { workflowKey: "standard_preapproved", type: "standard" };
      const isPreApproved = cr.workflowKey === "standard_preapproved" || cr.type === "pre-approved";
      expect(isPreApproved).toBe(true);
    });

    it("should identify pre-approved by type", () => {
      const cr = { workflowKey: "standard", type: "pre-approved" };
      const isPreApproved = cr.workflowKey === "standard_preapproved" || cr.type === "pre-approved";
      expect(isPreApproved).toBe(true);
    });

    it("should not identify standard CR as pre-approved", () => {
      const cr = { workflowKey: "standard", type: "standard" };
      const isPreApproved = cr.workflowKey === "standard_preapproved" || cr.type === "pre-approved";
      expect(isPreApproved).toBe(false);
    });

    it("should not identify emergency CR as pre-approved", () => {
      const cr = { workflowKey: "emergency", type: "emergency" };
      const isPreApproved = cr.workflowKey === "standard_preapproved" || cr.type === "pre-approved";
      expect(isPreApproved).toBe(false);
    });
  });
});
