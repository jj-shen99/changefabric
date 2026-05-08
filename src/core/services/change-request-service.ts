/**
 * High-level domain service tying together schema, workflow, approvals,
 * impact + ML scoring, and audit logging.
 *
 * It uses a Repository abstraction so the same service powers Next.js API
 * routes, server actions, CLI scripts, and tests with in-memory stores.
 */

import type {
  Approval,
  ApprovalDecision,
  ApprovalPolicy,
  ApprovalStep,
  ChangeRequest,
  Comment,
  Priority,
  RiskLevel,
  ChangeType,
  ImpactLevel,
} from "../schema";
import type { WorkflowDefinition, WorkflowRuntime } from "../workflow/state-machine";
import {
  applyTransition,
  availableTransitions,
} from "../workflow/state-machine";
import {
  applyDecision,
  activeSteps,
  overallApprovalState,
} from "../approval/engine";
import { analyzeImpact, type ImpactReport } from "../impact/analyzer";
import { predictRisk, type MLRiskResult } from "../ml/risk";
import { AUDIT_ACTIONS, recordAudit, type AuditWriter } from "../audit";

export interface CreateChangeInput {
  title: string;
  description?: string;
  type?: ChangeType;
  category?: string;
  priority?: Priority;
  riskLevel?: RiskLevel;
  impactLevel?: ImpactLevel;
  urgency?: "1" | "2" | "3";
  workflowKey?: string;
  justification?: string;
  implementationPlan?: string;
  backoutPlan?: string;
  testPlan?: string;
  riskAndImpactAnalysis?: string;
  plannedStart?: string | null;
  plannedEnd?: string | null;
  assignedTo?: string | null;
  assignmentGroup?: string | null;
  configurationItem?: string | null;
  businessService?: string | null;
  affectedServices?: string[];
  tags?: string[];
  releaseId?: string | null;
}

export interface CreateApprovalStepInput {
  name: string;
  ordering: number;
  policy: ApprovalPolicy;
  approvers: Array<{ email: string; group?: string }>;
}

export interface ChangeRequestRepository {
  nextNumber(): Promise<string>;
  create(cr: ChangeRequest): Promise<ChangeRequest>;
  update(number: string, patch: Partial<ChangeRequest>): Promise<ChangeRequest>;
  get(number: string): Promise<ChangeRequest | null>;
  list(filter?: { state?: string; requestedBy?: string }): Promise<ChangeRequest[]>;
  delete(number: string): Promise<void>;

  logTransition(input: {
    changeRequestId: string;
    fromState: string;
    toState: string;
    event: string;
    actor: string;
    reason?: string;
  }): Promise<void>;

  createApprovalStep(step: Omit<ApprovalStep, "id" | "approvals"> & { approvers: Array<{ email: string; group?: string }> }): Promise<ApprovalStep>;
  listApprovalSteps(crNumber: string): Promise<ApprovalStep[]>;
  updateApprovalStep(id: string, patch: Partial<ApprovalStep>): Promise<void>;
  saveApprovals(stepId: string, approvals: Approval[]): Promise<void>;

  addComment(comment: Omit<Comment, "id" | "createdAt"> & { id?: string }): Promise<Comment>;
  listComments(crNumber: string): Promise<Comment[]>;
}

export interface ServiceContext {
  actor: string;
  actorRole?: "admin" | "manager" | "viewer";
}

export class ChangeRequestService {
  constructor(
    private readonly repo: ChangeRequestRepository,
    private readonly workflows: Record<string, WorkflowDefinition>,
    private readonly runtime: WorkflowRuntime<ChangeRequest>,
    private readonly audit: AuditWriter
  ) {}

  /** Create a new change request in the workflow's initial state. */
  async create(
    ctx: ServiceContext,
    input: CreateChangeInput
  ): Promise<ChangeRequest> {
    // Determine workflow based on type if not explicitly provided
    const crType = input.type ?? "normal";
    const wfKey = input.workflowKey ?? this.getDefaultWorkflowForType(crType);
    const wf = this.requireWorkflow(wfKey);
    const number = await this.repo.nextNumber();
    const now = new Date().toISOString();

    const draft: ChangeRequest = {
      number,
      workflowKey: wfKey,
      title: input.title,
      description: input.description ?? "",
      type: crType,
      category: input.category ?? "other",
      priority: input.priority ?? "3",
      riskLevel: input.riskLevel ?? "moderate",
      impactLevel: input.impactLevel ?? "3",
      urgency: input.urgency ?? "3",
      state: wf.initial,
      approvalState: "not_requested",
      justification: input.justification ?? "",
      implementationPlan: input.implementationPlan ?? "",
      backoutPlan: input.backoutPlan ?? "",
      testPlan: input.testPlan ?? "",
      riskAndImpactAnalysis: input.riskAndImpactAnalysis ?? "",
      closeCode: "",
      closeNotes: "",
      plannedStart: input.plannedStart ?? null,
      plannedEnd: input.plannedEnd ?? null,
      actualStart: null,
      actualEnd: null,
      requestedBy: ctx.actor,
      assignedTo: input.assignedTo ?? null,
      assignmentGroup: input.assignmentGroup ?? null,
      configurationItem: input.configurationItem ?? null,
      businessService: input.businessService ?? null,
      affectedServices: input.affectedServices ?? [],
      tags: input.tags ?? [],
      computedRiskScore: 0,
      computedImpactScore: 0,
      mlRiskScore: null,
      mlConfidence: null,
      mlExplanation: null,
      releaseId: input.releaseId ?? null,
      createdAt: now,
      updatedAt: now,
      createdBy: ctx.actor,
      closedAt: null,
      closedBy: null,
    };

    // Compute scores up-front
    const impact = analyzeImpact(draft);
    const ml = predictRisk(draft);
    draft.computedRiskScore = impact.overallRisk;
    draft.computedImpactScore = (impact.functionalityRisk + impact.dataIntegrityRisk) / 2;
    draft.mlRiskScore = ml.score;
    draft.mlConfidence = ml.confidence;
    draft.mlExplanation = ml.explanation;

    const created = await this.repo.create(draft);
    
    // Create default approval step if assignedTo is specified
    if (created.assignedTo) {
      const stepName = this.getDefaultApprovalStepName(created.type);
      await this.repo.createApprovalStep({
        changeRequestId: created.number,
        name: stepName,
        ordering: 0,
        policy: "any",
        status: "pending",
        approvers: [{ email: created.assignedTo }],
      });
    }
    
    await recordAudit(this.audit, {
      changeRequestId: number,
      actor: ctx.actor,
      action: AUDIT_ACTIONS.crCreate,
      payload: { workflow: wfKey },
    });
    return created;
  }

  private getDefaultApprovalStepName(crType: string): string {
    switch (crType) {
      case "standard":
        return "Manager Review";
      case "normal":
        return "Technical Review";
      case "emergency":
        return "Emergency CAB";
      default:
        return "Review";
    }
  }

  private getDefaultWorkflowForType(crType: string): string {
    switch (crType) {
      case "emergency":
        return "emergency";
      case "standard":
      case "normal":
      default:
        return "standard";
    }
  }

  async update(
    ctx: ServiceContext,
    number: string,
    patch: Partial<ChangeRequest>
  ): Promise<ChangeRequest> {
    const before = await this.requireCR(number);
    // Recompute scores when relevant fields change
    const merged: ChangeRequest = { ...before, ...patch, updatedAt: new Date().toISOString() };
    const impact = analyzeImpact(merged);
    merged.computedRiskScore = impact.overallRisk;
    merged.computedImpactScore = (impact.functionalityRisk + impact.dataIntegrityRisk) / 2;
    const ml = predictRisk(merged);
    merged.mlRiskScore = ml.score;
    merged.mlConfidence = ml.confidence;
    merged.mlExplanation = ml.explanation;

    const updated = await this.repo.update(number, {
      ...patch,
      updatedAt: merged.updatedAt,
      computedRiskScore: merged.computedRiskScore,
      computedImpactScore: merged.computedImpactScore,
      mlRiskScore: merged.mlRiskScore,
      mlConfidence: merged.mlConfidence,
      mlExplanation: merged.mlExplanation,
    });
    await recordAudit(this.audit, {
      changeRequestId: number,
      actor: ctx.actor,
      action: AUDIT_ACTIONS.crUpdate,
      payload: { keys: Object.keys(patch) },
    });
    return updated;
  }

  async listAvailableTransitions(crNumber: string, role?: string) {
    const cr = await this.requireCR(crNumber);
    const wf = this.requireWorkflow(cr.workflowKey);
    return availableTransitions(wf, cr.state, role);
  }

  async transition(
    ctx: ServiceContext,
    crNumber: string,
    event: string,
    reason?: string
  ): Promise<ChangeRequest> {
    const cr = await this.requireCR(crNumber);
    const wf = this.requireWorkflow(cr.workflowKey);
    // Clone so effects' mutations stay isolated until we persist them.
    const draft: ChangeRequest = { ...cr };
    const result = await applyTransition(wf, this.runtime, cr.state, event, {
      changeRequest: draft,
      actor: ctx.actor,
      actorRole: ctx.actorRole,
      reason,
    });

    // Diff effect-driven changes vs the original CR and persist them along
    // with the new state.
    const patch: Partial<ChangeRequest> = {
      state: result.to,
      updatedAt: new Date().toISOString(),
    };
    const trackedKeys: Array<keyof ChangeRequest> = [
      "approvalState",
      "actualStart",
      "actualEnd",
      "closedAt",
      "closedBy",
    ];
    for (const k of trackedKeys) {
      if (draft[k] !== cr[k]) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (patch as any)[k] = draft[k];
      }
    }
    const updated = await this.repo.update(crNumber, patch);
    await this.repo.logTransition({
      changeRequestId: crNumber,
      fromState: cr.state,
      toState: result.to,
      event,
      actor: ctx.actor,
      reason,
    });
    await recordAudit(this.audit, {
      changeRequestId: crNumber,
      actor: ctx.actor,
      action: AUDIT_ACTIONS.crTransition,
      payload: { from: cr.state, to: result.to, event, reason },
    });
    return updated;
  }

  /** Add a multi-person approval step. */
  async addApprovalStep(
    ctx: ServiceContext,
    crNumber: string,
    input: CreateApprovalStepInput
  ): Promise<ApprovalStep> {
    await this.requireCR(crNumber);
    const step = await this.repo.createApprovalStep({
      changeRequestId: crNumber,
      name: input.name,
      ordering: input.ordering,
      policy: input.policy,
      status: "pending",
      startedAt: null,
      completedAt: null,
      approvers: input.approvers,
    });
    await recordAudit(this.audit, {
      changeRequestId: crNumber,
      actor: ctx.actor,
      action: AUDIT_ACTIONS.approvalStart,
      payload: { stepId: step.id, name: step.name, policy: step.policy, approvers: input.approvers },
    });
    return step;
  }

  /** Apply an approval decision and propagate state to the CR. */
  async decideApproval(
    ctx: ServiceContext,
    crNumber: string,
    stepId: string,
    decision: Exclude<ApprovalDecision, "pending">,
    comment?: string,
    delegatedTo?: string
  ): Promise<{ step: ApprovalStep; cr: ChangeRequest }> {
    await this.requireCR(crNumber);
    const steps = await this.repo.listApprovalSteps(crNumber);
    const step = steps.find((s) => s.id === stepId);
    if (!step) throw new Error(`Approval step ${stepId} not found on ${crNumber}`);

    const isActive = activeSteps(steps).some((s) => s.id === stepId);
    if (!isActive) {
      throw new Error(`Step ${step.name} is not currently active`);
    }

    const { approvals, evaluation } = applyDecision(step, step.approvals, {
      approverEmail: ctx.actor,
      decision,
      comment,
      delegatedTo,
    });

    await this.repo.saveApprovals(stepId, approvals);
    if (evaluation.resolved) {
      await this.repo.updateApprovalStep(stepId, {
        status: evaluation.stepStatus,
        completedAt: new Date().toISOString(),
      });
    }

    // Recompute aggregate approval state
    const refreshedSteps = await this.repo.listApprovalSteps(crNumber);
    const aggregate = overallApprovalState(refreshedSteps);
    let updatedCR = await this.repo.update(crNumber, {
      approvalState: aggregate,
      updatedAt: new Date().toISOString(),
    });

    await recordAudit(this.audit, {
      changeRequestId: crNumber,
      actor: ctx.actor,
      action: AUDIT_ACTIONS.approvalDecide,
      payload: { stepId, decision, comment, delegatedTo, aggregate },
    });

    // Auto-transition CR state based on approval outcome
    if (aggregate === "approved" && updatedCR.state === "awaiting_approval") {
      try {
        updatedCR = await this.transition(ctx, crNumber, "approve");
      } catch {
        // Transition may fail if guards aren't met; that's okay
      }
    } else if (aggregate === "rejected" && updatedCR.state === "awaiting_approval") {
      try {
        updatedCR = await this.transition(ctx, crNumber, "reject");
      } catch {
        // Transition may fail; that's okay
      }
    }

    return { step: { ...step, approvals, status: evaluation.stepStatus }, cr: updatedCR };
  }

  /** Standalone impact/ML analysis (also returns the persisted scores). */
  async analyze(
    crNumber: string
  ): Promise<{ impact: ImpactReport; ml: MLRiskResult }> {
    const cr = await this.requireCR(crNumber);
    return { impact: analyzeImpact(cr), ml: predictRisk(cr) };
  }

  async addComment(
    ctx: ServiceContext,
    crNumber: string,
    body: string,
    visibility: "public" | "internal" = "public"
  ): Promise<Comment> {
    await this.requireCR(crNumber);
    const c = await this.repo.addComment({
      changeRequestId: crNumber,
      authorEmail: ctx.actor,
      body,
      visibility,
    });
    await recordAudit(this.audit, {
      changeRequestId: crNumber,
      actor: ctx.actor,
      action: AUDIT_ACTIONS.commentCreate,
      payload: { commentId: c.id, visibility },
    });
    return c;
  }

  async list(filter?: { state?: string; requestedBy?: string }) {
    return this.repo.list(filter);
  }

  async get(number: string) {
    return this.repo.get(number);
  }

  private async requireCR(number: string): Promise<ChangeRequest> {
    const cr = await this.repo.get(number);
    if (!cr) throw new Error(`Change request ${number} not found`);
    return cr;
  }

  private requireWorkflow(key: string): WorkflowDefinition {
    const wf = this.workflows[key];
    if (!wf) throw new Error(`Workflow "${key}" not registered`);
    return wf;
  }
}
