import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { syncChangeRequests } from "@/lib/integrations/servicenow";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * POST /api/v2/changes/import
 * Import change requests from an external ITSM instance.
 * 
 * Uses the change_request table via ITSM Table API.
 * Endpoint: /api/now/table/change_request
 */
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { instance, user, password } = body;

    if (!instance || !user || !password) {
      return NextResponse.json(
        { error: "Missing required fields: instance, user, password" },
        { status: 400 }
      );
    }

    // Normalize instance URL
    const normalizedInstance = instance.replace(/\/$/, "");

    // Sync change requests from ITSM change_request table
    const result = await syncChangeRequests(prisma, {
      instance: normalizedInstance,
      user,
      password,
      syncedBy: session.user?.email || "import",
    });

    if (result.fetched === 0) {
      return NextResponse.json({
        success: true,
        message: "No change requests found in ITSM instance",
        imported: 0,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Imported ${result.upserted} change requests from ITSM`,
      imported: result.upserted,
      errors: result.errors,
      total: result.fetched,
      errorDetails: result.errors > 0 ? result.errorDetails.slice(0, 5) : undefined,
    });
  } catch (error) {
    console.error("ITSM import error:", error);
    const message = error instanceof Error ? error.message : "Import failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
