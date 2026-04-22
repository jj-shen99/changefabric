import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// POST - Test Git connection
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { user, password } = await request.json();

    if (!user) {
      return NextResponse.json({ success: false, message: "Username is required" });
    }

    // Test connection against GitHub Enterprise (code.devsnc.com)
    const testUrl = "https://code.devsnc.com/api/v3/user";
    
    const authHeader = "Basic " + Buffer.from(`${user}:${password}`).toString("base64");

    const res = await fetch(testUrl, {
      headers: {
        Accept: "application/json",
        Authorization: authHeader,
      },
    });

    if (res.ok) {
      const data = await res.json();
      const login = data.login || user;
      return NextResponse.json({ 
        success: true, 
        message: `Authenticated as ${login} on code.devsnc.com` 
      });
    } else if (res.status === 401) {
      return NextResponse.json({ 
        success: false, 
        message: "Authentication failed - check username and password/token" 
      });
    } else if (res.status === 403) {
      return NextResponse.json({ 
        success: false, 
        message: "Access forbidden - token may lack required scopes" 
      });
    } else {
      return NextResponse.json({ 
        success: false, 
        message: `Connection failed: HTTP ${res.status}` 
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Connection test failed";
    
    if (message.includes("ENOTFOUND") || message.includes("getaddrinfo")) {
      return NextResponse.json({ success: false, message: "Git server not reachable" });
    }
    if (message.includes("certificate")) {
      return NextResponse.json({ success: false, message: "SSL certificate error" });
    }
    
    return NextResponse.json({ success: false, message });
  }
}
