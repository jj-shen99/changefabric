"use client";

import { useSession } from "next-auth/react";
import { ROLE_PERMISSIONS, type UserRole } from "@/lib/auth-types";

export function usePermissions() {
  const { data: session } = useSession();
  const role = ((session?.user as { role?: string })?.role || "viewer") as UserRole;
  const permissions = ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.viewer;

  return {
    role,
    ...permissions,
    isAdmin: role === "admin",
    isManager: role === "manager",
    isViewer: role === "viewer",
  };
}
