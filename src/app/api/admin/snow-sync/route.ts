import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { encrypt, decrypt } from "@/lib/crypto";
import { requireSession, isResponse, forbidden, badRequest, serverError } from "../../v2/_helpers";

/**
 * GET /api/admin/snow-sync
 * Get ITSM sync settings for the current org (credentials are masked)
 */
export async function GET() {
  const ctx = await requireSession();
  if (isResponse(ctx)) return ctx;

  // Only admins can view sync settings
  if (!ctx.perms.canEditSettings && !ctx.isSuperAdmin) {
    return forbidden();
  }

  try {
    const org = await prisma.organization.findUnique({
      where: { orgId: ctx.orgId },
      select: {
        orgId: true,
        enableCRImport: true,
        snowInstance: true,
        snowUsername: true,
        snowPassword: true,
        snowSyncEnabled: true,
        snowSyncIntervalHours: true,
        snowSyncDays: true,
        snowLastSyncAt: true,
        snowLastSyncBy: true,
        snowLastSyncResult: true,
      },
    });

    if (!org) {
      return NextResponse.json({
        settings: {
          enableCRImport: false,
          snowInstance: null,
          snowUsername: null,
          hasPassword: false,
          snowSyncEnabled: false,
          snowSyncIntervalHours: 24,
          snowSyncDays: 30,
          snowLastSyncAt: null,
          snowLastSyncBy: null,
          snowLastSyncResult: null,
        },
      });
    }

    // Mask credentials - only show if they exist, not the actual values
    return NextResponse.json({
      settings: {
        enableCRImport: org.enableCRImport,
        snowInstance: org.snowInstance,
        snowUsername: org.snowUsername ? decrypt(org.snowUsername) : null,
        hasPassword: !!org.snowPassword,
        snowSyncEnabled: org.snowSyncEnabled,
        snowSyncIntervalHours: org.snowSyncIntervalHours,
        snowSyncDays: org.snowSyncDays,
        snowLastSyncAt: org.snowLastSyncAt?.toISOString() || null,
        snowLastSyncBy: org.snowLastSyncBy,
        snowLastSyncResult: org.snowLastSyncResult ? JSON.parse(org.snowLastSyncResult) : null,
      },
    });
  } catch (err) {
    return serverError(err);
  }
}

/**
 * PUT /api/admin/snow-sync
 * Update ITSM sync settings (admin only)
 * Credentials are encrypted before storage
 */
export async function PUT(request: Request) {
  const ctx = await requireSession();
  if (isResponse(ctx)) return ctx;

  // Only admins can update sync settings
  if (!ctx.perms.canEditSettings && !ctx.isSuperAdmin) {
    return forbidden();
  }

  let body: {
    snowInstance?: string;
    snowUsername?: string;
    snowPassword?: string;
    snowSyncEnabled?: boolean;
    snowSyncIntervalHours?: number;
    snowSyncDays?: number;
  };

  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body");
  }

  try {
    const updateData: Record<string, unknown> = {};

    // Validate and set instance URL
    if (body.snowInstance !== undefined) {
      if (body.snowInstance) {
        try {
          const url = new URL(body.snowInstance);
          if (url.protocol !== "https:") {
            return badRequest("Instance URL must use HTTPS");
          }
          updateData.snowInstance = body.snowInstance.replace(/\/$/, ""); // Remove trailing slash
        } catch {
          return badRequest("Invalid instance URL format");
        }
      } else {
        updateData.snowInstance = null;
      }
    }

    // Encrypt and store username
    if (body.snowUsername !== undefined) {
      updateData.snowUsername = body.snowUsername ? encrypt(body.snowUsername) : null;
    }

    // Encrypt and store password
    if (body.snowPassword !== undefined) {
      updateData.snowPassword = body.snowPassword ? encrypt(body.snowPassword) : null;
    }

    // Validate sync enabled
    if (typeof body.snowSyncEnabled === "boolean") {
      updateData.snowSyncEnabled = body.snowSyncEnabled;
    }

    // Validate sync interval (1-168 hours = 1 hour to 1 week)
    if (body.snowSyncIntervalHours !== undefined) {
      const hours = parseInt(String(body.snowSyncIntervalHours), 10);
      if (isNaN(hours) || hours < 1 || hours > 168) {
        return badRequest("Sync interval must be between 1 and 168 hours");
      }
      updateData.snowSyncIntervalHours = hours;
    }

    // Validate sync days (1-365)
    if (body.snowSyncDays !== undefined) {
      const days = parseInt(String(body.snowSyncDays), 10);
      if (isNaN(days) || days < 1 || days > 365) {
        return badRequest("Sync days must be between 1 and 365");
      }
      updateData.snowSyncDays = days;
    }

    if (Object.keys(updateData).length === 0) {
      return badRequest("No valid fields to update");
    }

    // Use upsert to create org if it doesn't exist
    // Try to get a proper name from the user's session or use a default
    const orgName = ctx.orgId.includes("-") && ctx.orgId.length > 30 
      ? "Imported Organization" 
      : ctx.orgId;
    const updated = await prisma.organization.upsert({
      where: { orgId: ctx.orgId },
      update: updateData,
      create: {
        orgId: ctx.orgId,
        name: orgName,
        ...updateData,
      },
      select: {
        orgId: true,
        enableCRImport: true,
        snowInstance: true,
        snowUsername: true,
        snowPassword: true,
        snowSyncEnabled: true,
        snowSyncIntervalHours: true,
        snowSyncDays: true,
        snowLastSyncAt: true,
        snowLastSyncBy: true,
        snowLastSyncResult: true,
      },
    });

    return NextResponse.json({
      settings: {
        enableCRImport: updated.enableCRImport,
        snowInstance: updated.snowInstance,
        snowUsername: updated.snowUsername ? decrypt(updated.snowUsername) : null,
        hasPassword: !!updated.snowPassword,
        snowSyncEnabled: updated.snowSyncEnabled,
        snowSyncIntervalHours: updated.snowSyncIntervalHours,
        snowSyncDays: updated.snowSyncDays,
        snowLastSyncAt: updated.snowLastSyncAt?.toISOString() || null,
        snowLastSyncBy: updated.snowLastSyncBy,
        snowLastSyncResult: updated.snowLastSyncResult ? JSON.parse(updated.snowLastSyncResult) : null,
      },
    });
  } catch (err) {
    return serverError(err);
  }
}

/**
 * DELETE /api/admin/snow-sync
 * Clear ITSM credentials and disable sync
 */
export async function DELETE() {
  const ctx = await requireSession();
  if (isResponse(ctx)) return ctx;

  // Only admins can clear sync settings
  if (!ctx.perms.canEditSettings && !ctx.isSuperAdmin) {
    return forbidden();
  }

  try {
    await prisma.organization.update({
      where: { orgId: ctx.orgId },
      data: {
        snowInstance: null,
        snowUsername: null,
        snowPassword: null,
        snowSyncEnabled: false,
      },
    });

    return NextResponse.json({ success: true, message: "ITSM credentials cleared" });
  } catch (err) {
    return serverError(err);
  }
}
