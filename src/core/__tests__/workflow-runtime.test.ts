/**
 * Tests for workflow runtime - guards and effects
 */
import { buildStandardRuntime } from "../workflow/runtime";
import type { ChangeRequest } from "../schema";

describe("Workflow Runtime", () => {
  const mockLoadApprovalSteps = jest.fn();

  const runtime = buildStandardRuntime({
    loadApprovalSteps: mockLoadApprovalSteps,
  });

  const baseCR: ChangeRequest = {
    number: "CHG0000001",
    title: "Test CR",
    description: "Test description",
    type: "normal",
    category: "infrastructure",
    priority: "2",
    riskLevel: "moderate",
    impactLevel: "2",
    urgency: "2",
    state: "draft",
    approvalState: "not_required",
    workflowKey: "standard",
    requestedBy: "user@example.com",
    assignedTo: null,
    assignmentGroup: "Platform",
    businessService: null,
    affectedServices: [],
    tags: [],
    plannedStart: null,
    plannedEnd: null,
    actualStart: null,
    actualEnd: null,
    implementationPlan: "",
    backoutPlan: "",
    testPlan: "",
    riskAndImpactAnalysis: "",
    justification: "",
    closeCode: null,
    closeNotes: null,
    releaseId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: "user@example.com",
    closedAt: null,
    closedBy: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Guards", () => {
    describe("hasPlannedWindow", () => {
      it("returns true when both plannedStart and plannedEnd are set", () => {
        const cr: ChangeRequest = {
          ...baseCR,
          plannedStart: new Date(Date.now() + 86400000).toISOString(),
          plannedEnd: new Date(Date.now() + 90000000).toISOString(),
        };

        const result = runtime.guards.hasPlannedWindow({
          changeRequest: cr,
          actor: "user@example.com",
        });

        expect(result).toBe(true);
      });

      it("returns false when plannedStart is missing", () => {
        const cr: ChangeRequest = {
          ...baseCR,
          plannedStart: null,
          plannedEnd: new Date(Date.now() + 90000000).toISOString(),
        };

        const result = runtime.guards.hasPlannedWindow({
          changeRequest: cr,
          actor: "user@example.com",
        });

        expect(result).toBe(false);
      });

      it("returns false when plannedEnd is missing", () => {
        const cr: ChangeRequest = {
          ...baseCR,
          plannedStart: new Date(Date.now() + 86400000).toISOString(),
          plannedEnd: null,
        };

        const result = runtime.guards.hasPlannedWindow({
          changeRequest: cr,
          actor: "user@example.com",
        });

        expect(result).toBe(false);
      });

      it("returns false when both are missing", () => {
        const result = runtime.guards.hasPlannedWindow({
          changeRequest: baseCR,
          actor: "user@example.com",
        });

        expect(result).toBe(false);
      });
    });

    describe("hasBackoutPlan", () => {
      it("returns true when backout plan is at least 30 characters", () => {
        const cr: ChangeRequest = {
          ...baseCR,
          backoutPlan: "This is a detailed backout plan with more than 30 characters.",
        };

        const result = runtime.guards.hasBackoutPlan({
          changeRequest: cr,
          actor: "user@example.com",
        });

        expect(result).toBe(true);
      });

      it("returns false when backout plan is too short", () => {
        const cr: ChangeRequest = {
          ...baseCR,
          backoutPlan: "Short plan",
        };

        const result = runtime.guards.hasBackoutPlan({
          changeRequest: cr,
          actor: "user@example.com",
        });

        expect(result).toBe(false);
      });

      it("returns false when backout plan is empty", () => {
        const result = runtime.guards.hasBackoutPlan({
          changeRequest: baseCR,
          actor: "user@example.com",
        });

        expect(result).toBe(false);
      });

      it("trims whitespace before checking length", () => {
        const cr: ChangeRequest = {
          ...baseCR,
          backoutPlan: "   Short   ",
        };

        const result = runtime.guards.hasBackoutPlan({
          changeRequest: cr,
          actor: "user@example.com",
        });

        expect(result).toBe(false);
      });
    });

    describe("hasImplementationPlan", () => {
      it("returns true when implementation plan is at least 30 characters", () => {
        const cr: ChangeRequest = {
          ...baseCR,
          implementationPlan: "This is a detailed implementation plan with steps.",
        };

        const result = runtime.guards.hasImplementationPlan({
          changeRequest: cr,
          actor: "user@example.com",
        });

        expect(result).toBe(true);
      });

      it("returns false when implementation plan is too short", () => {
        const cr: ChangeRequest = {
          ...baseCR,
          implementationPlan: "Deploy it",
        };

        const result = runtime.guards.hasImplementationPlan({
          changeRequest: cr,
          actor: "user@example.com",
        });

        expect(result).toBe(false);
      });
    });

    describe("allApprovalStepsApproved", () => {
      it("returns true when all steps are approved", async () => {
        mockLoadApprovalSteps.mockResolvedValue([
          {
            id: "step-1",
            status: "approved",
            policy: "all",
            decisions: [{ decision: "approved" }],
          },
          {
            id: "step-2",
            status: "approved",
            policy: "any",
            decisions: [{ decision: "approved" }],
          },
        ]);

        const result = await runtime.guards.allApprovalStepsApproved({
          changeRequest: baseCR,
          actor: "user@example.com",
        });

        expect(result).toBe(true);
      });

      it("returns false when any step is pending", async () => {
        mockLoadApprovalSteps.mockResolvedValue([
          {
            id: "step-1",
            status: "approved",
            policy: "all",
            decisions: [{ decision: "approved" }],
          },
          {
            id: "step-2",
            status: "pending",
            policy: "any",
            decisions: [],
          },
        ]);

        const result = await runtime.guards.allApprovalStepsApproved({
          changeRequest: baseCR,
          actor: "user@example.com",
        });

        expect(result).toBe(false);
      });

      it("returns false when any step is rejected", async () => {
        mockLoadApprovalSteps.mockResolvedValue([
          {
            id: "step-1",
            status: "rejected",
            policy: "all",
            decisions: [{ decision: "rejected" }],
          },
        ]);

        const result = await runtime.guards.allApprovalStepsApproved({
          changeRequest: baseCR,
          actor: "user@example.com",
        });

        expect(result).toBe(false);
      });
    });
  });

  describe("Effects", () => {
    describe("setActualStart", () => {
      it("sets actualStart if not already set", () => {
        const cr: ChangeRequest = { ...baseCR };

        runtime.effects.setActualStart({
          changeRequest: cr,
          actor: "user@example.com",
          from: "scheduled",
          to: "in_progress",
          event: "start_implementation",
        });

        expect(cr.actualStart).toBeDefined();
        expect(new Date(cr.actualStart!).getTime()).toBeCloseTo(Date.now(), -3);
      });

      it("does not overwrite existing actualStart", () => {
        const existingStart = new Date(Date.now() - 86400000).toISOString();
        const cr: ChangeRequest = {
          ...baseCR,
          actualStart: existingStart,
        };

        runtime.effects.setActualStart({
          changeRequest: cr,
          actor: "user@example.com",
          from: "scheduled",
          to: "in_progress",
          event: "start_implementation",
        });

        expect(cr.actualStart).toBe(existingStart);
      });
    });

    describe("setActualEnd", () => {
      it("sets actualEnd if not already set", () => {
        const cr: ChangeRequest = { ...baseCR };

        runtime.effects.setActualEnd({
          changeRequest: cr,
          actor: "user@example.com",
          from: "in_progress",
          to: "implemented",
          event: "complete_implementation",
        });

        expect(cr.actualEnd).toBeDefined();
        expect(new Date(cr.actualEnd!).getTime()).toBeCloseTo(Date.now(), -3);
      });
    });

    describe("setClosed", () => {
      it("sets closedAt and closedBy", () => {
        const cr: ChangeRequest = { ...baseCR };

        runtime.effects.setClosed({
          changeRequest: cr,
          actor: "closer@example.com",
          from: "reviewing",
          to: "closed",
          event: "close",
        });

        expect(cr.closedAt).toBeDefined();
        expect(cr.closedBy).toBe("closer@example.com");
      });
    });

    describe("startApprovalSteps", () => {
      it("sets approvalState to pending", () => {
        const cr: ChangeRequest = { ...baseCR };

        runtime.effects.startApprovalSteps({
          changeRequest: cr,
          actor: "user@example.com",
          from: "assessing",
          to: "awaiting_approval",
          event: "request_approval",
        });

        expect(cr.approvalState).toBe("pending");
      });
    });
  });
});
