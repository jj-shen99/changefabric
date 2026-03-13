"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  LayoutDashboard,
  GitPullRequest,
  ShieldAlert,
  Rocket,
  BarChart3,
  Settings,
  LogOut,
  Users,
  Radar,
  Crown,
  KeyRound,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_SECTIONS } from "@/lib/constants";

import { ROLE_PERMISSIONS, type UserRole } from "@/lib/auth-types";

const iconMap: Record<string, React.ElementType> = {
  "/": LayoutDashboard,
  "/changes": GitPullRequest,
  "/impact": ShieldAlert,
  "/analytics": BarChart3,
  "/releases": Rocket,
  "/risk-radar": Radar,
  "/executive": Crown,
};

const roleBadge: Record<string, { label: string; className: string }> = {
  admin: { label: "Admin", className: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300" },
  manager: { label: "Manager", className: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" },
  viewer: { label: "Viewer", className: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300" },
};

interface SidebarProps {
  onNavigate?: () => void;
}

export function Sidebar({ onNavigate }: SidebarProps = {}) {
  const pathname = usePathname();
  const { data: session } = useSession();

  const userRole = ((session?.user as { role?: string })?.role || "viewer") as UserRole;
  const badge = roleBadge[userRole] || roleBadge.viewer;
  const permissions = ROLE_PERMISSIONS[userRole] || ROLE_PERMISSIONS.viewer;

  return (
    <aside
      className="flex h-full w-64 flex-col border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
      aria-label="Main navigation"
    >
      <div className="flex h-11 items-center gap-2 bg-gradient-to-r from-emerald-700 to-teal-700 px-4 dark:from-emerald-900 dark:to-teal-900">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-white/20">
          <GitPullRequest className="h-3.5 w-3.5 text-white" aria-hidden="true" />
        </div>
        <h1 className="text-base font-bold text-white tracking-tight">GCS Change &amp; Release Management Dashboard</h1>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Primary">
        {NAV_SECTIONS.map((section, sIdx) => (
          <div key={sIdx} className={sIdx > 0 ? "mt-4" : ""}>
            {section.section && (
              <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                {section.section}
              </p>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => {
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
        ))}
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
        {permissions.canManageUsers && (
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
        {permissions.canEditSettings && (
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
                <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-medium", badge.className)}>
                  {badge.label}
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
