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

export type UserRole = "admin" | "manager";

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Administrator",
  manager: "Release Manager",
};

export const ROLE_PERMISSIONS = {
  admin: {
    canManageUsers: true,
    canManageChanges: true,
    canApproveChanges: true,
    canManageReleases: true,
    canEditSettings: true,
    canViewMetrics: true,
    canViewAllData: true,
  },
  manager: {
    canManageUsers: false,
    canManageChanges: true,
    canApproveChanges: true,
    canManageReleases: true,
    canEditSettings: false,
    canViewMetrics: true,
    canViewAllData: false,
  },
} as const;
