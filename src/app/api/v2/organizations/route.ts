import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/v2/organizations - List all organizations (super admin only)
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is super admin
    if (!session.user.isSuperAdmin) {
      return NextResponse.json(
        { error: "Forbidden - Super admin access required" },
        { status: 403 }
      );
    }

    const organizations = await prisma.organization.findMany({
      orderBy: { createdAt: "desc" },
    });

    // Get user counts per org
    const orgStats = await Promise.all(
      organizations.map(async (org) => {
        const userCount = await prisma.user.count({
          where: { orgId: org.orgId },
        });
        const crCount = await prisma.changeRequest.count({
          where: { orgId: org.orgId },
        });
        return {
          ...org,
          userCount,
          crCount,
        };
      })
    );

    return NextResponse.json(orgStats);
  } catch (error) {
    console.error("Error fetching organizations:", error);
    return NextResponse.json(
      { error: "Failed to fetch organizations" },
      { status: 500 }
    );
  }
}

// POST /api/v2/organizations - Create a new organization (super admin only)
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is super admin
    if (!session.user.isSuperAdmin) {
      return NextResponse.json(
        { error: "Forbidden - Super admin access required" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { orgId, name, description } = body;

    if (!orgId || !name) {
      return NextResponse.json(
        { error: "Organization ID and name are required" },
        { status: 400 }
      );
    }

    // Validate orgId format (alphanumeric, lowercase, hyphens allowed)
    if (!/^[a-z0-9-]+$/.test(orgId)) {
      return NextResponse.json(
        { error: "Organization ID must be lowercase alphanumeric with hyphens only" },
        { status: 400 }
      );
    }

    // Check if orgId already exists
    const existing = await prisma.organization.findUnique({
      where: { orgId },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Organization ID already exists" },
        { status: 409 }
      );
    }

    const organization = await prisma.organization.create({
      data: {
        orgId,
        name,
        description: description || "",
        isActive: true,
      },
    });

    // Create default roles for the new organization
    const defaultRoles = [
      {
        name: `admin_${orgId}`,
        displayName: "Administrator",
        description: `Administrator for ${name}`,
        orgId,
        canManageUsers: true,
        canManageRoles: true,
        canManageChanges: true,
        canApproveChanges: true,
        canImplementChanges: true,
        canManageReleases: true,
        canEditSettings: true,
        canViewMetrics: true,
        canViewAllData: true,
        isSuperAdmin: false,
        isSystem: true,
      },
      {
        name: `change_manager_${orgId}`,
        displayName: "Change Manager",
        description: `Change Manager for ${name}`,
        orgId,
        canManageUsers: false,
        canManageRoles: false,
        canManageChanges: true,
        canApproveChanges: true,
        canImplementChanges: true,
        canManageReleases: true,
        canEditSettings: false,
        canViewMetrics: true,
        canViewAllData: true,
        isSuperAdmin: false,
        isSystem: true,
      },
      {
        name: `requester_${orgId}`,
        displayName: "Requester",
        description: `Requester for ${name}`,
        orgId,
        canManageUsers: false,
        canManageRoles: false,
        canManageChanges: true,
        canApproveChanges: false,
        canImplementChanges: false,
        canManageReleases: false,
        canEditSettings: false,
        canViewMetrics: false,
        canViewAllData: false,
        isSuperAdmin: false,
        isSystem: true,
      },
    ];

    for (const role of defaultRoles) {
      await prisma.role.create({ data: role });
    }

    return NextResponse.json(organization, { status: 201 });
  } catch (error) {
    console.error("Error creating organization:", error);
    return NextResponse.json(
      { error: "Failed to create organization" },
      { status: 500 }
    );
  }
}
