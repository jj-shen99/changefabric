import "next-auth";

declare module "next-auth" {
  interface User {
    role?: string;
  }

  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      role: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string;
    id?: string;
  }
}

export type UserRole = "admin" | "manager" | "approver" | "implementer" | "requester" | "viewer";

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Administrator",
  manager: "Release Manager",
  approver: "Approver",
  implementer: "Implementer",
  requester: "Requester",
  viewer: "Viewer",
};

export const ROLE_PERMISSIONS = {
  admin: {
    canManageUsers: true,
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
    canManageChanges: true,
    canApproveChanges: true,
    canImplementChanges: true,
    canManageReleases: true,
    canEditSettings: false,
    canViewMetrics: true,
    canViewAllData: false,  // Managers can only see their own CRs
  },
  approver: {
    canManageUsers: false,
    canManageChanges: false,  // Cannot create/edit CRs
    canApproveChanges: true,   // Can approve CRs assigned to them
    canImplementChanges: false,
    canManageReleases: false,
    canEditSettings: false,
    canViewMetrics: true,
    canViewAllData: false,  // Can only see CRs they're assigned to approve
  },
  implementer: {
    canManageUsers: false,
    canManageChanges: false,  // Cannot create/edit CRs
    canApproveChanges: false,
    canImplementChanges: true, // Can execute approved changes
    canManageReleases: false,
    canEditSettings: false,
    canViewMetrics: true,
    canViewAllData: false,  // Can only see CRs assigned to them
  },
  requester: {
    canManageUsers: false,
    canManageChanges: true,   // Can create and edit their own CRs
    canApproveChanges: false,
    canImplementChanges: false,
    canManageReleases: false,
    canEditSettings: false,
    canViewMetrics: false,
    canViewAllData: false,  // Can only see their own CRs
  },
  viewer: {
    canManageUsers: false,
    canManageChanges: false,
    canApproveChanges: false,
    canImplementChanges: false,
    canManageReleases: false,
    canEditSettings: false,
    canViewMetrics: true,
    canViewAllData: false,  // Viewers can only see CRs they're associated with
  },
} as const;
