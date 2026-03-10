import Link from "next/link";
import { FileQuestion } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
      <div className="rounded-full bg-gray-100 p-4">
        <FileQuestion className="h-8 w-8 text-gray-400" />
      </div>
      <div className="text-center">
        <h2 className="text-xl font-bold text-gray-900">Page Not Found</h2>
        <p className="mt-1 text-sm text-gray-500">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
      </div>
      <Link
        href="/"
        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        Back to Dashboard
      </Link>
    </div>
  );
}
