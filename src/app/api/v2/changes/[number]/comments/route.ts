/**
 * GET  /api/v2/changes/:number/comments
 * POST /api/v2/changes/:number/comments  Body: { body, visibility? }
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PrismaChangeRequestRepository } from "@/core/adapters/prisma-repository";
import { getChangeRequestService } from "@/core";
import { badRequest, isResponse, requireSession, serverError } from "../../../_helpers";

export async function GET(
  _req: Request,
  { params }: { params: { number: string } }
) {
  const ctx = await requireSession();
  if (isResponse(ctx)) return ctx;
  try {
    const repo = new PrismaChangeRequestRepository(prisma);
    return NextResponse.json({ comments: await repo.listComments(params.number) });
  } catch (err) {
    return serverError(err);
  }
}

export async function POST(
  request: Request,
  { params }: { params: { number: string } }
) {
  const ctx = await requireSession();
  if (isResponse(ctx)) return ctx;
  let body: { body?: string; visibility?: "public" | "internal" };
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body");
  }
  if (!body.body) return badRequest("Missing 'body'");
  try {
    const c = await getChangeRequestService().addComment(
      { actor: ctx.email, actorRole: ctx.primaryRole },
      params.number,
      body.body,
      body.visibility ?? "public"
    );
    return NextResponse.json(c, { status: 201 });
  } catch (err) {
    return serverError(err);
  }
}
