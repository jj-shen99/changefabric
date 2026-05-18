import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Permissions } from "@/lib/auth-types";

async function requireUserManagement() {
  const session = await getServerSession(authOptions);
  if (!session) return { error: "Unauthorized", status: 401 };
  
  const permissions = session.user?.permissions as Permissions | undefined;
  const roles = session.user?.roles as string[] | undefined;
  
  // Admin, super admin, or users with canManageUsers or canManageRoles permission can view/manage users
  const isSuperAdmin = session.user?.isSuperAdmin || false;
  const canManage = isSuperAdmin ||
                    roles?.includes("admin") || 
                    permissions?.canManageUsers || 
                    permissions?.canManageRoles;
  if (!canManage) {
    return { error: "Forbidden: user management access required", status: 403 };
  }
  
  return { session };
}

// GET /api/admin/users — List all users with their roles
export async function GET() {
  const auth = await requireUserManagement();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const currentUserRoles = auth.session.user?.roles as string[] | undefined;
  const isSuperAdmin = auth.session.user?.isSuperAdmin || false;
  const isCurrentUserAdmin = isSuperAdmin || currentUserRoles?.includes("admin");
  const userOrgId = auth.session.user?.orgId || "demo";

  const users = await prisma.user.findMany({
    where: isSuperAdmin ? {} : { orgId: userOrgId },
    select: {
      id: true,
      email: true,
      name: true,
      orgId: true,
      createdAt: true,
      updatedAt: true,
      userRoles: {
        include: {
          role: {
            select: {
              id: true,
              name: true,
              displayName: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Get all org names for mapping (use orgId, not id)
  const orgs = await prisma.organization.findMany({
    select: { orgId: true, name: true },
  });
  const orgMap = new Map(orgs.map(o => [o.orgId, o.name]));

  // Filter out admin users for non-admin viewers
  const filteredUsers = isCurrentUserAdmin 
    ? users 
    : users.filter(u => !u.userRoles.some(ur => ur.role.name === "admin"));

  return NextResponse.json({ 
    users: filteredUsers.map(u => ({
      id: u.id,
      email: u.email,
      name: u.name,
      orgId: u.orgId,
      orgName: orgMap.get(u.orgId) || u.orgId,
      createdAt: u.createdAt.toISOString(),
      updatedAt: u.updatedAt.toISOString(),
      roles: u.userRoles.map(ur => ({
        id: ur.role.id,
        name: ur.role.name,
        displayName: ur.role.displayName,
      })),
    }))
  });
}

// POST /api/admin/users — Create a new user (super admin only)
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only super admin can create users
  const isSuperAdmin = session.user?.isSuperAdmin || false;
  if (!isSuperAdmin) {
    return NextResponse.json({ error: "Forbidden: only super admin can create users" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { email, name, orgId, roleIds } = body;

    // Validate required fields
    if (!email || !name || !orgId) {
      return NextResponse.json({ error: "Email, name, and organization are required" }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ error: "A user with this email already exists" }, { status: 400 });
    }

    // Verify org exists (orgId is the unique identifier, not id)
    const org = await prisma.organization.findUnique({ where: { orgId } });
    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 400 });
    }

    // Generate a temporary password (user will need to reset via forgot password flow)
    // In production, this should trigger an email with a reset link
    const tempPassword = `temp_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const bcrypt = await import("bcryptjs");
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    // Ensure default groups exist for the org
    const existingGroups = await prisma.group.count({ where: { orgId } });
    if (existingGroups === 0) {
      const defaultGroupNames = [
        { name: "Change Advisory Board", description: "Reviews and approves change requests", type: "approver" },
        { name: "IT Operations", description: "Implements and monitors changes", type: "assignment" },
        { name: "Development Team", description: "Develops and tests changes", type: "assignment" },
        { name: "Security Team", description: "Reviews security implications", type: "approver" },
        { name: "Infrastructure Team", description: "Manages infrastructure changes", type: "both" },
      ];
      
      for (const g of defaultGroupNames) {
        await prisma.group.create({
          data: { ...g, orgId, createdBy: "system" },
        });
      }
    }

    // Ensure default services exist for the org
    const existingServices = await prisma.service.count({ where: { orgId } });
    if (existingServices === 0) {
      const defaultServiceNames = [
        { name: "core-app", displayName: "Core Application", description: "Main business application", category: "application" },
        { name: "database", displayName: "Database Services", description: "Database infrastructure", category: "database" },
        { name: "network", displayName: "Network Services", description: "Network infrastructure", category: "network" },
        { name: "security", displayName: "Security Services", description: "Security infrastructure", category: "security" },
        { name: "cloud", displayName: "Cloud Infrastructure", description: "Cloud platform services", category: "infrastructure" },
      ];
      
      for (const s of defaultServiceNames) {
        await prisma.service.create({
          data: { ...s, orgId, createdBy: "system" },
        });
      }
    }

    // Create user with optional roles
    const user = await prisma.user.create({
      data: {
        email,
        name,
        orgId,
        hashedPassword,
        userRoles: roleIds && roleIds.length > 0 ? {
          create: (roleIds as string[]).map((roleId: string) => ({ roleId })),
        } : undefined,
      },
      include: {
        userRoles: {
          include: {
            role: {
              select: {
                id: true,
                name: true,
                displayName: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({
      message: "User created successfully. User should use 'Forgot Password' to set their password.",
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        orgId: user.orgId,
        orgName: org.name,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
        roles: user.userRoles.map((ur: { role: { id: string; name: string; displayName: string } }) => ({
          id: ur.role.id,
          name: ur.role.name,
          displayName: ur.role.displayName,
        })),
      },
    }, { status: 201 });
  } catch (error) {
    console.error("Error creating user:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/admin/users — Delete a user
export async function DELETE(request: Request) {
  const auth = await requireUserManagement();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("id");

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    // Prevent self-deletion
    if (userId === auth.session.user.id) {
      return NextResponse.json({ error: "You cannot delete your own account" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check org access - admin can only delete users in their own org (unless super admin)
    const isSuperAdmin = auth.session.user?.isSuperAdmin || false;
    const userOrgId = auth.session.user?.orgId || "demo";
    if (!isSuperAdmin && user.orgId !== userOrgId) {
      return NextResponse.json({ error: "Cannot delete users from other organizations" }, { status: 403 });
    }

    // UserRoles will be cascade deleted
    await prisma.user.delete({ where: { id: userId } });

    return NextResponse.json({ message: "User deleted" });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
