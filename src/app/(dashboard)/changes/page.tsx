"use client";

import { useState } from "react";
import { Filter, Search, ExternalLink, FileCode2, Plus, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { useDebounce, useData, usePermissions } from "@/hooks";
import { PAGINATION } from "@/lib/constants";
import { Card, CardHeader, CardTitle } from "@/components/card";
import { RiskBadge } from "@/components/risk-badge";
import { ChangeStatusBadge, ValidationStatusBadge } from "@/components/status-badge";
import { formatDate } from "@/lib/utils";
import { ChangeStatus, ChangeCategory } from "@/lib/types";

export default function ChangesPage() {
  const { changeRequests, loading, error, refetch } = useData();
  const { canManageChanges } = usePermissions();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ChangeStatus | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState<ChangeCategory | "all">("all");
  const [selectedCR, setSelectedCR] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const debouncedSearch = useDebounce(search);

  if (loading) return <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-32 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />)}</div>;
  if (error) return <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">{error}</div>;

  async function handleDelete(id: string) {
    if (!confirm(`Delete change request ${id}?`)) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/data/changes?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setSelectedCR(null);
        toast.success("Change request deleted");
        await refetch();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to delete");
      }
    } finally {
      setDeleting(null);
    }
  }

  const filtered = changeRequests.filter((cr) => {
    const matchSearch =
      cr.title.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      cr.id.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      cr.author.toLowerCase().includes(debouncedSearch.toLowerCase());
    const matchStatus = statusFilter === "all" || cr.status === statusFilter;
    const matchCategory = categoryFilter === "all" || cr.category === categoryFilter;
    return matchSearch && matchStatus && matchCategory;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGINATION.DEFAULT_PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGINATION.DEFAULT_PAGE_SIZE, safePage * PAGINATION.DEFAULT_PAGE_SIZE);
  const selected = changeRequests.find((cr) => cr.id === selectedCR);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Change Requests</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Track and manage all software change requests</p>
        </div>
        {canManageChanges && (
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            New Change Request
          </button>
        )}
      </div>

      {showCreate && canManageChanges && <CreateChangeForm onCreated={() => { setShowCreate(false); refetch(); }} onCancel={() => setShowCreate(false)} />}

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by ID, title, or author..."
              aria-label="Search change requests"
              className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              aria-label="Filter by status"
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as ChangeStatus | "all")}
            >
              <option value="all">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="pending_review">Pending Review</option>
              <option value="approved">Approved</option>
              <option value="in_progress">In Progress</option>
              <option value="deployed">Deployed</option>
              <option value="rolled_back">Rolled Back</option>
              <option value="failed">Failed</option>
            </select>
            <select
              aria-label="Filter by category"
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as ChangeCategory | "all")}
            >
              <option value="all">All Categories</option>
              <option value="feature">Feature</option>
              <option value="bugfix">Bugfix</option>
              <option value="hotfix">Hotfix</option>
              <option value="infrastructure">Infrastructure</option>
              <option value="security_patch">Security Patch</option>
              <option value="database_migration">Database Migration</option>
              <option value="config_change">Config Change</option>
              <option value="dependency_update">Dependency Update</option>
            </select>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-3 gap-6">
        {/* Change List */}
        <div className={`${selectedCR ? "col-span-2" : "col-span-3"} space-y-3`}>
          {paginated.map((cr) => (
            <Card
              key={cr.id}
              className={`cursor-pointer p-4 transition-all hover:shadow-md ${
                selectedCR === cr.id ? "ring-2 ring-blue-500" : ""
              }`}
              onClick={() => setSelectedCR(selectedCR === cr.id ? null : cr.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-gray-400">{cr.id}</span>
                    <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                      {cr.category.replace(/_/g, " ")}
                    </span>
                  </div>
                  <h3 className="mt-1 font-semibold text-gray-900 dark:text-gray-100">{cr.title}</h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 line-clamp-2">{cr.description}</p>
                  <div className="mt-2 flex items-center gap-4 text-xs text-gray-400">
                    <span>{cr.author} • {cr.team}</span>
                    <span className="flex items-center gap-1">
                      <FileCode2 className="h-3 w-3" />
                      +{cr.linesAdded} / -{cr.linesRemoved} in {cr.filesChanged} files
                    </span>
                    <span>Created {formatDate(cr.createdAt)}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <ChangeStatusBadge status={cr.status} />
                  <RiskBadge score={cr.impact.overallRisk} size="sm" />
                </div>
              </div>
              {/* Validation progress bar */}
              <div className="mt-3 flex items-center gap-2">
                <span className="text-[10px] text-gray-400">Validations:</span>
                <div className="flex gap-1">
                  {cr.validations.map((v) => (
                    <div
                      key={v.id}
                      className={`h-2 w-6 rounded-full ${
                        v.status === "passed"
                          ? "bg-green-400"
                          : v.status === "failed"
                          ? "bg-red-400"
                          : v.status === "running"
                          ? "bg-blue-400 animate-pulse"
                          : "bg-gray-200"
                      }`}
                      title={`${v.name}: ${v.status}`}
                    />
                  ))}
                </div>
                <span className="text-[10px] text-gray-400">
                  {cr.validations.filter((v) => v.status === "passed").length}/{cr.validations.length} passed
                </span>
              </div>
            </Card>
          ))}
          {filtered.length === 0 && (
            <Card className="p-8 text-center">
              <p className="text-gray-400">No change requests match your filters</p>
            </Card>
          )}
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Showing {(safePage - 1) * PAGINATION.DEFAULT_PAGE_SIZE + 1}–{Math.min(safePage * PAGINATION.DEFAULT_PAGE_SIZE, filtered.length)} of {filtered.length}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={safePage <= 1}
                  className="rounded-lg border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-100 disabled:opacity-40 dark:border-gray-700 dark:hover:bg-gray-800"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    onClick={() => setPage(n)}
                    className={`h-8 w-8 rounded-lg text-xs font-medium ${
                      n === safePage
                        ? "bg-blue-600 text-white"
                        : "border border-gray-200 text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
                    }`}
                  >
                    {n}
                  </button>
                ))}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage >= totalPages}
                  className="rounded-lg border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-100 disabled:opacity-40 dark:border-gray-700 dark:hover:bg-gray-800"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Detail Panel */}
        {selected && (
          <div className="col-span-1 space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{selected.id}</CardTitle>
                  <div className="flex items-center gap-2">
                    {canManageChanges && (
                      <button
                        onClick={() => handleDelete(selected.id)}
                        disabled={deleting === selected.id}
                        className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50"
                        title="Delete change request"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => setSelectedCR(null)}
                      className="text-xs text-gray-400 hover:text-gray-600"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </CardHeader>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">{selected.title}</h3>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{selected.description}</p>

              <div className="mt-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Status</span>
                  <ChangeStatusBadge status={selected.status} />
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Risk Score</span>
                  <RiskBadge score={selected.impact.overallRisk} />
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Author</span>
                  <span className="font-medium text-gray-700 dark:text-gray-300">{selected.author}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Team</span>
                  <span className="font-medium text-gray-700 dark:text-gray-300">{selected.team}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Blast Radius</span>
                  <span className="font-medium text-gray-700 dark:text-gray-300 capitalize">{selected.impact.blastRadius}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Affected Users</span>
                  <span className="font-medium text-gray-700 dark:text-gray-300">{selected.impact.affectedUsers.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Est. Downtime</span>
                  <span className="font-medium text-gray-700 dark:text-gray-300">{selected.impact.estimatedDowntime}</span>
                </div>
                {selected.jiraTicket && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Jira Ticket</span>
                    <span className="font-medium text-blue-600">{selected.jiraTicket}</span>
                  </div>
                )}
                {selected.prUrl && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Pull Request</span>
                    <a href={selected.prUrl} className="flex items-center gap-1 text-blue-600 hover:underline">
                      <ExternalLink className="h-3 w-3" />
                      View PR
                    </a>
                  </div>
                )}
              </div>

              <div className="mt-4">
                <h4 className="text-xs font-semibold uppercase text-gray-400 mb-2">Affected Services</h4>
                <div className="flex flex-wrap gap-1">
                  {selected.impact.affectedServices.map((s) => (
                    <span key={s} className="rounded bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700">
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-4">
                <h4 className="text-xs font-semibold uppercase text-gray-400 mb-2">Approvers</h4>
                <div className="flex flex-wrap gap-1">
                  {selected.approvers.length > 0 ? selected.approvers.map((a) => (
                    <span key={a} className="rounded bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600">
                      {a}
                    </span>
                  )) : (
                    <span className="text-xs text-gray-400">No approvers yet</span>
                  )}
                </div>
              </div>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Validations</CardTitle>
              </CardHeader>
              <div className="space-y-2">
                {selected.validations.map((v) => (
                  <div key={v.id} className="flex items-center justify-between rounded-lg border border-gray-100 dark:border-gray-800 p-2">
                    <div>
                      <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{v.name}</p>
                      <p className="text-[10px] text-gray-400">{v.type.replace(/_/g, " ")}</p>
                      {v.duration && <p className="text-[10px] text-gray-400">{v.duration}</p>}
                    </div>
                    <ValidationStatusBadge status={v.status} />
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

function CreateChangeForm({ onCreated, onCancel }: { onCreated: () => void; onCancel: () => void }) {
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setFormError("");

    const fd = new FormData(e.currentTarget);
    const body = {
      id: fd.get("id"),
      title: fd.get("title"),
      description: fd.get("description"),
      category: fd.get("category"),
      author: fd.get("author"),
      team: fd.get("team"),
      status: "draft",
      impact: {
        outageRisk: 0,
        performanceRisk: 0,
        functionalityRisk: 0,
        securityRisk: 0,
        dataIntegrityRisk: 0,
        overallRisk: 0,
        affectedServices: [],
        affectedUsers: 0,
        estimatedDowntime: "0 min",
        rollbackComplexity: "low",
        blastRadius: "low",
      },
    };

    try {
      const res = await fetch("/api/data/changes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        setFormError(data.error || "Failed to create");
        toast.error(data.error || "Failed to create change request");
        return;
      }
      toast.success("Change request created");
      onCreated();
    } catch {
      setFormError("An unexpected error occurred");
      toast.error("An unexpected error occurred");
    } finally {
      setSubmitting(false);
    }
  }

  const inputCls = "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100";
  const labelCls = "mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400";

  return (
    <Card className="p-5">
      <CardHeader>
        <CardTitle>Create Change Request</CardTitle>
      </CardHeader>
      {formError && (
        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
          {formError}
        </div>
      )}
      <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>ID *</label>
          <input name="id" required placeholder="CR-1050" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Title *</label>
          <input name="title" required placeholder="Change request title" className={inputCls} />
        </div>
        <div className="col-span-2">
          <label className={labelCls}>Description *</label>
          <textarea name="description" required rows={2} placeholder="Describe the change..." className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Category *</label>
          <select name="category" required className={inputCls}>
            <option value="feature">Feature</option>
            <option value="bugfix">Bugfix</option>
            <option value="hotfix">Hotfix</option>
            <option value="infrastructure">Infrastructure</option>
            <option value="security_patch">Security Patch</option>
            <option value="database_migration">Database Migration</option>
            <option value="config_change">Config Change</option>
            <option value="dependency_update">Dependency Update</option>
          </select>
        </div>
        <div>
          <label className={labelCls}>Team *</label>
          <input name="team" required placeholder="e.g. Platform" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Author *</label>
          <input name="author" required placeholder="e.g. Jane Doe" className={inputCls} />
        </div>
        <div className="flex items-end gap-2">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? "Creating..." : "Create"}
          </button>
          <button type="button" onClick={onCancel} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800">
            Cancel
          </button>
        </div>
      </form>
    </Card>
  );
}
