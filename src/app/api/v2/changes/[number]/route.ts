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
    const repo = new PrismaChangeRequestRepository(prisma);
    
    // Check if user is an approver on this CR
    const isApprover = await repo.isUserApprover(cr.number, ctx.email);
    
    // Allow viewing if: admin, OR user requested it, OR user is assigned, OR user is an approver
    const isOwner = cr.requestedBy === ctx.email;
    const isAssigned = cr.assignedTo === ctx.email;
    
    // Draft CRs are only visible to the owner (requestedBy) and admins
    const isDraft = cr.state === "draft";
    if (isDraft && !ctx.perms.canViewAllData && !isOwner) {
      return forbidden();
    }
    
    // Approvers can see CRs in states relevant to the approval workflow:
    // - awaiting_approval: pending their decision
    // - approved, in_progress, implemented, closed: to track CRs they approved
    // - rejected, rolled_back: to see outcome of their rejection or rollback
    // NOT visible: draft, submitted, scheduled, canceled (pre-approval or unrelated states)
    const approverVisibleStates = new Set([
      "awaiting_approval", "approved", "in_progress", "implemented", "rolled_back", "closed", "rejected"
    ]);
    const approverCanView = isApprover && approverVisibleStates.has(cr.state);
    
    if (!ctx.perms.canViewAllData && !isOwner && !isAssigned && !approverCanView) {
      return forbidden();
    }
    const [steps, comments] = await Promise.all([
      repo.listApprovalSteps(cr.number),
      repo.listComments(cr.number),
    ]);
    const wf = BUILTIN_WORKFLOWS.find((w) => w.key === cr.workflowKey);
    
    // Determine user's access level
    // - "full": can edit, transition, manage approvals (owner, assigned, or admin)
    // - "approver": can only view and make approval decisions
    const canEdit = ctx.perms.canViewAllData || isOwner || isAssigned;
    const isApproverOnly = isApprover && !canEdit;
    
    // Get all valid transitions for current state and role
    let transitions = canEdit && wf
      ? availableTransitions(wf, cr.state, ctx.primaryRole)
      : [];
    
    // Filter transitions based on user's relationship to the CR
    // Admin sees all transitions
    if (!ctx.perms.canViewAllData && transitions.length > 0) {
      // Owner actions: submit, cancel, return_to_draft, request_approval
      const ownerActions = ["submit", "cancel", "return_to_draft", "request_approval"];
      // Assigned person actions: implementation-related actions
      const assignedActions = [
        "assess", "schedule", "start_implementation", "complete_implementation",
        "begin_review", "close", "approve", "reject", "cancel"
      ];
      
      transitions = transitions.filter(t => {
        if (isOwner && ownerActions.includes(t.event)) return true;
        if (isAssigned && assignedActions.includes(t.event)) return true;
        // If user is both owner and assigned, show both sets
        return false;
      });
    }
    
    // Check if this is a pre-approved workflow (no approval steps needed)
    const isPreApproved = cr.workflowKey === "standard_preapproved";
    
    // Check if user is admin (can delete imported CRs)
    const isAdmin = ctx.perms.canViewAllData;
    
    // Check if CR is imported (has externalSource)
    const isImported = !!cr.externalSource;
    
    return NextResponse.json({ 
      changeRequest: cr, 
      approvalSteps: steps, 
      comments, 
      availableTransitions: transitions,
      userAccess: {
        canEdit,
        isApproverOnly,
        isOwner,
        isAssigned,
        isApprover,
        isPreApproved,
        isAdmin,
        isImported,
      },
    });
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

  // Validate planned dates if provided
  const now = new Date();
  if (body.plannedStart !== undefined && body.plannedStart !== null) {
    const plannedStart = new Date(body.plannedStart as string);
    if (isNaN(plannedStart.getTime())) {
      return badRequest("Invalid plannedStart date format");
    }
    if (plannedStart <= now) {
      return badRequest("Planned start must be in the future");
    }
  }
  if (body.plannedEnd !== undefined && body.plannedEnd !== null) {
    const plannedEnd = new Date(body.plannedEnd as string);
    if (isNaN(plannedEnd.getTime())) {
      return badRequest("Invalid plannedEnd date format");
    }
    if (plannedEnd <= now) {
      return badRequest("Planned end must be in the future");
    }
  }
  // If both are provided, check order
  if (body.plannedStart && body.plannedEnd) {
    const plannedStart = new Date(body.plannedStart as string);
    const plannedEnd = new Date(body.plannedEnd as string);
    if (plannedStart >= plannedEnd) {
      return badRequest("Planned start must be earlier than planned end");
    }
  }
  // If only one is provided, we need to check against existing values
  const svc = getChangeRequestService();
  if ((body.plannedStart && !body.plannedEnd) || (!body.plannedStart && body.plannedEnd)) {
    const existing = await svc.get(params.number);
    if (existing) {
      const newStart = body.plannedStart ? new Date(body.plannedStart as string) : (existing.plannedStart ? new Date(existing.plannedStart) : null);
      const newEnd = body.plannedEnd ? new Date(body.plannedEnd as string) : (existing.plannedEnd ? new Date(existing.plannedEnd) : null);
      if (newStart && newEnd && newStart >= newEnd) {
        return badRequest("Planned start must be earlier than planned end");
      }
    }
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updated = await svc.update({ actor: ctx.email, actorRole: ctx.primaryRole }, params.number, body as any);
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
  
  // Only admins can delete CRs
  if (!ctx.perms.canViewAllData) {
    return forbidden();
  }
  
  const svc = getChangeRequestService();
  
  try {
    // Check if CR exists and is imported (has externalSource)
    const cr = await svc.get(params.number);
    
    if (!cr) {
      return notFound();
    }
    
    // Only allow deletion of imported CRs (those with an externalSource)
    if (!cr.externalSource) {
      return badRequest("Only imported change requests can be deleted. Native CRs should be canceled instead.");
    }
    
    // Delete the CR and related records using raw queries for cascade
    await prisma.$executeRaw`DELETE FROM Approval WHERE changeRequestId = ${params.number}`;
    await prisma.$executeRaw`DELETE FROM ApprovalStep WHERE changeRequestId = ${params.number}`;
    await prisma.$executeRaw`DELETE FROM Comment WHERE changeRequestId = ${params.number}`;
    await prisma.$executeRaw`DELETE FROM AuditEvent WHERE changeRequestId = ${params.number}`;
    await prisma.$executeRaw`DELETE FROM ChangeRequest WHERE number = ${params.number}`;
    
    return NextResponse.json({ deleted: params.number });
  } catch (err) {
    return serverError(err);
  }
}
