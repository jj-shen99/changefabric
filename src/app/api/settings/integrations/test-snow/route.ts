import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// POST - Test ServiceNow connection (admin only)
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
    const { instance, user, password } = await request.json();

    if (!instance || !user) {
      return NextResponse.json({ success: false, message: "Instance URL and username are required" });
    }

    // Clean up instance URL
    const baseUrl = instance.replace(/\/$/, "");

    // Test connection by fetching a single change_request (the actual table we use)
    const testUrl = `${baseUrl}/api/now/table/change_request?sysparm_limit=1&sysparm_fields=number`;
    
    const res = await fetch(testUrl, {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Authorization": "Basic " + Buffer.from(`${user}:${password}`).toString("base64"),
      },
    });

    if (res.ok) {
      // Verify we got JSON back
      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        return NextResponse.json({ 
          success: true, 
          message: `Connected to ${new URL(baseUrl).hostname} successfully` 
        });
      } else {
        return NextResponse.json({ 
          success: false, 
          message: `Instance returned ${contentType} instead of JSON - API may not be enabled` 
        });
      }
    } else if (res.status === 401) {
      return NextResponse.json({ 
        success: false, 
        message: "Authentication failed - check username and password" 
      });
    } else if (res.status === 403) {
      return NextResponse.json({ 
        success: false, 
        message: "Access forbidden - user may lack API permissions" 
      });
    } else if (res.status === 406) {
      return NextResponse.json({ 
        success: false, 
        message: "Instance does not support JSON API - check if REST API is enabled" 
      });
    } else {
      const text = await res.text();
      return NextResponse.json({ 
        success: false, 
        message: `Connection failed: HTTP ${res.status} - ${text.slice(0, 100)}` 
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Connection test failed";
    
    // Provide helpful error messages
    if (message.includes("ENOTFOUND") || message.includes("getaddrinfo")) {
      return NextResponse.json({ success: false, message: "Instance URL not found - check the hostname" });
    }
    if (message.includes("ECONNREFUSED")) {
      return NextResponse.json({ success: false, message: "Connection refused - instance may be down" });
    }
    if (message.includes("certificate")) {
      return NextResponse.json({ success: false, message: "SSL certificate error - check instance URL" });
    }
    
    return NextResponse.json({ success: false, message });
  }
}
