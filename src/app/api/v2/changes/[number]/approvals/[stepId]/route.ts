/**
 * POST /api/v2/changes/:number/approvals/:stepId
 *   Body: { decision: "approved"|"rejected"|"delegated", comment?, delegatedTo? }
 *
 * The acting approver is the authenticated user. They must be one of the
 * step's assigned approvers; the engine enforces that.
 */

import { NextResponse } from "next/server";
import { getChangeRequestService } from "@/core";
import {
  badRequest,
  forbidden,
  isResponse,
  requireSession,
  serverError,
} from "../../../../_helpers";

export async function POST(
  request: Request,
  { params }: { params: { number: string; stepId: string } }
) {
  const ctx = await requireSession();
  if (isResponse(ctx)) return ctx;
  if (!ctx.perms.canApproveChanges) return forbidden();

  let body: { decision?: string; comment?: string; delegatedTo?: string };
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body");
  }
  const allowed = new Set(["approved", "rejected", "delegated"]);
  if (!body.decision || !allowed.has(body.decision)) {
    return badRequest("Field 'decision' must be approved|rejected|delegated");
  }
  try {
    const result = await getChangeRequestService().decideApproval(
      { actor: ctx.email, actorRole: ctx.primaryRole },
      params.number,
      params.stepId,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      body.decision as any,
      body.comment,
      body.delegatedTo
    );
    return NextResponse.json(result);
  } catch (err) {
    return serverError(err);
  }
}
