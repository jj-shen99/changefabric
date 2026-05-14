import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, isResponse, forbidden, badRequest, serverError } from "../../v2/_helpers";

/**
 * GET /api/admin/services
 * List all services (admin only)
 */
export async function GET() {
  const ctx = await requireSession();
  if (isResponse(ctx)) return ctx;
  if (!ctx.perms.canViewAllData && !ctx.perms.canEditSettings && !ctx.perms.canManageUsers) return forbidden();

  try {
    const services = await prisma.service.findMany({
      orderBy: { name: "asc" },
    });
    return NextResponse.json(services);
  } catch (e) {
    return serverError(e);
  }
}

/**
 * POST /api/admin/services
 * Create a new service
 */
export async function POST(request: Request) {
  const ctx = await requireSession();
  if (isResponse(ctx)) return ctx;
  if (!ctx.perms.canEditSettings) return forbidden();

  try {
    const body = await request.json();
    const { name, displayName, description, category, owner, criticality } = body;

    if (!name || !displayName) {
      return badRequest("name and displayName are required");
    }

    // Check for duplicate
    const existing = await prisma.service.findUnique({ where: { name } });
    if (existing) {
      return badRequest(`Service with name "${name}" already exists`);
    }

    const service = await prisma.service.create({
      data: {
        name: name.toLowerCase().replace(/\s+/g, "-"),
        displayName,
        description: description || "",
        category: category || "other",
        owner: owner || null,
        criticality: criticality || "standard",
        createdBy: ctx.email,
      },
    });

    return NextResponse.json(service, { status: 201 });
  } catch (e) {
    return serverError(e);
  }
}

/**
 * PUT /api/admin/services
 * Update a service
 */
export async function PUT(request: Request) {
  const ctx = await requireSession();
  if (isResponse(ctx)) return ctx;
  if (!ctx.perms.canEditSettings) return forbidden();

  try {
    const body = await request.json();
    const { id, name, displayName, description, category, owner, criticality, isActive } = body;

    if (!id) {
      return badRequest("id is required");
    }

    const service = await prisma.service.update({
      where: { id },
      data: {
        ...(name && { name: name.toLowerCase().replace(/\s+/g, "-") }),
        ...(displayName && { displayName }),
        ...(description !== undefined && { description }),
        ...(category && { category }),
        ...(owner !== undefined && { owner }),
        ...(criticality && { criticality }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    return NextResponse.json(service);
  } catch (e) {
    return serverError(e);
  }
}

/**
 * DELETE /api/admin/services
 * Delete a service
 */
export async function DELETE(request: Request) {
  const ctx = await requireSession();
  if (isResponse(ctx)) return ctx;
  if (!ctx.perms.canEditSettings) return forbidden();

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return badRequest("id is required");
    }

    await prisma.service.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (e) {
    return serverError(e);
  }
}
