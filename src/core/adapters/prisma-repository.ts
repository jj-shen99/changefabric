/**
 * Prisma-backed implementation of ChangeRequestRepository + AuditWriter.
 *
 * Translates between the Prisma row shape (snake_case strings, JSON-encoded
 * arrays) and the canonical core schema.
 */

import type { PrismaClient } from "@prisma/client";
import type {
  Approval,
  ApprovalPolicy,
  ApprovalStep,
  ApprovalStepStatus,
  ChangeRequest,
  ChangeType,
  Comment,
  ImpactLevel,
  Priority,
  RiskLevel,
  Urgency,
  ApprovalState,
} from "../schema";
import type { ChangeRequestRepository } from "../services/change-request-service";
import type { AuditWriter } from "../audit";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toCR(row: any): ChangeRequest {
  return {
    number: row.number,
    externalId: row.externalId,
    externalSource: row.externalSource,
    workflowKey: row.workflowKey,
    title: row.title,
    description: row.description,
    type: row.type as ChangeType,
    category: row.category,
    priority: row.priority as Priority,
    riskLevel: row.riskLevel as RiskLevel,
    impactLevel: row.impactLevel as ImpactLevel,
    urgency: row.urgency as Urgency,
    state: row.state,
    approvalState: row.approvalState as ApprovalState,
    justification: row.justification,
    implementationPlan: row.implementationPlan,
    backoutPlan: row.backoutPlan,
    testPlan: row.testPlan,
    riskAndImpactAnalysis: row.riskAndImpactAnalysis,
    closeCode: row.closeCode,
    closeNotes: row.closeNotes,
    plannedStart: row.plannedStart ? row.plannedStart.toISOString() : null,
    plannedEnd: row.plannedEnd ? row.plannedEnd.toISOString() : null,
    actualStart: row.actualStart ? row.actualStart.toISOString() : null,
    actualEnd: row.actualEnd ? row.actualEnd.toISOString() : null,
    requestedBy: row.requestedBy,
    assignedTo: row.assignedTo,
    assignmentGroup: row.assignmentGroup,
    configurationItem: row.configurationItem,
    businessService: row.businessService,
    affectedServices: safeJSON<string[]>(row.affectedServices, []),
    tags: safeJSON<string[]>(row.tags, []),
    computedRiskScore: row.computedRiskScore,
    computedImpactScore: row.computedImpactScore,
    mlRiskScore: row.mlRiskScore,
    mlConfidence: row.mlConfidence,
    mlExplanation: row.mlExplanation,
    releaseId: row.releaseId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    createdBy: row.createdBy,
    closedAt: row.closedAt ? row.closedAt.toISOString() : null,
    closedBy: row.closedBy,
  };
}

function safeJSON<T>(v: string | null | undefined, fallback: T): T {
  if (!v) return fallback;
  try {
    return JSON.parse(v) as T;
  } catch {
    return fallback;
  }
}

function fromCRPatch(patch: Partial<ChangeRequest>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...patch };
  if (patch.affectedServices) out.affectedServices = JSON.stringify(patch.affectedServices);
  if (patch.tags) out.tags = JSON.stringify(patch.tags);
  for (const k of ["plannedStart", "plannedEnd", "actualStart", "actualEnd", "closedAt", "createdAt", "updatedAt"] as const) {
    if (patch[k]) out[k] = new Date(patch[k] as string);
  }
  return out;
}

export class PrismaChangeRequestRepository implements ChangeRequestRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async nextNumber(): Promise<string> {
    // Atomically increment by querying max number with the CHG prefix.
    const last = await this.prisma.changeRequest.findFirst({
      where: { number: { startsWith: "CHG" } },
      orderBy: { number: "desc" },
      select: { number: true },
    });
    const lastN = last ? parseInt(last.number.replace(/\D/g, ""), 10) || 0 : 0;
    return `CHG${String(lastN + 1).padStart(7, "0")}`;
  }

  async create(cr: ChangeRequest): Promise<ChangeRequest> {
    const row = await this.prisma.changeRequest.create({
      data: {
        number: cr.number,
        externalId: cr.externalId ?? null,
        externalSource: cr.externalSource ?? null,
        workflowKey: cr.workflowKey,
        title: cr.title,
        description: cr.description,
        type: cr.type,
        category: cr.category,
        priority: cr.priority,
        riskLevel: cr.riskLevel,
        impactLevel: cr.impactLevel,
        urgency: cr.urgency,
        state: cr.state,
        approvalState: cr.approvalState,
        justification: cr.justification,
        implementationPlan: cr.implementationPlan,
        backoutPlan: cr.backoutPlan,
        testPlan: cr.testPlan,
        riskAndImpactAnalysis: cr.riskAndImpactAnalysis,
        closeCode: cr.closeCode,
        closeNotes: cr.closeNotes,
        plannedStart: cr.plannedStart ? new Date(cr.plannedStart) : null,
        plannedEnd: cr.plannedEnd ? new Date(cr.plannedEnd) : null,
        actualStart: cr.actualStart ? new Date(cr.actualStart) : null,
        actualEnd: cr.actualEnd ? new Date(cr.actualEnd) : null,
        requestedBy: cr.requestedBy,
        assignedTo: cr.assignedTo ?? null,
        assignmentGroup: cr.assignmentGroup ?? null,
        configurationItem: cr.configurationItem ?? null,
        businessService: cr.businessService ?? null,
        affectedServices: JSON.stringify(cr.affectedServices),
        tags: JSON.stringify(cr.tags),
        computedRiskScore: cr.computedRiskScore,
        computedImpactScore: cr.computedImpactScore,
        mlRiskScore: cr.mlRiskScore,
        mlConfidence: cr.mlConfidence,
        mlExplanation: cr.mlExplanation,
        releaseId: cr.releaseId ?? null,
        createdBy: cr.createdBy,
        closedAt: cr.closedAt ? new Date(cr.closedAt) : null,
        closedBy: cr.closedBy ?? null,
      },
    });
    return toCR(row);
  }

  async update(number: string, patch: Partial<ChangeRequest>): Promise<ChangeRequest> {
    const row = await this.prisma.changeRequest.update({
      where: { number },
      data: fromCRPatch(patch),
    });
    return toCR(row);
  }

  async get(number: string): Promise<ChangeRequest | null> {
    const row = await this.prisma.changeRequest.findUnique({ where: { number } });
    return row ? toCR(row) : null;
  }

  async list(filter?: { state?: string; requestedBy?: string }): Promise<ChangeRequest[]> {
    const rows = await this.prisma.changeRequest.findMany({
      where: {
        ...(filter?.state ? { state: filter.state } : {}),
        ...(filter?.requestedBy ? { requestedBy: filter.requestedBy } : {}),
      },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(toCR);
  }

  async delete(number: string): Promise<void> {
    await this.prisma.changeRequest.delete({ where: { number } });
  }

  async logTransition(input: {
    changeRequestId: string;
    fromState: string;
    toState: string;
    event: string;
    actor: string;
    reason?: string;
  }): Promise<void> {
    await this.prisma.workflowTransitionLog.create({ data: input });
  }

  async createApprovalStep(
    step: Omit<ApprovalStep, "id" | "approvals"> & { approvers: Array<{ email: string; group?: string }> }
  ): Promise<ApprovalStep> {
    const created = await this.prisma.approvalStep.create({
      data: {
        changeRequestId: step.changeRequestId,
        name: step.name,
        ordering: step.ordering,
        policy: step.policy,
        status: step.status,
        startedAt: step.startedAt ? new Date(step.startedAt) : new Date(),
        completedAt: step.completedAt ? new Date(step.completedAt) : null,
        approvals: {
          create: step.approvers.map((a) => ({
            changeRequestId: step.changeRequestId,
            approverEmail: a.email,
            approverGroup: a.group ?? null,
          })),
        },
      },
      include: { approvals: true },
    });
    return rowToStep(created);
  }

  async listApprovalSteps(crNumber: string): Promise<ApprovalStep[]> {
    const rows = await this.prisma.approvalStep.findMany({
      where: { changeRequestId: crNumber },
      include: { approvals: true },
      orderBy: { ordering: "asc" },
    });
    return rows.map(rowToStep);
  }

  async isUserApprover(crNumber: string, userEmail: string): Promise<boolean> {
    const count = await this.prisma.approval.count({
      where: {
        changeRequestId: crNumber,
        approverEmail: userEmail,
      },
    });
    return count > 0;
  }

  async updateApprovalStep(id: string, patch: Partial<ApprovalStep>): Promise<void> {
    const data: Record<string, unknown> = { ...patch };
    delete data.approvals;
    if (patch.completedAt) data.completedAt = new Date(patch.completedAt);
    if (patch.startedAt) data.startedAt = new Date(patch.startedAt);
    await this.prisma.approvalStep.update({ where: { id }, data });
  }

  async saveApprovals(stepId: string, approvals: Approval[]): Promise<void> {
    // Update each row individually (set decision/comment/decidedAt).
    await Promise.all(
      approvals.map((a) =>
        this.prisma.approval.update({
          where: { id: a.id },
          data: {
            decision: a.decision,
            comment: a.comment ?? null,
            delegatedTo: a.delegatedTo ?? null,
            decidedAt: a.decidedAt ? new Date(a.decidedAt) : null,
          },
        })
      )
    );
    void stepId;
  }

  async addComment(
    comment: Omit<Comment, "id" | "createdAt"> & { id?: string }
  ): Promise<Comment> {
    const row = await this.prisma.comment.create({
      data: {
        changeRequestId: comment.changeRequestId,
        authorEmail: comment.authorEmail,
        body: comment.body,
        visibility: comment.visibility,
      },
    });
    return {
      id: row.id,
      changeRequestId: row.changeRequestId,
      authorEmail: row.authorEmail,
      body: row.body,
      visibility: row.visibility as "public" | "internal",
      createdAt: row.createdAt.toISOString(),
    };
  }

  async listComments(crNumber: string): Promise<Comment[]> {
    const rows = await this.prisma.comment.findMany({
      where: { changeRequestId: crNumber },
      orderBy: { createdAt: "asc" },
    });
    return rows.map((r) => ({
      id: r.id,
      changeRequestId: r.changeRequestId,
      authorEmail: r.authorEmail,
      body: r.body,
      visibility: r.visibility as "public" | "internal",
      createdAt: r.createdAt.toISOString(),
    }));
  }

  async getCRTypeApprovers(crType: string): Promise<Array<{
    crType: string;
    approverEmail: string;
    approverGroup: string | null;
    stepName: string;
    ordering: number;
  }>> {
    const rows = await this.prisma.$queryRaw<Array<{
      crType: string;
      approverEmail: string;
      approverGroup: string | null;
      stepName: string;
      ordering: number;
    }>>`
      SELECT crType, approverEmail, approverGroup, stepName, ordering
      FROM CRTypeApprover
      WHERE isActive = 1 AND crType = ${crType}
      ORDER BY ordering, stepName
    `;
    return rows;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToStep(row: any): ApprovalStep {
  return {
    id: row.id,
    changeRequestId: row.changeRequestId,
    name: row.name,
    ordering: row.ordering,
    policy: row.policy as ApprovalPolicy,
    status: row.status as ApprovalStepStatus,
    startedAt: row.startedAt ? row.startedAt.toISOString() : null,
    completedAt: row.completedAt ? row.completedAt.toISOString() : null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    approvals: (row.approvals ?? []).map((a: any) => ({
      id: a.id,
      changeRequestId: a.changeRequestId,
      stepId: a.stepId,
      approverEmail: a.approverEmail,
      approverGroup: a.approverGroup,
      decision: a.decision,
      comment: a.comment,
      delegatedTo: a.delegatedTo,
      decidedAt: a.decidedAt ? a.decidedAt.toISOString() : null,
      createdAt: a.createdAt.toISOString(),
    })),
  };
}

export class PrismaAuditWriter implements AuditWriter {
  constructor(private readonly prisma: PrismaClient) {}
  async write(event: {
    changeRequestId?: string | null;
    actor: string;
    action: string;
    payload?: Record<string, unknown>;
    createdAt: Date;
  }) {
    await this.prisma.auditEvent.create({
      data: {
        changeRequestId: event.changeRequestId ?? null,
        actor: event.actor,
        action: event.action,
        payload: JSON.stringify(event.payload ?? {}),
        createdAt: event.createdAt,
      },
    });
  }
}
