import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, isResponse, serverError } from "../../v2/_helpers";

/**
 * GET /api/groups/search
 * Search groups for autocomplete (any authenticated user)
 * Query params: ?q=<search_term>&type=approver|assignment|both&limit=10
 */
export async function GET(request: Request) {
  const ctx = await requireSession();
  if (isResponse(ctx)) return ctx;

  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") || "";
    const type = searchParams.get("type");
    const limit = Math.min(parseInt(searchParams.get("limit") || "10"), 50);

    // Build where clause
    const where: {
      isActive: boolean;
      type?: string | { in: string[] };
      name?: { contains: string };
    } = {
      isActive: true,
    };

    // For "approver" type, also include "both" type groups
    // For "assignment" type, also include "both" type groups
    if (type === "approver") {
      where.type = { in: ["approver", "both"] };
    } else if (type === "assignment") {
      where.type = { in: ["assignment", "both"] };
    } else if (type) {
      where.type = type;
    }
    if (q.trim()) where.name = { contains: q.trim() };

    const groups = await prisma.group.findMany({
      where,
      select: {
        id: true,
        name: true,
        description: true,
        type: true,
      },
      orderBy: { name: "asc" },
      take: limit,
    });

    return NextResponse.json({ groups });
  } catch (err) {
    return serverError(err);
  }
}
