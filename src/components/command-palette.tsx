"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, X, GitPullRequest, Rocket, CheckCircle2, LayoutDashboard, ShieldAlert, BarChart3, Settings, ArrowRight } from "lucide-react";
import { useData } from "@/hooks";

interface SearchResult {
  id: string;
  label: string;
  description: string;
  href: string;
  icon: React.ElementType;
  category: "page" | "change" | "release" | "validation";
}

const PAGES: SearchResult[] = [
  { id: "nav-overview", label: "Overview", description: "Dashboard overview", href: "/", icon: LayoutDashboard, category: "page" },
  { id: "nav-changes", label: "Change Requests", description: "Track and manage changes", href: "/changes", icon: GitPullRequest, category: "page" },
  { id: "nav-impact", label: "Impact Analysis", description: "Risk assessment", href: "/impact", icon: ShieldAlert, category: "page" },
  { id: "nav-releases", label: "Releases", description: "Release timeline", href: "/releases", icon: Rocket, category: "page" },
  { id: "nav-validations", label: "Validations", description: "Test results and gates", href: "/validations", icon: CheckCircle2, category: "page" },
  { id: "nav-metrics", label: "Metrics & Trends", description: "DORA metrics", href: "/metrics", icon: BarChart3, category: "page" },
  { id: "nav-settings", label: "Settings", description: "Dashboard configuration", href: "/settings", icon: Settings, category: "page" },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { changeRequests, releases } = useData();

  // Keyboard shortcut
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setOpen(false);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Build search results from data
  const getResults = useCallback((): SearchResult[] => {
    const q = query.toLowerCase().trim();
    if (!q) return PAGES;

    const results: SearchResult[] = [];

    // Filter pages
    PAGES.forEach((p) => {
      if (p.label.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)) {
        results.push(p);
      }
    });

    // Search change requests
    changeRequests.forEach((cr) => {
      if (
        cr.id.toLowerCase().includes(q) ||
        cr.title.toLowerCase().includes(q) ||
        cr.author.toLowerCase().includes(q) ||
        cr.team.toLowerCase().includes(q)
      ) {
        results.push({
          id: `cr-${cr.id}`,
          label: `${cr.id}: ${cr.title}`,
          description: `${cr.team} · ${cr.author} · Risk ${cr.impact.overallRisk}`,
          href: `/changes`,
          icon: GitPullRequest,
          category: "change",
        });
      }
    });

    // Search releases
    releases.forEach((r) => {
      if (
        r.id.toLowerCase().includes(q) ||
        r.name.toLowerCase().includes(q) ||
        r.version.toLowerCase().includes(q)
      ) {
        results.push({
          id: `rel-${r.id}`,
          label: `${r.id}: ${r.name}`,
          description: `v${r.version} · ${r.status} · Risk ${r.overallRisk}`,
          href: `/releases`,
          icon: Rocket,
          category: "release",
        });
      }
    });

    // Search validations
    changeRequests.forEach((cr) => {
      cr.validations.forEach((v) => {
        if (v.name.toLowerCase().includes(q) || v.type.toLowerCase().includes(q)) {
          results.push({
            id: `val-${v.id}`,
            label: v.name,
            description: `${cr.id} · ${v.type.replace(/_/g, " ")} · ${v.status}`,
            href: `/validations`,
            icon: CheckCircle2,
            category: "validation",
          });
        }
      });
    });

    return results.slice(0, 20);
  }, [query, changeRequests, releases]);

  const results = getResults();

  // Keyboard navigation
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && results[selectedIndex]) {
      e.preventDefault();
      router.push(results[selectedIndex].href);
      setOpen(false);
    }
  }

  // Scroll selected into view
  useEffect(() => {
    const el = listRef.current?.children[selectedIndex] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  if (!open) return null;

  const categoryLabels: Record<string, string> = {
    page: "Pages",
    change: "Change Requests",
    release: "Releases",
    validation: "Validations",
  };

  // Group results by category
  const grouped: Record<string, SearchResult[]> = {};
  results.forEach((r) => {
    if (!grouped[r.category]) grouped[r.category] = [];
    grouped[r.category].push(r);
  });

  let flatIndex = 0;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)} />

      {/* Dialog */}
      <div className="relative w-full max-w-lg rounded-xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900">
        {/* Search input */}
        <div className="flex items-center gap-3 border-b border-gray-200 px-4 dark:border-gray-700">
          <Search className="h-4 w-4 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search pages, changes, releases, validations..."
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent py-3 text-sm text-gray-900 outline-none placeholder:text-gray-400 dark:text-gray-100"
          />
          <kbd className="hidden rounded border border-gray-200 px-1.5 py-0.5 text-[10px] font-medium text-gray-400 sm:inline dark:border-gray-700">ESC</kbd>
          <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-80 overflow-y-auto p-2">
          {results.length === 0 && (
            <div className="py-8 text-center text-sm text-gray-400">
              No results found for &quot;{query}&quot;
            </div>
          )}
          {Object.entries(grouped).map(([category, items]) => (
            <div key={category}>
              <div className="px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                {categoryLabels[category] || category}
              </div>
              {items.map((result) => {
                const idx = flatIndex++;
                const Icon = result.icon;
                return (
                  <button
                    key={result.id}
                    onClick={() => { router.push(result.href); setOpen(false); }}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                      idx === selectedIndex
                        ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                        : "text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
                    }`}
                  >
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-medium">{result.label}</p>
                      <p className="truncate text-xs text-gray-400">{result.description}</p>
                    </div>
                    <ArrowRight className="h-3 w-3 flex-shrink-0 opacity-40" />
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-gray-200 px-4 py-2 text-[10px] text-gray-400 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Open</span>
            <span>esc Close</span>
          </div>
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-gray-200 px-1 py-0.5 font-medium dark:border-gray-700">⌘K</kbd>
            to toggle
          </span>
        </div>
      </div>
    </div>
  );
}
