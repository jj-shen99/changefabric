import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/v2/services
 * List all active services (public endpoint for autocomplete)
 * Query params: ?search=term
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";

    const services = await prisma.service.findMany({
      where: {
        isActive: true,
        ...(search && {
          OR: [
            { name: { contains: search } },
            { displayName: { contains: search } },
          ],
        }),
      },
      orderBy: { displayName: "asc" },
      select: {
        id: true,
        name: true,
        displayName: true,
        category: true,
        criticality: true,
      },
    });

    return NextResponse.json(services);
  } catch (e) {
    console.error("Error fetching services:", e);
    return NextResponse.json({ error: "Failed to fetch services" }, { status: 500 });
  }
}
