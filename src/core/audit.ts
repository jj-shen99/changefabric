/**
 * Standard audit-event helper.
 *
 * Every domain action funnels through `recordAudit` so we have a complete
 * trace of who did what to which change request, when, and why. The shape
 * is intentionally simple JSON so it can be exported to a SIEM later.
 */

export interface AuditEventInput {
  changeRequestId?: string | null;
  actor: string;
  action: string;
  payload?: Record<string, unknown>;
}

export interface AuditWriter {
  write(event: AuditEventInput & { createdAt: Date }): Promise<void>;
}

/** Standard set of audit-action keys used across the domain. */
export const AUDIT_ACTIONS = {
  crCreate: "cr.create",
  crUpdate: "cr.update",
  crDelete: "cr.delete",
  crTransition: "cr.transition",
  approvalStart: "approval.start",
  approvalDecide: "approval.decide",
  approvalDelegate: "approval.delegate",
  commentCreate: "comment.create",
  attachmentUpload: "attachment.upload",
  mlAnalyze: "ml.analyze",
  impactAnalyze: "impact.analyze",
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];

export async function recordAudit(
  writer: AuditWriter,
  event: AuditEventInput
): Promise<void> {
  await writer.write({ ...event, createdAt: new Date() });
}
