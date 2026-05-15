"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  LayoutDashboard,
  GitPullRequest,
  ShieldAlert,
  BarChart3,
  Settings,
  LogOut,
  Users,
  KeyRound,
  FileText,
  Code2,
  ClipboardList,
  UserCheck,
  UsersRound,
  Server,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_SECTIONS } from "@/lib/constants";

import { DEFAULT_PERMISSIONS, SYSTEM_ROLE_LABELS, type Permissions } from "@/lib/auth-types";

const iconMap: Record<string, React.ElementType> = {
  "/": LayoutDashboard,
  "/my-tasks": ClipboardList,
  "/changes": GitPullRequest,
  "/impact": ShieldAlert,
  "/code-analysis": Code2,
  "/analytics": BarChart3,
  "/reports": FileText,
};

const roleBadgeStyles: Record<string, { className: string }> = {
  super_admin: { className: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300" },
  admin: { className: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300" },
  change_manager: { className: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" },
  approver: { className: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" },
  implementer: { className: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300" },
  requester: { className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300" },
  cab_member: { className: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300" },
};

interface SidebarProps {
  onNavigate?: () => void;
}

export function Sidebar({ onNavigate }: SidebarProps = {}) {
  const pathname = usePathname();
  const { data: session } = useSession();

  // Get roles and permissions from the new multi-role session
  const userRoles = (session?.user as { roles?: string[] })?.roles || [];
  const permissions = (session?.user as { permissions?: Permissions })?.permissions || DEFAULT_PERMISSIONS;
  const isSuperAdmin = (session?.user as { isSuperAdmin?: boolean })?.isSuperAdmin || false;
  
  // Get the primary role for display (first role, or first "important" role)
  const primaryRole = userRoles.includes("super_admin") ? "super_admin"
    : userRoles.includes("admin") ? "admin" 
    : userRoles.includes("change_manager") ? "change_manager"
    : userRoles[0] || "requester";
  const primaryRoleLabel = SYSTEM_ROLE_LABELS[primaryRole as keyof typeof SYSTEM_ROLE_LABELS] || primaryRole;
  const badgeStyle = roleBadgeStyles[primaryRole] || roleBadgeStyles.requester;

  return (
    <aside
      className="flex h-full w-64 flex-col border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
      aria-label="Main navigation"
    >
      <div className="flex h-11 items-center gap-2 bg-gradient-to-r from-emerald-700 to-teal-700 px-4 dark:from-emerald-900 dark:to-teal-900">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-white/20">
          <GitPullRequest className="h-3.5 w-3.5 text-white" aria-hidden="true" />
        </div>
        <h1 className="text-sm font-bold text-white tracking-tight">Change Management</h1>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Primary">
        {NAV_SECTIONS.map((section, sIdx) => {
          // Filter out certain pages based on role
          const isAdmin = userRoles.includes("admin");
          const filteredItems = section.items.filter(item => {
            // Hide "My Tasks" for admin users
            if (item.href === "/my-tasks" && isAdmin) return false;
            // Hide these pages for super admin - they only manage orgs
            if (isSuperAdmin && ["/changes", "/impact", "/my-tasks"].includes(item.href)) return false;
            return true;
          });
          
          if (filteredItems.length === 0) return null;
          
          return (
            <div key={sIdx} className={sIdx > 0 ? "mt-4" : ""}>
              {section.section && (
                <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  {section.section}
                </p>
              )}
              <div className="space-y-0.5">
                {filteredItems.map((item) => {
                  const isActive = pathname === item.href;
                  const Icon = iconMap[item.href] || LayoutDashboard;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={isActive ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400"
                          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                      )}
                    >
                      <Icon
                        className={cn("h-4 w-4", isActive ? "text-blue-700 dark:text-blue-400" : "text-gray-400 dark:text-gray-500")}
                        aria-hidden="true"
                      />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="border-t border-gray-200 p-3 space-y-1 dark:border-gray-800">
        <Link
          href="/settings/account"
          aria-current={pathname === "/settings/account" ? "page" : undefined}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
            pathname === "/settings/account"
              ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400"
              : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
          )}
        >
          <KeyRound
            className={cn("h-4 w-4", pathname === "/settings/account" ? "text-blue-700 dark:text-blue-400" : "text-gray-400 dark:text-gray-500")}
            aria-hidden="true"
          />
          Account
        </Link>
        {(permissions.canManageUsers || permissions.canManageRoles || isSuperAdmin) && (
          <Link
            href="/settings/users"
            aria-current={pathname === "/settings/users" ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              pathname === "/settings/users"
                ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400"
                : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
            )}
          >
            <Users
              className={cn("h-4 w-4", pathname === "/settings/users" ? "text-blue-700 dark:text-blue-400" : "text-gray-400 dark:text-gray-500")}
              aria-hidden="true"
            />
            User Management
          </Link>
        )}
        {permissions.canManageUsers && !isSuperAdmin && (
          <Link
            href="/settings/groups"
            aria-current={pathname === "/settings/groups" ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              pathname === "/settings/groups"
                ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400"
                : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
            )}
          >
            <UsersRound
              className={cn("h-4 w-4", pathname === "/settings/groups" ? "text-blue-700 dark:text-blue-400" : "text-gray-400 dark:text-gray-500")}
              aria-hidden="true"
            />
            Assignment Groups
          </Link>
        )}
        {permissions.canManageUsers && !isSuperAdmin && (
          <Link
            href="/settings/services"
            aria-current={pathname === "/settings/services" ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              pathname === "/settings/services"
                ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400"
                : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
            )}
          >
            <Server
              className={cn("h-4 w-4", pathname === "/settings/services" ? "text-blue-700 dark:text-blue-400" : "text-gray-400 dark:text-gray-500")}
              aria-hidden="true"
            />
            Services
          </Link>
        )}
        {permissions.canManageUsers && !isSuperAdmin && (
          <Link
            href="/settings/approvers"
            aria-current={pathname === "/settings/approvers" ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              pathname === "/settings/approvers"
                ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400"
                : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
            )}
          >
            <UserCheck
              className={cn("h-4 w-4", pathname === "/settings/approvers" ? "text-blue-700 dark:text-blue-400" : "text-gray-400 dark:text-gray-500")}
              aria-hidden="true"
            />
            CR Type Approvers
          </Link>
        )}
        {permissions.canEditSettings && !isSuperAdmin && (
          <Link
            href="/settings"
            aria-current={pathname === "/settings" ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              pathname === "/settings"
                ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400"
                : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
            )}
          >
            <Settings
              className={cn("h-4 w-4", pathname === "/settings" ? "text-blue-700 dark:text-blue-400" : "text-gray-400 dark:text-gray-500")}
              aria-hidden="true"
            />
            Settings
          </Link>
        )}
        {isSuperAdmin && (
          <Link
            href="/admin/organizations"
            aria-current={pathname === "/admin/organizations" ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              pathname === "/admin/organizations"
                ? "bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-400"
                : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
            )}
          >
            <Building2
              className={cn("h-4 w-4", pathname === "/admin/organizations" ? "text-purple-700 dark:text-purple-400" : "text-gray-400 dark:text-gray-500")}
              aria-hidden="true"
            />
            Organizations
          </Link>
        )}
      </div>

      {session?.user && (
        <div className="border-t border-gray-200 p-3 dark:border-gray-800">
          <div className="flex items-center gap-3 rounded-lg px-3 py-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700 dark:bg-blue-900 dark:text-blue-300">
              {session.user.name?.charAt(0)?.toUpperCase() || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                {session.user.name}
              </p>
              <div className="flex items-center gap-1.5">
                <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-medium", badgeStyle.className)}>
                  {primaryRoleLabel}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-red-50 hover:text-red-700 dark:text-gray-400 dark:hover:bg-red-950 dark:hover:text-red-400"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Sign out
          </button>
        </div>
      )}
    </aside>
  );
}
