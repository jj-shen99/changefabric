"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
      <div className="rounded-full bg-red-100 p-4">
        <AlertTriangle className="h-8 w-8 text-red-600" />
      </div>
      <div className="text-center">
        <h2 className="text-xl font-bold text-gray-900">Something went wrong</h2>
        <p className="mt-1 text-sm text-gray-500">
          An unexpected error occurred. Please try again or contact support if the issue persists.
        </p>
        {error.digest && (
          <p className="mt-2 font-mono text-xs text-gray-400">Error ID: {error.digest}</p>
        )}
      </div>
      <button
        onClick={reset}
        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        <RotateCcw className="h-4 w-4" />
        Try Again
      </button>
    </div>
  );
}
