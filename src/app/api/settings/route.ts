/**
 * GET  /api/settings?category=<category>  — get settings by category
 * POST /api/settings  — update a setting
 *   Body: { key: string, value: string, category?: string }
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  badRequest,
  forbidden,
  isResponse,
  requireSession,
  serverError,
} from "../v2/_helpers";

export async function GET(request: Request) {
  const ctx = await requireSession();
  if (isResponse(ctx)) return ctx;

  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");

  try {
    const where = category ? { category } : {};
    const settings = await prisma.systemSetting.findMany({
      where,
      orderBy: { key: "asc" },
    });

    // Convert to key-value map
    const settingsMap: Record<string, string> = {};
    settings.forEach((s) => {
      settingsMap[s.key] = s.value;
    });

    return NextResponse.json({ settings: settingsMap });
  } catch (err) {
    return serverError(err);
  }
}

export async function POST(request: Request) {
  const ctx = await requireSession();
  if (isResponse(ctx)) return ctx;

  // Only admins can update settings
  if (!ctx.perms.canEditSettings) {
    return forbidden();
  }

  let body: { key?: string; value?: string; category?: string };
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body");
  }

  if (!body.key || body.value === undefined) {
    return badRequest("Missing 'key' or 'value'");
  }

  try {
    const setting = await prisma.systemSetting.upsert({
      where: { key: body.key },
      update: {
        value: body.value,
        category: body.category ?? "general",
        updatedBy: ctx.email,
      },
      create: {
        key: body.key,
        value: body.value,
        category: body.category ?? "general",
        updatedBy: ctx.email,
      },
    });

    return NextResponse.json({ setting });
  } catch (err) {
    return serverError(err);
  }
}
