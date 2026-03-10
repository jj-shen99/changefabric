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
  name: "Change & Release Dashboard",
  description: "Software change validation and release impact analysis dashboard",
  url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3600",
} as const;

// Navigation items (single source of truth for sidebar + breadcrumbs)
export const NAV_ITEMS = [
  { href: "/", label: "Overview", segment: null },
  { href: "/changes", label: "Change Requests", segment: "changes" },
  { href: "/impact", label: "Impact Analysis", segment: "impact" },
  { href: "/releases", label: "Releases", segment: "releases" },
  { href: "/validations", label: "Validations", segment: "validations" },
  { href: "/metrics", label: "Metrics & Trends", segment: "metrics" },
  { href: "/risk-radar", label: "Risk Radar", segment: "risk-radar" },
  { href: "/confidence", label: "Confidence", segment: "confidence" },
  { href: "/failure-analysis", label: "Failure Analysis", segment: "failure-analysis" },
  { href: "/velocity", label: "Velocity", segment: "velocity" },
  { href: "/executive", label: "Executive", segment: "executive" },
] as const;
