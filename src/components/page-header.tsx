"use client";

import { Bell } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="flex h-11 items-center justify-between bg-gradient-to-r from-slate-600 to-slate-700 px-5 dark:from-slate-700 dark:to-slate-800">
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-3">
          <h1 className="text-sm font-bold text-white">{title}</h1>
          {subtitle && (
            <p className="hidden truncate text-xs text-slate-400 md:block">{subtitle}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1">
        {actions}
        <button
          className="relative rounded-lg p-1.5 text-slate-300 transition-colors hover:bg-white/10"
          aria-label="Notifications"
        >
          <Bell className="h-3.5 w-3.5" />
          <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-red-400 ring-1 ring-slate-700" />
        </button>
        <ThemeToggle />
      </div>
    </div>
  );
}
