/**
 * Built-in workflow definitions seeded into the database. Admins can override
 * them by editing the WorkflowDefinition rows.
 *
 *   standard  — Normal change with assess + approval + scheduled implementation
 *   emergency — Compressed flow for emergency changes (post-implementation review)
 *   standard_preapproved — Pre-approved standard change template
 */

import type { WorkflowDefinition } from "./state-machine";

export const STANDARD_WORKFLOW: WorkflowDefinition = {
  key: "standard",
  name: "Standard Change",
  description:
    "Normal change request: draft → submit → assess → approve → schedule → implement → review → close",
  version: 1,
  initial: "draft",
  states: {
    draft: { name: "Draft", tags: ["editable"] },
    submitted: { name: "Submitted", tags: ["in-flight"] },
    assessing: { name: "Assessing", tags: ["in-flight"] },
    awaiting_approval: { name: "Awaiting Approval", tags: ["in-flight"] },
    approved: { name: "Approved", tags: ["in-flight"] },
    scheduled: { name: "Scheduled", tags: ["in-flight"] },
    in_progress: { name: "In Progress", tags: ["in-flight"] },
    implemented: { name: "Implemented", tags: ["in-flight"] },
    reviewing: { name: "Reviewing", tags: ["in-flight"] },
    closed: { name: "Closed", terminal: true, tags: ["done"] },
    rejected: { name: "Rejected", terminal: true, tags: ["done"] },
    canceled: { name: "Canceled", terminal: true, tags: ["done"] },
  },
  transitions: [
    { event: "submit", from: "draft", to: "submitted", requiredRole: "manager" },
    { event: "assess", from: "submitted", to: "assessing", requiredRole: "manager" },
    { event: "request_approval", from: ["assessing", "submitted"], to: "awaiting_approval", requiredRole: "manager", effects: ["startApprovalSteps"] },
    { event: "approve", from: "awaiting_approval", to: "approved", guards: ["allApprovalStepsApproved"], requiredRole: "manager" },
    { event: "reject", from: "awaiting_approval", to: "rejected", requiredRole: "manager" },
    { event: "schedule", from: "approved", to: "scheduled", guards: ["hasPlannedWindow"], requiredRole: "manager" },
    { event: "start_implementation", from: ["scheduled", "approved"], to: "in_progress", requiredRole: "manager", effects: ["setActualStart"] },
    { event: "complete_implementation", from: "in_progress", to: "implemented", requiredRole: "manager", effects: ["setActualEnd"] },
    { event: "begin_review", from: "implemented", to: "reviewing", requiredRole: "manager" },
    { event: "close", from: ["reviewing", "implemented"], to: "closed", requiredRole: "manager", effects: ["setClosed"] },
    { event: "cancel", from: ["draft", "submitted", "assessing", "awaiting_approval", "approved", "scheduled"], to: "canceled", requiredRole: "manager", effects: ["setClosed"] },
    { event: "return_to_draft", from: ["submitted", "assessing"], to: "draft", requiredRole: "manager" },
  ],
};

export const EMERGENCY_WORKFLOW: WorkflowDefinition = {
  key: "emergency",
  name: "Emergency Change",
  description:
    "Emergency: skip pre-approval, implement immediately, retrospective review and approval.",
  version: 1,
  initial: "draft",
  states: {
    draft: { name: "Draft", tags: ["editable"] },
    in_progress: { name: "In Progress", tags: ["in-flight"] },
    implemented: { name: "Implemented", tags: ["in-flight"] },
    awaiting_approval: { name: "Retro Approval", tags: ["in-flight"] },
    closed: { name: "Closed", terminal: true, tags: ["done"] },
    rejected: { name: "Rejected", terminal: true, tags: ["done"] },
    canceled: { name: "Canceled", terminal: true, tags: ["done"] },
  },
  transitions: [
    { event: "start_implementation", from: "draft", to: "in_progress", requiredRole: "manager", effects: ["setActualStart"] },
    { event: "complete_implementation", from: "in_progress", to: "implemented", requiredRole: "manager", effects: ["setActualEnd"] },
    { event: "request_approval", from: "implemented", to: "awaiting_approval", requiredRole: "manager", effects: ["startApprovalSteps"] },
    { event: "approve", from: "awaiting_approval", to: "closed", guards: ["allApprovalStepsApproved"], requiredRole: "manager", effects: ["setClosed"] },
    { event: "reject", from: "awaiting_approval", to: "rejected", requiredRole: "admin" },
    { event: "cancel", from: ["draft", "in_progress"], to: "canceled", requiredRole: "manager", effects: ["setClosed"] },
  ],
};

export const STANDARD_PREAPPROVED_WORKFLOW: WorkflowDefinition = {
  key: "standard_preapproved",
  name: "Pre-Approved Standard Change",
  description: "Low-risk pre-approved template; no human approval gate.",
  version: 1,
  initial: "draft",
  states: {
    draft: { name: "Draft", tags: ["editable"] },
    scheduled: { name: "Scheduled", tags: ["in-flight"] },
    in_progress: { name: "In Progress", tags: ["in-flight"] },
    implemented: { name: "Implemented", tags: ["in-flight"] },
    closed: { name: "Closed", terminal: true, tags: ["done"] },
    canceled: { name: "Canceled", terminal: true, tags: ["done"] },
  },
  transitions: [
    { event: "schedule", from: "draft", to: "scheduled", guards: ["hasPlannedWindow"], requiredRole: "manager" },
    { event: "start_implementation", from: "scheduled", to: "in_progress", requiredRole: "manager", effects: ["setActualStart"] },
    { event: "complete_implementation", from: "in_progress", to: "implemented", requiredRole: "manager", effects: ["setActualEnd"] },
    { event: "close", from: "implemented", to: "closed", requiredRole: "manager", effects: ["setClosed"] },
    { event: "cancel", from: ["draft", "scheduled", "in_progress"], to: "canceled", requiredRole: "manager", effects: ["setClosed"] },
  ],
};

export const BUILTIN_WORKFLOWS: WorkflowDefinition[] = [
  STANDARD_WORKFLOW,
  EMERGENCY_WORKFLOW,
  STANDARD_PREAPPROVED_WORKFLOW,
];

export const DEFAULT_WORKFLOW_KEY = "standard";

/**
 * Maps CR type to the recommended workflow.
 * Users can override this when creating a CR, but this provides sensible defaults.
 */
export const TYPE_TO_WORKFLOW: Record<string, string> = {
  standard: "standard",
  normal: "standard",
  emergency: "emergency",
};

/**
 * Get the workflow for a given CR type.
 * Falls back to standard workflow if type is not mapped.
 */
export function getWorkflowForType(crType: string): WorkflowDefinition {
  const workflowKey = TYPE_TO_WORKFLOW[crType] || DEFAULT_WORKFLOW_KEY;
  return BUILTIN_WORKFLOWS.find((w) => w.key === workflowKey) || STANDARD_WORKFLOW;
}

/**
 * Get available states for a CR type.
 * Returns the states from the workflow associated with that type.
 */
export function getStatesForType(crType: string): { value: string; label: string; tags: string[] }[] {
  const workflow = getWorkflowForType(crType);
  return Object.entries(workflow.states).map(([key, state]) => ({
    value: key,
    label: state.name,
    tags: state.tags || [],
  }));
}

/**
 * Get available transitions for a CR based on its type and current state.
 */
export function getAvailableTransitionsForType(
  crType: string,
  currentState: string,
  role?: string
): { event: string; to: string; label: string }[] {
  const workflow = getWorkflowForType(crType);
  const transitions: { event: string; to: string; label: string }[] = [];
  
  for (const t of workflow.transitions) {
    // Check if transition is valid from current state
    const fromStates = t.from === "*" ? [currentState] : Array.isArray(t.from) ? t.from : [t.from];
    if (!fromStates.includes(currentState)) continue;
    
    // Check role requirement
    if (t.requiredRole && role) {
      const roleOrder = ["viewer", "manager", "admin"];
      if (roleOrder.indexOf(role) < roleOrder.indexOf(t.requiredRole)) continue;
    }
    
    // Get human-readable label for the event
    const label = t.event
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
    
    transitions.push({
      event: t.event,
      to: t.to,
      label,
    });
  }
  
  return transitions;
}
