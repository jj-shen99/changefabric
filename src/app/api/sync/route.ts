import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { syncChangeRequests } from "@/lib/servicenow";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Parse credentials from URL params if provided
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get("days") || "7");
    const instance = searchParams.get("instance") || undefined;
    const user = searchParams.get("user") || undefined;
    const pass = searchParams.get("pass") || undefined;
    
    // Pass the user's email to track who synced
    const syncedBy = session.user.email || "unknown";

    const result = await syncChangeRequests(prisma, { days, instance, user, password: pass, syncedBy });
    return NextResponse.json(result);
  } catch (err) {
    console.error("Sync error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Sync failed" },
      { status: 500 },
    );
  }
}
