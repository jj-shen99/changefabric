import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Permissions } from "@/lib/auth-types";

async function requireRoleManagement() {
  const session = await getServerSession(authOptions);
  if (!session) return { error: "Unauthorized", status: 401 };
  
  const permissions = session.user?.permissions as Permissions | undefined;
  const roles = session.user?.roles as string[] | undefined;
  
  // Admin or users with canManageRoles permission can manage roles
  const canManage = roles?.includes("admin") || permissions?.canManageRoles;
  if (!canManage) {
    return { error: "Forbidden: role management access required", status: 403 };
  }
  
  return { session };
}

// Deprecated roles that should not be shown
const DEPRECATED_ROLES = ["viewer", "security_reviewer"];

// GET /api/admin/roles — List all roles
export async function GET() {
  const auth = await requireRoleManagement();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const roles = await prisma.role.findMany({
    where: { 
      isActive: true,
      name: { notIn: DEPRECATED_ROLES },
    },
    orderBy: [{ isSystem: "desc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      displayName: true,
      description: true,
      canManageUsers: true,
      canManageRoles: true,
      canManageChanges: true,
      canApproveChanges: true,
      canImplementChanges: true,
      canManageReleases: true,
      canEditSettings: true,
      canViewMetrics: true,
      canViewAllData: true,
      isSystem: true,
      isActive: true,
      _count: {
        select: { userRoles: true },
      },
    },
  });

  return NextResponse.json({ 
    roles: roles.map(r => ({
      ...r,
      userCount: r._count.userRoles,
      _count: undefined,
    }))
  });
}

// POST /api/admin/roles — Create a new role
export async function POST(request: Request) {
  const auth = await requireRoleManagement();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await request.json();
    const { 
      name, 
      displayName, 
      description,
      canManageUsers = false,
      canManageRoles = false,
      canManageChanges = false,
      canApproveChanges = false,
      canImplementChanges = false,
      canManageReleases = false,
      canEditSettings = false,
      canViewMetrics = false,
      canViewAllData = false,
    } = body;

    if (!name || !displayName) {
      return NextResponse.json({ error: "name and displayName are required" }, { status: 400 });
    }

    // Check if role name already exists
    const existing = await prisma.role.findUnique({ where: { name } });
    if (existing) {
      return NextResponse.json({ error: "A role with this name already exists" }, { status: 409 });
    }

    const role = await prisma.role.create({
      data: {
        name,
        displayName,
        description,
        canManageUsers,
        canManageRoles,
        canManageChanges,
        canApproveChanges,
        canImplementChanges,
        canManageReleases,
        canEditSettings,
        canViewMetrics,
        canViewAllData,
        isSystem: false,
      },
    });

    return NextResponse.json({ role }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT /api/admin/roles — Update a role
export async function PUT(request: Request) {
  const auth = await requireRoleManagement();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await request.json();
    const { 
      id,
      displayName, 
      description,
      canManageUsers,
      canManageRoles,
      canManageChanges,
      canApproveChanges,
      canImplementChanges,
      canManageReleases,
      canEditSettings,
      canViewMetrics,
      canViewAllData,
    } = body;

    if (!id) {
      return NextResponse.json({ error: "Role ID is required" }, { status: 400 });
    }

    const role = await prisma.role.findUnique({ where: { id } });
    if (!role) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }

    // System roles can only have their displayName and description updated
    const updateData: Record<string, unknown> = {};
    if (displayName !== undefined) updateData.displayName = displayName;
    if (description !== undefined) updateData.description = description;

    // Only allow permission updates for non-system roles
    if (!role.isSystem) {
      if (canManageUsers !== undefined) updateData.canManageUsers = canManageUsers;
      if (canManageRoles !== undefined) updateData.canManageRoles = canManageRoles;
      if (canManageChanges !== undefined) updateData.canManageChanges = canManageChanges;
      if (canApproveChanges !== undefined) updateData.canApproveChanges = canApproveChanges;
      if (canImplementChanges !== undefined) updateData.canImplementChanges = canImplementChanges;
      if (canManageReleases !== undefined) updateData.canManageReleases = canManageReleases;
      if (canEditSettings !== undefined) updateData.canEditSettings = canEditSettings;
      if (canViewMetrics !== undefined) updateData.canViewMetrics = canViewMetrics;
      if (canViewAllData !== undefined) updateData.canViewAllData = canViewAllData;
    }

    const updated = await prisma.role.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ role: updated });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/admin/roles — Delete a role (non-system only)
export async function DELETE(request: Request) {
  const auth = await requireRoleManagement();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Role ID is required" }, { status: 400 });
    }

    const role = await prisma.role.findUnique({ where: { id } });
    if (!role) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }

    if (role.isSystem) {
      return NextResponse.json({ error: "System roles cannot be deleted" }, { status: 400 });
    }

    // Check if any users have this role
    const userCount = await prisma.userRole.count({ where: { roleId: id } });
    if (userCount > 0) {
      return NextResponse.json({ 
        error: `Cannot delete role: ${userCount} user(s) still have this role assigned` 
      }, { status: 400 });
    }

    await prisma.role.delete({ where: { id } });

    return NextResponse.json({ message: "Role deleted" });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
