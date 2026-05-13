/**
 * Generic, declarative state machine for change-management workflows.
 *
 * A WorkflowDefinition is JSON-serializable so it can be persisted and edited
 * by admins. Guards and side-effects are referenced by name; the runtime
 * resolves them from a registry the host application supplies.
 */

export interface StateDef {
  name: string;
  description?: string;
  /** Optional: marks this state as terminal (no outgoing transitions). */
  terminal?: boolean;
  /** Optional: tags for UI/categorization (e.g. "in-flight"). */
  tags?: string[];
}

export interface TransitionDef {
  /** Unique event/action name, e.g. "submit", "approve", "implement". */
  event: string;
  from: string | string[] | "*";
  to: string;
  /** Names of guard functions registered with the runtime. All must pass. */
  guards?: string[];
  /** Names of effect functions registered with the runtime, run after the
   * transition is committed. */
  effects?: string[];
  /** Required role for this transition (RBAC). */
  requiredRole?: "admin" | "manager" | "implementer" | "requester";
  description?: string;
}

export interface WorkflowDefinition {
  key: string;
  name: string;
  description?: string;
  version: number;
  initial: string;
  states: Record<string, StateDef>;
  transitions: TransitionDef[];
}

export interface TransitionContext<T = unknown> {
  changeRequest: T;
  actor: string;
  reason?: string;
  payload?: Record<string, unknown>;
}

export type Guard<T = unknown> = (
  ctx: TransitionContext<T>
) => boolean | Promise<boolean>;

export type Effect<T = unknown> = (
  ctx: TransitionContext<T> & { from: string; to: string; event: string }
) => void | Promise<void>;

export interface WorkflowRuntime<T = unknown> {
  guards: Record<string, Guard<T>>;
  effects: Record<string, Effect<T>>;
}

export interface ResolvedTransition {
  event: string;
  from: string;
  to: string;
  description?: string;
  requiredRole?: string;
}

export class WorkflowError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "unknown_event"
      | "invalid_from_state"
      | "guard_failed"
      | "terminal_state"
      | "rbac_denied"
  ) {
    super(message);
    this.name = "WorkflowError";
  }
}

function matchesFrom(from: TransitionDef["from"], current: string): boolean {
  if (from === "*") return true;
  if (Array.isArray(from)) return from.includes(current);
  return from === current;
}

/** List the transitions currently available from a given state. */
export function availableTransitions(
  def: WorkflowDefinition,
  currentState: string,
  role?: string
): ResolvedTransition[] {
  const out: ResolvedTransition[] = [];
  for (const t of def.transitions) {
    if (!matchesFrom(t.from, currentState)) continue;
    if (t.requiredRole && role && !canActAs(role, t.requiredRole)) continue;
    out.push({
      event: t.event,
      from: currentState,
      to: t.to,
      description: t.description,
      requiredRole: t.requiredRole,
    });
  }
  return out;
}

function canActAs(actual: string, required: string): boolean {
  const order = ["requester", "implementer", "manager", "admin"];
  return order.indexOf(actual) >= order.indexOf(required);
}

/**
 * Apply a transition. Validates the event exists, the current state allows
 * it, RBAC, then runs guards and finally side-effects. Returns the new state.
 */
export async function applyTransition<T>(
  def: WorkflowDefinition,
  runtime: WorkflowRuntime<T>,
  currentState: string,
  event: string,
  ctx: TransitionContext<T> & { actorRole?: string }
): Promise<{ to: string; transition: TransitionDef }> {
  const stateDef = def.states[currentState];
  if (stateDef?.terminal) {
    throw new WorkflowError(
      `State "${currentState}" is terminal`,
      "terminal_state"
    );
  }

  const candidates = def.transitions.filter((t) => t.event === event);
  if (candidates.length === 0) {
    throw new WorkflowError(
      `Unknown event "${event}" for workflow "${def.key}"`,
      "unknown_event"
    );
  }

  const transition = candidates.find((t) => matchesFrom(t.from, currentState));
  if (!transition) {
    throw new WorkflowError(
      `Event "${event}" not allowed from state "${currentState}"`,
      "invalid_from_state"
    );
  }

  if (transition.requiredRole && ctx.actorRole) {
    if (!canActAs(ctx.actorRole, transition.requiredRole)) {
      throw new WorkflowError(
        `Role "${ctx.actorRole}" cannot perform "${event}" (requires ${transition.requiredRole})`,
        "rbac_denied"
      );
    }
  }

  for (const gName of transition.guards ?? []) {
    const g = runtime.guards[gName];
    if (!g) {
      throw new WorkflowError(`Guard "${gName}" not registered`, "guard_failed");
    }
    const ok = await g(ctx);
    if (!ok) {
      // Provide more helpful error messages for known guards
      let hint = "";
      if (gName === "hasPlannedWindow") {
        hint = " - Please set Planned Start and Planned End dates before scheduling.";
      } else if (gName === "allApprovalStepsApproved") {
        hint = " - All approval steps must be approved before proceeding.";
      } else if (gName === "hasBackoutPlan") {
        hint = " - A backout plan of at least 30 characters is required.";
      } else if (gName === "hasImplementationPlan") {
        hint = " - An implementation plan of at least 30 characters is required.";
      }
      throw new WorkflowError(`Guard "${gName}" failed${hint}`, "guard_failed");
    }
  }

  for (const eName of transition.effects ?? []) {
    const fx = runtime.effects[eName];
    if (fx) {
      await fx({ ...ctx, from: currentState, to: transition.to, event });
    }
  }

  return { to: transition.to, transition };
}

/** Validate a workflow definition is well-formed. */
export function validateWorkflow(def: WorkflowDefinition): string[] {
  const errors: string[] = [];
  if (!def.states[def.initial]) {
    errors.push(`Initial state "${def.initial}" not defined in states`);
  }
  for (const t of def.transitions) {
    if (!def.states[t.to]) {
      errors.push(`Transition "${t.event}" -> unknown state "${t.to}"`);
    }
    if (t.from !== "*") {
      const froms = Array.isArray(t.from) ? t.from : [t.from];
      for (const f of froms) {
        if (!def.states[f]) {
          errors.push(`Transition "${t.event}" from unknown state "${f}"`);
        }
      }
    }
  }
  return errors;
}
