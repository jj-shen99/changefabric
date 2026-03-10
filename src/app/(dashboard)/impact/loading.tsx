import { Skeleton } from "@/components/skeleton";

export default function ImpactLoading() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="mt-2 h-4 w-96" />
      </div>

      {/* Risk Heatmap */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <Skeleton className="h-5 w-64" />
        <div className="mt-4 space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded-lg" />
          ))}
        </div>
      </div>

      {/* Detail Cards */}
      <div className="grid grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="mt-4 h-56 w-full rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}
