import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/admin/orgs — List all organizations (super admin only)
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only super admin can list all organizations
  const isSuperAdmin = session.user?.isSuperAdmin || false;
  if (!isSuperAdmin) {
    return NextResponse.json({ error: "Forbidden: only super admin can list organizations" }, { status: 403 });
  }

  try {
    const orgs = await prisma.organization.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        isActive: true,
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ organizations: orgs });
  } catch (error) {
    console.error("Error fetching organizations:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
