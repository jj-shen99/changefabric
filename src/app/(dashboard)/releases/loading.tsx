import { Skeleton } from "@/components/skeleton";

export default function ReleasesLoading() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-32" />
        <Skeleton className="mt-2 h-4 w-80" />
      </div>

      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <Skeleton className="h-12 w-12 rounded-xl" />
              <div>
                <Skeleton className="h-6 w-48" />
                <Skeleton className="mt-2 h-4 w-72" />
              </div>
            </div>
            <Skeleton className="h-7 w-24 rounded-full" />
          </div>
          <Skeleton className="mt-4 h-2 w-full rounded-full" />
          <div className="mt-4 space-y-2">
            {Array.from({ length: 2 }).map((_, j) => (
              <Skeleton key={j} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
