/**
 * GET  /api/v2/changes/:number/approvals  — list approval steps + decisions
 * POST /api/v2/changes/:number/approvals  — add a new approval step (multi-person)
 *   Body: { name, ordering, policy: "all"|"any"|"quorum:N", approvers: [{email, group?}] }
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PrismaChangeRequestRepository } from "@/core/adapters/prisma-repository";
import { getChangeRequestService } from "@/core";
import {
  badRequest,
  forbidden,
  isResponse,
  requireSession,
  serverError,
} from "../../../_helpers";

export async function GET(
  _req: Request,
  { params }: { params: { number: string } }
) {
  const ctx = await requireSession();
  if (isResponse(ctx)) return ctx;
  try {
    const repo = new PrismaChangeRequestRepository(prisma);
    const steps = await repo.listApprovalSteps(params.number);
    return NextResponse.json({ steps });
  } catch (err) {
    return serverError(err);
  }
}

export async function POST(
  request: Request,
  { params }: { params: { number: string } }
) {
  const ctx = await requireSession();
  if (isResponse(ctx)) return ctx;
  if (!ctx.perms.canManageChanges) return forbidden();
  let body: {
    name?: string;
    ordering?: number;
    policy?: string;
    approvers?: Array<{ email: string; group?: string }>;
  };
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body");
  }
  if (!body.name || !Array.isArray(body.approvers) || body.approvers.length === 0) {
    return badRequest("Missing 'name' or 'approvers'");
  }
  try {
    const step = await getChangeRequestService().addApprovalStep(
      { actor: ctx.email, actorRole: ctx.role },
      params.number,
      {
        name: body.name,
        ordering: body.ordering ?? 0,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        policy: (body.policy ?? "all") as any,
        approvers: body.approvers,
      }
    );
    return NextResponse.json(step, { status: 201 });
  } catch (err) {
    return serverError(err);
  }
}
