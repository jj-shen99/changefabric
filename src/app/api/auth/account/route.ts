import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/auth/account — get current user session info (for debugging)
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  
  return NextResponse.json({
    email: session.user.email,
    name: session.user.name,
    orgId: session.user.orgId,
    isSuperAdmin: session.user.isSuperAdmin,
    roles: session.user.roles,
  });
}

// PUT /api/auth/account — update email or password for the logged-in user
export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // ── Change Email ──
    if (action === "email") {
      const { newEmail, currentPassword } = body;

      if (!newEmail || !currentPassword) {
        return NextResponse.json(
          { error: "New email and current password are required" },
          { status: 400 }
        );
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(newEmail)) {
        return NextResponse.json(
          { error: "Invalid email format" },
          { status: 400 }
        );
      }

      const passwordValid = await bcrypt.compare(currentPassword, user.hashedPassword);
      if (!passwordValid) {
        return NextResponse.json(
          { error: "Current password is incorrect" },
          { status: 403 }
        );
      }

      const existing = await prisma.user.findUnique({
        where: { email: newEmail },
      });
      if (existing && existing.id !== user.id) {
        return NextResponse.json(
          { error: "Email already in use by another account" },
          { status: 409 }
        );
      }

      await prisma.user.update({
        where: { id: user.id },
        data: { email: newEmail },
      });

      return NextResponse.json({ message: "Email updated successfully. Please sign in again with your new email." });
    }

    // ── Change Password ──
    if (action === "password") {
      const { currentPassword, newPassword, confirmPassword } = body;

      if (!currentPassword || !newPassword || !confirmPassword) {
        return NextResponse.json(
          { error: "All password fields are required" },
          { status: 400 }
        );
      }

      if (newPassword.length < 8) {
        return NextResponse.json(
          { error: "New password must be at least 8 characters" },
          { status: 400 }
        );
      }

      if (newPassword !== confirmPassword) {
        return NextResponse.json(
          { error: "New password and confirmation do not match" },
          { status: 400 }
        );
      }

      const passwordValid = await bcrypt.compare(currentPassword, user.hashedPassword);
      if (!passwordValid) {
        return NextResponse.json(
          { error: "Current password is incorrect" },
          { status: 403 }
        );
      }

      const hashedPassword = await bcrypt.hash(newPassword, 12);

      await prisma.user.update({
        where: { id: user.id },
        data: { hashedPassword },
      });

      return NextResponse.json({ message: "Password updated successfully" });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
