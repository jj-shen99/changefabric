import { cn } from "@/lib/utils";
import { ChangeStatus, ValidationStatus } from "@/lib/types";

const changeStatusConfig: Record<ChangeStatus, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-gray-100 text-gray-700" },
  pending_review: { label: "Pending Review", className: "bg-amber-100 text-amber-800" },
  approved: { label: "Approved", className: "bg-blue-100 text-blue-800" },
  in_progress: { label: "In Progress", className: "bg-purple-100 text-purple-800" },
  deployed: { label: "Deployed", className: "bg-green-100 text-green-800" },
  rolled_back: { label: "Rolled Back", className: "bg-red-100 text-red-800" },
  failed: { label: "Failed", className: "bg-red-100 text-red-800" },
};

const validationStatusConfig: Record<ValidationStatus, { label: string; className: string }> = {
  passed: { label: "Passed", className: "bg-green-100 text-green-800" },
  failed: { label: "Failed", className: "bg-red-100 text-red-800" },
  running: { label: "Running", className: "bg-blue-100 text-blue-800" },
  pending: { label: "Pending", className: "bg-gray-100 text-gray-600" },
  skipped: { label: "Skipped", className: "bg-gray-100 text-gray-500" },
};

export function ChangeStatusBadge({ status }: { status: ChangeStatus }) {
  const config = changeStatusConfig[status];
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-1 text-xs font-medium", config.className)}>
      {config.label}
    </span>
  );
}

export function ValidationStatusBadge({ status }: { status: ValidationStatus }) {
  const config = validationStatusConfig[status];
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-1 text-xs font-medium", config.className)}>
      {status === "running" && (
        <span className="mr-1 h-1.5 w-1.5 animate-pulse rounded-full bg-blue-500" />
      )}
      {config.label}
    </span>
  );
}
