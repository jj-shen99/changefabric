import { Skeleton } from "@/components/skeleton";

export default function ValidationsLoading() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-36" />
        <Skeleton className="mt-2 h-4 w-96" />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded-lg" />
              <div>
                <Skeleton className="h-7 w-10" />
                <Skeleton className="mt-1 h-3 w-20" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-3 gap-6">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="mt-4 h-56 w-full rounded-lg" />
        </div>
        <div className="col-span-2 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="mt-4 h-56 w-full rounded-lg" />
        </div>
      </div>

      {/* Validation List */}
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}
