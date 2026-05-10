import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, isResponse, forbidden, badRequest, serverError } from "../../v2/_helpers";

/**
 * GET /api/admin/groups
 * List all groups (admin only)
 * Query params: ?type=approver|assignment|both&search=<term>&active=true|false
 */
export async function GET(request: Request) {
  const ctx = await requireSession();
  if (isResponse(ctx)) return ctx;
  if (!ctx.perms.canViewAllData) return forbidden();

  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const search = searchParams.get("search");
    const active = searchParams.get("active");

    const where: {
      type?: string;
      isActive?: boolean;
      name?: { contains: string };
    } = {};

    if (type) where.type = type;
    if (active !== null) where.isActive = active !== "false";
    if (search) where.name = { contains: search };

    const groups = await prisma.group.findMany({
      where,
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ groups });
  } catch (err) {
    return serverError(err);
  }
}

/**
 * POST /api/admin/groups
 * Create a new group (admin only)
 */
export async function POST(request: Request) {
  const ctx = await requireSession();
  if (isResponse(ctx)) return ctx;
  if (!ctx.perms.canViewAllData) return forbidden();

  let body: {
    name: string;
    description?: string;
    type?: string;
  };

  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body");
  }

  const { name, description = "", type = "approver" } = body;

  if (!name || name.trim().length === 0) {
    return badRequest("Group name is required");
  }

  const validTypes = ["approver", "assignment", "both"];
  if (!validTypes.includes(type)) {
    return badRequest(`Type must be one of: ${validTypes.join(", ")}`);
  }

  try {
    // Check for duplicate
    const existing = await prisma.group.findUnique({ where: { name: name.trim() } });
    if (existing) {
      return badRequest(`Group "${name}" already exists`);
    }

    const group = await prisma.group.create({
      data: {
        name: name.trim(),
        description,
        type,
        createdBy: ctx.email,
      },
    });

    return NextResponse.json(group, { status: 201 });
  } catch (err) {
    return serverError(err);
  }
}

/**
 * PUT /api/admin/groups
 * Update a group (admin only)
 */
export async function PUT(request: Request) {
  const ctx = await requireSession();
  if (isResponse(ctx)) return ctx;
  if (!ctx.perms.canViewAllData) return forbidden();

  let body: {
    id: string;
    name?: string;
    description?: string;
    type?: string;
    isActive?: boolean;
  };

  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body");
  }

  const { id, name, description, type, isActive } = body;

  if (!id) {
    return badRequest("Group id is required");
  }

  if (type) {
    const validTypes = ["approver", "assignment", "both"];
    if (!validTypes.includes(type)) {
      return badRequest(`Type must be one of: ${validTypes.join(", ")}`);
    }
  }

  try {
    // Check if group exists
    const existing = await prisma.group.findUnique({ where: { id } });
    if (!existing) {
      return badRequest("Group not found");
    }

    // Check for duplicate name if name is being changed
    if (name && name.trim() !== existing.name) {
      const duplicate = await prisma.group.findUnique({ where: { name: name.trim() } });
      if (duplicate) {
        return badRequest(`Group "${name}" already exists`);
      }
    }

    const group = await prisma.group.update({
      where: { id },
      data: {
        ...(name && { name: name.trim() }),
        ...(description !== undefined && { description }),
        ...(type && { type }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    return NextResponse.json(group);
  } catch (err) {
    return serverError(err);
  }
}

/**
 * DELETE /api/admin/groups
 * Delete a group (admin only)
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
    const result = await prisma.group.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ deleted: result.id });
  } catch (err) {
    return serverError(err);
  }
}
