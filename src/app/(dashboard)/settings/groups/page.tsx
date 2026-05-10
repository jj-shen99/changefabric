"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/card";
import { Users, Plus, Trash2, Edit2, AlertTriangle, Check, X } from "lucide-react";

interface Group {
  id: string;
  name: string;
  description: string;
  type: string;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
}

const GROUP_TYPES = [
  { value: "approver", label: "Approver Group", description: "For approval workflows" },
  { value: "assignment", label: "Assignment Group", description: "For CR assignments" },
  { value: "both", label: "Both", description: "Can be used for both" },
];

export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formType, setFormType] = useState("approver");
  const [submitting, setSubmitting] = useState(false);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editType, setEditType] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Check if user is admin
      const sessionRes = await fetch("/api/auth/session");
      const session = await sessionRes.json();
      const userRole = session?.user?.role;
      setIsAdmin(userRole === "admin");

      if (userRole !== "admin") {
        setError("Access denied. Admin privileges required.");
        setLoading(false);
        return;
      }

      // Fetch groups
      const groupsRes = await fetch("/api/admin/groups");
      if (!groupsRes.ok) throw new Error("Failed to load groups");
      const groupsData = await groupsRes.json();
      setGroups(groupsData.groups || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function addGroup(e: React.FormEvent) {
    e.preventDefault();
    if (!formName.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName.trim(),
          description: formDescription.trim(),
          type: formType,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to add group");
        return;
      }

      setShowForm(false);
      setFormName("");
      setFormDescription("");
      setFormType("approver");
      await load();
    } finally {
      setSubmitting(false);
    }
  }

  async function updateGroup(id: string) {
    if (!editName.trim()) return;

    try {
      const res = await fetch("/api/admin/groups", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          name: editName.trim(),
          description: editDescription.trim(),
          type: editType,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to update group");
        return;
      }

      setEditingId(null);
      await load();
    } catch {
      alert("Failed to update group");
    }
  }

  async function deleteGroup(id: string, name: string) {
    if (!confirm(`Are you sure you want to delete the group "${name}"?`)) return;

    try {
      const res = await fetch(`/api/admin/groups?id=${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to delete group");
        return;
      }

      await load();
    } catch {
      alert("Failed to delete group");
    }
  }

  function startEdit(group: Group) {
    setEditingId(group.id);
    setEditName(group.name);
    setEditDescription(group.description);
    setEditType(group.type);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName("");
    setEditDescription("");
    setEditType("");
  }

  if (loading) {
    return (
      <>
        <PageHeader title="Group Management" subtitle="Manage approver and assignment groups" />
        <div className="p-6 text-sm text-gray-500">Loading...</div>
      </>
    );
  }

  if (!isAdmin) {
    return (
      <>
        <PageHeader title="Group Management" subtitle="Manage approver and assignment groups" />
        <div className="p-6">
          <Card className="p-6">
            <div className="flex items-center gap-3 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
              <span>Access denied. Admin privileges required.</span>
            </div>
          </Card>
        </div>
      </>
    );
  }

  const activeGroups = groups.filter(g => g.isActive);
  const inactiveGroups = groups.filter(g => !g.isActive);

  return (
    <>
      <PageHeader
        title="Group Management"
        subtitle="Manage approver and assignment groups"
        actions={
          <button
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" />
            Add Group
          </button>
        }
      />

      <div className="space-y-6 p-4 md:p-6">
        {error && (
          <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Add Group Form */}
        {showForm && (
          <Card className="p-4">
            <h3 className="mb-4 text-sm font-semibold">Add New Group</h3>
            <form onSubmit={addGroup} className="grid gap-4 md:grid-cols-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">Name *</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g., CAB, Security Team"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">Description</label>
                <input
                  type="text"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Optional description"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">Type</label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                >
                  {GROUP_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end gap-2">
                <button
                  type="submit"
                  disabled={submitting || !formName.trim()}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {submitting ? "Adding..." : "Add"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                >
                  Cancel
                </button>
              </div>
            </form>
          </Card>
        )}

        {/* Active Groups */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="rounded-lg bg-indigo-50 p-2 dark:bg-indigo-900/30">
                <Users className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              </div>
              Active Groups
            </CardTitle>
            <CardDescription>{activeGroups.length} groups available</CardDescription>
          </CardHeader>

          <div className="px-4 pb-4">
            {activeGroups.length === 0 ? (
              <p className="text-sm text-gray-500 italic">No groups configured. Click "Add Group" to create one.</p>
            ) : (
              <div className="space-y-2">
                {activeGroups.map((group) => (
                  <div
                    key={group.id}
                    className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-800/50"
                  >
                    {editingId === group.id ? (
                      <div className="flex flex-1 items-center gap-3">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-40 rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-800"
                        />
                        <input
                          type="text"
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          placeholder="Description"
                          className="w-48 rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-800"
                        />
                        <select
                          value={editType}
                          onChange={(e) => setEditType(e.target.value)}
                          className="rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-800"
                        >
                          {GROUP_TYPES.map((t) => (
                            <option key={t.value} value={t.value}>{t.label}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => updateGroup(group.id)}
                          className="rounded p-1 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                          title="Save"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="rounded p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                          title="Cancel"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-3">
                          <Users className="h-4 w-4 text-gray-400" />
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {group.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {GROUP_TYPES.find(t => t.value === group.type)?.label || group.type}
                              {group.description && ` • ${group.description}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => startEdit(group)}
                            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700"
                            title="Edit group"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => deleteGroup(group.id, group.name)}
                            className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
                            title="Delete group"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Inactive Groups */}
        {inactiveGroups.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-500">
                <div className="rounded-lg bg-gray-100 p-2 dark:bg-gray-800">
                  <Users className="h-4 w-4 text-gray-400" />
                </div>
                Inactive Groups
              </CardTitle>
              <CardDescription>{inactiveGroups.length} groups archived</CardDescription>
            </CardHeader>

            <div className="px-4 pb-4">
              <div className="space-y-2">
                {inactiveGroups.map((group) => (
                  <div
                    key={group.id}
                    className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50/50 px-4 py-3 opacity-60 dark:border-gray-800 dark:bg-gray-800/30"
                  >
                    <div className="flex items-center gap-3">
                      <Users className="h-4 w-4 text-gray-300" />
                      <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          {group.name}
                        </p>
                        <p className="text-xs text-gray-400">
                          {GROUP_TYPES.find(t => t.value === group.type)?.label || group.type}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        )}
      </div>
    </>
  );
}
