import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Default groups to import for new organizations
const DEFAULT_GROUPS = [
  { name: "Admin", description: "System administrators", type: "assignment" },
  { name: "CAB", description: "Change Advisory Board - reviews and approves changes", type: "approval" },
  { name: "Database", description: "Database administration team", type: "assignment" },
  { name: "DevOps", description: "DevOps and CI/CD team", type: "assignment" },
  { name: "Engineering", description: "Software engineering team", type: "assignment" },
  { name: "Infrastructure", description: "Infrastructure and cloud team", type: "assignment" },
  { name: "On-Call", description: "On-call rotation team", type: "assignment" },
  { name: "Platform", description: "Platform engineering team", type: "assignment" },
  { name: "QA", description: "Quality assurance team", type: "assignment" },
  { name: "Security", description: "Security and compliance team", type: "both" },
  { name: "Network", description: "Network operations team", type: "assignment" },
  { name: "SRE", description: "Site reliability engineering team", type: "assignment" },
];

// POST /api/admin/groups/import-defaults — Import default groups for the org
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if user is admin
  const roles = session.user?.roles as string[] | undefined;
  const isAdmin = roles?.some(r => r === "admin" || r.startsWith("admin_")) || session.user?.isSuperAdmin;
  
  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden: admin access required" }, { status: 403 });
  }

  const orgId = session.user?.orgId || "demo";

  try {
    // Check which groups already exist for this org
    const existingGroups = await prisma.group.findMany({
      where: { orgId },
      select: { name: true },
    });
    const existingNames = new Set(existingGroups.map((g: { name: string }) => g.name.toLowerCase()));

    // Filter out groups that already exist
    const groupsToCreate = DEFAULT_GROUPS.filter(
      (g) => !existingNames.has(g.name.toLowerCase())
    );

    if (groupsToCreate.length === 0) {
      return NextResponse.json({
        message: "All default groups already exist",
        created: 0,
        skipped: DEFAULT_GROUPS.length,
      });
    }

    // Create the groups
    const created = await prisma.group.createMany({
      data: groupsToCreate.map((g) => ({
        name: g.name,
        description: g.description,
        type: g.type,
        orgId,
        isActive: true,
        createdBy: session.user?.email || "system",
      })),
    });

    return NextResponse.json({
      message: `Successfully imported ${created.count} default groups`,
      created: created.count,
      skipped: DEFAULT_GROUPS.length - groupsToCreate.length,
      groups: groupsToCreate.map(g => g.name),
    });
  } catch (error) {
    console.error("Error importing default groups:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
