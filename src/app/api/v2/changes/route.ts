/**
 * GET  /api/v2/changes — list change requests (filterable)
 * POST /api/v2/changes — create a new change request
 */

import { NextResponse } from "next/server";
import { getChangeRequestService } from "@/core";
import { prisma } from "@/lib/prisma";
import {
  badRequest,
  forbidden,
  isResponse,
  requireSession,
  serverError,
} from "../_helpers";

export async function GET(request: Request) {
  const ctx = await requireSession();
  if (isResponse(ctx)) return ctx;
  const { searchParams } = new URL(request.url);
  const state = searchParams.get("state") || undefined;
  const requestedBy = searchParams.get("requestedBy") || undefined;

  const svc = getChangeRequestService();
  try {
    const filter: { state?: string; requestedBy?: string } = {};
    if (state) filter.state = state;
    if (requestedBy) filter.requestedBy = requestedBy;

    let items = await svc.list(filter);
    
    // Non-admin users can only see CRs they requested, are assigned to, or are approvers on
    if (!ctx.perms.canViewAllData) {
      // Get CR numbers where user is an approver
      const approverCRs = await prisma.$queryRaw<Array<{ changeRequestId: string }>>`
        SELECT DISTINCT changeRequestId FROM Approval WHERE approverEmail = ${ctx.email}
      `;
      const approverCRNumbers = new Set(approverCRs.map(r => r.changeRequestId));
      
      items = items.filter(cr => 
        cr.requestedBy === ctx.email || 
        cr.assignedTo === ctx.email ||
        approverCRNumbers.has(cr.number)
      );
    }

    return NextResponse.json({ items, total: items.length });
  } catch (err) {
    return serverError(err);
  }
}

export async function POST(request: Request) {
  const ctx = await requireSession();
  if (isResponse(ctx)) return ctx;
  if (!ctx.perms.canManageChanges) return forbidden();

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body");
  }
  if (!body.title || typeof body.title !== "string") {
    return badRequest("Missing required field: title");
  }
  const svc = getChangeRequestService();
  try {
    const cr = await svc.create(
      { actor: ctx.email, actorRole: ctx.role },
      body as unknown as Parameters<typeof svc.create>[1]
    );
    return NextResponse.json(cr, { status: 201 });
  } catch (err) {
    return serverError(err);
  }
}
