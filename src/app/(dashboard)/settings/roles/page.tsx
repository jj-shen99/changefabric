"use client";

import { useState, useEffect, useCallback } from "react";
import { usePermissions } from "@/hooks";
import { Card, CardHeader, CardTitle } from "@/components/card";
import { PageHeader } from "@/components/page-header";
import { Shield, Loader2, Check, X } from "lucide-react";
import { useRouter } from "next/navigation";

interface RoleRecord {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
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
  userCount: number;
}

export default function RolesPage() {
  const { canManageRoles, isAdmin } = usePermissions();
  const router = useRouter();
  const [roles, setRoles] = useState<RoleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchRoles = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/roles");
      if (res.status === 403) {
        router.push("/");
        return;
      }
      if (!res.ok) throw new Error("Failed to fetch roles");
      const data = await res.json();
      setRoles(data.roles);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load roles");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  if (!canManageRoles && !isAdmin) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <Shield className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" />
          <h2 className="mt-4 text-lg font-semibold text-gray-900 dark:text-gray-100">Access Denied</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">You don&apos;t have permission to manage roles.</p>
        </div>
      </div>
    );
  }

  const roleBadge: Record<string, string> = {
    admin: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
    change_manager: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
    approver: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
    implementer: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
    requester: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
    cab_member: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300",
  };

  const PermissionIcon = ({ enabled }: { enabled: boolean }) => (
    enabled ? (
      <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
    ) : (
      <X className="h-4 w-4 text-gray-300 dark:text-gray-600" />
    )
  );

  return (
    <>
      <PageHeader title="Role Management" subtitle="View system roles and their permissions" actions={
        <div className="flex items-center gap-2 rounded-lg bg-blue-50/20 px-3 py-1 text-xs font-medium text-blue-300">
          <Shield className="h-3.5 w-3.5" />
          {roles.length} roles
        </div>
      } />
      <div className="space-y-6 p-4 md:p-6">

        {error && (
          <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">{error}</div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>System Roles</CardTitle>
            <p className="text-sm text-gray-500 dark:text-gray-400">View and manage role permissions for the change management system</p>
          </CardHeader>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800">
                    <th className="pb-3 font-medium text-gray-500 dark:text-gray-400">Role</th>
                    <th className="pb-3 font-medium text-gray-500 dark:text-gray-400">Description</th>
                    <th className="pb-3 font-medium text-gray-500 dark:text-gray-400 text-center">Users</th>
                    <th className="pb-3 font-medium text-gray-500 dark:text-gray-400 text-center">Manage Users</th>
                    <th className="pb-3 font-medium text-gray-500 dark:text-gray-400 text-center">Manage Roles</th>
                    <th className="pb-3 font-medium text-gray-500 dark:text-gray-400 text-center">Manage Changes</th>
                    <th className="pb-3 font-medium text-gray-500 dark:text-gray-400 text-center">Approve</th>
                    <th className="pb-3 font-medium text-gray-500 dark:text-gray-400 text-center">Implement</th>
                    <th className="pb-3 font-medium text-gray-500 dark:text-gray-400 text-center">Releases</th>
                    <th className="pb-3 font-medium text-gray-500 dark:text-gray-400 text-center">Settings</th>
                    <th className="pb-3 font-medium text-gray-500 dark:text-gray-400 text-center">Metrics</th>
                    <th className="pb-3 font-medium text-gray-500 dark:text-gray-400 text-center">All Data</th>
                  </tr>
                </thead>
                <tbody>
                  {roles.map((role) => (
                    <tr key={role.id} className="border-b border-gray-50 dark:border-gray-800">
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <span className={`rounded px-2 py-1 text-xs font-medium ${roleBadge[role.name] || "bg-gray-100 text-gray-700"}`}>
                            {role.displayName}
                          </span>
                          {role.isSystem && (
                            <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                              System
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 text-gray-600 dark:text-gray-400 max-w-xs truncate">
                        {role.description || "—"}
                      </td>
                      <td className="py-3 text-center">
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                          {role.userCount}
                        </span>
                      </td>
                      <td className="py-3 text-center"><PermissionIcon enabled={role.canManageUsers} /></td>
                      <td className="py-3 text-center"><PermissionIcon enabled={role.canManageRoles} /></td>
                      <td className="py-3 text-center"><PermissionIcon enabled={role.canManageChanges} /></td>
                      <td className="py-3 text-center"><PermissionIcon enabled={role.canApproveChanges} /></td>
                      <td className="py-3 text-center"><PermissionIcon enabled={role.canImplementChanges} /></td>
                      <td className="py-3 text-center"><PermissionIcon enabled={role.canManageReleases} /></td>
                      <td className="py-3 text-center"><PermissionIcon enabled={role.canEditSettings} /></td>
                      <td className="py-3 text-center"><PermissionIcon enabled={role.canViewMetrics} /></td>
                      <td className="py-3 text-center"><PermissionIcon enabled={role.canViewAllData} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card className="p-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Role Assignment Rules</h3>
          <ul className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
            <li>• Users can have multiple roles. Permissions are combined (OR logic).</li>
            <li>• System roles cannot be deleted or modified.</li>
            <li>• Only admins can assign or remove the admin role.</li>
            <li>• Change managers can assign roles to non-admin users.</li>
            <li>• Users must always have at least one role.</li>
          </ul>
        </Card>
      </div>
    </>
  );
}
