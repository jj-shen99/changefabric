/**
 * GET  /api/v2/changes/:number/transitions  — list legal transitions for current state
 * POST /api/v2/changes/:number/transitions  — fire a workflow transition
 *   Body: { event: string, reason?: string }
 */

import { NextResponse } from "next/server";
import { availableTransitions, BUILTIN_WORKFLOWS, getChangeRequestService } from "@/core";
import { prisma } from "@/lib/prisma";
import type { ApprovalPolicyConfig } from "@/core/services/change-request-service";
import {
  badRequest,
  forbidden,
  isResponse,
  notFound,
  requireSession,
  serverError,
} from "../../../_helpers";

// Default approval policies if none configured
const DEFAULT_POLICIES: ApprovalPolicyConfig[] = [
  { id: "critical", riskLevel: "critical", minScore: 80, maxScore: 100, requiredApprovals: 3, approverGroups: ["Tech Lead", "Security Lead", "CAB"], autoApprove: false },
  { id: "high", riskLevel: "high", minScore: 60, maxScore: 79, requiredApprovals: 2, approverGroups: ["Tech Lead", "Manager"], autoApprove: false },
  { id: "medium", riskLevel: "medium", minScore: 40, maxScore: 59, requiredApprovals: 1, approverGroups: ["Tech Lead"], autoApprove: false },
  { id: "low", riskLevel: "low", minScore: 0, maxScore: 39, requiredApprovals: 0, approverGroups: [], autoApprove: true },
];

/** Load approval policies from database or return defaults */
async function loadApprovalPolicies(): Promise<ApprovalPolicyConfig[]> {
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: "approval_policies" },
    });
    if (setting?.value) {
      return JSON.parse(setting.value) as ApprovalPolicyConfig[];
    }
  } catch {
    // Fall through to defaults
  }
  return DEFAULT_POLICIES;
}

export async function GET(
  _req: Request,
  { params }: { params: { number: string } }
) {
  const ctx = await requireSession();
  if (isResponse(ctx)) return ctx;
  const svc = getChangeRequestService();
  const cr = await svc.get(params.number);
  if (!cr) return notFound();
  const wf = BUILTIN_WORKFLOWS.find((w) => w.key === cr.workflowKey);
  if (!wf) return notFound("Workflow not registered");
  return NextResponse.json({ availableTransitions: availableTransitions(wf, cr.state, ctx.primaryRole) });
}

export async function POST(
  request: Request,
  { params }: { params: { number: string } }
) {
  const ctx = await requireSession();
  if (isResponse(ctx)) return ctx;
  // Allow users who can manage changes OR implement changes to fire transitions
  // The workflow engine will enforce role-based access for specific transitions
  if (!ctx.perms.canManageChanges && !ctx.perms.canImplementChanges) return forbidden();
  let body: { event?: string; reason?: string };
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body");
  }
  if (!body.event) return badRequest("Missing 'event'");
  try {
    const cr = await getChangeRequestService().transition(
      { actor: ctx.email, actorRole: ctx.primaryRole },
      params.number,
      body.event,
      body.reason,
      { approvalPolicyLoader: loadApprovalPolicies }
    );
    return NextResponse.json(cr);
  } catch (err) {
    return serverError(err);
  }
}
