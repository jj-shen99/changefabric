/**
 * Shared helpers for the v2 API surface.
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ROLE_PERMISSIONS, type UserRole } from "@/lib/auth-types";

export interface SessionContext {
  email: string;
  role: UserRole;
  perms: (typeof ROLE_PERMISSIONS)[UserRole];
}

/** Returns either a SessionContext or a NextResponse error to short-circuit. */
export async function requireSession(): Promise<SessionContext | NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const role = ((session.user as { role?: string }).role || "manager") as UserRole;
  return {
    email: session.user.email,
    role,
    perms: ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.manager,
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
