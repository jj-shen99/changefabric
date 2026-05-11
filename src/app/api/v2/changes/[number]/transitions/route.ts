/**
 * GET  /api/v2/changes/:number/transitions  — list legal transitions for current state
 * POST /api/v2/changes/:number/transitions  — fire a workflow transition
 *   Body: { event: string, reason?: string }
 */

import { NextResponse } from "next/server";
import { availableTransitions, BUILTIN_WORKFLOWS, getChangeRequestService } from "@/core";
import {
  badRequest,
  forbidden,
  isResponse,
  notFound,
  requireSession,
  serverError,
} from "../../../_helpers";

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
  if (!ctx.perms.canManageChanges) return forbidden();
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
      body.reason
    );
    return NextResponse.json(cr);
  } catch (err) {
    return serverError(err);
  }
}
