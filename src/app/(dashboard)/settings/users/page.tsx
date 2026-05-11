"use client";

import { useState, useEffect, useCallback } from "react";
import { usePermissions } from "@/hooks";
import { Card, CardHeader, CardTitle } from "@/components/card";
import { PageHeader } from "@/components/page-header";
import { Shield, Trash2, Loader2, UserPlus, Plus, Check } from "lucide-react";
import { useRouter } from "next/navigation";

interface RoleInfo {
  id: string;
  name: string;
  displayName: string;
}

interface UserRecord {
  id: string;
  email: string;
  name: string;
  roles: RoleInfo[];
  createdAt: string;
}

interface AvailableRole {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  isSystem: boolean;
  userCount: number;
}

export default function UserManagementPage() {
  const { canManageUsers, isAdmin } = usePermissions();
  const router = useRouter();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [availableRoles, setAvailableRoles] = useState<AvailableRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [savingRoles, setSavingRoles] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/users");
      if (res.status === 403) {
        router.push("/");
        return;
      }
      if (!res.ok) throw new Error("Failed to fetch users");
      const data = await res.json();
      setUsers(data.users);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [router]);

  const fetchRoles = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/roles");
      if (res.ok) {
        const data = await res.json();
        setAvailableRoles(data.roles);
      }
    } catch {
      // Ignore role fetch errors
    }
  }, []);

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, [fetchUsers, fetchRoles]);

  function startEditingRoles(user: UserRecord) {
    setEditingUserId(user.id);
    setSelectedRoles(user.roles.map(r => r.id));
  }

  function cancelEditingRoles() {
    setEditingUserId(null);
    setSelectedRoles([]);
  }

  function toggleRole(roleId: string) {
    setSelectedRoles(prev => 
      prev.includes(roleId) 
        ? prev.filter(id => id !== roleId)
        : [...prev, roleId]
    );
  }

  async function saveRoles(userId: string) {
    if (selectedRoles.length === 0) {
      alert("User must have at least one role");
      return;
    }
    setSavingRoles(true);
    try {
      const res = await fetch("/api/admin/users/roles", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, roleIds: selectedRoles }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to update roles");
        return;
      }
      // Update local state
      setUsers(prev => prev.map(u => {
        if (u.id === userId) {
          return {
            ...u,
            roles: data.roles.map((r: { id: string; name: string; displayName: string }) => ({
              id: r.id,
              name: r.name,
              displayName: r.displayName,
            })),
          };
        }
        return u;
      }));
      setEditingUserId(null);
      setSelectedRoles([]);
    } finally {
      setSavingRoles(false);
    }
  }

  async function handleDelete(userId: string, userName: string) {
    if (!confirm(`Delete user "${userName}"? This cannot be undone.`)) return;
    setDeletingId(userId);
    try {
      const res = await fetch(`/api/admin/users?id=${userId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to delete user");
        return;
      }
      setUsers((prev) => prev.filter((u) => u.id !== userId));
    } finally {
      setDeletingId(null);
    }
  }

  if (!canManageUsers && !isAdmin) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <Shield className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" />
          <h2 className="mt-4 text-lg font-semibold text-gray-900 dark:text-gray-100">Access Denied</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">You don&apos;t have permission to manage users.</p>
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
    viewer: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    cab_member: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300",
    security_reviewer: "bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300",
  };

  return (
    <>
      <PageHeader title="User Management" subtitle="Manage user accounts and role assignments" actions={
        <div className="flex items-center gap-2 rounded-lg bg-blue-50/20 px-3 py-1 text-xs font-medium text-blue-300">
          <UserPlus className="h-3.5 w-3.5" />
          {users.length} users
        </div>
      } />
    <div className="space-y-6 p-4 md:p-6">

      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">{error}</div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
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
                  <th className="pb-3 font-medium text-gray-500 dark:text-gray-400">Name</th>
                  <th className="pb-3 font-medium text-gray-500 dark:text-gray-400">Email</th>
                  <th className="pb-3 font-medium text-gray-500 dark:text-gray-400">Roles</th>
                  <th className="pb-3 font-medium text-gray-500 dark:text-gray-400">Joined</th>
                  <th className="pb-3 font-medium text-gray-500 dark:text-gray-400 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-gray-50 dark:border-gray-800">
                    <td className="py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-gray-900 dark:text-gray-100">{user.name}</span>
                      </div>
                    </td>
                    <td className="py-3 text-gray-600 dark:text-gray-400">{user.email}</td>
                    <td className="py-3">
                      {editingUserId === user.id ? (
                        <div className="space-y-2">
                          <div className="flex flex-wrap gap-1">
                            {availableRoles.map((role) => (
                              <button
                                key={role.id}
                                onClick={() => toggleRole(role.id)}
                                className={`rounded px-2 py-1 text-[10px] font-medium transition-colors ${
                                  selectedRoles.includes(role.id)
                                    ? roleBadge[role.name] || "bg-gray-200 text-gray-700"
                                    : "bg-gray-100 text-gray-400 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-500"
                                }`}
                              >
                                {selectedRoles.includes(role.id) && <Check className="inline h-3 w-3 mr-0.5" />}
                                {role.displayName}
                              </button>
                            ))}
                          </div>
                          <div className="flex gap-1">
                            <button
                              onClick={() => saveRoles(user.id)}
                              disabled={savingRoles}
                              className="rounded bg-teal-600 px-2 py-1 text-[10px] font-medium text-white hover:bg-teal-700 disabled:opacity-50"
                            >
                              {savingRoles ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
                            </button>
                            <button
                              onClick={cancelEditingRoles}
                              className="rounded bg-gray-200 px-2 py-1 text-[10px] font-medium text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {user.roles.length > 0 ? (
                            user.roles.map((role) => (
                              <span
                                key={role.id}
                                className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${roleBadge[role.name] || "bg-gray-100 text-gray-700"}`}
                              >
                                {role.displayName}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-gray-400">No roles</span>
                          )}
                          <button
                            onClick={() => startEditingRoles(user)}
                            className="ml-1 rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
                            title="Edit roles"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="py-3 text-gray-500 dark:text-gray-400">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => handleDelete(user.id, user.name)}
                        disabled={deletingId === user.id}
                        className="rounded p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:hover:bg-red-950 dark:hover:text-red-400"
                        title="Delete user"
                      >
                        {deletingId === user.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="p-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Role Permissions</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Users can have multiple roles. Permissions are combined (OR logic).</p>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 text-xs">
          <div>
            <span className={`rounded px-1.5 py-0.5 font-medium ${roleBadge.admin}`}>Admin</span>
            <ul className="mt-2 space-y-1 text-gray-500 dark:text-gray-400">
              <li>✓ Manage users & roles</li>
              <li>✓ All permissions</li>
              <li>✓ Edit settings</li>
              <li>✓ View all data</li>
            </ul>
          </div>
          <div>
            <span className={`rounded px-1.5 py-0.5 font-medium ${roleBadge.change_manager}`}>Change Mgr</span>
            <ul className="mt-2 space-y-1 text-gray-500 dark:text-gray-400">
              <li>✓ Manage changes</li>
              <li>✓ Approve changes</li>
              <li>✓ Implement changes</li>
              <li>✓ Manage releases</li>
            </ul>
          </div>
          <div>
            <span className={`rounded px-1.5 py-0.5 font-medium ${roleBadge.approver}`}>Approver</span>
            <ul className="mt-2 space-y-1 text-gray-500 dark:text-gray-400">
              <li>✓ Approve changes</li>
              <li>✓ View metrics</li>
            </ul>
          </div>
          <div>
            <span className={`rounded px-1.5 py-0.5 font-medium ${roleBadge.implementer}`}>Implementer</span>
            <ul className="mt-2 space-y-1 text-gray-500 dark:text-gray-400">
              <li>✓ Implement changes</li>
              <li>✓ View metrics</li>
            </ul>
          </div>
          <div>
            <span className={`rounded px-1.5 py-0.5 font-medium ${roleBadge.requester}`}>Requester</span>
            <ul className="mt-2 space-y-1 text-gray-500 dark:text-gray-400">
              <li>✓ Create/edit CRs</li>
            </ul>
          </div>
          <div>
            <span className={`rounded px-1.5 py-0.5 font-medium ${roleBadge.viewer}`}>Viewer</span>
            <ul className="mt-2 space-y-1 text-gray-500 dark:text-gray-400">
              <li>✓ View metrics</li>
              <li>✓ Read-only access</li>
            </ul>
          </div>
          <div>
            <span className={`rounded px-1.5 py-0.5 font-medium ${roleBadge.cab_member}`}>CAB Member</span>
            <ul className="mt-2 space-y-1 text-gray-500 dark:text-gray-400">
              <li>✓ Approve changes</li>
              <li>✓ View all data</li>
            </ul>
          </div>
          <div>
            <span className={`rounded px-1.5 py-0.5 font-medium ${roleBadge.security_reviewer}`}>Security</span>
            <ul className="mt-2 space-y-1 text-gray-500 dark:text-gray-400">
              <li>✓ Approve changes</li>
              <li>✓ View metrics</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
    </>
  );
}
