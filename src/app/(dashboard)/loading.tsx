import { Skeleton } from "@/components/skeleton";

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Skeleton className="h-8 w-64" />
        <Skeleton className="mt-2 h-4 w-96" />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between">
              <Skeleton className="h-8 w-8 rounded-lg" />
              <Skeleton className="h-4 w-12" />
            </div>
            <div className="mt-3">
              <Skeleton className="h-8 w-16" />
              <Skeleton className="mt-1 h-3 w-24" />
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="mt-4 h-48 w-full rounded-lg" />
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="mt-4 h-48 w-full rounded-lg" />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <Skeleton className="h-5 w-48" />
        <div className="mt-4 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}
