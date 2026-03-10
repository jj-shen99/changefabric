import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ROLE_PERMISSIONS } from "@/lib/auth-types";
import type { UserRole } from "@/lib/auth-types";

function getPermissions(session: { user: { role?: string } }) {
  const role = (session.user.role || "viewer") as UserRole;
  return ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.viewer;
}

// POST /api/data/changes — Create a new change request (SN schema)
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const perms = getPermissions(session as { user: { role?: string } });
  if (!perms.canManageChanges) {
    return NextResponse.json({ error: "Forbidden: insufficient permissions" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { number: crNumber, sys_id, short_description, ...rest } = body;

    if (!crNumber || !sys_id) {
      return NextResponse.json(
        { error: "Missing required fields: number, sys_id" },
        { status: 400 }
      );
    }

    const existing = await prisma.changeRequest.findUnique({ where: { number: crNumber } });
    if (existing) {
      return NextResponse.json({ error: "Change request with this number already exists" }, { status: 409 });
    }

    await prisma.changeRequest.create({
      data: { number: crNumber, sys_id, short_description: short_description || "", ...rest },
    });

    return NextResponse.json({ message: "Change request created", number: crNumber }, { status: 201 });
  } catch (err) {
    console.error("Create change request error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT /api/data/changes — Update an existing change request
export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const perms = getPermissions(session as { user: { role?: string } });
  if (!perms.canManageChanges) {
    return NextResponse.json({ error: "Forbidden: insufficient permissions" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { number: crNumber, ...updates } = body;

    if (!crNumber) {
      return NextResponse.json({ error: "Change request number is required" }, { status: 400 });
    }

    const existing = await prisma.changeRequest.findUnique({ where: { number: crNumber } });
    if (!existing) {
      return NextResponse.json({ error: "Change request not found" }, { status: 404 });
    }

    await prisma.changeRequest.update({ where: { number: crNumber }, data: updates });

    return NextResponse.json({ message: "Change request updated" });
  } catch (err) {
    console.error("Update change request error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/data/changes — Delete a change request
export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const perms = getPermissions(session as { user: { role?: string } });
  if (!perms.canManageChanges) {
    return NextResponse.json({ error: "Forbidden: insufficient permissions" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const crNumber = searchParams.get("number") || searchParams.get("id");

    if (!crNumber) {
      return NextResponse.json({ error: "Change request number is required" }, { status: 400 });
    }

    const existing = await prisma.changeRequest.findUnique({ where: { number: crNumber } });
    if (!existing) {
      return NextResponse.json({ error: "Change request not found" }, { status: 404 });
    }

    await prisma.changeRequest.delete({ where: { number: crNumber } });

    return NextResponse.json({ message: "Change request deleted" });
  } catch (err) {
    console.error("Delete change request error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
