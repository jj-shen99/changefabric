import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/users/search?q=<query>
 * Search users by name or email for autocomplete.
 * Returns name and email (no sensitive data).
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
  const allUsers = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
    },
    orderBy: { name: "asc" },
  });

  const users = allUsers
    .filter(u => 
      u.name.toLowerCase().includes(lowerQuery) || 
      u.email.toLowerCase().includes(lowerQuery)
    )
    .slice(0, 10);

  return NextResponse.json({ users });
}
