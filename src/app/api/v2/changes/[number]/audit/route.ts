/**
 * GET /api/v2/changes/:number/audit — fetch audit events for a CR
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  forbidden,
  isResponse,
  notFound,
  requireSession,
  serverError,
} from "../../../_helpers";

export async function GET(
  _request: Request,
  { params }: { params: { number: string } }
) {
  const ctx = await requireSession();
  if (isResponse(ctx)) return ctx;

  try {
    // Check if CR exists
    const cr = await prisma.changeRequest.findUnique({
      where: { number: params.number },
      select: { number: true, requestedBy: true, assignedTo: true },
    });

    if (!cr) return notFound();

    // Check access - same rules as viewing the CR
    const isOwner = cr.requestedBy === ctx.email;
    const isAssigned = cr.assignedTo === ctx.email;

    if (!ctx.perms.canViewAllData && !isOwner && !isAssigned) {
      return forbidden();
    }

    // Fetch audit events
    const events = await prisma.auditEvent.findMany({
      where: { changeRequestId: params.number },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        actor: true,
        action: true,
        payload: true,
        createdAt: true,
      },
    });

    // Parse payload JSON strings
    const parsedEvents = events.map((e) => ({
      ...e,
      payload: typeof e.payload === "string" ? JSON.parse(e.payload) : e.payload,
    }));

    return NextResponse.json({ events: parsedEvents });
  } catch (err) {
    return serverError(err);
  }
}
