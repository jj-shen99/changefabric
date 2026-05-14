import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface ServiceRow {
  id: string;
  name: string;
  displayName: string;
  category: string;
  criticality: string;
}

/**
 * GET /api/v2/services
 * List all active services (public endpoint for autocomplete)
 * Query params: ?search=term
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";

    // Use raw SQL to avoid Prisma client model issues
    let services: ServiceRow[];
    if (search) {
      const searchPattern = `%${search}%`;
      services = await prisma.$queryRaw<ServiceRow[]>`
        SELECT id, name, displayName, category, criticality 
        FROM Service 
        WHERE isActive = 1 
          AND (name LIKE ${searchPattern} OR displayName LIKE ${searchPattern})
        ORDER BY displayName ASC
      `;
    } else {
      services = await prisma.$queryRaw<ServiceRow[]>`
        SELECT id, name, displayName, category, criticality 
        FROM Service 
        WHERE isActive = 1 
        ORDER BY displayName ASC
      `;
    }

    return NextResponse.json(services);
  } catch (e) {
    console.error("Error fetching services:", e);
    return NextResponse.json({ error: "Failed to fetch services" }, { status: 500 });
  }
}
