import { Skeleton } from "@/components/skeleton";

export default function ChangesLoading() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="mt-2 h-4 w-80" />
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 flex-1" />
          <Skeleton className="h-9 w-36" />
          <Skeleton className="h-9 w-36" />
        </div>
      </div>

      {/* Change Cards */}
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between">
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-5 w-80" />
                <Skeleton className="h-4 w-full max-w-xl" />
                <Skeleton className="h-3 w-64" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-6 w-24 rounded-full" />
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <Skeleton className="h-2 w-12" />
              <div className="flex gap-1">
                {Array.from({ length: 5 }).map((_, j) => (
                  <Skeleton key={j} className="h-2 w-6 rounded-full" />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
