import "next-auth";

// ── Permission Types ─────────────────────────────────────────────
export interface Permissions {
  canManageUsers: boolean;
  canManageRoles: boolean;
  canManageChanges: boolean;
  canApproveChanges: boolean;
  canImplementChanges: boolean;
  canManageReleases: boolean;
  canEditSettings: boolean;
  canViewMetrics: boolean;
  canViewAllData: boolean;
}

// Role as stored in database
export interface Role {
  id: string;
  name: string;
  displayName: string;
  description?: string | null;
  canManageUsers: boolean;
  canManageRoles: boolean;
  canManageChanges: boolean;
  canApproveChanges: boolean;
  canImplementChanges: boolean;
  canManageReleases: boolean;
  canEditSettings: boolean;
  canViewMetrics: boolean;
  canViewAllData: boolean;
  isSystem: boolean;
  isActive: boolean;
}

// User's role assignment
export interface UserRoleAssignment {
  roleId: string;
  roleName: string;
  roleDisplayName: string;
  assignedBy?: string | null;
  assignedAt: Date;
}

declare module "next-auth" {
  interface User {
    roles?: string[];  // Array of role names
  }

  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      roles: string[];  // Array of role names
      permissions: Permissions;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    roles?: string[];
    permissions?: Permissions;
    id?: string;
  }
}

// System role names (for reference)
export type SystemRoleName = 
  | "admin" 
  | "change_manager" 
  | "approver" 
  | "implementer" 
  | "requester" 
  | "viewer"
  | "cab_member"
  | "security_reviewer";

export const SYSTEM_ROLE_LABELS: Record<SystemRoleName, string> = {
  admin: "Administrator",
  change_manager: "Change Manager",
  approver: "Approver",
  implementer: "Implementer",
  requester: "Requester",
  viewer: "Viewer",
  cab_member: "CAB Member",
  security_reviewer: "Security Reviewer",
};

// Default permissions (all false)
export const DEFAULT_PERMISSIONS: Permissions = {
  canManageUsers: false,
  canManageRoles: false,
  canManageChanges: false,
  canApproveChanges: false,
  canImplementChanges: false,
  canManageReleases: false,
  canEditSettings: false,
  canViewMetrics: false,
  canViewAllData: false,
};

/**
 * Aggregate permissions from multiple roles.
 * Uses OR logic - if any role grants a permission, the user has it.
 */
export function aggregatePermissions(roles: Partial<Permissions>[]): Permissions {
  return roles.reduce<Permissions>((acc, role) => ({
    canManageUsers: acc.canManageUsers || !!role.canManageUsers,
    canManageRoles: acc.canManageRoles || !!role.canManageRoles,
    canManageChanges: acc.canManageChanges || !!role.canManageChanges,
    canApproveChanges: acc.canApproveChanges || !!role.canApproveChanges,
    canImplementChanges: acc.canImplementChanges || !!role.canImplementChanges,
    canManageReleases: acc.canManageReleases || !!role.canManageReleases,
    canEditSettings: acc.canEditSettings || !!role.canEditSettings,
    canViewMetrics: acc.canViewMetrics || !!role.canViewMetrics,
    canViewAllData: acc.canViewAllData || !!role.canViewAllData,
  }), { ...DEFAULT_PERMISSIONS });
}

/**
 * Check if user has a specific role
 */
export function hasRole(userRoles: string[], roleName: string): boolean {
  return userRoles.includes(roleName);
}

/**
 * Check if user has any of the specified roles
 */
export function hasAnyRole(userRoles: string[], roleNames: string[]): boolean {
  return roleNames.some(role => userRoles.includes(role));
}

/**
 * Check if user is an admin (has admin role)
 */
export function isAdmin(userRoles: string[]): boolean {
  return hasRole(userRoles, "admin");
}

/**
 * Check if user can manage roles (admin or has canManageRoles permission)
 */
export function canManageRoles(userRoles: string[], permissions: Permissions): boolean {
  return isAdmin(userRoles) || permissions.canManageRoles;
}

// ── Legacy compatibility ─────────────────────────────────────────
// Keep old types for backward compatibility during migration
export type UserRole = "admin" | "manager" | "approver" | "implementer" | "requester" | "viewer";

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Administrator",
  manager: "Change Manager",
  approver: "Approver",
  implementer: "Implementer",
  requester: "Requester",
  viewer: "Viewer",
};

// Legacy ROLE_PERMISSIONS for backward compatibility
export const ROLE_PERMISSIONS = {
  admin: {
    canManageUsers: true,
    canManageRoles: true,
    canManageChanges: true,
    canApproveChanges: true,
    canImplementChanges: true,
    canManageReleases: true,
    canEditSettings: true,
    canViewMetrics: true,
    canViewAllData: true,
  },
  manager: {
    canManageUsers: false,
    canManageRoles: false,
    canManageChanges: true,
    canApproveChanges: true,
    canImplementChanges: true,
    canManageReleases: true,
    canEditSettings: false,
    canViewMetrics: true,
    canViewAllData: true,
  },
  approver: {
    canManageUsers: false,
    canManageRoles: false,
    canManageChanges: false,
    canApproveChanges: true,
    canImplementChanges: false,
    canManageReleases: false,
    canEditSettings: false,
    canViewMetrics: true,
    canViewAllData: false,
  },
  implementer: {
    canManageUsers: false,
    canManageRoles: false,
    canManageChanges: false,
    canApproveChanges: false,
    canImplementChanges: true,
    canManageReleases: false,
    canEditSettings: false,
    canViewMetrics: true,
    canViewAllData: false,
  },
  requester: {
    canManageUsers: false,
    canManageRoles: false,
    canManageChanges: true,
    canApproveChanges: false,
    canImplementChanges: false,
    canManageReleases: false,
    canEditSettings: false,
    canViewMetrics: false,
    canViewAllData: false,
  },
  viewer: {
    canManageUsers: false,
    canManageRoles: false,
    canManageChanges: false,
    canApproveChanges: false,
    canImplementChanges: false,
    canManageReleases: false,
    canEditSettings: false,
    canViewMetrics: true,
    canViewAllData: false,
  },
} as const;
