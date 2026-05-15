/**
 * Core change-management schema (framework-agnostic).
 *
 * These types are the canonical representation of a change request inside
 * the application. Persistence (Prisma), HTTP (Next.js API routes) and UI
 * layers all map to/from these types via thin adapters.
 *
 * Inspired by the ServiceNow change_request table but vendor-neutral.
 */

export type ChangeType = "standard" | "emergency" | "pre-approved";

export type RiskLevel = "low" | "moderate" | "high";

export type ImpactLevel = "1" | "2" | "3"; // 1 = highest impact

export type Priority = "1" | "2" | "3" | "4"; // 1 = highest priority

export type Urgency = "1" | "2" | "3";

export type ApprovalState =
  | "not_requested"
  | "pending"
  | "approved"
  | "rejected";

export type ApprovalDecision =
  | "pending"
  | "approved"
  | "rejected"
  | "delegated";

export type ApprovalPolicy = "all" | "any" | `quorum:${number}`;

export type ApprovalStepStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "skipped";

export type ValidationStatus =
  | "pending"
  | "running"
  | "passed"
  | "failed"
  | "skipped";

export interface ChangeRequest {
  number: string;
  externalId?: string | null;
  externalSource?: string | null;
  workflowKey: string;
  orgId?: string;

  title: string;
  description: string;
  type: ChangeType;
  category: string;
  priority: Priority;
  riskLevel: RiskLevel;
  impactLevel: ImpactLevel;
  urgency: Urgency;
  state: string;
  approvalState: ApprovalState;

  justification: string;
  implementationPlan: string;
  backoutPlan: string;
  testPlan: string;
  riskAndImpactAnalysis: string;
  closeCode: string;
  closeNotes: string;

  plannedStart?: string | null;
  plannedEnd?: string | null;
  actualStart?: string | null;
  actualEnd?: string | null;

  requestedBy: string;
  assignedTo?: string | null;
  assignmentGroup?: string | null;

  configurationItem?: string | null;
  businessService?: string | null;
  affectedServices: string[];
  tags: string[];

  computedRiskScore: number;
  computedImpactScore: number;
  mlRiskScore?: number | null;
  mlConfidence?: number | null;
  mlExplanation?: string | null;

  releaseId?: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  closedAt?: string | null;
  closedBy?: string | null;
}

export interface Approval {
  id: string;
  changeRequestId: string;
  stepId?: string | null;
  approverEmail: string;
  approverGroup?: string | null;
  decision: ApprovalDecision;
  comment?: string | null;
  delegatedTo?: string | null;
  decidedAt?: string | null;
  createdAt: string;
}

export interface ApprovalStep {
  id: string;
  changeRequestId: string;
  name: string;
  ordering: number;
  policy: ApprovalPolicy;
  status: ApprovalStepStatus;
  startedAt?: string | null;
  completedAt?: string | null;
  approvals: Approval[];
}

export interface Comment {
  id: string;
  changeRequestId: string;
  authorEmail: string;
  body: string;
  visibility: "public" | "internal";
  createdAt: string;
}

export interface AuditEvent {
  id: string;
  changeRequestId?: string | null;
  actor: string;
  action: string;
  payload: Record<string, unknown>;
  createdAt: string;
}

/** Default canonical CR states used by the "standard" workflow. */
export const STANDARD_STATES = [
  "draft",
  "submitted",
  "awaiting_approval",
  "approved",
  "scheduled",
  "implemented",
  "rolled_back",
  "closed",
  "rejected",
  "canceled",
] as const;

export type StandardState = (typeof STANDARD_STATES)[number];

export const TERMINAL_STATES: readonly string[] = [
  "closed",
  "rejected",
  "canceled",
  "rolled_back",
];

/** States from which a CR cannot be canceled (implementation has started) */
export const NO_CANCEL_STATES: readonly string[] = [
  "implemented",
  "rolled_back",
  "closed",
  "rejected",
];
