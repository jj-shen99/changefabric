"use client";

import { useSession } from "next-auth/react";
import { DEFAULT_PERMISSIONS, type Permissions } from "@/lib/auth-types";

export function usePermissions() {
  const { data: session } = useSession();
  
  // Get roles and permissions from session
  const roles = session?.user?.roles || [];
  const permissions: Permissions = session?.user?.permissions || DEFAULT_PERMISSIONS;

  return {
    // Role information
    roles,
    hasRole: (roleName: string) => roles.includes(roleName),
    hasAnyRole: (roleNames: string[]) => roleNames.some(r => roles.includes(r)),
    
    // Permission flags (spread from aggregated permissions)
    ...permissions,
    
    // Convenience flags for common checks
    isAdmin: roles.includes("admin"),
    isChangeManager: roles.includes("change_manager"),
    isApprover: roles.includes("approver") || roles.includes("cab_member"),
    isImplementer: roles.includes("implementer"),
    isRequester: roles.includes("requester"),
    
    // Legacy compatibility
    isManager: roles.includes("change_manager") || roles.includes("admin"),
    
    // Can assign roles (admin or has canManageRoles permission)
    canAssignRoles: roles.includes("admin") || permissions.canManageRoles,
  };
}
