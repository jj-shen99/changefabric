import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/users/search?q=<query>&role=<role>
 * Search users by name or email for autocomplete.
 * Returns name and email (no sensitive data).
 * 
 * Query params:
 * - q: search query (required, min 1 char)
 * - role: filter by role - "assignable" returns only implementer/manager users (for CR assignment)
 */
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") || "";
  const roleFilter = searchParams.get("role") || "";

  if (query.length < 1) {
    return NextResponse.json({ users: [] });
  }

  // SQLite doesn't support case-insensitive mode, so we use lowercase comparison
  const lowerQuery = query.toLowerCase();
  
  // Fetch users with their roles
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

  // Filter by search query and role requirements
  const users = allUsers
    .filter(u => {
      const userRoles = u.userRoles.map(ur => ur.role.name);
      
      // For "assignable" filter: only return users who can implement changes
      // Exclude: requester (can only create CRs), approver (can only approve)
      // Include: implementer, manager, change_manager, admin (can implement)
      if (roleFilter === "assignable") {
        // User must have at least one role that allows implementation
        const implementerRoles = ["implementer", "manager", "change_manager", "admin"];
        const canBeAssigned = userRoles.some(role => implementerRoles.includes(role));
        
        // Exclude users who ONLY have requester or approver roles
        const onlyRequesterOrApprover = userRoles.every(role => 
          ["requester", "approver"].includes(role)
        );
        
        if (!canBeAssigned || onlyRequesterOrApprover) return false;
      } else {
        // Default behavior: exclude admin users
        const isAdmin = userRoles.includes("admin");
        if (isAdmin) return false;
      }
      
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
