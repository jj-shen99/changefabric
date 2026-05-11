"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import { PageHeader } from "@/components/page-header";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/card";
import { Shield, Plus, Trash2, Users, AlertTriangle, Zap, FileText } from "lucide-react";
import Link from "next/link";

interface Approver {
  id: string;
  crType: string;
  approverEmail: string;
  approverGroup: string | null;
  stepName: string;
  ordering: number;
  isActive: boolean;
  createdBy: string;
}

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface GroupSuggestion {
  id: string;
  name: string;
  description: string;
  type: string;
}

const CR_TYPES = [
  { value: "standard", label: "Standard", icon: FileText, color: "text-blue-600", bg: "bg-blue-50", description: "Pre-approved low-risk changes" },
  { value: "normal", label: "Normal", icon: Shield, color: "text-amber-600", bg: "bg-amber-50", description: "Standard changes requiring approval" },
  { value: "emergency", label: "Emergency", icon: Zap, color: "text-red-600", bg: "bg-red-50", description: "Urgent changes with expedited approval" },
];

export default function ApproversPage() {
  const [approvers, setApprovers] = useState<Approver[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState("normal");
  const [formEmail, setFormEmail] = useState("");
  const [formGroup, setFormGroup] = useState("");
  const [formStep, setFormStep] = useState("Default");
  const [formOrdering, setFormOrdering] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // Group autocomplete state
  const [groupSuggestions, setGroupSuggestions] = useState<GroupSuggestion[]>([]);
  const [showGroupSuggestions, setShowGroupSuggestions] = useState(false);
  const [allGroups, setAllGroups] = useState<GroupSuggestion[]>([]);
  const groupInputRef = useRef<HTMLInputElement>(null);

  // Load all groups on mount for dropdown
  useEffect(() => {
    async function loadGroups() {
      try {
        const res = await fetch("/api/groups/search?type=approver&limit=50");
        if (res.ok) {
          const data = await res.json();
          setAllGroups(data.groups || []);
        }
      } catch {
        // Ignore errors
      }
    }
    loadGroups();
  }, []);

  // Filter group suggestions when typing
  useEffect(() => {
    if (!formGroup.trim()) {
      // Show all groups when input is empty but focused
      setGroupSuggestions(allGroups);
      return;
    }

    // Filter groups based on input
    const filtered = allGroups.filter(g => 
      g.name.toLowerCase().includes(formGroup.toLowerCase())
    );
    setGroupSuggestions(filtered);
  }, [formGroup, allGroups]);

  function selectGroup(group: GroupSuggestion) {
    setFormGroup(group.name);
    setShowGroupSuggestions(false);
    groupInputRef.current?.focus();
  }

  function handleGroupFocus() {
    // Show suggestions when input is focused
    if (groupSuggestions.length > 0 || allGroups.length > 0) {
      setShowGroupSuggestions(true);
      if (groupSuggestions.length === 0) {
        setGroupSuggestions(allGroups);
      }
    }
  }

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Check if user has permission
      const sessionRes = await fetch("/api/auth/session");
      const session = await sessionRes.json();
      const userRoles = session?.user?.roles || [];
      const permissions = session?.user?.permissions || {};
      const hasAccess = userRoles.includes("admin") || permissions.canManageUsers;
      setIsAdmin(userRoles.includes("admin"));

      if (!hasAccess) {
        setError("Access denied. Admin privileges required.");
        setLoading(false);
        return;
      }

      // Fetch approvers
      const approversRes = await fetch("/api/admin/cr-type-approvers");
      if (!approversRes.ok) throw new Error("Failed to load approvers");
      const approversData = await approversRes.json();
      setApprovers(approversData.approvers || []);

      // Fetch users for dropdown
      const usersRes = await fetch("/api/admin/users");
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsers(usersData.users || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function addApprover(e: React.FormEvent) {
    e.preventDefault();
    if (!formEmail) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/cr-type-approvers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          crType: formType,
          approverEmail: formEmail,
          approverGroup: formGroup || null,
          stepName: formStep,
          ordering: formOrdering,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to add approver");
        return;
      }

      setShowForm(false);
      setFormEmail("");
      setFormGroup("");
      setFormStep("Default");
      setFormOrdering(1);
      await load();
    } finally {
      setSubmitting(false);
    }
  }

  async function removeApprover(id: string) {
    if (!confirm("Are you sure you want to remove this approver?")) return;

    try {
      const res = await fetch(`/api/admin/cr-type-approvers?id=${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to remove approver");
        return;
      }

      await load();
    } catch {
      alert("Failed to remove approver");
    }
  }

  if (loading) {
    return (
      <>
        <PageHeader title="CR Type Approvers" subtitle="Manage default approvers for each change request type" />
        <div className="p-6 text-sm text-gray-500">Loading...</div>
      </>
    );
  }

  if (!isAdmin) {
    return (
      <>
        <PageHeader title="CR Type Approvers" subtitle="Manage default approvers for each change request type" />
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

  return (
    <>
      <PageHeader
        title="CR Type Approvers"
        subtitle="Manage default approvers for each change request type"
        actions={
          <button
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" />
            Add Approver
          </button>
        }
      />

      <div className="space-y-6 p-4 md:p-6">
        {error && (
          <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Add Approver Form */}
        {showForm && (
          <Card className="p-4">
            <h3 className="mb-4 text-sm font-semibold">Add Default Approver</h3>
            <form onSubmit={addApprover} className="grid gap-4 md:grid-cols-5">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">CR Type</label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                >
                  {CR_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">Approver</label>
                <select
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                  required
                >
                  <option value="">Select user...</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.email}>{u.name} ({u.email})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">Step Name</label>
                <input
                  type="text"
                  value={formStep}
                  onChange={(e) => setFormStep(e.target.value)}
                  placeholder="e.g., Tech Review, CAB"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                />
              </div>
              <div className="relative">
                <label className="mb-1 block text-xs font-medium text-gray-500">
                  Group (optional)
                  <Link href="/settings/groups" className="ml-2 text-indigo-600 hover:underline">
                    Manage
                  </Link>
                </label>
                <input
                  ref={groupInputRef}
                  type="text"
                  value={formGroup}
                  onChange={(e) => setFormGroup(e.target.value)}
                  onFocus={handleGroupFocus}
                  onBlur={() => setTimeout(() => setShowGroupSuggestions(false), 150)}
                  placeholder="Select or type a group..."
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                  autoComplete="off"
                />
                {showGroupSuggestions && groupSuggestions.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
                    {groupSuggestions.map((group) => (
                      <button
                        key={group.id}
                        type="button"
                        onClick={() => selectGroup(group)}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        <Users className="h-4 w-4 text-gray-400" />
                        <div>
                          <div className="font-medium">{group.name}</div>
                          {group.description && (
                            <div className="text-xs text-gray-500">{group.description}</div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-end gap-2">
                <button
                  type="submit"
                  disabled={submitting || !formEmail}
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

        {/* Approvers by CR Type */}
        {CR_TYPES.map((type) => {
          const typeApprovers = approvers.filter((a) => a.crType === type.value);
          const TypeIcon = type.icon;

          return (
            <Card key={type.value}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className={`rounded-lg p-2 ${type.bg}`}>
                    <TypeIcon className={`h-4 w-4 ${type.color}`} />
                  </div>
                  {type.label} Changes
                </CardTitle>
                <CardDescription>{type.description}</CardDescription>
              </CardHeader>

              <div className="px-4 pb-4">
                {typeApprovers.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">No default approvers configured</p>
                ) : (
                  <div className="space-y-2">
                    {typeApprovers.map((approver) => (
                      <div
                        key={approver.id}
                        className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-800/50"
                      >
                        <div className="flex items-center gap-3">
                          <Users className="h-4 w-4 text-gray-400" />
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {approver.approverEmail}
                            </p>
                            <p className="text-xs text-gray-500">
                              Step: {approver.stepName}
                              {approver.approverGroup && ` • Group: ${approver.approverGroup}`}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => removeApprover(approver.id)}
                          className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
                          title="Remove approver"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </>
  );
}
