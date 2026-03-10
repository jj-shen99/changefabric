import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Authentication",
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-gray-950">
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
