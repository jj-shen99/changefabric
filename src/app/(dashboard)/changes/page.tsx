"use client";

/**
 * /changes — list view backed by the re-architected /api/v2/changes endpoint.
 * No more ServiceNow refresh. Native CRs only.
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search, Plus, AlertTriangle, Clock, CheckCircle2, XCircle, Info, ChevronUp, ChevronDown } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/card";
import { usePermissions } from "@/hooks";

type SortKey = "number" | "title" | "state" | "computedRiskScore" | "mlRiskScore" | "requestedBy" | "createdAt";
type SortDir = "asc" | "desc";

interface CR {
  number: string;
  title: string;
  state: string;
  type: string;
  category: string;
  priority: string;
  riskLevel: string;
  computedRiskScore: number;
  mlRiskScore: number | null;
  requestedBy: string;
  assignedTo: string | null;
  createdAt: string;
  affectedServices: string[];
}

// Normalize state to lowercase for consistent filtering
const normalizeState = (state: string) => state.toLowerCase().replace(/\s+/g, "_");

const STATE_TONE: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  submitted: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  awaiting_approval: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  approved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  scheduled: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  implemented: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300",
  rolled_back: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
  closed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  rejected: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
  canceled: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  // ServiceNow states (mapped to similar native states)
  new: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  authorize: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  implement: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
};

function StatePill({ state }: { state: string }) {
  const normalizedState = state.toLowerCase().replace(/\s+/g, "_");
  const tone = STATE_TONE[normalizedState] || STATE_TONE.draft;
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${tone}`}>
      {state.replace(/_/g, " ")}
    </span>
  );
}

function RiskPill({ score }: { score: number }) {
  const tone =
    score >= 75
      ? "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300"
      : score >= 50
        ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
        : score >= 25
          ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300"
          : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300";
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${tone}`}>
      {Math.round(score)}
    </span>
  );
}

export default function ChangesPage() {
  const { canManageChanges } = usePermissions();
  const [items, setItems] = useState<CR[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v2/changes");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setItems(data.items ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    let result = items.filter((c) => {
      const normalizedState = normalizeState(c.state);
      if (stateFilter !== "all" && normalizedState !== stateFilter) return false;
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        c.number.toLowerCase().includes(q) ||
        c.title.toLowerCase().includes(q) ||
        c.requestedBy.toLowerCase().includes(q) ||
        (c.assignedTo ?? "").toLowerCase().includes(q)
      );
    });
    
    // Sort
    result = [...result].sort((a, b) => {
      let aVal: string | number | null = a[sortKey];
      let bVal: string | number | null = b[sortKey];
      
      // Handle null/undefined
      if (aVal === null || aVal === undefined) aVal = sortKey === "mlRiskScore" || sortKey === "computedRiskScore" ? -1 : "";
      if (bVal === null || bVal === undefined) bVal = sortKey === "mlRiskScore" || sortKey === "computedRiskScore" ? -1 : "";
      
      // Compare
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDir === "asc" ? aVal - bVal : bVal - aVal;
      }
      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();
      if (sortDir === "asc") return aStr.localeCompare(bStr);
      return bStr.localeCompare(aStr);
    });
    
    return result;
  }, [items, search, stateFilter, sortKey, sortDir]);
  
  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const counts = useMemo(() => {
    return {
      total: items.length,
      pending: items.filter((c) =>
        ["draft", "submitted", "assessing", "awaiting_approval", "new", "assess", "authorize"].includes(normalizeState(c.state))
      ).length,
      inFlight: items.filter((c) =>
        ["approved", "scheduled", "implemented", "reviewing", "implement", "review"].includes(normalizeState(c.state))
      ).length,
      closed: items.filter((c) => normalizeState(c.state) === "closed").length,
      rejected: items.filter((c) => ["rejected", "canceled"].includes(normalizeState(c.state))).length,
    };
  }, [items]);

  return (
    <>
      <PageHeader
        title="Change Requests"
        subtitle="Native, vendor-neutral change management"
        actions={
          <div className="flex gap-2">
            {canManageChanges && (
              <Link
                href="/changes/new"
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white shadow hover:bg-indigo-700"
              >
                <Plus className="h-4 w-4" /> New Change Request
              </Link>
            )}
          </div>
        }
      />
    <div className="space-y-6 p-4 md:p-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Stat icon={<Clock className="h-4 w-4" />} label="Pending" value={counts.pending} tone="amber" tooltip="CRs in: Draft, Submitted, Assessing, Awaiting Approval" />
        <Stat icon={<AlertTriangle className="h-4 w-4" />} label="In Flight" value={counts.inFlight} tone="indigo" tooltip="CRs in: Approved, Scheduled, In Progress, Implemented, Reviewing" />
        <Stat icon={<CheckCircle2 className="h-4 w-4" />} label="Closed" value={counts.closed} tone="emerald" tooltip="Successfully completed change requests" />
        <Stat icon={<XCircle className="h-4 w-4" />} label="Rejected" value={counts.rejected} tone="rose" tooltip="CRs that were canceled or rejected" />
        <Stat icon={<Search className="h-4 w-4" />} label="Total" value={counts.total} tone="gray" tooltip="Total number of change requests" />
      </div>

      <Card>
        <div className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by number, title, requester…"
              className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm dark:border-gray-700 dark:bg-gray-900"
            />
          </div>
          <select
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
          >
            <option value="all">All states</option>
            {Object.keys(STATE_TONE).map((s) => (
              <option key={s} value={s}>
                {s.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="p-6 text-sm text-gray-500">Loading…</div>
        ) : error ? (
          <div className="p-6 text-sm text-rose-600">Error: {error}</div>
        ) : filtered.length === 0 ? (
          <div className="p-6 text-sm text-gray-500">No change requests match.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-y border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500 dark:border-gray-800 dark:bg-gray-900/50 dark:text-gray-400">
                <tr>
                  <SortTh sortKey="number" currentKey={sortKey} dir={sortDir} onClick={toggleSort}>Number</SortTh>
                  <SortTh sortKey="title" currentKey={sortKey} dir={sortDir} onClick={toggleSort}>Title</SortTh>
                  <SortTh sortKey="state" currentKey={sortKey} dir={sortDir} onClick={toggleSort}>State</SortTh>
                  <SortTh sortKey="computedRiskScore" currentKey={sortKey} dir={sortDir} onClick={toggleSort}>Risk</SortTh>
                  <SortTh sortKey="mlRiskScore" currentKey={sortKey} dir={sortDir} onClick={toggleSort}>ML</SortTh>
                  <SortTh sortKey="requestedBy" currentKey={sortKey} dir={sortDir} onClick={toggleSort}>Requester</SortTh>
                  <SortTh sortKey="createdAt" currentKey={sortKey} dir={sortDir} onClick={toggleSort}>Created</SortTh>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filtered.map((c) => (
                  <tr key={c.number} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                    <Td>
                      <Link href={`/changes/${c.number}`} className="font-mono text-indigo-600 hover:underline dark:text-indigo-400">
                        {c.number}
                      </Link>
                    </Td>
                    <Td>
                      <div className="font-medium text-gray-900 dark:text-gray-100">{c.title}</div>
                      <div className="text-xs text-gray-500">{c.type} · {c.category}</div>
                    </Td>
                    <Td><StatePill state={c.state} /></Td>
                    <Td><RiskPill score={c.computedRiskScore} /></Td>
                    <Td>{c.mlRiskScore !== null && c.mlRiskScore !== undefined ? <RiskPill score={c.mlRiskScore} /> : <span className="text-xs text-gray-400">—</span>}</Td>
                    <Td><span className="text-xs text-gray-600 dark:text-gray-300">{c.requestedBy}</span></Td>
                    <Td><span className="text-xs text-gray-500">{new Date(c.createdAt).toLocaleDateString()}</span></Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
    </>
  );
}

function Stat({ icon, label, value, tone, tooltip }: { icon: React.ReactNode; label: string; value: number; tone: string; tooltip: string }) {
  const tones: Record<string, string> = {
    amber: "text-amber-600 dark:text-amber-400",
    indigo: "text-indigo-600 dark:text-indigo-400",
    emerald: "text-emerald-600 dark:text-emerald-400",
    rose: "text-rose-600 dark:text-rose-400",
    gray: "text-gray-600 dark:text-gray-300",
  };
  return (
    <Card className="group relative">
      <div className="p-4">
        <div className={`flex items-center justify-between`}>
          <div className={`flex items-center gap-2 text-xs font-medium ${tones[tone]}`}>
            {icon}
            {label}
          </div>
          <div className="relative">
            <Info className="h-3.5 w-3.5 text-gray-300 hover:text-gray-500 cursor-help dark:text-gray-600 dark:hover:text-gray-400" />
            <div className="absolute right-0 top-5 z-50 hidden w-48 rounded-lg bg-gray-900 p-2 text-xs text-white shadow-lg group-hover:block dark:bg-gray-700">
              {tooltip}
              <div className="absolute -top-1 right-2 h-2 w-2 rotate-45 bg-gray-900 dark:bg-gray-700" />
            </div>
          </div>
        </div>
        <div className="mt-2 text-2xl font-semibold text-gray-900 dark:text-gray-100">{value}</div>
      </div>
    </Card>
  );
}

function SortTh({ 
  children, 
  sortKey, 
  currentKey, 
  dir, 
  onClick 
}: { 
  children: React.ReactNode; 
  sortKey: SortKey; 
  currentKey: SortKey; 
  dir: SortDir; 
  onClick: (key: SortKey) => void;
}) {
  const isActive = sortKey === currentKey;
  return (
    <th 
      className="px-4 py-2 font-medium cursor-pointer select-none hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      onClick={() => onClick(sortKey)}
    >
      <div className="flex items-center gap-1">
        {children}
        <span className={`inline-flex flex-col ${isActive ? "text-indigo-600 dark:text-indigo-400" : "text-gray-300 dark:text-gray-600"}`}>
          <ChevronUp className={`h-3 w-3 -mb-1 ${isActive && dir === "asc" ? "text-indigo-600 dark:text-indigo-400" : ""}`} />
          <ChevronDown className={`h-3 w-3 -mt-1 ${isActive && dir === "desc" ? "text-indigo-600 dark:text-indigo-400" : ""}`} />
        </span>
      </div>
    </th>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-4 py-3 align-top">{children}</td>;
}
