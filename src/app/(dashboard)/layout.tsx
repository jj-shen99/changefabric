"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { Sidebar } from "@/components/sidebar";
import { SkipToContent } from "@/components/skip-to-content";
import { CommandPalette } from "@/components/command-palette";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <>
      <SkipToContent />
      <CommandPalette />
      {/* Mobile header */}
      <div className="flex h-14 items-center gap-3 border-b border-gray-200 bg-white px-4 md:hidden dark:border-gray-800 dark:bg-gray-900">
        <button
          onClick={() => setSidebarOpen(true)}
          className="rounded-lg p-1.5 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
          aria-label="Open sidebar"
        >
          <Menu className="h-5 w-5" />
        </button>
        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Change & Release</span>
      </div>
      <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden md:h-screen">
        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-40 md:hidden">
            <div className="fixed inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
            <div className="relative z-50 h-full w-64">
              <Sidebar onNavigate={() => setSidebarOpen(false)} />
            </div>
          </div>
        )}
        {/* Desktop sidebar */}
        <div className="hidden md:block h-full">
          <Sidebar />
        </div>
        <main
          id="main-content"
          role="main"
          className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-950"
          tabIndex={-1}
        >
          {children}
        </main>
      </div>
    </>
  );
}
