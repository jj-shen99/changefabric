/**
 * Shared helpers for the v2 API surface.
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { DEFAULT_PERMISSIONS, type Permissions } from "@/lib/auth-types";

export interface SessionContext {
  email: string;
  roles: string[];
  perms: Permissions;
  isAdmin: boolean;
  /** Primary role for backward compatibility with workflow RBAC */
  primaryRole: "admin" | "manager" | "implementer" | "requester";
}

/** Returns either a SessionContext or a NextResponse error to short-circuit. */
export async function requireSession(): Promise<SessionContext | NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const roles = session.user.roles || [];
  const perms = session.user.permissions || DEFAULT_PERMISSIONS;
  const isAdmin = roles.includes("admin");
  
  // Determine primary role for backward compatibility with workflow RBAC
  // Role hierarchy: admin > manager > implementer > requester
  // Maps to: admin, manager, implementer, or requester (default for all other users)
  const primaryRole: "admin" | "manager" | "implementer" | "requester" = isAdmin 
    ? "admin" 
    : roles.includes("change_manager") || perms.canManageChanges 
      ? "manager" 
      : roles.includes("implementer") || perms.canImplementChanges
        ? "implementer"
        : "requester";
  
  return {
    email: session.user.email,
    roles,
    perms,
    isAdmin,
    primaryRole,
  };
}

export function isResponse(x: unknown): x is NextResponse {
  return x instanceof NextResponse;
}

export function badRequest(msg: string) {
  return NextResponse.json({ error: msg }, { status: 400 });
}
export function forbidden(msg = "Forbidden") {
  return NextResponse.json({ error: msg }, { status: 403 });
}
export function notFound(msg = "Not found") {
  return NextResponse.json({ error: msg }, { status: 404 });
}
export function serverError(err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  // eslint-disable-next-line no-console
  console.error("[api/v2] error:", err);
  return NextResponse.json({ error: message }, { status: 500 });
}
