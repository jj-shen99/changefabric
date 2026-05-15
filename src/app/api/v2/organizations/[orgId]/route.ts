import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ orgId: string }>;
}

// GET /api/v2/organizations/[orgId] - Get organization details (super admin only)
export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!session.user.isSuperAdmin) {
      return NextResponse.json(
        { error: "Forbidden - Super admin access required" },
        { status: 403 }
      );
    }

    const { orgId } = await params;

    const organization = await prisma.organization.findUnique({
      where: { orgId },
    });

    if (!organization) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    // Get stats
    const [userCount, crCount, serviceCount, groupCount] = await Promise.all([
      prisma.user.count({ where: { orgId } }),
      prisma.changeRequest.count({ where: { orgId } }),
      prisma.service.count({ where: { orgId } }),
      prisma.group.count({ where: { orgId } }),
    ]);

    return NextResponse.json({
      ...organization,
      userCount,
      crCount,
      serviceCount,
      groupCount,
    });
  } catch (error) {
    console.error("Error fetching organization:", error);
    return NextResponse.json(
      { error: "Failed to fetch organization" },
      { status: 500 }
    );
  }
}

// PATCH /api/v2/organizations/[orgId] - Update organization (super admin only)
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!session.user.isSuperAdmin) {
      return NextResponse.json(
        { error: "Forbidden - Super admin access required" },
        { status: 403 }
      );
    }

    const { orgId } = await params;
    const body = await request.json();
    const { name, description, isActive } = body;

    const organization = await prisma.organization.findUnique({
      where: { orgId },
    });

    if (!organization) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    const updated = await prisma.organization.update({
      where: { orgId },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating organization:", error);
    return NextResponse.json(
      { error: "Failed to update organization" },
      { status: 500 }
    );
  }
}

// DELETE /api/v2/organizations/[orgId] - Delete organization (super admin only)
export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!session.user.isSuperAdmin) {
      return NextResponse.json(
        { error: "Forbidden - Super admin access required" },
        { status: 403 }
      );
    }

    const { orgId } = await params;

    // Prevent deleting the demo org
    if (orgId === "demo") {
      return NextResponse.json(
        { error: "Cannot delete the demo organization" },
        { status: 400 }
      );
    }

    const organization = await prisma.organization.findUnique({
      where: { orgId },
    });

    if (!organization) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    // Check if org has users
    const userCount = await prisma.user.count({ where: { orgId } });
    if (userCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete organization with ${userCount} users. Remove users first.` },
        { status: 400 }
      );
    }

    // Delete org-specific roles first
    await prisma.role.deleteMany({ where: { orgId } });

    // Delete the organization
    await prisma.organization.delete({ where: { orgId } });

    return NextResponse.json({ message: "Organization deleted successfully" });
  } catch (error) {
    console.error("Error deleting organization:", error);
    return NextResponse.json(
      { error: "Failed to delete organization" },
      { status: 500 }
    );
  }
}
