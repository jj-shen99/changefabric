"use client";

import { useState, useEffect, useCallback } from "react";
import { usePermissions } from "@/hooks";
import { Card, CardHeader, CardTitle } from "@/components/card";
import { PageHeader } from "@/components/page-header";
import { Shield, Trash2, Loader2, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";

interface UserRecord {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
}

export default function UserManagementPage() {
  const { isAdmin } = usePermissions();
  const router = useRouter();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  async function handleRoleChange(userId: string, newRole: string) {
    setUpdatingId(userId);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role: newRole }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to update role");
        return;
      }
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      );
    } finally {
      setUpdatingId(null);
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

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <Shield className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" />
          <h2 className="mt-4 text-lg font-semibold text-gray-900 dark:text-gray-100">Access Denied</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Only administrators can manage users.</p>
        </div>
      </div>
    );
  }

  const roleBadge: Record<string, string> = {
    admin: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
    manager: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
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
                  <th className="pb-3 font-medium text-gray-500 dark:text-gray-400">Role</th>
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
                      <select
                        value={user.role}
                        onChange={(e) => handleRoleChange(user.id, e.target.value)}
                        disabled={updatingId === user.id}
                        className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs font-medium outline-none focus:border-blue-500 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                      >
                        <option value="admin">Admin</option>
                        <option value="manager">Manager</option>
                      </select>
                      <span className={`ml-2 inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium ${roleBadge[user.role] || roleBadge.manager}`}>
                        {user.role}
                      </span>
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
        <div className="grid grid-cols-3 gap-4 text-xs">
          <div>
            <span className={`rounded px-1.5 py-0.5 font-medium ${roleBadge.admin}`}>Admin</span>
            <ul className="mt-2 space-y-1 text-gray-500 dark:text-gray-400">
              <li>Manage users & roles</li>
              <li>Create/edit/delete changes</li>
              <li>Approve changes</li>
              <li>Manage releases</li>
              <li>Edit settings</li>
            </ul>
          </div>
          <div>
            <span className={`rounded px-1.5 py-0.5 font-medium ${roleBadge.manager}`}>Manager</span>
            <ul className="mt-2 space-y-1 text-gray-500 dark:text-gray-400">
              <li>Create/edit/delete changes</li>
              <li>Approve changes</li>
              <li>Manage releases</li>
              <li>View metrics</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
    </>
  );
}
