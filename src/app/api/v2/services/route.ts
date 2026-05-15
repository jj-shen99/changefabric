import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface ServiceRow {
  id: string;
  name: string;
  displayName: string;
  category: string;
  criticality: string;
  orgId: string;
}

/**
 * GET /api/v2/services
 * List all active services (filtered by org unless super admin)
 * Query params: ?search=term
 */
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const isSuperAdmin = session?.user?.isSuperAdmin || false;
    const orgId = session?.user?.orgId || "demo";
    
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";

    // Use raw SQL to avoid Prisma client model issues
    let services: ServiceRow[];
    if (search) {
      const searchPattern = `%${search}%`;
      if (isSuperAdmin) {
        services = await prisma.$queryRaw<ServiceRow[]>`
          SELECT id, name, displayName, category, criticality, orgId 
          FROM Service 
          WHERE isActive = 1 
            AND (name LIKE ${searchPattern} OR displayName LIKE ${searchPattern})
          ORDER BY displayName ASC
        `;
      } else {
        services = await prisma.$queryRaw<ServiceRow[]>`
          SELECT id, name, displayName, category, criticality, orgId 
          FROM Service 
          WHERE isActive = 1 
            AND orgId = ${orgId}
            AND (name LIKE ${searchPattern} OR displayName LIKE ${searchPattern})
          ORDER BY displayName ASC
        `;
      }
    } else {
      if (isSuperAdmin) {
        services = await prisma.$queryRaw<ServiceRow[]>`
          SELECT id, name, displayName, category, criticality, orgId 
          FROM Service 
          WHERE isActive = 1 
          ORDER BY displayName ASC
        `;
      } else {
        services = await prisma.$queryRaw<ServiceRow[]>`
          SELECT id, name, displayName, category, criticality, orgId 
          FROM Service 
          WHERE isActive = 1 AND orgId = ${orgId}
          ORDER BY displayName ASC
        `;
      }
    }

    return NextResponse.json(services);
  } catch (e) {
    console.error("Error fetching services:", e);
    return NextResponse.json({ error: "Failed to fetch services" }, { status: 500 });
  }
}
