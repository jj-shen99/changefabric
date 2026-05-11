import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/users/search?q=<query>
 * Search users by name or email for autocomplete.
 * Returns name and email (no sensitive data).
 * Excludes admin users from results (admins should not be assigned to CR tasks).
 */
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") || "";

  if (query.length < 1) {
    return NextResponse.json({ users: [] });
  }

  // SQLite doesn't support case-insensitive mode, so we use lowercase comparison
  const lowerQuery = query.toLowerCase();
  
  // Fetch users with their roles to filter out admins
  const allUsers = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      userRoles: {
        include: {
          role: {
            select: { name: true },
          },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  // Filter by search query and exclude admin users
  const users = allUsers
    .filter(u => {
      // Exclude users with admin role
      const isAdmin = u.userRoles.some(ur => ur.role.name === "admin");
      if (isAdmin) return false;
      
      // Match search query
      return u.name.toLowerCase().includes(lowerQuery) || 
             u.email.toLowerCase().includes(lowerQuery);
    })
    .slice(0, 10)
    .map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
    }));

  return NextResponse.json({ users });
}
