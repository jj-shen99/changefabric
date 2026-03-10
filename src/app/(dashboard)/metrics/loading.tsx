import { Skeleton } from "@/components/skeleton";

export default function MetricsLoading() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="mt-2 h-4 w-80" />
      </div>

      {/* DORA Metrics */}
      <div>
        <Skeleton className="h-4 w-32" />
        <div className="mt-3 grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between">
                <Skeleton className="h-8 w-8 rounded-lg" />
                <Skeleton className="h-5 w-24 rounded-full" />
              </div>
              <div className="mt-3">
                <Skeleton className="h-8 w-20" />
                <Skeleton className="mt-1 h-3 w-36" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="mt-1 h-3 w-64" />
            <Skeleton className="mt-4 h-56 w-full rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}
