import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, isResponse, forbidden, badRequest, serverError } from "../../v2/_helpers";

/**
 * GET /api/admin/org-settings
 * Get organization settings for the current user's org
 */
export async function GET() {
  const ctx = await requireSession();
  if (isResponse(ctx)) return ctx;

  try {
    const org = await prisma.organization.findUnique({
      where: { orgId: ctx.orgId },
      select: {
        orgId: true,
        name: true,
        description: true,
        enableCRImport: true,
        isActive: true,
      },
    });

    if (!org) {
      return badRequest("Organization not found");
    }

    return NextResponse.json({ settings: org });
  } catch (err) {
    return serverError(err);
  }
}

/**
 * PUT /api/admin/org-settings
 * Update organization settings (admin only)
 */
export async function PUT(request: Request) {
  const ctx = await requireSession();
  if (isResponse(ctx)) return ctx;
  
  // Only admins can update org settings
  if (!ctx.perms.canEditSettings && !ctx.isSuperAdmin) {
    return forbidden();
  }

  let body: {
    enableCRImport?: boolean;
    name?: string;
    description?: string;
  };

  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body");
  }

  try {
    const updateData: Record<string, unknown> = {};
    
    if (typeof body.enableCRImport === "boolean") {
      updateData.enableCRImport = body.enableCRImport;
    }
    if (typeof body.name === "string") {
      updateData.name = body.name;
    }
    if (typeof body.description === "string") {
      updateData.description = body.description;
    }

    if (Object.keys(updateData).length === 0) {
      return badRequest("No valid fields to update");
    }

    const updated = await prisma.organization.update({
      where: { orgId: ctx.orgId },
      data: updateData,
      select: {
        orgId: true,
        name: true,
        description: true,
        enableCRImport: true,
        isActive: true,
      },
    });

    return NextResponse.json({ settings: updated });
  } catch (err) {
    return serverError(err);
  }
}
