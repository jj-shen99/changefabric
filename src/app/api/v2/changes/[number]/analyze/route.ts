/**
 * GET /api/v2/changes/:number/analyze
 * Returns deterministic impact analysis + ML risk scoring for a CR.
 */
import { NextResponse } from "next/server";
import { getChangeRequestService } from "@/core";
import { isResponse, notFound, requireSession, serverError } from "../../../_helpers";

export async function GET(
  _req: Request,
  { params }: { params: { number: string } }
) {
  const ctx = await requireSession();
  if (isResponse(ctx)) return ctx;
  try {
    const svc = getChangeRequestService();
    const cr = await svc.get(params.number);
    if (!cr) return notFound();
    const out = await svc.analyze(params.number);
    return NextResponse.json({ number: cr.number, ...out });
  } catch (err) {
    return serverError(err);
  }
}
