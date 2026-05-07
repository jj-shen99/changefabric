/**
 * GET /api/v2/workflows — list registered workflow definitions
 *
 * Returned data is read directly from the built-in BUILTIN_WORKFLOWS so the
 * UI can render legal transitions without an extra DB call.
 */
import { NextResponse } from "next/server";
import { BUILTIN_WORKFLOWS } from "@/core";
import { isResponse, requireSession } from "../_helpers";

export async function GET() {
  const ctx = await requireSession();
  if (isResponse(ctx)) return ctx;
  return NextResponse.json({ workflows: BUILTIN_WORKFLOWS });
}
