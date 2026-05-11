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
  
  // Admin or users with canManageUsers/canManageRoles permission can assign roles
  const canManage = roles?.includes("admin") || 
                    permissions?.canManageUsers || 
                    permissions?.canManageRoles;
  if (!canManage) {
    return { error: "Forbidden: role assignment access required", status: 403 };
  }
  
  return { session };
}

// GET /api/admin/users/roles?userId=xxx — Get roles for a specific user
export async function GET(request: Request) {
  const auth = await requireRoleManagement();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      userRoles: {
        include: {
          role: {
            select: {
              id: true,
              name: true,
              displayName: true,
              description: true,
              isSystem: true,
            },
          },
        },
      },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({
    userId: user.id,
    email: user.email,
    name: user.name,
    roles: user.userRoles.map(ur => ({
      id: ur.role.id,
      name: ur.role.name,
      displayName: ur.role.displayName,
      description: ur.role.description,
      isSystem: ur.role.isSystem,
      assignedAt: ur.assignedAt,
      assignedBy: ur.assignedBy,
    })),
  });
}

// POST /api/admin/users/roles — Assign a role to a user
export async function POST(request: Request) {
  const auth = await requireRoleManagement();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { userId, roleId } = await request.json();

    if (!userId || !roleId) {
      return NextResponse.json({ error: "userId and roleId are required" }, { status: 400 });
    }

    // Verify user exists
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Verify role exists
    const role = await prisma.role.findUnique({ where: { id: roleId } });
    if (!role) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }

    // Check if current user is admin
    const currentUserRoles = auth.session.user?.roles as string[] | undefined;
    const isCurrentUserAdmin = currentUserRoles?.includes("admin");

    // Non-admins cannot assign admin role
    if (!isCurrentUserAdmin && role.name === "admin") {
      return NextResponse.json({ error: "Only admins can assign the admin role" }, { status: 403 });
    }

    // Non-admins cannot modify admin users
    if (!isCurrentUserAdmin) {
      const targetUserRoles = await prisma.userRole.findMany({
        where: { userId },
        include: { role: true },
      });
      const targetIsAdmin = targetUserRoles.some(ur => ur.role.name === "admin");
      if (targetIsAdmin) {
        return NextResponse.json({ error: "Only admins can modify admin user roles" }, { status: 403 });
      }
    }

    // Check if already assigned
    const existing = await prisma.userRole.findUnique({
      where: { userId_roleId: { userId, roleId } },
    });
    if (existing) {
      return NextResponse.json({ error: "User already has this role" }, { status: 409 });
    }

    // Assign the role
    const userRole = await prisma.userRole.create({
      data: {
        userId,
        roleId,
        assignedBy: auth.session.user.email,
      },
      include: {
        role: {
          select: {
            id: true,
            name: true,
            displayName: true,
          },
        },
      },
    });

    return NextResponse.json({
      message: `Role "${role.displayName}" assigned to user`,
      userRole: {
        roleId: userRole.roleId,
        roleName: userRole.role.name,
        roleDisplayName: userRole.role.displayName,
        assignedAt: userRole.assignedAt,
        assignedBy: userRole.assignedBy,
      },
    }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/admin/users/roles — Remove a role from a user
export async function DELETE(request: Request) {
  const auth = await requireRoleManagement();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const roleId = searchParams.get("roleId");

    if (!userId || !roleId) {
      return NextResponse.json({ error: "userId and roleId are required" }, { status: 400 });
    }

    // Prevent removing admin role from self
    if (auth.session.user.id === userId) {
      const role = await prisma.role.findUnique({ where: { id: roleId } });
      if (role?.name === "admin") {
        return NextResponse.json({ error: "You cannot remove your own admin role" }, { status: 400 });
      }
    }

    // Check if assignment exists
    const userRole = await prisma.userRole.findUnique({
      where: { userId_roleId: { userId, roleId } },
      include: { role: true },
    });
    if (!userRole) {
      return NextResponse.json({ error: "User does not have this role" }, { status: 404 });
    }

    // Check if this is the user's only role
    const roleCount = await prisma.userRole.count({ where: { userId } });
    if (roleCount <= 1) {
      return NextResponse.json({ error: "Cannot remove the user's only role" }, { status: 400 });
    }

    // Remove the role
    await prisma.userRole.delete({
      where: { userId_roleId: { userId, roleId } },
    });

    return NextResponse.json({ 
      message: `Role "${userRole.role.displayName}" removed from user` 
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT /api/admin/users/roles — Replace all roles for a user
export async function PUT(request: Request) {
  const auth = await requireRoleManagement();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { userId, roleIds } = await request.json();

    if (!userId || !Array.isArray(roleIds)) {
      return NextResponse.json({ error: "userId and roleIds array are required" }, { status: 400 });
    }

    if (roleIds.length === 0) {
      return NextResponse.json({ error: "User must have at least one role" }, { status: 400 });
    }

    // Verify user exists
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Verify all roles exist
    const roles = await prisma.role.findMany({
      where: { id: { in: roleIds } },
    });
    if (roles.length !== roleIds.length) {
      return NextResponse.json({ error: "One or more roles not found" }, { status: 404 });
    }

    // Check if current user is admin
    const currentUserRoles = auth.session.user?.roles as string[] | undefined;
    const isCurrentUserAdmin = currentUserRoles?.includes("admin");

    // Non-admins cannot assign or remove admin role
    if (!isCurrentUserAdmin) {
      const adminRole = roles.find(r => r.name === "admin");
      if (adminRole) {
        return NextResponse.json({ error: "Only admins can assign the admin role" }, { status: 403 });
      }
      // Check if target user currently has admin role - non-admins can't modify admin users
      const targetUserRoles = await prisma.userRole.findMany({
        where: { userId },
        include: { role: true },
      });
      const targetIsAdmin = targetUserRoles.some(ur => ur.role.name === "admin");
      if (targetIsAdmin) {
        return NextResponse.json({ error: "Only admins can modify admin user roles" }, { status: 403 });
      }
    }

    // If removing admin role from self, prevent it
    if (auth.session.user.id === userId) {
      const currentRoles = await prisma.userRole.findMany({
        where: { userId },
        include: { role: true },
      });
      const hadAdmin = currentRoles.some(ur => ur.role.name === "admin");
      const willHaveAdmin = roles.some(r => r.name === "admin");
      if (hadAdmin && !willHaveAdmin) {
        return NextResponse.json({ error: "You cannot remove your own admin role" }, { status: 400 });
      }
    }

    // Transaction: delete all existing roles and add new ones
    await prisma.$transaction([
      prisma.userRole.deleteMany({ where: { userId } }),
      prisma.userRole.createMany({
        data: roleIds.map((roleId: string) => ({
          userId,
          roleId,
          assignedBy: auth.session.user.email,
        })),
      }),
    ]);

    // Fetch updated roles
    const updatedRoles = await prisma.userRole.findMany({
      where: { userId },
      include: {
        role: {
          select: {
            id: true,
            name: true,
            displayName: true,
          },
        },
      },
    });

    return NextResponse.json({
      message: "User roles updated",
      roles: updatedRoles.map(ur => ({
        id: ur.role.id,
        name: ur.role.name,
        displayName: ur.role.displayName,
        assignedAt: ur.assignedAt,
        assignedBy: ur.assignedBy,
      })),
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
