/**
 * GET    /api/v2/changes/:number  — fetch a CR (with steps + comments + transitions)
 * PATCH  /api/v2/changes/:number  — partial update
 * DELETE /api/v2/changes/:number  — delete
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getChangeRequestService } from "@/core";
import { availableTransitions, BUILTIN_WORKFLOWS } from "@/core";
import {
  badRequest,
  forbidden,
  isResponse,
  notFound,
  requireSession,
  serverError,
} from "../../_helpers";
import { PrismaChangeRequestRepository } from "@/core/adapters/prisma-repository";

export async function GET(
  _request: Request,
  { params }: { params: { number: string } }
) {
  const ctx = await requireSession();
  if (isResponse(ctx)) return ctx;
  const svc = getChangeRequestService();
  try {
    const cr = await svc.get(params.number);
    if (!cr) return notFound();
    // Allow viewing if: admin, OR user requested it, OR user is assigned
    const isOwner = cr.requestedBy === ctx.email;
    const isAssigned = cr.assignedTo === ctx.email;
    if (!ctx.perms.canViewAllData && !isOwner && !isAssigned) {
      return forbidden();
    }
    const repo = new PrismaChangeRequestRepository(prisma);
    const [steps, comments] = await Promise.all([
      repo.listApprovalSteps(cr.number),
      repo.listComments(cr.number),
    ]);
    const wf = BUILTIN_WORKFLOWS.find((w) => w.key === cr.workflowKey);
    const transitions = wf
      ? availableTransitions(wf, cr.state, ctx.role)
      : [];
    return NextResponse.json({ changeRequest: cr, approvalSteps: steps, comments, availableTransitions: transitions });
  } catch (err) {
    return serverError(err);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { number: string } }
) {
  const ctx = await requireSession();
  if (isResponse(ctx)) return ctx;
  if (!ctx.perms.canManageChanges) return forbidden();
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body");
  }
  const svc = getChangeRequestService();
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updated = await svc.update({ actor: ctx.email, actorRole: ctx.role }, params.number, body as any);
    return NextResponse.json(updated);
  } catch (err) {
    return serverError(err);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { number: string } }
) {
  const ctx = await requireSession();
  if (isResponse(ctx)) return ctx;
  if (!ctx.perms.canManageChanges) return forbidden();
  try {
    await prisma.changeRequest.delete({ where: { number: params.number } });
    return NextResponse.json({ deleted: params.number });
  } catch (err) {
    return serverError(err);
  }
}
