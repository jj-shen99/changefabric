import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface GroupRow {
  id: string;
  name: string;
  description: string;
  type: string;
}

/**
 * GET /api/v2/groups
 * List all active assignment groups (public endpoint for autocomplete)
 * Query params: ?search=term&type=assignment|approver|both
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const type = searchParams.get("type") || "assignment"; // default to assignment groups

    // Use raw SQL to fetch groups
    let groups: GroupRow[];
    if (search) {
      const searchPattern = `%${search}%`;
      if (type === "all") {
        groups = await prisma.$queryRaw<GroupRow[]>`
          SELECT id, name, description, type 
          FROM "Group" 
          WHERE isActive = 1 
            AND name LIKE ${searchPattern}
          ORDER BY name ASC
        `;
      } else {
        groups = await prisma.$queryRaw<GroupRow[]>`
          SELECT id, name, description, type 
          FROM "Group" 
          WHERE isActive = 1 
            AND (type = ${type} OR type = 'both')
            AND name LIKE ${searchPattern}
          ORDER BY name ASC
        `;
      }
    } else {
      if (type === "all") {
        groups = await prisma.$queryRaw<GroupRow[]>`
          SELECT id, name, description, type 
          FROM "Group" 
          WHERE isActive = 1 
          ORDER BY name ASC
        `;
      } else {
        groups = await prisma.$queryRaw<GroupRow[]>`
          SELECT id, name, description, type 
          FROM "Group" 
          WHERE isActive = 1 
            AND (type = ${type} OR type = 'both')
          ORDER BY name ASC
        `;
      }
    }

    return NextResponse.json(groups);
  } catch (e) {
    console.error("Error fetching groups:", e);
    return NextResponse.json({ error: "Failed to fetch groups" }, { status: 500 });
  }
}
