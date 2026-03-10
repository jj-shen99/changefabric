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

export type UserRole = "admin" | "manager" | "viewer";

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Administrator",
  manager: "Release Manager",
  viewer: "Viewer",
};

export const ROLE_PERMISSIONS = {
  admin: {
    canManageUsers: true,
    canManageChanges: true,
    canApproveChanges: true,
    canManageReleases: true,
    canEditSettings: true,
    canViewMetrics: true,
  },
  manager: {
    canManageUsers: false,
    canManageChanges: true,
    canApproveChanges: true,
    canManageReleases: true,
    canEditSettings: false,
    canViewMetrics: true,
  },
  viewer: {
    canManageUsers: false,
    canManageChanges: false,
    canApproveChanges: false,
    canManageReleases: false,
    canEditSettings: false,
    canViewMetrics: true,
  },
} as const;
