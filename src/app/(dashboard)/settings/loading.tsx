import { Skeleton } from "@/components/skeleton";

export default function SettingsLoading() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-32" />
        <Skeleton className="mt-2 h-4 w-80" />
      </div>

      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="mt-1 h-4 w-64" />
          <div className="mt-4 space-y-3">
            {Array.from({ length: 3 }).map((_, j) => (
              <Skeleton key={j} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
