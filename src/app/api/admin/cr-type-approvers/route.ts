import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, isResponse, forbidden, badRequest, serverError } from "../../v2/_helpers";

/**
 * GET /api/admin/cr-type-approvers
 * List all CR type approver assignments (admin only)
 * Query params: ?crType=standard|normal|emergency
 */
export async function GET(request: Request) {
  const ctx = await requireSession();
  if (isResponse(ctx)) return ctx;
  if (!ctx.perms.canViewAllData) return forbidden();

  try {
    const { searchParams } = new URL(request.url);
    const crType = searchParams.get("crType");

    const where: { isActive: boolean; crType?: string } = { isActive: true };
    if (crType) where.crType = crType;

    const approvers = await prisma.$queryRaw<Array<{
      id: string;
      crType: string;
      approverEmail: string;
      approverGroup: string | null;
      stepName: string;
      ordering: number;
      isActive: boolean;
      createdBy: string;
      createdAt: string;
    }>>`
      SELECT id, crType, approverEmail, approverGroup, stepName, ordering, isActive, createdBy, createdAt
      FROM CRTypeApprover
      WHERE isActive = 1 ${crType ? `AND crType = ${crType}` : ""}
      ORDER BY crType, ordering, stepName
    `;

    // Group by CR type for easier consumption
    const grouped: Record<string, typeof approvers> = {};
    for (const a of approvers) {
      if (!grouped[a.crType]) grouped[a.crType] = [];
      grouped[a.crType].push(a);
    }

    return NextResponse.json({ approvers, grouped });
  } catch (err) {
    return serverError(err);
  }
}

/**
 * POST /api/admin/cr-type-approvers
 * Add a new CR type approver assignment (admin only)
 */
export async function POST(request: Request) {
  const ctx = await requireSession();
  if (isResponse(ctx)) return ctx;
  if (!ctx.perms.canViewAllData) return forbidden();

  let body: {
    crType: string;
    approverEmail: string;
    approverGroup?: string;
    stepName?: string;
    ordering?: number;
  };

  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body");
  }

  const { crType, approverEmail, approverGroup, stepName = "Default", ordering = 1 } = body;

  if (!crType || !approverEmail) {
    return badRequest("crType and approverEmail are required");
  }

  const validTypes = ["standard", "normal", "emergency"];
  if (!validTypes.includes(crType)) {
    return badRequest(`crType must be one of: ${validTypes.join(", ")}`);
  }

  try {
    // Check if user exists
    const user = await prisma.user.findUnique({ where: { email: approverEmail } });
    if (!user) {
      return badRequest(`User with email ${approverEmail} not found`);
    }

    // Check for duplicate
    const existing = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM CRTypeApprover 
      WHERE crType = ${crType} AND approverEmail = ${approverEmail} AND stepName = ${stepName}
    `;
    if (existing.length > 0) {
      return badRequest("This approver is already assigned to this CR type and step");
    }

    // Create the assignment
    const id = crypto.randomUUID();
    await prisma.$executeRaw`
      INSERT INTO CRTypeApprover (id, crType, approverEmail, approverGroup, stepName, ordering, isActive, createdBy, createdAt, updatedAt)
      VALUES (${id}, ${crType}, ${approverEmail}, ${approverGroup || null}, ${stepName}, ${ordering}, 1, ${ctx.email}, datetime('now'), datetime('now'))
    `;

    return NextResponse.json({
      id,
      crType,
      approverEmail,
      approverGroup,
      stepName,
      ordering,
      isActive: true,
      createdBy: ctx.email,
    }, { status: 201 });
  } catch (err) {
    return serverError(err);
  }
}

/**
 * DELETE /api/admin/cr-type-approvers
 * Remove a CR type approver assignment (admin only)
 * Query params: ?id=<uuid>
 */
export async function DELETE(request: Request) {
  const ctx = await requireSession();
  if (isResponse(ctx)) return ctx;
  if (!ctx.perms.canViewAllData) return forbidden();

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return badRequest("id query parameter is required");
  }

  try {
    // Soft delete by setting isActive = false
    const result = await prisma.$executeRaw`
      UPDATE CRTypeApprover SET isActive = 0, updatedAt = datetime('now') WHERE id = ${id}
    `;

    if (result === 0) {
      return badRequest("Approver assignment not found");
    }

    return NextResponse.json({ deleted: id });
  } catch (err) {
    return serverError(err);
  }
}
