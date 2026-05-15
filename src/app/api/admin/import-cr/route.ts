import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, isResponse, forbidden, badRequest } from "../../v2/_helpers";
import { syncChangeRequests } from "@/lib/integrations/servicenow";

/**
 * POST /api/admin/import-cr
 * Import change requests from ServiceNow (admin only, requires enableCRImport setting)
 */
export async function POST(request: Request) {
  const ctx = await requireSession();
  if (isResponse(ctx)) return ctx;
  
  // Only admins can import CRs
  if (!ctx.perms.canManageChanges && !ctx.isSuperAdmin) {
    return forbidden();
  }

  // Check if CR import is enabled for this org
  const org = await prisma.organization.findUnique({
    where: { orgId: ctx.orgId },
    select: { enableCRImport: true },
  });

  if (!org?.enableCRImport && !ctx.isSuperAdmin) {
    return NextResponse.json(
      { error: "CR import is not enabled for this organization. Please contact your administrator." },
      { status: 403 }
    );
  }

  let body: {
    instance: string;
    user: string;
    password: string;
    days?: number;
  };

  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body");
  }

  const { instance, user, password, days } = body;

  if (!instance || !user || !password) {
    return badRequest("ServiceNow instance URL, username, and password are required");
  }

  // Validate instance URL format - must be a valid URL with https
  try {
    const url = new URL(instance);
    if (url.protocol !== "https:") {
      return badRequest("Instance URL must use HTTPS");
    }
  } catch {
    return badRequest("Invalid instance URL format");
  }

  try {
    const result = await syncChangeRequests(prisma, {
      instance,
      user,
      password,
      days: days || 30,
      syncedBy: ctx.email,
      orgId: ctx.orgId,
    });

    return NextResponse.json({
      success: true,
      message: `Imported ${result.upserted} change requests`,
      details: {
        fetched: result.fetched,
        upserted: result.upserted,
        errors: result.errors,
        errorDetails: result.errorDetails.slice(0, 10), // Limit error details
      },
    });
  } catch (err) {
    console.error("ServiceNow import error:", err);
    const message = err instanceof Error ? err.message : "Failed to import from ServiceNow";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
