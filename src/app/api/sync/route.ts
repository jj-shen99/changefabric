/**
 * Legacy /api/sync endpoint — DEPRECATED.
 *
 * The application is now standalone and no longer refreshes change requests
 * from an external ITSM instance by default. Use the optional ITSM plugin
 * (src/lib/integrations/servicenow) explicitly if you want to import data,
 * or POST to /api/v2/changes to create CRs in the new generic schema.
 */
import { NextResponse } from "next/server";

const DISABLED_PAYLOAD = {
  error: "ITSM sync is disabled in this build.",
  message:
    "This application no longer pulls change requests from an external ITSM instance. " +
    "Use POST /api/v2/changes to create CRs natively, or enable the ITSM " +
    "plugin under src/lib/integrations/servicenow.",
  alternativeEndpoints: ["/api/v2/changes", "/api/v2/changes/:number/transitions"],
} as const;

export async function POST() {
  return NextResponse.json(DISABLED_PAYLOAD, { status: 410 });
}
export async function GET() {
  return NextResponse.json(DISABLED_PAYLOAD, { status: 410 });
}
