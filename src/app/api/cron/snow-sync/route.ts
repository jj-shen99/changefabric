import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";
import { syncChangeRequests } from "@/lib/integrations/servicenow";

/**
 * GET /api/cron/snow-sync
 * 
 * Cron endpoint to automatically sync change requests from external ITSM.
 * This should be called by an external scheduler (e.g., cron job, Vercel cron, etc.)
 * 
 * Security: Requires CRON_SECRET header to match the CRON_SECRET env var.
 * If CRON_SECRET is not set, the endpoint is disabled.
 * 
 * The endpoint checks all organizations with auto-sync enabled and syncs
 * those that are due based on their configured interval.
 */
export async function GET(request: Request) {
  // Verify cron secret
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json(
      { error: "Cron endpoint is disabled. Set CRON_SECRET env var to enable." },
      { status: 503 }
    );
  }

  const authHeader = request.headers.get("authorization");
  const providedSecret = authHeader?.replace("Bearer ", "");

  if (providedSecret !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Find all organizations with auto-sync enabled
    const orgs = await prisma.organization.findMany({
      where: {
        snowSyncEnabled: true,
        snowInstance: { not: null },
        snowUsername: { not: null },
        snowPassword: { not: null },
        enableCRImport: true,
      },
      select: {
        orgId: true,
        name: true,
        snowInstance: true,
        snowUsername: true,
        snowPassword: true,
        snowSyncIntervalHours: true,
        snowSyncDays: true,
        snowLastSyncAt: true,
      },
    });

    const results: Array<{
      orgId: string;
      status: "synced" | "skipped" | "error";
      message: string;
      details?: unknown;
    }> = [];

    const now = new Date();

    for (const org of orgs) {
      // Check if sync is due
      if (org.snowLastSyncAt) {
        const hoursSinceLastSync =
          (now.getTime() - org.snowLastSyncAt.getTime()) / (1000 * 60 * 60);
        
        if (hoursSinceLastSync < org.snowSyncIntervalHours) {
          results.push({
            orgId: org.orgId,
            status: "skipped",
            message: `Next sync in ${Math.ceil(org.snowSyncIntervalHours - hoursSinceLastSync)} hours`,
          });
          continue;
        }
      }

      // Decrypt credentials
      const instance = org.snowInstance!;
      const username = decrypt(org.snowUsername!);
      const password = decrypt(org.snowPassword!);

      try {
        // Perform sync
        const syncResult = await syncChangeRequests(prisma, {
          instance,
          user: username,
          password,
          days: org.snowSyncDays,
          syncedBy: "auto-sync",
          orgId: org.orgId,
        });

        // Update last sync info
        await prisma.organization.update({
          where: { orgId: org.orgId },
          data: {
            snowLastSyncAt: now,
            snowLastSyncBy: "auto-sync",
            snowLastSyncResult: JSON.stringify({
              success: true,
              fetched: syncResult.fetched,
              upserted: syncResult.upserted,
              errors: syncResult.errors,
              timestamp: now.toISOString(),
            }),
          },
        });

        results.push({
          orgId: org.orgId,
          status: "synced",
          message: `Synced ${syncResult.upserted} CRs`,
          details: {
            fetched: syncResult.fetched,
            upserted: syncResult.upserted,
            errors: syncResult.errors,
          },
        });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);

        // Update last sync with error
        await prisma.organization.update({
          where: { orgId: org.orgId },
          data: {
            snowLastSyncAt: now,
            snowLastSyncBy: "auto-sync",
            snowLastSyncResult: JSON.stringify({
              success: false,
              error: errorMessage,
              timestamp: now.toISOString(),
            }),
          },
        });

        results.push({
          orgId: org.orgId,
          status: "error",
          message: errorMessage,
        });
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      organizations: results,
      summary: {
        total: orgs.length,
        synced: results.filter((r) => r.status === "synced").length,
        skipped: results.filter((r) => r.status === "skipped").length,
        errors: results.filter((r) => r.status === "error").length,
      },
    });
  } catch (err) {
    console.error("Cron sync error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Sync failed" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/cron/snow-sync
 * 
 * Manually trigger sync using saved ITSM credentials.
 * Finds any organization with saved credentials and syncs.
 */
export async function POST() {
  // Find any org with saved ITSM credentials
  const org = await prisma.organization.findFirst({
    where: {
      snowInstance: { not: null },
      snowUsername: { not: null },
      snowPassword: { not: null },
      enableCRImport: true,
    },
    select: {
      orgId: true,
      enableCRImport: true,
      snowInstance: true,
      snowUsername: true,
      snowPassword: true,
      snowSyncDays: true,
    },
  });

  if (!org) {
    return NextResponse.json(
      { error: "ITSM credentials not configured. Please set up credentials first." },
      { status: 400 }
    );
  }

  // Credentials already validated by the query - just double-check
  if (!org.snowInstance || !org.snowUsername || !org.snowPassword) {
    return NextResponse.json(
      { error: "ITSM credentials not configured. Please set up credentials first." },
      { status: 400 }
    );
  }

  try {
    // Decrypt credentials
    const instance = org.snowInstance;
    const username = decrypt(org.snowUsername);
    const password = decrypt(org.snowPassword);

    // Perform sync
    const syncResult = await syncChangeRequests(prisma, {
      instance,
      user: username,
      password,
      days: org.snowSyncDays,
      syncedBy: "manual-sync",
      orgId: org.orgId,
    });

    const now = new Date();

    // Update last sync info
    await prisma.organization.update({
      where: { orgId: org.orgId },
      data: {
        snowLastSyncAt: now,
        snowLastSyncBy: "manual-sync",
        snowLastSyncResult: JSON.stringify({
          success: true,
          fetched: syncResult.fetched,
          upserted: syncResult.upserted,
          errors: syncResult.errors,
          timestamp: now.toISOString(),
        }),
      },
    });

    return NextResponse.json({
      success: true,
      message: `Synced ${syncResult.upserted} change requests`,
      details: {
        fetched: syncResult.fetched,
        upserted: syncResult.upserted,
        errors: syncResult.errors,
        errorDetails: syncResult.errorDetails.slice(0, 10),
      },
    });
  } catch (err) {
    console.error("Manual sync error:", err);
    const errorMessage = err instanceof Error ? err.message : "Sync failed";

    // Update last sync with error
    await prisma.organization.update({
      where: { orgId: org.orgId },
      data: {
        snowLastSyncAt: new Date(),
        snowLastSyncBy: "manual-sync",
        snowLastSyncResult: JSON.stringify({
          success: false,
          error: errorMessage,
          timestamp: new Date().toISOString(),
        }),
      },
    });

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
