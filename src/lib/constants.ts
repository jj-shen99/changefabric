/**
 * Application-wide constants and configuration values.
 * Centralizes magic numbers and thresholds to avoid scattered hardcoded values.
 */

// Risk score thresholds used across the application
export const RISK_THRESHOLDS = {
  CRITICAL: 80,
  HIGH: 60,
  MEDIUM: 40,
  LOW: 0,
} as const;

// Risk level labels
export const RISK_LABELS = {
  CRITICAL: "Critical",
  HIGH: "High",
  MEDIUM: "Medium",
  LOW: "Low",
} as const;

// Risk level color classes (Tailwind)
export const RISK_COLORS = {
  CRITICAL: {
    text: "text-risk-critical",
    bg: "bg-red-100 text-red-800",
    fill: "#ef4444",
  },
  HIGH: {
    text: "text-risk-high",
    bg: "bg-orange-100 text-orange-800",
    fill: "#f97316",
  },
  MEDIUM: {
    text: "text-risk-medium",
    bg: "bg-yellow-100 text-yellow-800",
    fill: "#eab308",
  },
  LOW: {
    text: "text-risk-low",
    bg: "bg-green-100 text-green-800",
    fill: "#22c55e",
  },
} as const;

// Deployment health classification
export const DEPLOY_HEALTH = {
  EXCELLENT: { minSuccess: 95, maxRisk: 30 },
  GOOD: { minSuccess: 90, maxRisk: 40 },
  FAIR: { minSuccess: 85, maxRisk: 100 },
} as const;

// Pagination defaults
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 10,
  MAX_PAGE_SIZE: 100,
} as const;

// Search/filter debounce delay (ms)
export const DEBOUNCE_DELAY = 300;

// Chart styling defaults
export const CHART_STYLES = {
  gridStroke: "#f1f5f9",
  axisStroke: "#94a3b8",
  axisFontSize: 12,
  tooltipBorderRadius: "8px",
  tooltipBorder: "1px solid #e2e8f0",
  tooltipShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
} as const;

// Application metadata
export const APP_CONFIG = {
  name: "Change Request Management Dashboard",
  description: "Software change validation and release impact analysis dashboard",
  url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3600",
} as const;

// ── Consistent Dropdown Options ─────────────────────────────────
// Single source of truth for all dropdown values across the application

export const CR_TYPES = [
  { value: "standard", label: "Standard" },
  { value: "normal", label: "Normal" },
  { value: "emergency", label: "Emergency" },
] as const;

export const CR_CATEGORIES = [
  { value: "infrastructure", label: "Infrastructure" },
  { value: "feature", label: "Feature" },
  { value: "hotfix", label: "Hotfix" },
  { value: "database", label: "Database" },
  { value: "config", label: "Configuration" },
  { value: "security", label: "Security" },
  { value: "network", label: "Network" },
  { value: "application", label: "Application" },
  { value: "other", label: "Other" },
] as const;

export const CR_PRIORITIES = [
  { value: "1", label: "1 - Critical" },
  { value: "2", label: "2 - High" },
  { value: "3", label: "3 - Moderate" },
  { value: "4", label: "4 - Low" },
] as const;

export const CR_RISK_LEVELS = [
  { value: "low", label: "Low" },
  { value: "moderate", label: "Moderate" },
  { value: "high", label: "High" },
  { value: "very_high", label: "Very High" },
] as const;

export const CR_IMPACT_LEVELS = [
  { value: "1", label: "1 - High" },
  { value: "2", label: "2 - Medium" },
  { value: "3", label: "3 - Low" },
] as const;

export const CR_URGENCY_LEVELS = [
  { value: "1", label: "1 - High" },
  { value: "2", label: "2 - Medium" },
  { value: "3", label: "3 - Low" },
] as const;

export const CR_WORKFLOWS = [
  { value: "standard", label: "Standard" },
  { value: "emergency", label: "Emergency" },
  { value: "standard_preapproved", label: "Pre-approved" },
] as const;

export const CR_STATES = [
  { value: "draft", label: "Draft", tag: "editable" },
  { value: "submitted", label: "Submitted", tag: "in-flight" },
  { value: "assessing", label: "Assessing", tag: "in-flight" },
  { value: "awaiting_approval", label: "Awaiting Approval", tag: "in-flight" },
  { value: "approved", label: "Approved", tag: "in-flight" },
  { value: "scheduled", label: "Scheduled", tag: "in-flight" },
  { value: "in_progress", label: "In Progress", tag: "in-flight" },
  { value: "implemented", label: "Implemented", tag: "in-flight" },
  { value: "reviewing", label: "Reviewing", tag: "in-flight" },
  { value: "closed", label: "Closed", tag: "done" },
  { value: "rejected", label: "Rejected", tag: "done" },
  { value: "canceled", label: "Canceled", tag: "done" },
] as const;

export const CR_APPROVAL_STATES = [
  { value: "not_requested", label: "Not Requested" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
] as const;

export const ASSIGNMENT_GROUPS = [
  { value: "Platform", label: "Platform" },
  { value: "Payments", label: "Payments" },
  { value: "Identity", label: "Identity" },
  { value: "Data Engineering", label: "Data Engineering" },
  { value: "Infrastructure", label: "Infrastructure" },
  { value: "Security", label: "Security" },
  { value: "DevOps", label: "DevOps" },
  { value: "Frontend", label: "Frontend" },
  { value: "Backend", label: "Backend" },
  { value: "Mobile", label: "Mobile" },
  { value: "QA", label: "QA" },
  { value: "Product", label: "Product" },
  { value: "SRE", label: "SRE" },
  { value: "Database", label: "Database" },
  { value: "Network", label: "Network" },
] as const;

// Navigation items (single source of truth for sidebar + breadcrumbs)
export type NavItem = { href: string; label: string; segment: string | null };
export type NavSection = { section: string | null; items: NavItem[] };

export const NAV_SECTIONS: NavSection[] = [
  {
    section: "Changes",
    items: [
      { href: "/", label: "Overview", segment: null },
      { href: "/changes", label: "Change Requests", segment: "changes" },
      { href: "/impact", label: "Impact Analysis", segment: "impact" },
      { href: "/code-analysis", label: "Code Analysis", segment: "code-analysis" },
      { href: "/reports", label: "Reports", segment: "reports" },
      { href: "/analytics", label: "CHG Analytics", segment: "analytics" },
    ],
  },
];

// Flat list for backward compatibility (command palette, tests, etc.)
export const NAV_ITEMS = NAV_SECTIONS.flatMap((s) => s.items);
