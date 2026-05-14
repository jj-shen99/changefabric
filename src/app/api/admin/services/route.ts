import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, isResponse, forbidden, badRequest, serverError } from "../../v2/_helpers";

interface ServiceRow {
  id: string;
  name: string;
  displayName: string;
  description: string;
  category: string;
  owner: string | null;
  criticality: string;
  isActive: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * GET /api/admin/services
 * List all services (admin only)
 */
export async function GET() {
  const ctx = await requireSession();
  if (isResponse(ctx)) return ctx;
  if (!ctx.perms.canViewAllData && !ctx.perms.canEditSettings && !ctx.perms.canManageUsers) return forbidden();

  try {
    // Use raw SQL to avoid Prisma client model issues
    const services = await prisma.$queryRaw<ServiceRow[]>`
      SELECT id, name, displayName, description, category, owner, criticality, isActive, createdBy, createdAt, updatedAt
      FROM Service
      ORDER BY name ASC
    `;
    // Convert isActive from number/BigInt to boolean for frontend
    const result = services.map(s => ({ ...s, isActive: Boolean(s.isActive) }));
    return NextResponse.json(result);
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

    const normalizedName = name.toLowerCase().replace(/\s+/g, "-");

    // Check for duplicate using raw SQL
    const existing = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM Service WHERE name = ${normalizedName} LIMIT 1
    `;
    if (existing.length > 0) {
      return badRequest(`Service with name "${name}" already exists`);
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await prisma.$executeRaw`
      INSERT INTO Service (id, name, displayName, description, category, owner, criticality, isActive, createdBy, createdAt, updatedAt)
      VALUES (${id}, ${normalizedName}, ${displayName}, ${description || ""}, ${category || "other"}, ${owner || null}, ${criticality || "standard"}, 1, ${ctx.email}, ${now}, ${now})
    `;

    return NextResponse.json({ id, name: normalizedName, displayName, description: description || "", category: category || "other", owner: owner || null, criticality: criticality || "standard", isActive: true, createdBy: ctx.email, createdAt: now, updatedAt: now }, { status: 201 });
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

    const now = new Date().toISOString();
    const normalizedName = name ? name.toLowerCase().replace(/\s+/g, "-") : null;
    const isActiveNum = isActive !== undefined ? (isActive ? 1 : 0) : null;

    // Build dynamic update using raw SQL
    await prisma.$executeRaw`
      UPDATE Service SET
        name = COALESCE(${normalizedName}, name),
        displayName = COALESCE(${displayName || null}, displayName),
        description = COALESCE(${description !== undefined ? description : null}, description),
        category = COALESCE(${category || null}, category),
        owner = COALESCE(${owner !== undefined ? owner : null}, owner),
        criticality = COALESCE(${criticality || null}, criticality),
        isActive = COALESCE(${isActiveNum}, isActive),
        updatedAt = ${now}
      WHERE id = ${id}
    `;

    // Fetch updated record
    const updated = await prisma.$queryRaw<ServiceRow[]>`
      SELECT id, name, displayName, description, category, owner, criticality, isActive, createdBy, createdAt, updatedAt
      FROM Service WHERE id = ${id}
    `;
    if (updated.length === 0) {
      return badRequest("Service not found");
    }
    return NextResponse.json({ ...updated[0], isActive: Boolean(updated[0].isActive) });
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

    await prisma.$executeRaw`DELETE FROM Service WHERE id = ${id}`;

    return NextResponse.json({ success: true });
  } catch (e) {
    return serverError(e);
  }
}
