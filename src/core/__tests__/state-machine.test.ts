import {
  applyTransition,
  availableTransitions,
  validateWorkflow,
  WorkflowError,
  type WorkflowDefinition,
  type WorkflowRuntime,
} from "../workflow/state-machine";
import { STANDARD_WORKFLOW } from "../workflow/definitions";

const noopRuntime: WorkflowRuntime<{ number: string }> = { guards: {}, effects: {} };

describe("state-machine", () => {
  it("validates a well-formed workflow", () => {
    expect(validateWorkflow(STANDARD_WORKFLOW)).toEqual([]);
  });

  it("flags unknown target states", () => {
    const bad: WorkflowDefinition = {
      ...STANDARD_WORKFLOW,
      transitions: [{ event: "x", from: "draft", to: "ghost" }],
    };
    expect(validateWorkflow(bad)).toContain('Transition "x" -> unknown state "ghost"');
  });

  it("returns transitions valid from a given state", () => {
    const ts = availableTransitions(STANDARD_WORKFLOW, "draft");
    expect(ts.map((t) => t.event)).toContain("submit");
    expect(ts.map((t) => t.event)).not.toContain("approve");
  });

  it("filters by RBAC role", () => {
    const ts = availableTransitions(STANDARD_WORKFLOW, "draft", "viewer");
    expect(ts).toHaveLength(0);
  });

  it("rejects unknown events", async () => {
    await expect(
      applyTransition(STANDARD_WORKFLOW, noopRuntime, "draft", "bogus", { changeRequest: { number: "x" }, actor: "a" })
    ).rejects.toBeInstanceOf(WorkflowError);
  });

  it("rejects illegal-from transitions", async () => {
    await expect(
      applyTransition(STANDARD_WORKFLOW, noopRuntime, "draft", "approve", {
        changeRequest: { number: "x" },
        actor: "a",
        actorRole: "manager",
      })
    ).rejects.toMatchObject({ code: "invalid_from_state" });
  });

  it("rejects transitions from terminal states", async () => {
    await expect(
      applyTransition(STANDARD_WORKFLOW, noopRuntime, "closed", "submit", {
        changeRequest: { number: "x" },
        actor: "a",
        actorRole: "manager",
      })
    ).rejects.toMatchObject({ code: "terminal_state" });
  });

  it("enforces RBAC", async () => {
    await expect(
      applyTransition(STANDARD_WORKFLOW, noopRuntime, "draft", "submit", {
        changeRequest: { number: "x" },
        actor: "a",
        actorRole: "viewer",
      })
    ).rejects.toMatchObject({ code: "rbac_denied" });
  });

  it("invokes guards and stops on guard failure", async () => {
    const runtime: WorkflowRuntime<{ number: string }> = {
      guards: { allApprovalStepsApproved: () => false },
      effects: {},
    };
    await expect(
      applyTransition(STANDARD_WORKFLOW, runtime, "awaiting_approval", "approve", {
        changeRequest: { number: "x" },
        actor: "a",
        actorRole: "manager",
      })
    ).rejects.toMatchObject({ code: "guard_failed" });
  });

  it("performs a successful transition", async () => {
    const runtime: WorkflowRuntime<{ number: string }> = {
      guards: { allApprovalStepsApproved: () => true, hasPlannedWindow: () => true },
      effects: {},
    };
    const result = await applyTransition(STANDARD_WORKFLOW, runtime, "awaiting_approval", "approve", {
      changeRequest: { number: "x" },
      actor: "a",
      actorRole: "manager",
    });
    expect(result.to).toBe("approved");
  });
});
