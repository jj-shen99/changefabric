"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { 
  ClipboardList, 
  CheckCircle2, 
  Clock, 
  User, 
  AlertTriangle,
  RefreshCw,
  ChevronRight,
  ShieldCheck,
  UserCheck,
  FileText,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/card";

interface TaskCR {
  number: string;
  title: string;
  state: string;
  priority: string;
  riskLevel: string;
  requestedBy: string;
  assignedTo: string | null;
  createdAt: string;
  updatedAt: string;
  pendingApprovalStepId?: string;
  pendingApprovalStepName?: string;
}

interface Task {
  type: "approval" | "assigned" | "requested";
  cr: TaskCR;
  reason: string;
}

interface TasksResponse {
  tasks: Task[];
  counts: {
    pendingApprovals: number;
    assigned: number;
    requested: number;
    total: number;
  };
}

const TYPE_CONFIG = {
  approval: {
    icon: ShieldCheck,
    label: "Pending Approval",
    bgColor: "bg-amber-100 dark:bg-amber-900/30",
    textColor: "text-amber-700 dark:text-amber-300",
    borderColor: "border-l-amber-500",
  },
  assigned: {
    icon: UserCheck,
    label: "Assigned to You",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
    textColor: "text-blue-700 dark:text-blue-300",
    borderColor: "border-l-blue-500",
  },
  requested: {
    icon: FileText,
    label: "Your Request",
    bgColor: "bg-purple-100 dark:bg-purple-900/30",
    textColor: "text-purple-700 dark:text-purple-300",
    borderColor: "border-l-purple-500",
  },
};

const PRIORITY_COLORS: Record<string, string> = {
  "1": "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
  "2": "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  "3": "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  "4": "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
};

const STATE_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  submitted: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  awaiting_approval: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  approved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  scheduled: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  in_progress: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
  new: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  authorize: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  implement: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
};

function normalizeState(state: string) {
  return state.toLowerCase().replace(/\s+/g, "_");
}

export default function MyTasksPage() {
  const [data, setData] = useState<TasksResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "approval" | "assigned" | "requested">("all");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/my-tasks");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const filteredTasks = data?.tasks.filter((t) => filter === "all" || t.type === filter) ?? [];

  return (
    <>
      <PageHeader
        title="My Tasks"
        subtitle="Change requests that need your attention"
        actions={
          <button
            onClick={() => void load()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        }
      />

      <div className="space-y-6 p-4 md:p-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <SummaryCard
            icon={<ShieldCheck className="h-5 w-5" />}
            label="Pending Approvals"
            value={data?.counts.pendingApprovals ?? 0}
            color="amber"
            active={filter === "approval"}
            onClick={() => setFilter(filter === "approval" ? "all" : "approval")}
          />
          <SummaryCard
            icon={<UserCheck className="h-5 w-5" />}
            label="Assigned to You"
            value={data?.counts.assigned ?? 0}
            color="blue"
            active={filter === "assigned"}
            onClick={() => setFilter(filter === "assigned" ? "all" : "assigned")}
          />
          <SummaryCard
            icon={<FileText className="h-5 w-5" />}
            label="Your Requests"
            value={data?.counts.requested ?? 0}
            color="purple"
            active={filter === "requested"}
            onClick={() => setFilter(filter === "requested" ? "all" : "requested")}
          />
          <SummaryCard
            icon={<ClipboardList className="h-5 w-5" />}
            label="Total Tasks"
            value={data?.counts.total ?? 0}
            color="gray"
            active={filter === "all"}
            onClick={() => setFilter("all")}
          />
        </div>

        {/* Task List */}
        <Card>
          <div className="border-b border-gray-100 px-4 py-3 dark:border-gray-800">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <ClipboardList className="h-4 w-4" />
              {filter === "all" ? "All Tasks" : TYPE_CONFIG[filter].label}
              <span className="ml-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-normal text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                {filteredTasks.length}
              </span>
            </h2>
          </div>

          {loading ? (
            <div className="flex items-center justify-center p-12">
              <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : error ? (
            <div className="p-6 text-center text-sm text-rose-600">
              <AlertTriangle className="mx-auto mb-2 h-6 w-6" />
              Error: {error}
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="p-12 text-center">
              <CheckCircle2 className="mx-auto mb-3 h-12 w-12 text-emerald-500" />
              <p className="text-lg font-medium text-gray-900 dark:text-gray-100">All caught up!</p>
              <p className="mt-1 text-sm text-gray-500">No tasks need your attention right now.</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
              {filteredTasks.map((task) => (
                <TaskRow key={task.cr.number} task={task} />
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  color,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: "amber" | "blue" | "purple" | "gray";
  active: boolean;
  onClick: () => void;
}) {
  const colorClasses = {
    amber: "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300",
    blue: "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300",
    purple: "bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300",
    gray: "bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  };

  return (
    <button
      onClick={onClick}
      className={`rounded-xl p-4 text-left transition-all ${colorClasses[color]} ${
        active ? "ring-2 ring-offset-2 ring-current" : "hover:opacity-80"
      }`}
    >
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-2xl font-bold">{value}</span>
      </div>
      <p className="mt-1 text-xs font-medium opacity-80">{label}</p>
    </button>
  );
}

function TaskRow({ task }: { task: Task }) {
  const config = TYPE_CONFIG[task.type];
  const Icon = config.icon;
  const normalizedState = normalizeState(task.cr.state);
  const stateColor = STATE_COLORS[normalizedState] || STATE_COLORS.draft;
  const priorityColor = PRIORITY_COLORS[task.cr.priority] || PRIORITY_COLORS["3"];

  return (
    <li className={`border-l-4 ${config.borderColor}`}>
      <Link
        href={`/changes/${task.cr.number}`}
        className="flex items-center gap-4 px-4 py-4 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
      >
        <div className={`rounded-lg p-2 ${config.bgColor}`}>
          <Icon className={`h-5 w-5 ${config.textColor}`} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-medium text-gray-900 dark:text-gray-100">
              {task.cr.number}
            </span>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${stateColor}`}>
              {task.cr.state}
            </span>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${priorityColor}`}>
              P{task.cr.priority}
            </span>
          </div>
          <p className="mt-0.5 truncate text-sm text-gray-700 dark:text-gray-300">
            {task.cr.title}
          </p>
          <div className="mt-1 flex items-center gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" />
              {task.cr.requestedBy}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {new Date(task.cr.updatedAt).toLocaleDateString()}
            </span>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1">
          <span className={`rounded-full px-2 py-1 text-xs font-medium ${config.bgColor} ${config.textColor}`}>
            {task.reason}
          </span>
          <ChevronRight className="h-4 w-4 text-gray-400" />
        </div>
      </Link>
    </li>
  );
}
