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

export interface CRTypeApprover {
  crType: string;
  approverEmail: string;
  approverGroup: string | null;
  stepName: string;
  ordering: number;
}

/** Configuration for risk-based approval policies */
export interface ApprovalPolicyConfig {
  id: string;
  riskLevel: "critical" | "high" | "medium" | "low";
  minScore: number;
  maxScore: number;
  requiredApprovals: number;
  approverGroups: string[];
  autoApprove: boolean;
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

  getCRTypeApprovers(crType: string): Promise<CRTypeApprover[]>;
}

export interface ServiceContext {
  actor: string;
  actorRole?: "admin" | "manager" | "implementer" | "requester";
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
    
    // Create approval steps based on CR type
    await this.createDefaultApprovalSteps(created, ctx.actor);
    
    await recordAudit(this.audit, {
      changeRequestId: number,
      actor: ctx.actor,
      action: AUDIT_ACTIONS.crCreate,
      payload: { workflow: wfKey, type: crType },
    });
    return created;
  }

  /**
   * Create default approval steps based on CR type.
   * Fetches approvers from CRTypeApprover table, grouped by stepName.
   * Falls back to assignedTo if no approvers configured.
   */
  private async createDefaultApprovalSteps(cr: ChangeRequest, _requestor: string): Promise<void> {
    // Fetch configured approvers for this CR type
    const typeApprovers = await this.repo.getCRTypeApprovers(cr.type);
    
    if (typeApprovers.length > 0) {
      // Group approvers by stepName
      const stepMap = new Map<string, { ordering: number; approvers: Array<{ email: string; group?: string }> }>();
      
      for (const approver of typeApprovers) {
        const existing = stepMap.get(approver.stepName);
        if (existing) {
          existing.approvers.push({ 
            email: approver.approverEmail, 
            group: approver.approverGroup || undefined 
          });
        } else {
          stepMap.set(approver.stepName, {
            ordering: approver.ordering,
            approvers: [{ 
              email: approver.approverEmail, 
              group: approver.approverGroup || undefined 
            }],
          });
        }
      }
      
      // Create approval steps from grouped approvers
      for (const [stepName, stepData] of stepMap) {
        await this.repo.createApprovalStep({
          changeRequestId: cr.number,
          name: stepName,
          ordering: stepData.ordering,
          policy: "any",
          status: "pending",
          approvers: stepData.approvers,
        });
      }
    } else {
      // Fallback: create a single default step with assignedTo or requestor as approver
      const defaultApprover = cr.assignedTo || cr.requestedBy;
      await this.repo.createApprovalStep({
        changeRequestId: cr.number,
        name: "Review",
        ordering: 0,
        policy: "any",
        status: "pending",
        approvers: [{ email: defaultApprover }],
      });
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
    reason?: string,
    options?: { approvalPolicyLoader?: () => Promise<ApprovalPolicyConfig[]> }
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
    
    // Auto-create approval steps when entering awaiting_approval state
    if (result.to === "awaiting_approval" && options?.approvalPolicyLoader) {
      await this.applyApprovalPolicies(ctx, crNumber, cr.computedRiskScore ?? 0, options.approvalPolicyLoader);
    }
    
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
  
  /** Apply approval policies based on risk score - auto-create approval steps */
  private async applyApprovalPolicies(
    ctx: ServiceContext,
    crNumber: string,
    riskScore: number,
    policyLoader: () => Promise<ApprovalPolicyConfig[]>
  ): Promise<void> {
    try {
      const policies = await policyLoader();
      // Find the matching policy for this risk score
      const policy = policies.find(p => riskScore >= p.minScore && riskScore <= p.maxScore);
      
      if (!policy || policy.autoApprove) {
        // No policy or auto-approve - no approval steps needed
        return;
      }
      
      // Check if approval steps already exist
      const existingSteps = await this.repo.listApprovalSteps(crNumber);
      if (existingSteps.length > 0) {
        // Steps already exist (manually added or from CR type defaults)
        return;
      }
      
      // Create approval steps based on policy
      for (let i = 0; i < policy.approverGroups.length; i++) {
        const groupName = policy.approverGroups[i];
        // Get approvers from the group (using CRTypeApprover table or default)
        const approvers = await this.getApproversForGroup(groupName);
        
        if (approvers.length > 0) {
          await this.addApprovalStep(ctx, crNumber, {
            name: groupName,
            ordering: i + 1,
            policy: policy.requiredApprovals > 1 ? `quorum:${Math.min(policy.requiredApprovals, approvers.length)}` as ApprovalPolicy : "any",
            approvers: approvers.map(a => ({ email: a.email, group: groupName })),
          });
        }
      }
    } catch (err) {
      // Log but don't fail the transition if policy application fails
      console.error("Failed to apply approval policies:", err);
    }
  }
  
  /** Get approvers for a given group name */
  private async getApproversForGroup(groupName: string): Promise<Array<{ email: string }>> {
    // Try to find approvers from CRTypeApprover table with matching step name
    const typeApprovers = await this.repo.getCRTypeApprovers?.("normal");
    if (typeApprovers) {
      const groupApprovers = typeApprovers.filter(a => 
        a.stepName.toLowerCase() === groupName.toLowerCase() ||
        a.approverGroup?.toLowerCase() === groupName.toLowerCase()
      );
      if (groupApprovers.length > 0) {
        return groupApprovers.map(a => ({ email: a.approverEmail }));
      }
    }
    
    // Fallback: return empty (admin can manually add approvers)
    return [];
  }

  /** Add a multi-person approval step. */
  async addApprovalStep(
    ctx: ServiceContext,
    crNumber: string,
    input: CreateApprovalStepInput
  ): Promise<ApprovalStep> {
    await this.requireCR(crNumber);
    
    // Check for duplicate step name
    const existingSteps = await this.repo.listApprovalSteps(crNumber);
    const duplicate = existingSteps.find(s => s.name.toLowerCase() === input.name.toLowerCase());
    if (duplicate) {
      throw new Error(`An approval step named "${input.name}" already exists for this CR`);
    }
    
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
    // Use a system context with admin role to ensure the transition succeeds
    // regardless of the approver's role (the approval decision itself is the authorization)
    const systemCtx: ServiceContext = { actor: ctx.actor, actorRole: "admin" };
    if (aggregate === "approved" && updatedCR.state === "awaiting_approval") {
      try {
        updatedCR = await this.transition(systemCtx, crNumber, "approve");
      } catch (err) {
        // Log the error for debugging but don't fail the approval
        console.error(`Auto-transition to approved failed for ${crNumber}:`, err);
      }
    } else if (aggregate === "rejected" && updatedCR.state === "awaiting_approval") {
      try {
        updatedCR = await this.transition(systemCtx, crNumber, "reject");
      } catch (err) {
        // Log the error for debugging but don't fail the approval
        console.error(`Auto-transition to rejected failed for ${crNumber}:`, err);
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
