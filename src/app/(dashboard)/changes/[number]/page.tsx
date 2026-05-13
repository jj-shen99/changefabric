"use client";

/**
 * /changes/[number] — full CR detail with workflow transitions, multi-person
 * approval steps, comments, and impact + ML analysis. Backed by /api/v2.
 */

import { useCallback, useEffect, useState, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, Send, MessageSquare, ShieldCheck, Activity, Pencil, Save, X, Lock, Info, UserPlus, Eye, Trash2, CheckCircle2, XCircle, AlertTriangle, TrendingUp, TrendingDown, Shield, FileText, Clock, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/card";

interface CR {
  number: string;
  title: string;
  description: string;
  state: string;
  approvalState: string;
  workflowKey: string;
  type: string;
  category: string;
  priority: string;
  riskLevel: string;
  impactLevel: string;
  computedRiskScore: number;
  mlRiskScore: number | null;
  mlConfidence: number | null;
  mlExplanation: string | null;
  requestedBy: string;
  assignedTo: string | null;
  assignmentGroup: string | null;
  affectedServices: string[];
  plannedStart: string | null;
  plannedEnd: string | null;
  implementationPlan: string;
  backoutPlan: string;
  testPlan: string;
  riskAndImpactAnalysis: string;
  justification: string;
  createdAt: string;
}

interface Approval {
  id: string;
  approverEmail: string;
  approverGroup: string | null;
  decision: string;
  comment: string | null;
  decidedAt: string | null;
}
interface ApprovalStep {
  id: string;
  name: string;
  ordering: number;
  policy: string;
  status: string;
  startedAt: string | null;
  completedAt: string | null;
  approvals: Approval[];
}
interface Comment {
  id: string;
  authorEmail: string;
  body: string;
  visibility: string;
  createdAt: string;
}
interface Transition {
  event: string;
  from: string;
  to: string;
  description?: string;
}

interface UserAccess {
  canEdit: boolean;
  isApproverOnly: boolean;
  isOwner: boolean;
  isAssigned: boolean;
  isApprover: boolean;
  isPreApproved: boolean;
  isAdmin: boolean;
  isImported: boolean;
  isPostApproval: boolean;
  currentUserEmail: string;
}

export default function ChangeDetailPage({ params }: { params: { number: string } }) {
  const crNumber = params.number;
  const router = useRouter();
  
  const [cr, setCR] = useState<CR | null>(null);
  const [steps, setSteps] = useState<ApprovalStep[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [transitions, setTransitions] = useState<Transition[]>([]);
  const [userAccess, setUserAccess] = useState<UserAccess | null>(null);
  const [analysis, setAnalysis] = useState<{ impact?: Record<string, unknown>; ml?: Record<string, unknown> } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<"overview" | "approvals" | "comments" | "activity" | "analysis">("overview");
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<CR>>({});
  
  // Assigned To user autocomplete state for edit mode
  const [assignedToSearch, setAssignedToSearch] = useState("");
  const [assignedToSuggestions, setAssignedToSuggestions] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const [showAssignedToDropdown, setShowAssignedToDropdown] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setCR(null); // Reset CR when loading new one
    setAnalysis(null); // Reset analysis
    try {
      const res = await fetch(`/api/v2/changes/${crNumber}`, { cache: "no-store" });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setCR(data.changeRequest);
      setSteps(data.approvalSteps);
      setComments(data.comments);
      setTransitions(data.availableTransitions ?? []);
      setUserAccess(data.userAccess ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [crNumber]);

  useEffect(() => { void load(); }, [load]);

  // Search users for Assigned To autocomplete in edit mode
  // Only show users with implementer or manager roles (who can implement changes)
  useEffect(() => {
    if (assignedToSearch.length < 1) {
      setAssignedToSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(assignedToSearch)}&role=assignable`);
        if (res.ok) {
          const data = await res.json();
          setAssignedToSuggestions(data.users || []);
          setShowAssignedToDropdown((data.users || []).length > 0);
        }
      } catch {
        // Ignore search errors
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [assignedToSearch]);

  async function fireTransition(event: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/v2/changes/${crNumber}/transitions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event }),
      });
      if (!res.ok) {
        const e = await res.json();
        alert(e.error || "Transition failed");
      } else {
        await load();
      }
    } finally {
      setBusy(false);
    }
  }

  async function decide(stepId: string, decision: "approved" | "rejected", comment?: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/v2/changes/${crNumber}/approvals/${stepId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, comment }),
      });
      if (!res.ok) {
        const e = await res.json();
        alert(e.error || "Approval failed");
      } else {
        await load();
      }
    } finally {
      setBusy(false);
    }
  }

  async function addComment(body: string) {
    if (!body.trim()) return;
    const res = await fetch(`/api/v2/changes/${crNumber}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });
    if (res.ok) await load();
  }

  async function runAnalysis() {
    setBusy(true);
    try {
      const res = await fetch(`/api/v2/changes/${crNumber}/analyze`);
      const data = await res.json();
      setAnalysis(data);
      setTab("analysis");
    } finally {
      setBusy(false);
    }
  }

  function startEdit() {
    if (!cr) return;
    // For post-approval CRs, only allow editing limited fields
    if (userAccess?.isPostApproval) {
      setEditForm({
        assignedTo: cr.assignedTo,
        plannedStart: cr.plannedStart,
        plannedEnd: cr.plannedEnd,
      });
    } else {
      setEditForm({
        title: cr.title,
        description: cr.description,
        justification: cr.justification,
        implementationPlan: cr.implementationPlan,
        backoutPlan: cr.backoutPlan,
        testPlan: cr.testPlan,
        riskAndImpactAnalysis: cr.riskAndImpactAnalysis,
        assignedTo: cr.assignedTo,
        assignmentGroup: cr.assignmentGroup,
        riskLevel: cr.riskLevel,
        impactLevel: cr.impactLevel,
        priority: cr.priority,
        category: cr.category,
        plannedStart: cr.plannedStart,
        plannedEnd: cr.plannedEnd,
      });
    }
    setEditing(true);
  }

  async function saveEdit() {
    setBusy(true);
    try {
      const res = await fetch(`/api/v2/changes/${crNumber}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (!res.ok) {
        const e = await res.json();
        alert(e.error || "Update failed");
      } else {
        setEditing(false);
        await load();
      }
    } finally {
      setBusy(false);
    }
  }

  async function deleteCR() {
    if (!confirm(`Are you sure you want to delete change request ${crNumber}?\n\nThis will permanently remove the CR and all associated data (approvals, comments, audit logs).\n\nThis action cannot be undone.`)) {
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/v2/changes/${crNumber}`, { method: "DELETE" });
      if (!res.ok) {
        const e = await res.json();
        alert(e.error || "Delete failed");
      } else {
        router.push("/changes");
      }
    } finally {
      setBusy(false);
    }
  }

  const isClosed = cr?.state === "closed" || cr?.state === "canceled" || cr?.state === "rejected";

  if (loading) return <div className="p-6 text-sm text-gray-500">Loading…</div>;
  if (error || !cr) return <div className="p-6 text-sm text-rose-600">Error: {error ?? "not found"}</div>;

  return (
    <>
      <PageHeader
        title={`${cr.number} — ${cr.title}`}
        actions={
          <Link href="/changes" className="inline-flex items-center gap-2 rounded-lg border border-white/30 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/10">
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </Link>
        }
      />
    <div className="space-y-4 p-4 md:p-6">
      {/* Approver-only notice */}
      {userAccess?.isApproverOnly && (
        <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
          <Eye className="h-4 w-4" />
          <span>You have <strong>read-only</strong> access to this CR as an approver. You can view details and make approval decisions.</span>
        </div>
      )}
      
      {/* Header summary */}
      <Card>
        <div className="flex flex-wrap items-center gap-3 p-4">
          <Pill tone="indigo">state: {cr.state}</Pill>
          <Pill tone="emerald">type: {cr.type}</Pill>
          <Pill tone="rose">risk: {cr.riskLevel}</Pill>
          <div className="ml-auto flex items-center gap-3 text-xs">
            <span><strong>Score:</strong> {Math.round(cr.computedRiskScore)}</span>
            {cr.mlRiskScore !== null && cr.mlRiskScore !== undefined && <span><strong>ML:</strong> {Math.round(cr.mlRiskScore)} ({Math.round((cr.mlConfidence ?? 0) * 100)}% conf)</span>}
            <button onClick={runAnalysis} disabled={busy} className="rounded-lg border border-gray-200 px-2 py-1 text-xs hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800">
              <Activity className="mr-1 inline h-3 w-3" /> Re-analyze
            </button>
          </div>
        </div>
        {/* Workflow transitions - only show for CR owner, assigned user, or admin - not for approver-only users */}
        {/* In draft state, only show submit button to owner */}
        {transitions.length > 0 && (userAccess?.isOwner || userAccess?.isAssigned || userAccess?.isAdmin) && !userAccess?.isApproverOnly && (
          <div className="border-t border-gray-100 px-4 py-3 dark:border-gray-800">
            <div className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">Workflow actions</div>
            <div className="flex flex-wrap gap-2">
              {transitions
                .filter((t) => {
                  // In draft state, only show submit button to owner
                  if (cr.state === "draft") {
                    if (t.event === "submit") {
                      return userAccess?.isOwner;
                    }
                    // Show cancel button for managers/admins
                    if (t.event === "cancel") {
                      return userAccess?.isAdmin;
                    }
                    return false;
                  }
                  // Submit button should only be visible to CR requester (owner)
                  if (t.event === "submit") {
                    return userAccess?.isOwner;
                  }
                  // Hide 'approve' and 'approve_emergency' buttons - approval happens via approval steps UI
                  if (t.event === "approve" || t.event === "approve_emergency") {
                    return false;
                  }
                  // Hide 'reject' workflow action for approver-only users - they use the reject button in approval steps
                  if (t.event === "reject" && userAccess?.isApproverOnly) {
                    return false;
                  }
                  return true;
                })
                .map((t) => (
                <button
                  key={t.event}
                  disabled={busy}
                  onClick={() => fireTransition(t.event)}
                  className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white shadow hover:bg-indigo-700 disabled:opacity-50"
                  title={`${t.from} → ${t.to}`}
                >
                  <Send className="h-3 w-3" />
                  {t.event}
                </button>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-800">
        {(["overview", "approvals", "comments", "activity", "analysis"] as const).map((t) => {
          // Hide approvals tab for pre-approved workflows, disable for closed CRs
          const isPreApproved = userAccess?.isPreApproved;
          const isHidden = t === "approvals" && isPreApproved;
          const isDisabled = t === "approvals" && isClosed;
          
          if (isHidden) return null;
          
          return (
            <button
              key={t}
              onClick={() => !isDisabled && setTab(t)}
              disabled={isDisabled}
              className={`px-4 py-2 text-sm font-medium flex items-center gap-1.5 ${
                isDisabled
                  ? "text-gray-300 dark:text-gray-600 cursor-not-allowed"
                  : tab === t
                  ? "border-b-2 border-indigo-600 text-indigo-700 dark:text-indigo-400"
                  : "text-gray-500 hover:text-gray-700"
              }`}
              title={isDisabled ? "Approvals are locked for closed/canceled/rejected CRs" : undefined}
            >
              {isDisabled && <Lock className="h-3 w-3" />}
              {t}
            </button>
          );
        })}
      </div>

      {tab === "overview" && (
        <Card>
          {/* Edit/Save/Delete buttons */}
          <div className="flex items-center justify-end gap-2 border-b border-gray-100 px-4 py-2 dark:border-gray-800">
            {!editing ? (
              <>
                {/* Delete button - only for admins: imported CRs or CRs in draft/awaiting_approval state */}
                {userAccess?.isAdmin && (userAccess?.isImported || cr.state === "draft" || cr.state === "awaiting_approval") && (
                  <button
                    onClick={deleteCR}
                    disabled={busy}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 disabled:opacity-50 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40"
                    title={userAccess?.isImported ? "Delete this imported change request" : `Delete this ${cr.state} change request`}
                  >
                    <Trash2 className="h-3 w-3" /> Delete
                  </button>
                )}
                {/* Edit button - only CR owner (creator) can edit */}
                {userAccess?.isOwner ? (
                  <button
                    onClick={startEdit}
                    disabled={isClosed}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    title={isClosed ? "Cannot edit closed/canceled/rejected CRs" : "Edit change request"}
                  >
                    <Pencil className="h-3 w-3" /> Edit
                  </button>
                ) : (
                  <span className="text-xs text-gray-500 italic">Read-only access</span>
                )}
              </>
            ) : (
              <>
                <button
                  onClick={() => setEditing(false)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                >
                  <X className="h-3 w-3" /> Cancel
                </button>
                <button
                  onClick={saveEdit}
                  disabled={busy}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  <Save className="h-3 w-3" /> Save Changes
                </button>
              </>
            )}
          </div>

          {!editing ? (
            /* View Mode */
            <div className="grid gap-6 p-4 md:grid-cols-2">
              <Section title="Description" body={cr.description} />
              <Section title="Justification" body={cr.justification} />
              <Section title="Implementation Plan" body={cr.implementationPlan} />
              <Section title="Backout Plan" body={cr.backoutPlan} />
              <Section title="Test Plan" body={cr.testPlan} />
              <Section title="Risk & Impact Analysis" body={cr.riskAndImpactAnalysis} />
              <div>
                <H>People</H>
                <Kv k="Requested by" v={cr.requestedBy} />
                <Kv k="Assigned to" v={cr.assignedTo ?? "—"} />
                <Kv k="Group" v={cr.assignmentGroup ?? "—"} />
              </div>
              <div>
                <H>Schedule</H>
                <Kv k="Planned start" v={cr.plannedStart ? new Date(cr.plannedStart).toLocaleString() : "—"} />
                <Kv k="Planned end" v={cr.plannedEnd ? new Date(cr.plannedEnd).toLocaleString() : "—"} />
                <Kv k="Created" v={new Date(cr.createdAt).toLocaleString()} />
              </div>
              <div className="md:col-span-2">
                <H>Affected Services</H>
                <div className="flex flex-wrap gap-1">
                  {cr.affectedServices.length === 0 ? (
                    <span className="text-xs text-gray-400">none</span>
                  ) : (
                    cr.affectedServices.map((s) => (
                      <span key={s} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs dark:bg-gray-800">{s}</span>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Edit Mode */
            <div className="grid gap-4 p-4 md:grid-cols-2">
              {/* Post-approval notice */}
              {userAccess?.isPostApproval && (
                <div className="md:col-span-2 rounded-lg bg-amber-50 border border-amber-200 p-3 dark:bg-amber-950/30 dark:border-amber-800">
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    <strong>Limited editing:</strong> This CR is approved. Only Assigned To and Planned Dates can be modified.
                  </p>
                </div>
              )}
              
              {/* Full edit fields - only shown pre-approval */}
              {!userAccess?.isPostApproval && (
                <>
                  <EditField label="Title" value={editForm.title ?? ""} onChange={(v) => setEditForm({ ...editForm, title: v })} />
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-500">Risk Level</label>
                      <select
                        value={editForm.riskLevel ?? ""}
                        onChange={(e) => setEditForm({ ...editForm, riskLevel: e.target.value })}
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                      >
                        <option value="low">Low</option>
                        <option value="moderate">Moderate</option>
                        <option value="high">High</option>
                        <option value="very_high">Very High</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-500">Impact Level</label>
                      <select
                        value={editForm.impactLevel ?? ""}
                        onChange={(e) => setEditForm({ ...editForm, impactLevel: e.target.value })}
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                      >
                        <option value="1">1 - High</option>
                        <option value="2">2 - Medium</option>
                        <option value="3">3 - Low</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-500">Priority</label>
                      <select
                        value={editForm.priority ?? ""}
                        onChange={(e) => setEditForm({ ...editForm, priority: e.target.value })}
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                      >
                        <option value="1">1 - Critical</option>
                        <option value="2">2 - High</option>
                        <option value="3">3 - Moderate</option>
                        <option value="4">4 - Low</option>
                      </select>
                    </div>
                  </div>
                  <EditTextarea label="Description" value={editForm.description ?? ""} onChange={(v) => setEditForm({ ...editForm, description: v })} />
                  <EditTextarea label="Justification" value={editForm.justification ?? ""} onChange={(v) => setEditForm({ ...editForm, justification: v })} />
                  <EditTextarea label="Implementation Plan" value={editForm.implementationPlan ?? ""} onChange={(v) => setEditForm({ ...editForm, implementationPlan: v })} rows={6} />
                  <EditTextarea label="Backout Plan" value={editForm.backoutPlan ?? ""} onChange={(v) => setEditForm({ ...editForm, backoutPlan: v })} rows={6} />
                  <EditTextarea label="Test Plan" value={editForm.testPlan ?? ""} onChange={(v) => setEditForm({ ...editForm, testPlan: v })} rows={6} />
                  <EditTextarea label="Risk & Impact Analysis" value={editForm.riskAndImpactAnalysis ?? ""} onChange={(v) => setEditForm({ ...editForm, riskAndImpactAnalysis: v })} rows={6} />
                </>
              )}
              
              {/* Assigned To - always editable */}
              <div className="grid grid-cols-2 gap-2">
                <div className="relative">
                  <label className="mb-1 block text-xs font-medium text-gray-500">Assigned To</label>
                  {editForm.assignedTo ? (
                    <div className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 dark:border-gray-700">
                      <span className="flex-1 text-sm">{editForm.assignedTo}</span>
                      <button
                        type="button"
                        onClick={() => setEditForm({ ...editForm, assignedTo: null })}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <input
                        type="text"
                        value={assignedToSearch}
                        onChange={(e) => setAssignedToSearch(e.target.value)}
                        onFocus={() => assignedToSuggestions.length > 0 && setShowAssignedToDropdown(true)}
                        onBlur={() => setTimeout(() => setShowAssignedToDropdown(false), 200)}
                        placeholder="Type to search users..."
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                      />
                      {showAssignedToDropdown && assignedToSuggestions.length > 0 && (
                        <ul className="absolute z-10 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
                          {assignedToSuggestions.map((user) => (
                            <li
                              key={user.id}
                              className="cursor-pointer px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700"
                              onMouseDown={() => {
                                setEditForm({ ...editForm, assignedTo: user.email });
                                setAssignedToSearch("");
                                setAssignedToSuggestions([]);
                                setShowAssignedToDropdown(false);
                              }}
                            >
                              <div className="font-medium text-sm text-gray-900 dark:text-gray-100">{user.name}</div>
                              <div className="text-xs text-gray-500">{user.email}</div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </>
                  )}
                </div>
                {/* Assignment Group - only shown pre-approval */}
                {!userAccess?.isPostApproval && (
                  <EditField label="Assignment Group" value={editForm.assignmentGroup ?? ""} onChange={(v) => setEditForm({ ...editForm, assignmentGroup: v || null })} placeholder="Team name" />
                )}
              </div>
              
              {/* Category - only shown pre-approval */}
              {!userAccess?.isPostApproval && (
                <EditField label="Category" value={editForm.category ?? ""} onChange={(v) => setEditForm({ ...editForm, category: v })} />
              )}
              
              {/* Planned dates - always editable */}
              <div className="grid grid-cols-2 gap-3 md:col-span-2 pb-48">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Planned start</label>
                  <input
                    type="datetime-local"
                    value={editForm.plannedStart ? new Date(editForm.plannedStart).toISOString().slice(0, 16) : ""}
                    onChange={(e) => setEditForm({ ...editForm, plannedStart: e.target.value ? new Date(e.target.value).toISOString() : null })}
                    min={new Date().toISOString().slice(0, 16)}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Planned end</label>
                  <input
                    type="datetime-local"
                    value={editForm.plannedEnd ? new Date(editForm.plannedEnd).toISOString().slice(0, 16) : ""}
                    onChange={(e) => setEditForm({ ...editForm, plannedEnd: e.target.value ? new Date(e.target.value).toISOString() : null })}
                    min={editForm.plannedStart ? new Date(editForm.plannedStart).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16)}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                  />
                </div>
              </div>
            </div>
          )}
        </Card>
      )}

      {tab === "approvals" && !isClosed && (
        <ApprovalsTab steps={steps} crNumber={cr.number} onDecide={decide} onChange={load} busy={busy} currentUserEmail={userAccess?.currentUserEmail || null} canManageSteps={userAccess?.isOwner || false} />
      )}

      {tab === "approvals" && isClosed && (
        <Card>
          <div className="flex flex-col items-center justify-center gap-3 p-8 text-center">
            <Lock className="h-8 w-8 text-gray-400" />
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Approvals are locked</p>
            <p className="text-xs text-gray-500">This change request is {cr.state}. Approval actions are no longer available.</p>
          </div>
        </Card>
      )}

      {tab === "comments" && (
        <CommentsTab comments={comments} onAdd={addComment} />
      )}

      {tab === "activity" && (
        <ActivityTab crNumber={cr.number} />
      )}

      {tab === "analysis" && (
        <AnalysisTab cr={cr} analysis={analysis} onRun={runAnalysis} busy={busy} />
      )}
    </div>
    </>
  );
}

function Section({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <H>{title}</H>
      <p className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">{body || <span className="text-gray-400">—</span>}</p>
    </div>
  );
}
function H({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">{children}</h3>;
}
function Kv({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3 text-sm">
      <span className="text-gray-500">{k}</span>
      <span className="font-medium text-gray-800 dark:text-gray-200">{v}</span>
    </div>
  );
}
function Pill({ children, tone }: { children: React.ReactNode; tone: "indigo" | "amber" | "rose" | "emerald" | "gray" }) {
  const tones: Record<string, string> = {
    indigo: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
    amber: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    rose: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
    emerald: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
    gray: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  };
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${tones[tone]}`}>{children}</span>;
}

/* ─── Tabs ─────────────────────────────────────────────────────── */

interface UserSuggestion {
  id: string;
  name: string;
  email: string;
}

function ApprovalsTab({
  steps,
  crNumber,
  onDecide,
  onChange,
  busy,
  currentUserEmail,
  canManageSteps,
}: {
  steps: ApprovalStep[];
  crNumber: string;
  onDecide: (stepId: string, d: "approved" | "rejected", c?: string) => void;
  onChange: () => void;
  busy: boolean;
  currentUserEmail: string | null;
  canManageSteps: boolean;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [policy, setPolicy] = useState("all");
  const [ordering, setOrdering] = useState(0);
  const [approverInput, setApproverInput] = useState("");
  const [selectedApprovers, setSelectedApprovers] = useState<UserSuggestion[]>([]);
  const [suggestions, setSuggestions] = useState<UserSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Search users as user types
  useEffect(() => {
    if (approverInput.length < 1) {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(approverInput)}`);
        if (res.ok) {
          const data = await res.json();
          // Filter out already selected users
          const filtered = data.users.filter(
            (u: UserSuggestion) => !selectedApprovers.some(s => s.email === u.email)
          );
          setSuggestions(filtered);
          setShowSuggestions(filtered.length > 0);
        }
      } catch {
        // Ignore search errors
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [approverInput, selectedApprovers]);

  function addApprover(user: UserSuggestion) {
    setSelectedApprovers([...selectedApprovers, user]);
    setApproverInput("");
    setSuggestions([]);
    setShowSuggestions(false);
    inputRef.current?.focus();
  }

  function removeApprover(email: string) {
    setSelectedApprovers(selectedApprovers.filter(a => a.email !== email));
  }

  async function addStep() {
    if (!name || selectedApprovers.length === 0) {
      alert("Need a name and at least one approver");
      return;
    }
    const list = selectedApprovers.map((u) => ({ email: u.email }));
    const res = await fetch(`/api/v2/changes/${crNumber}/approvals`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, ordering, policy, approvers: list }),
    });
    if (res.ok) {
      setName(""); setSelectedApprovers([]); setShowAdd(false);
      onChange();
    } else {
      const e = await res.json();
      alert(e.error || "Failed");
    }
  }

  return (
    <Card>
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-800">
        <h3 className="flex items-center gap-2 text-sm font-semibold"><ShieldCheck className="h-4 w-4" /> Approval Steps</h3>
        {/* Only CR owner can add/manage approval steps */}
        {canManageSteps && (
          <button onClick={() => setShowAdd((s) => !s)} className="rounded-lg border border-gray-200 px-2 py-1 text-xs hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800">
            {showAdd ? "Cancel" : "+ Add step"}
          </button>
        )}
      </div>
      {showAdd && canManageSteps && (
        <div className="space-y-3 border-b border-gray-100 p-4 text-sm dark:border-gray-800">
          {/* Field explanations */}
          <div className="rounded-lg bg-blue-50 p-3 text-xs text-blue-700 dark:bg-blue-950 dark:text-blue-300">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <div className="space-y-1">
                <p><strong>Step Name:</strong> A label for this approval stage (e.g., &quot;Manager Review&quot;, &quot;CAB&quot;, &quot;Security Team&quot;)</p>
                <p><strong>Order:</strong> The sequence number - lower numbers are processed first (0, 1, 2...)</p>
                <p><strong>Policy:</strong> How approvals are counted - &quot;all&quot; requires everyone, &quot;any&quot; needs just one, &quot;quorum:N&quot; needs N approvals</p>
                <p><strong>Approvers:</strong> Start typing a name to search and select team members</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Step Name</label>
              <input 
                className="w-full rounded-lg border border-gray-200 px-3 py-2 dark:border-gray-700 dark:bg-gray-900" 
                placeholder="e.g., Manager Review, CAB, Security" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Order (execution sequence)</label>
              <input 
                className="w-full rounded-lg border border-gray-200 px-3 py-2 dark:border-gray-700 dark:bg-gray-900" 
                type="number" 
                placeholder="0" 
                value={ordering} 
                onChange={(e) => setOrdering(parseInt(e.target.value) || 0)} 
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Approval Policy</label>
              <select 
                className="w-full rounded-lg border border-gray-200 px-3 py-2 dark:border-gray-700 dark:bg-gray-900" 
                value={policy} 
                onChange={(e) => setPolicy(e.target.value)}
              >
                <option value="all">All must approve (unanimous)</option>
                <option value="any">Any one can approve</option>
                <option value="quorum:2">At least 2 must approve</option>
                <option value="quorum:3">At least 3 must approve</option>
              </select>
            </div>
            <div className="relative">
              <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Add Approvers</label>
              <div className="relative">
                <UserPlus className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input 
                  ref={inputRef}
                  className="w-full rounded-lg border border-gray-200 pl-9 pr-3 py-2 dark:border-gray-700 dark:bg-gray-900" 
                  placeholder="Type a name to search..." 
                  value={approverInput} 
                  onChange={(e) => setApproverInput(e.target.value)}
                  onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                />
              </div>
              {/* Suggestions dropdown */}
              {showSuggestions && suggestions.length > 0 && (
                <ul className="absolute z-10 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
                  {suggestions.map((user) => (
                    <li 
                      key={user.id}
                      className="cursor-pointer px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700"
                      onMouseDown={() => addApprover(user)}
                    >
                      <div className="font-medium text-gray-900 dark:text-gray-100">{user.name}</div>
                      <div className="text-xs text-gray-500">{user.email}</div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Selected approvers */}
          {selectedApprovers.length > 0 && (
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Selected Approvers</label>
              <div className="flex flex-wrap gap-2">
                {selectedApprovers.map((user) => (
                  <span 
                    key={user.email}
                    className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-3 py-1 text-sm text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300"
                  >
                    {user.name}
                    <button 
                      type="button"
                      onClick={() => removeApprover(user.email)}
                      className="ml-1 rounded-full p-0.5 hover:bg-indigo-200 dark:hover:bg-indigo-800"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          <button 
            onClick={addStep} 
            disabled={busy || !name || selectedApprovers.length === 0} 
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            Create Approval Step
          </button>
        </div>
      )}
      {steps.length === 0 ? (
        <div className="p-6 text-sm text-gray-500">No approval steps yet. Click &quot;+ Add step&quot; to create one.</div>
      ) : (
        (() => {
          // Calculate active steps (lowest pending ordering)
          const pendingSteps = steps.filter(s => s.status === "pending");
          const minOrder = pendingSteps.length > 0 ? Math.min(...pendingSteps.map(s => s.ordering)) : -1;
          const activeStepIds = new Set(pendingSteps.filter(s => s.ordering === minOrder).map(s => s.id));
          
          return (
            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
              {steps.map((s) => {
                const isActive = activeStepIds.has(s.id);
                return (
                  <li key={s.id} className={`p-4 ${!isActive && s.status === "pending" ? "opacity-60" : ""}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-semibold">
                          #{s.ordering} · {s.name}{" "}
                          <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-normal text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                            {s.policy === "all" ? "All must approve" : s.policy === "any" ? "Any one" : s.policy}
                          </span>
                          {isActive && s.status === "pending" && (
                            <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                              Active
                            </span>
                          )}
                          {!isActive && s.status === "pending" && (
                            <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-normal text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                              Waiting
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 text-xs text-gray-500">
                          Status: <span className={s.status === "approved" ? "text-emerald-600" : s.status === "rejected" ? "text-rose-600" : "text-amber-600"}>{s.status}</span>
                        </div>
                      </div>
                    </div>
                    <ul className="mt-3 space-y-1">
                      {s.approvals.map((a) => (
                        <li key={a.id} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm dark:bg-gray-900/50">
                          <div>
                            <div className="font-medium">{a.approverEmail}{a.approverGroup ? <span className="ml-1 text-xs text-gray-500">({a.approverGroup})</span> : null}</div>
                            <div className="text-xs">
                              Decision: <span className={a.decision === "approved" ? "text-emerald-600 font-medium" : a.decision === "rejected" ? "text-rose-600 font-medium" : "text-gray-500"}>{a.decision}</span>
                              {a.comment ? <span className="ml-2 italic text-gray-500">&quot;{a.comment}&quot;</span> : null}
                              {a.decidedAt ? <span className="ml-2 text-gray-400">({new Date(a.decidedAt).toLocaleDateString()})</span> : null}
                            </div>
                          </div>
                          {/* Only show buttons for active steps */}
                          {a.decision === "pending" && s.status === "pending" && isActive && currentUserEmail === a.approverEmail && (
                            <div className="flex gap-1">
                              <button onClick={() => onDecide(s.id, "approved")} disabled={busy} className="rounded-md bg-emerald-600 px-2 py-1 text-xs text-white hover:bg-emerald-700 disabled:opacity-50">Approve</button>
                              <button onClick={() => onDecide(s.id, "rejected")} disabled={busy} className="rounded-md bg-rose-600 px-2 py-1 text-xs text-white hover:bg-rose-700 disabled:opacity-50">Reject</button>
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  </li>
                );
              })}
            </ul>
          );
        })()
      )}
    </Card>
  );
}

function CommentsTab({ comments, onAdd }: { comments: Comment[]; onAdd: (b: string) => void }) {
  const [body, setBody] = useState("");
  return (
    <Card>
      <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-3 dark:border-gray-800">
        <MessageSquare className="h-4 w-4" />
        <h3 className="text-sm font-semibold">Comments</h3>
      </div>
      <ul className="divide-y divide-gray-100 dark:divide-gray-800">
        {comments.length === 0 && <li className="p-4 text-sm text-gray-500">No comments yet.</li>}
        {comments.map((c) => (
          <li key={c.id} className="p-4">
            <div className="text-xs text-gray-500">
              <strong>{c.authorEmail}</strong> · {new Date(c.createdAt).toLocaleString()} · {c.visibility}
            </div>
            <div className="mt-1 whitespace-pre-wrap text-sm">{c.body}</div>
          </li>
        ))}
      </ul>
      <div className="border-t border-gray-100 p-3 dark:border-gray-800">
        <textarea
          rows={2}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Add a comment…"
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
        />
        <div className="mt-2 flex justify-end">
          <button
            onClick={() => { onAdd(body); setBody(""); }}
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700"
          >
            Post
          </button>
        </div>
      </div>
    </Card>
  );
}

interface AuditEvent {
  id: string;
  actor: string;
  action: string;
  payload: Record<string, unknown> | null;
  createdAt: string;
}

const ACTION_LABELS: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  cr_create: { label: "Created", icon: <FileText className="h-4 w-4" />, color: "text-blue-600" },
  cr_update: { label: "Updated", icon: <Pencil className="h-4 w-4" />, color: "text-amber-600" },
  cr_transition: { label: "State Changed", icon: <Activity className="h-4 w-4" />, color: "text-purple-600" },
  approval_start: { label: "Approval Started", icon: <ShieldCheck className="h-4 w-4" />, color: "text-indigo-600" },
  approval_decide: { label: "Approval Decision", icon: <CheckCircle2 className="h-4 w-4" />, color: "text-green-600" },
  comment_create: { label: "Comment Added", icon: <MessageSquare className="h-4 w-4" />, color: "text-gray-600" },
};

function ActivityTab({ crNumber }: { crNumber: string }) {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadEvents() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/v2/changes/${crNumber}/audit`);
        if (!res.ok) {
          const e = await res.json().catch(() => ({}));
          throw new Error(e.error || `HTTP ${res.status}`);
        }
        const data = await res.json();
        setEvents(data.events || []);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    }
    loadEvents();
  }, [crNumber]);

  function formatPayload(action: string, payload: Record<string, unknown> | null): string {
    if (!payload) return "";
    
    if (action === "cr_transition") {
      const from = payload.from || "unknown";
      const to = payload.to || "unknown";
      const event = payload.event || "";
      return `${from} → ${to}${event ? ` (${event})` : ""}`;
    }
    
    if (action === "approval_decide") {
      const decision = payload.decision || "";
      const stepName = payload.stepName || "";
      return `${decision}${stepName ? ` on ${stepName}` : ""}`;
    }
    
    if (action === "cr_update") {
      const fields = payload.updatedFields as string[] | undefined;
      if (fields && fields.length > 0) {
        return `Fields: ${fields.join(", ")}`;
      }
    }
    
    return "";
  }

  return (
    <Card>
      <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-3 dark:border-gray-800">
        <Activity className="h-4 w-4" />
        <h3 className="text-sm font-semibold">Activity Log</h3>
      </div>
      {loading ? (
        <div className="p-4 text-sm text-gray-500">Loading activity...</div>
      ) : error ? (
        <div className="p-4 text-sm text-red-500">{error}</div>
      ) : events.length === 0 ? (
        <div className="p-4 text-sm text-gray-500">No activity recorded yet.</div>
      ) : (
        <ul className="divide-y divide-gray-100 dark:divide-gray-800">
          {events.map((event) => {
            const actionInfo = ACTION_LABELS[event.action] || { 
              label: event.action, 
              icon: <Activity className="h-4 w-4" />, 
              color: "text-gray-600" 
            };
            const payloadText = formatPayload(event.action, event.payload);
            
            return (
              <li key={event.id} className="flex items-start gap-3 p-4">
                <div className={`mt-0.5 ${actionInfo.color}`}>
                  {actionInfo.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm text-gray-900 dark:text-gray-100">
                      {actionInfo.label}
                    </span>
                    {payloadText && (
                      <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                        {payloadText}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    by <strong>{event.actor}</strong> · {new Date(event.createdAt).toLocaleString()}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

interface ImpactAnalysis {
  outageRisk: number;
  performanceRisk: number;
  functionalityRisk: number;
  securityRisk: number;
  dataIntegrityRisk: number;
  overallRisk: number;
  blastRadius: string;
  rollbackComplexity: string;
  affectedServices: string[];
  estimatedDowntime: string;
  rationale: string[];
}

interface MLAnalysis {
  probability: number;
  score: number;
  confidence: number;
  contributions: Array<{ feature: string; weight: number; value: number; contribution: number }>;
  explanation: string;
}

function AnalysisTab({ cr, analysis, onRun, busy }: { cr: CR; analysis: { impact?: Record<string, unknown>; ml?: Record<string, unknown> } | null; onRun: () => void; busy: boolean }) {
  const impact = analysis?.impact as ImpactAnalysis | undefined;
  const ml = analysis?.ml as MLAnalysis | undefined;

  // Readiness checks
  const hasDescription = cr.description.trim().length >= 20;
  const hasImplementationPlan = cr.implementationPlan.trim().length >= 30;
  const hasBackoutPlan = cr.backoutPlan.trim().length >= 30;
  const hasTestPlan = cr.testPlan.trim().length >= 30;
  const hasJustification = cr.justification.trim().length >= 20;
  const hasPlannedDates = !!(cr.plannedStart && cr.plannedEnd);
  const hasAssignee = !!cr.assignedTo;

  const readinessChecks = [
    { label: "Description", passed: hasDescription, required: true },
    { label: "Implementation Plan", passed: hasImplementationPlan, required: true },
    { label: "Backout Plan", passed: hasBackoutPlan, required: true },
    { label: "Test Plan", passed: hasTestPlan, required: true },
    { label: "Justification", passed: hasJustification, required: true },
    { label: "Planned Dates", passed: hasPlannedDates, required: true },
    { label: "Assignee", passed: hasAssignee, required: false },
  ];

  const requiredPassed = readinessChecks.filter(c => c.required && c.passed).length;
  const requiredTotal = readinessChecks.filter(c => c.required).length;
  const readinessScore = Math.round((requiredPassed / requiredTotal) * 100);
  const isReadyToSubmit = requiredPassed === requiredTotal;

  // Risk assessment
  const riskScore = cr.mlRiskScore ?? cr.computedRiskScore;
  const riskTier = riskScore >= 75 ? "critical" : riskScore >= 50 ? "high" : riskScore >= 25 ? "medium" : "low";
  const riskColor = riskTier === "critical" ? "text-red-600" : riskTier === "high" ? "text-orange-600" : riskTier === "medium" ? "text-amber-600" : "text-green-600";
  const riskBg = riskTier === "critical" ? "bg-red-100 dark:bg-red-900/30" : riskTier === "high" ? "bg-orange-100 dark:bg-orange-900/30" : riskTier === "medium" ? "bg-amber-100 dark:bg-amber-900/30" : "bg-green-100 dark:bg-green-900/30";

  // Submit recommendation
  const getSubmitRecommendation = () => {
    if (!isReadyToSubmit) {
      return { status: "blocked", label: "Not Ready", message: "Complete all required fields before submitting", color: "text-red-600", bg: "bg-red-50 dark:bg-red-900/20", icon: XCircle };
    }
    if (riskTier === "critical") {
      return { status: "caution", label: "Review Recommended", message: "High risk score - consider additional review before submitting", color: "text-orange-600", bg: "bg-orange-50 dark:bg-orange-900/20", icon: AlertTriangle };
    }
    if (riskTier === "high") {
      return { status: "caution", label: "Proceed with Caution", message: "Elevated risk - ensure all plans are thorough", color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-900/20", icon: AlertTriangle };
    }
    return { status: "ready", label: "Ready to Submit", message: "All checks passed - CR is ready for submission", color: "text-green-600", bg: "bg-green-50 dark:bg-green-900/20", icon: CheckCircle2 };
  };

  const recommendation = getSubmitRecommendation();
  const RecommendationIcon = recommendation.icon;

  return (
    <div className="space-y-4">
      {/* Submit Readiness Banner */}
      <Card className={`border-2 ${isReadyToSubmit ? "border-green-200 dark:border-green-800" : "border-amber-200 dark:border-amber-800"}`}>
        <div className={`p-4 ${recommendation.bg}`}>
          <div className="flex items-start gap-4">
            <div className={`rounded-full p-2 ${recommendation.bg}`}>
              <RecommendationIcon className={`h-6 w-6 ${recommendation.color}`} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h3 className={`text-lg font-bold ${recommendation.color}`}>{recommendation.label}</h3>
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${riskBg} ${riskColor}`}>
                  Risk: {riskTier.toUpperCase()} ({Math.round(riskScore)}/100)
                </span>
              </div>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{recommendation.message}</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{readinessScore}%</div>
              <div className="text-xs text-gray-500">Readiness</div>
            </div>
          </div>

          {/* Readiness Checklist */}
          <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">
            {readinessChecks.map((check) => (
              <div
                key={check.label}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs ${
                  check.passed
                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                    : check.required
                    ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                    : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                }`}
              >
                {check.passed ? (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                ) : (
                  <XCircle className="h-3.5 w-3.5" />
                )}
                <span className="font-medium">{check.label}</span>
                {check.required && !check.passed && <span className="text-[10px]">(required)</span>}
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Main Analysis Card */}
      <Card>
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-800">
          <h3 className="flex items-center gap-2 text-sm font-semibold"><Activity className="h-4 w-4" /> Impact &amp; ML Analysis</h3>
          <div className="flex items-center gap-2">
            <Link
              href={`/impact?cr=${cr.number}`}
              className="rounded-lg border border-indigo-200 bg-indigo-50 px-2 py-1 text-xs text-indigo-700 hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300 dark:hover:bg-indigo-900/50"
            >
              View in Impact Dashboard
            </Link>
            <button onClick={onRun} disabled={busy} className="rounded-lg border border-gray-200 px-2 py-1 text-xs hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800">
              {busy ? "Analyzing..." : "Run Analysis"}
            </button>
          </div>
        </div>

        <div className="p-4 space-y-6">
          {/* Risk Summary */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
              <div className="flex items-center gap-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
                <Shield className="h-4 w-4" /> Computed Risk
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className={`text-3xl font-bold ${cr.computedRiskScore >= 50 ? "text-red-600" : cr.computedRiskScore >= 25 ? "text-amber-600" : "text-green-600"}`}>
                  {Math.round(cr.computedRiskScore)}
                </span>
                <span className="text-sm text-gray-400">/100</span>
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
              <div className="flex items-center gap-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
                <Zap className="h-4 w-4" /> ML Risk Score
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                {cr.mlRiskScore !== null && cr.mlRiskScore !== undefined ? (
                  <>
                    <span className={`text-3xl font-bold ${cr.mlRiskScore >= 50 ? "text-red-600" : cr.mlRiskScore >= 25 ? "text-amber-600" : "text-green-600"}`}>
                      {Math.round(cr.mlRiskScore)}
                    </span>
                    <span className="text-sm text-gray-400">/100</span>
                    <span className="ml-2 rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500 dark:bg-gray-800">
                      {Math.round((cr.mlConfidence ?? 0) * 100)}% conf
                    </span>
                  </>
                ) : (
                  <span className="text-lg text-gray-400">—</span>
                )}
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
              <div className="flex items-center gap-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
                <Clock className="h-4 w-4" /> Change Window
              </div>
              <div className="mt-2">
                {cr.plannedStart && cr.plannedEnd ? (
                  <div className="text-sm">
                    <div className="font-medium text-gray-900 dark:text-gray-100">
                      {new Date(cr.plannedStart).toLocaleDateString()}
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(cr.plannedStart).toLocaleTimeString()} - {new Date(cr.plannedEnd).toLocaleTimeString()}
                    </div>
                  </div>
                ) : (
                  <span className="text-lg text-gray-400">Not scheduled</span>
                )}
              </div>
            </div>
          </div>

          {/* ML Explanation */}
          {cr.mlExplanation && (
            <div className="rounded-lg bg-indigo-50 p-4 dark:bg-indigo-900/20">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 mt-0.5 text-indigo-600 dark:text-indigo-400" />
                <div>
                  <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">ML Analysis Summary</p>
                  <p className="mt-1 text-sm text-indigo-600 dark:text-indigo-400">{cr.mlExplanation}</p>
                </div>
              </div>
            </div>
          )}

          {/* Impact Analysis Details */}
          {impact && (
            <div>
              <H>Impact Analysis Details</H>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                <RiskMeter label="Outage Risk" value={impact.outageRisk} />
                <RiskMeter label="Performance Risk" value={impact.performanceRisk} />
                <RiskMeter label="Functionality Risk" value={impact.functionalityRisk} />
                <RiskMeter label="Security Risk" value={impact.securityRisk} />
                <RiskMeter label="Data Integrity Risk" value={impact.dataIntegrityRisk} />
                <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                  <div className="text-xs text-gray-500">Blast Radius</div>
                  <div className={`text-sm font-bold ${
                    impact.blastRadius === "critical" ? "text-red-600" :
                    impact.blastRadius === "high" ? "text-orange-600" :
                    impact.blastRadius === "medium" ? "text-amber-600" : "text-green-600"
                  }`}>{impact.blastRadius.toUpperCase()}</div>
                </div>
                <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                  <div className="text-xs text-gray-500">Rollback Complexity</div>
                  <div className={`text-sm font-bold ${
                    impact.rollbackComplexity === "critical" ? "text-red-600" :
                    impact.rollbackComplexity === "high" ? "text-orange-600" :
                    impact.rollbackComplexity === "medium" ? "text-amber-600" : "text-green-600"
                  }`}>{impact.rollbackComplexity.toUpperCase()}</div>
                </div>
                <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                  <div className="text-xs text-gray-500">Est. Downtime</div>
                  <div className="text-sm font-bold text-gray-900 dark:text-gray-100">{impact.estimatedDowntime}</div>
                </div>
              </div>
            </div>
          )}

          {/* ML Contributions */}
          {ml && ml.contributions && ml.contributions.length > 0 && (
            <div>
              <H>Risk Factor Contributions</H>
              <div className="space-y-2">
                {ml.contributions
                  .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
                  .slice(0, 6)
                  .map((c, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-32 text-xs text-gray-600 dark:text-gray-400 truncate" title={c.feature}>
                        {c.feature.replace(/_/g, " ")}
                      </div>
                      <div className="flex-1">
                        <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-700">
                          <div
                            className={`h-2 rounded-full ${c.contribution > 0 ? "bg-red-500" : "bg-green-500"}`}
                            style={{ width: `${Math.min(Math.abs(c.contribution) * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-1 w-16 text-xs">
                        {c.contribution > 0 ? (
                          <TrendingUp className="h-3 w-3 text-red-500" />
                        ) : (
                          <TrendingDown className="h-3 w-3 text-green-500" />
                        )}
                        <span className={c.contribution > 0 ? "text-red-600" : "text-green-600"}>
                          {c.contribution > 0 ? "+" : ""}{(c.contribution * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Raw Data (collapsible) */}
          {(impact || ml) && (
            <details className="group">
              <summary className="cursor-pointer text-xs font-medium text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                <FileText className="inline h-3 w-3 mr-1" />
                View Raw Analysis Data
              </summary>
              <div className="mt-2 grid gap-4 md:grid-cols-2">
                {impact && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">Impact Analysis</p>
                    <pre className="overflow-x-auto rounded-lg bg-gray-50 p-3 text-xs dark:bg-gray-900/60">{JSON.stringify(impact, null, 2)}</pre>
                  </div>
                )}
                {ml && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">ML Analysis</p>
                    <pre className="overflow-x-auto rounded-lg bg-gray-50 p-3 text-xs dark:bg-gray-900/60">{JSON.stringify(ml, null, 2)}</pre>
                  </div>
                )}
              </div>
            </details>
          )}

          {/* No analysis yet */}
          {!analysis && (
            <div className="text-center py-8">
              <Activity className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-600" />
              <p className="mt-2 text-sm text-gray-500">Click &quot;Run Analysis&quot; to generate detailed impact and ML analysis</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

function RiskMeter({ label, value }: { label: string; value: number }) {
  const color = value >= 75 ? "bg-red-500" : value >= 50 ? "bg-orange-500" : value >= 25 ? "bg-amber-500" : "bg-green-500";
  const textColor = value >= 75 ? "text-red-600" : value >= 50 ? "text-orange-600" : value >= 25 ? "text-amber-600" : "text-green-600";
  return (
    <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500">{label}</span>
        <span className={`text-sm font-bold ${textColor}`}>{value}</span>
      </div>
      <div className="mt-2 h-1.5 rounded-full bg-gray-200 dark:bg-gray-700">
        <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

/* ─── Edit Form Components ─────────────────────────────────────── */

function EditField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-gray-500">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
      />
    </div>
  );
}

function EditTextarea({
  label,
  value,
  onChange,
  rows = 4,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-gray-500">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
      />
    </div>
  );
}
