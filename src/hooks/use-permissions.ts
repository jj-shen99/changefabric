"use client";

import { useSession } from "next-auth/react";
import { DEFAULT_PERMISSIONS, type Permissions } from "@/lib/auth-types";

export function usePermissions() {
  const { data: session } = useSession();
  
  // Get roles and permissions from session
  const roles = session?.user?.roles || [];
  const permissions: Permissions = session?.user?.permissions || DEFAULT_PERMISSIONS;
  const isSuperAdmin = session?.user?.isSuperAdmin || false;

  return {
    // Role information
    roles,
    hasRole: (roleName: string) => roles.includes(roleName),
    hasAnyRole: (roleNames: string[]) => roleNames.some(r => roles.includes(r)),
    
    // Permission flags (spread from aggregated permissions)
    ...permissions,
    
    // Super admin flag (can manage all orgs)
    isSuperAdmin,
    
    // Convenience flags for common checks
    // Admin check includes org-specific admin roles (e.g., admin_gcs)
    isAdmin: roles.some(r => r === "admin" || r.startsWith("admin_")),
    isChangeManager: roles.some(r => r === "change_manager" || r.startsWith("change_manager_")),
    isApprover: roles.includes("approver") || roles.includes("cab_member"),
    isImplementer: roles.includes("implementer"),
    isRequester: roles.some(r => r === "requester" || r.startsWith("requester_")),
    
    // Legacy compatibility
    isManager: roles.some(r => r === "change_manager" || r.startsWith("change_manager_") || r === "admin" || r.startsWith("admin_")),
    
    // Can assign roles (admin or has canManageRoles permission)
    canAssignRoles: roles.some(r => r === "admin" || r.startsWith("admin_")) || permissions.canManageRoles,
  };
}
