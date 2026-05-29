import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// POST - Test Git connection (admin only)
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  // Only admins can test integration settings
  const userRoles = (session.user as { roles?: string[] }).roles || [];
  if (!userRoles.includes("admin")) {
    return NextResponse.json({ error: "Forbidden - Admin role required" }, { status: 403 });
  }

  try {
    const { user, password, repoUrl } = await request.json();

    if (!user) {
      return NextResponse.json({ success: false, message: "Username is required" });
    }

    // Determine the Git host from the repo URL, GIT_ENTERPRISE_URL, or default
    let gitHost = process.env.GIT_ENTERPRISE_URL || "https://github.com";
    if (repoUrl) {
      try {
        const u = new URL(repoUrl.replace(/\.git$/, ""));
        gitHost = `${u.protocol}//${u.host}`;
      } catch { /* use default */ }
    }

    const authHeader = "Basic " + Buffer.from(`${user}:${password}`).toString("base64");
    const headers: Record<string, string> = {
      Accept: "application/json",
      Authorization: authHeader,
    };

    // Try multiple API endpoints: GitHub Enterprise v3, Gitea v1, then raw auth check
    const endpoints = [
      { url: `${gitHost}/api/v3/user`, name: "GitHub Enterprise" },
      { url: `${gitHost}/api/v1/user`, name: "Gitea" },
    ];

    for (const ep of endpoints) {
      try {
        const res = await fetch(ep.url, { headers });
        if (res.ok) {
          const data = await res.json();
          const login = data.login || data.username || user;
          return NextResponse.json({
            success: true,
            message: `Authenticated as ${login} on ${gitHost} (${ep.name})`,
          });
        }
        if (res.status === 401) {
          return NextResponse.json({
            success: false,
            message: "Authentication failed - check username and password/token",
          });
        }
        if (res.status === 403) {
          return NextResponse.json({
            success: false,
            message: "Access forbidden - token may lack required scopes",
          });
        }
        // 404 = this API variant doesn't exist, try next
      } catch {
        continue;
      }
    }

    // All endpoints returned 404 or failed — try a simple HEAD on the repo URL
    if (repoUrl) {
      try {
        const res = await fetch(repoUrl, { method: "HEAD", headers });
        if (res.ok || res.status === 301 || res.status === 302) {
          return NextResponse.json({
            success: true,
            message: `Repository accessible on ${gitHost}`,
          });
        }
      } catch { /* ignore */ }
    }

    return NextResponse.json({
      success: false,
      message: `Could not authenticate on ${gitHost} — verify the server supports GitHub/Gitea API`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Connection test failed";
    
    if (message.includes("ENOTFOUND") || message.includes("getaddrinfo")) {
      return NextResponse.json({ success: false, message: "Git server not reachable — check the URL" });
    }
    if (message.includes("certificate")) {
      return NextResponse.json({ success: false, message: "SSL certificate error — the server may use a self-signed certificate" });
    }
    
    return NextResponse.json({ success: false, message });
  }
}
