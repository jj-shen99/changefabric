# Codebase Analysis — Change & Release Dashboard

> **Version**: 1.1.0
> **Last Updated**: March 11, 2026

---

## Table of Contents

1. [Repository Overview](#1-repository-overview)
2. [File Statistics](#2-file-statistics)
3. [Directory Structure Analysis](#3-directory-structure-analysis)
4. [Core Modules Deep Dive](#4-core-modules-deep-dive)
5. [API Layer Analysis](#5-api-layer-analysis)
6. [Data Model Analysis](#6-data-model-analysis)
7. [Hook Architecture Analysis](#7-hook-architecture-analysis)
8. [Component Analysis](#8-component-analysis)
9. [Configuration & Tooling](#9-configuration--tooling)
10. [Dependency Analysis](#10-dependency-analysis)
11. [Code Patterns & Conventions](#11-code-patterns--conventions)
12. [Testing Analysis](#12-testing-analysis)
13. [Technical Debt & Observations](#13-technical-debt--observations)
14. [Strengths](#14-strengths)

---

## 1. Repository Overview

| Metric | Value |
|--------|-------|
| **Framework** | Next.js 14 (App Router) |
| **Language** | TypeScript 5.9 (strict mode) |
| **Total source files** | ~57 TypeScript/TSX files |
| **Configuration files** | ~10 (tsconfig, eslint, prettier, jest, postcss, tailwind, editorconfig, next.config) |
| **Database** | SQLite via Prisma ORM |
| **Test framework** | Jest + React Testing Library |

---

## 2. File Statistics

### By Directory

| Directory | Files | Purpose |
|-----------|-------|---------|
| `src/app/(auth)/` | 4 | Auth pages (login, register, reset-password, layout) |
| `src/app/(dashboard)/` | 28 | Dashboard pages, layouts, and loading states |
| `src/app/api/` | 7 | REST API route handlers |
| `src/app/` (root) | 4 | Root layout, globals.css, error.tsx, not-found.tsx |
| `src/components/` | 12 | Reusable UI components |
| `src/hooks/` | 5 | Custom React hooks |
| `src/lib/` | 7+ | Utilities, types, auth config, constants, Prisma client |
| `prisma/` | 2 | Schema definition + seed script |
| `scripts/` | 1 | ServiceNow import CLI |

### By File Type

| Extension | Count | Role |
|-----------|-------|------|
| `.tsx` | ~40 | React page and component files |
| `.ts` | ~20 | Hooks, utilities, API routes, types, config |
| `.prisma` | 1 | Database schema |
| `.css` | 1 | Global styles (Tailwind directives) |
| `.js` | 3 | Config files (next.config, postcss, tailwind) |
| `.json` | 3 | package.json, tsconfig, jest.config |

---

## 3. Directory Structure Analysis

```
release_change_ai/
│
├── prisma/                          ── DATA LAYER
│   ├── schema.prisma                   5 models, 180 lines
│   ├── seed.ts                         Demo data seeder
│   └── dev.db                          SQLite database file
│
├── scripts/
│   └── import-servicenow.ts         ── CLI import tool (35 lines)
│
├── src/
│   ├── app/                         ── NEXT.JS APP ROUTER
│   │   ├── layout.tsx                  Root layout (providers, font, metadata)
│   │   ├── globals.css                 Tailwind base + custom CSS vars
│   │   ├── error.tsx                   Global error boundary
│   │   ├── not-found.tsx               Custom 404 page
│   │   │
│   │   ├── (auth)/                  ── AUTH ROUTE GROUP (no sidebar)
│   │   │   ├── layout.tsx              Centered card layout
│   │   │   ├── login/page.tsx          Login form with NextAuth signIn
│   │   │   ├── register/page.tsx       Registration form
│   │   │   └── reset-password/page.tsx Password reset flow
│   │   │
│   │   ├── (dashboard)/             ── DASHBOARD ROUTE GROUP (with sidebar)
│   │   │   ├── layout.tsx              Sidebar + mobile nav + command palette
│   │   │   ├── loading.tsx             Overview skeleton
│   │   │   ├── page.tsx                Overview dashboard (/) 
│   │   │   ├── changes/               Change Requests
│   │   │   │   ├── page.tsx            Main page (~500 lines)
│   │   │   │   ├── layout.tsx          Metadata layout
│   │   │   │   └── loading.tsx         Skeleton
│   │   │   ├── impact/                Impact Analysis
│   │   │   │   ├── page.tsx            4-tab page (~1300 lines, largest page)
│   │   │   │   ├── layout.tsx
│   │   │   │   └── loading.tsx
│   │   │   ├── analytics/page.tsx      Analytics dashboard (4 tabs, ~660 lines)
│   │   │   ├── executive/page.tsx      Executive summary
│   │   │   ├── releases/              Releases & Validations
│   │   │   │   ├── page.tsx
│   │   │   │   ├── layout.tsx
│   │   │   │   └── loading.tsx
│   │   │   ├── risk-radar/page.tsx     Risk radar + confidence (~295 lines)
│   │   │   ├── confidence/page.tsx     Confidence scoring
│   │   │   ├── velocity/page.tsx       Team velocity
│   │   │   ├── failure-analysis/page.tsx Failure analysis
│   │   │   ├── metrics/               Metrics & Trends
│   │   │   │   ├── page.tsx
│   │   │   │   ├── layout.tsx
│   │   │   │   └── loading.tsx
│   │   │   ├── validations/           Validation tracking
│   │   │   │   ├── page.tsx
│   │   │   │   ├── layout.tsx
│   │   │   │   └── loading.tsx
│   │   │   └── settings/
│   │   │       ├── page.tsx            Dashboard settings
│   │   │       ├── layout.tsx
│   │   │       ├── loading.tsx
│   │   │       └── users/page.tsx      User management (admin)
│   │   │
│   │   └── api/                     ── API ROUTE HANDLERS
│   │       ├── auth/
│   │       │   ├── [...nextauth]/route.ts  NextAuth catch-all
│   │       │   ├── register/route.ts       POST /api/auth/register
│   │       │   └── reset-password/route.ts POST /api/auth/reset-password
│   │       ├── data/
│   │       │   ├── route.ts               GET /api/data (main data endpoint)
│   │       │   ├── analytics/route.ts     GET /api/data/analytics
│   │       │   ├── changes/route.ts       POST/PUT/DELETE /api/data/changes
│   │       │   └── plan-analysis/route.ts GET /api/data/plan-analysis (ML content analysis)
│   │       ├── admin/
│   │       │   └── users/route.ts         GET/PUT/DELETE /api/admin/users
│   │       └── sync/route.ts             POST /api/sync (ServiceNow)
│   │
│   ├── components/                  ── SHARED UI COMPONENTS
│   │   ├── card.tsx                    Card, CardHeader, CardTitle (CVA)
│   │   ├── command-palette.tsx         ⌘K search overlay
│   │   ├── page-header.tsx             Unified page header bar
│   │   ├── risk-badge.tsx              Color-coded risk label
│   │   ├── risk-gauge.tsx              SVG risk meter
│   │   ├── session-provider.tsx        NextAuth SessionProvider wrapper
│   │   ├── sidebar.tsx                 Navigation sidebar (~168 lines)
│   │   ├── skeleton.tsx                Loading placeholder
│   │   ├── skip-to-content.tsx         Accessibility skip link
│   │   ├── status-badge.tsx            Status indicator badge
│   │   ├── theme-provider.tsx          Dark mode context provider
│   │   └── theme-toggle.tsx            Sun/moon toggle button
│   │
│   ├── hooks/                       ── CUSTOM REACT HOOKS
│   │   ├── use-data.ts                 SWR hook for /api/data (62 lines)
│   │   ├── use-analytics.ts            SWR hook for /api/data/analytics (145 lines)
│   │   ├── use-permissions.ts          Role permission helper (19 lines)
│   │   ├── use-debounce.ts             Debounced value hook
│   │   └── use-media-query.ts          Responsive breakpoint detection
│   │
│   ├── lib/                         ── CORE LIBRARY
│   │   ├── auth.ts                     NextAuth configuration (72 lines)
│   │   ├── auth-types.ts               Role types + permission matrix (59 lines)
│   │   ├── constants.ts                App-wide constants (105 lines)
│   │   ├── types.ts                    Domain type definitions (155 lines)
│   │   ├── utils.ts                    Utility functions (68 lines)
│   │   ├── prisma.ts                   Prisma client singleton
│   │   ├── data.ts                     Legacy static mock data (fallback)
│   │   ├── servicenow.ts              ServiceNow sync client (147 lines)
│   │   └── __tests__/                  Unit test files
│   │
│   └── middleware.ts                ── AUTH MIDDLEWARE (20 lines)
│
├── package.json                     ── Dependency manifest
├── tsconfig.json                    ── TypeScript configuration
├── tailwind.config.js               ── Tailwind CSS configuration
├── postcss.config.js                ── PostCSS plugins
├── jest.config.ts                   ── Jest test configuration
├── next.config.js                   ── Next.js configuration
├── .env.example                     ── Environment template
├── .editorconfig                    ── Editor consistency rules
├── .eslintrc.json                   ── ESLint rules
├── .prettierrc                      ── Prettier formatting rules
├── README.md                        ── Project overview
├── REQUIREMENTS.md                  ── Requirements document
└── DEPLOYMENT.md                    ── Deployment guide
```

---

## 4. Core Modules Deep Dive

### 4.1 `src/lib/auth.ts` — Authentication Configuration

**Lines**: 72 | **Exports**: `authOptions`

Configures NextAuth.js with:
- **Credentials provider** — email/password login
- **bcryptjs** for password verification
- **JWT callbacks** — inject `role` and `id` into token
- **Session callbacks** — expose `role` and `id` to client
- **24-hour session** expiry

**Key design decision**: JWT strategy (stateless) rather than database sessions. This means sessions don't need a database table and scale horizontally, but tokens can't be individually revoked.

### 4.2 `src/lib/auth-types.ts` — Role System

**Lines**: 59 | **Exports**: `UserRole`, `ROLE_LABELS`, `ROLE_PERMISSIONS`

Defines a static permission matrix with 6 boolean permissions across 3 roles. Uses TypeScript module augmentation to extend NextAuth's `User`, `Session`, and `JWT` interfaces with the `role` field.

**Pattern**: Compile-time role enforcement via `as const` object.

### 4.3 `src/lib/constants.ts` — Centralized Configuration

**Lines**: 105 | **Exports**: 8 constants

Centralizes all magic numbers and configuration:
- `RISK_THRESHOLDS` — 0/40/60/80 breakpoints
- `RISK_LABELS` / `RISK_COLORS` — Consistent styling
- `DEPLOY_HEALTH` — Deployment classification
- `PAGINATION` — Default page sizes
- `DEBOUNCE_DELAY` — 300ms search delay
- `CHART_STYLES` — Recharts defaults
- `APP_CONFIG` — Application metadata
- `NAV_SECTIONS` / `NAV_ITEMS` — Single source of truth for navigation

### 4.4 `src/lib/types.ts` — Domain Types

**Lines**: 155 | **Exports**: 5 interfaces/types

Core domain model definitions:
- `ChangeRequest` — 90+ fields mirroring ServiceNow's `change_request` table exactly
- `Validation` — Test/review results linked to change requests
- `Release` — Release tracking entity
- `DashboardMetrics` — KPI snapshot
- `ValidationType` / `ValidationStatus` — Enumerated string unions

**Design decision**: All ServiceNow fields are typed as `string` to preserve raw data fidelity. Numeric conversions happen at the presentation layer.

### 4.5 `src/lib/utils.ts` — Utility Functions

**Lines**: 68 | **Exports**: 7 functions

| Function | Purpose |
|----------|---------|
| `cn()` | Merge Tailwind classes (clsx + twMerge) |
| `getRiskColor()` | Risk score → text color class |
| `getRiskBg()` | Risk score → background color class |
| `getRiskLabel()` | Risk score → "Critical"/"High"/"Medium"/"Low" |
| `getRiskFill()` | Risk score → hex fill color for charts |
| `riskNum()` | SN risk label ("High") → numeric score (0–100) |
| `formatSnDate()` | SN datetime string → formatted display |

All risk functions use `RISK_THRESHOLDS` from constants (no hardcoded values).

### 4.6 `src/lib/servicenow.ts` — ServiceNow Integration

**Lines**: 147 | **Exports**: `fetchChangeRequests`, `syncChangeRequests`, `SyncResult`

Two-phase sync process:
1. **Fetch** — Paginated GET from SN REST API (100 records/page, Basic Auth)
2. **Upsert** — Loop through records, normalize with `toRow()`, upsert via Prisma

**Key details**:
- `COLUMNS` array (93 entries) defines every persisted SN field
- `displayVal()` helper extracts `display_value` from SN reference objects
- Error handling is per-record (one bad record doesn't abort the batch)
- Returns `SyncResult` with counters: `fetched`, `upserted`, `errors`, `errorDetails`

### 4.7 `src/middleware.ts` — Route Protection

**Lines**: 20

Minimal middleware using NextAuth's `withAuth` wrapper. Declares a `matcher` array of protected route patterns. Any unauthenticated request to these patterns redirects to `/login`.

**Notable**: Analytics pages (`/analytics`, `/risk-radar`, `/executive`, etc.) are not explicitly in the matcher but are nested under the dashboard layout which requires auth.

---

## 5. API Layer Analysis

### 5.1 Endpoint Inventory

| Endpoint | Method | Auth | Handler Lines | Purpose |
|----------|--------|------|--------------|---------|
| `/api/data` | GET | Session | ~40 | Fetch all CRs, releases, metrics |
| `/api/data/analytics` | GET | Session | ~170 | Computed analytics (risk radar, blast radius, confidence, failure, velocity, rollback) |
| `/api/data/changes` | POST | Session | ~20 | Create change request |
| `/api/data/changes` | PUT | Session | ~20 | Update change request |
| `/api/data/changes` | DELETE | Session | ~15 | Delete change request |
| `/api/sync` | POST | Session | ~15 | Trigger SN sync |
| `/api/admin/users` | GET | Admin | ~20 | List all users |
| `/api/admin/users` | PUT | Admin | ~20 | Update user role |
| `/api/admin/users` | DELETE | Admin | ~15 | Delete user |
| `/api/auth/[...nextauth]` | * | Public | NextAuth | Auth endpoints |
| `/api/auth/register` | POST | Public | ~30 | User registration |
| `/api/auth/reset-password` | POST | Public | ~30 | Password reset |

### 5.2 `GET /api/data` — Main Data Endpoint

```
Input:  (none, session-authenticated)
Output: {
  changeRequests: ChangeRequest[]   ← with validations included
  releases: Release[]
  dashboardMetrics: DashboardMetric | null
}
```

- Runs 3 parallel Prisma queries via `Promise.all`
- Formats validations from the relation
- Used by `useData()` hook on every dashboard page

### 5.3 `GET /api/data/analytics` — Analytics Engine

The most complex API route. Performs server-side aggregation:

```
Input:  (none, session-authenticated)
Output: {
  releaseRiskRadar:     [per-release risk dimensions]
  blastRadius:          [per-assignment-group impact]
  confidenceScores:     [per-release confidence with recommendations]
  failureAnalysis:      {totalChanges, deployed, failed, rolledBack, failureByTeam[], serviceRiskRanking[]}
  velocity:             {teamVelocity[], categoryBreakdown[], approvalEfficiency[]}
  rollbackIntelligence: {rollbackCount, rollbackRate, rollbackData[], rollbackByService[]}
}
```

**Processing pipeline**:
1. Fetch CRs + releases from DB
2. Compute `releaseRiskRadar` with derived metrics (code churn, service spread, test coverage, risk factors)
3. Group CRs by `assignment_group` for blast radius
4. Compute confidence scores per release from validation pass rates
5. Aggregate failure rates by team
6. Rank services by risk exposure
7. Calculate team velocity and deployment rates
8. Analyze rollback patterns

---

## 6. Data Model Analysis

### 6.1 ChangeRequest — The Central Entity

The `ChangeRequest` model is the core data entity with **90+ string columns** mirroring the ServiceNow `change_request` table:

**Core fields** (actively used in UI):
- `number` (PK), `sys_id`, `short_description`, `description`
- `state`, `type`, `priority`, `risk`, `impact`, `urgency`, `scope`
- `assigned_to`, `assignment_group`, `opened_by`, `opened_at`
- `closed_at`, `close_code`, `close_notes`
- `implementation_plan`, `backout_plan`, `test_plan`
- `cmdb_ci`, `business_service`

**Supporting fields** (stored but less frequently rendered):
- CAB fields (`cab_required`, `cab_recommendation`, etc.)
- SLA fields (`made_sla`, `sla_due`, `due_date`)
- Conflict fields (`conflict_status`, `conflict_last_run`)
- Audit fields (`sys_created_by`, `sys_updated_on`, `sys_mod_count`)
- Communication fields (`work_notes`, `comments`, `watch_list`)

**Design tradeoff**: Storing all fields as strings is simple and lossless but means numeric comparisons and date operations require runtime conversion. This is acceptable because:
- ServiceNow itself returns mixed formats
- Display values for reference fields are strings by nature
- Analytics computations happen server-side in the API route

### 6.2 Relationships

```
ChangeRequest  1 ──── N  Validation
     │
     │  (logical, not FK)
     │
Release (standalone, no FK to ChangeRequest)
DashboardMetric (standalone snapshot)
User (standalone, auth only)
```

**Notable**: Releases are not formally linked to ChangeRequests via foreign key. The association is computed at the analytics API level.

---

## 7. Hook Architecture Analysis

### 7.1 `useData()` — Primary Data Hook

```typescript
// SWR configuration:
endpoint:        /api/data
refreshInterval: 30,000ms (30s auto-refresh)
dedupInterval:   5,000ms  (5s dedup window)
revalidateOnFocus: true
revalidateOnReconnect: true

// Returns:
changeRequests[]
releases[]
dashboardMetrics | null
loading: boolean
error: string | null
refetch(): Promise<void>
```

**Usage**: Overview, Changes, Impact Analysis, Releases, Metrics pages.

Every page that imports `useData()` shares the same SWR cache key (`/api/data`), meaning only one network request is made even if multiple components call the hook simultaneously. SWR's deduplication window (5s) prevents redundant fetches during rapid navigation.

### 7.2 `useAnalytics()` — Analytics Data Hook

```typescript
// SWR configuration:
endpoint:        /api/data/analytics
refreshInterval: 60,000ms (60s auto-refresh, longer due to computation cost)
dedupInterval:   10,000ms (10s dedup window)

// Returns:
releaseRiskRadar[]
blastRadius[]
confidenceScores[]
failureAnalysis{}
velocity{}
rollbackIntelligence{}
loading: boolean
error: string | null
```

**Usage**: Analytics, Risk Radar, Executive, Confidence, Velocity, Failure Analysis pages.

The analytics endpoint is more expensive (server-side aggregation), so it uses a longer refresh/dedup interval.

### 7.3 `usePermissions()` — Role Check Hook

```typescript
// Returns:
role: "admin" | "manager" | "viewer"
canManageUsers: boolean
canManageChanges: boolean
canApproveChanges: boolean
canManageReleases: boolean
canEditSettings: boolean
canViewMetrics: boolean
isAdmin: boolean
isManager: boolean
isViewer: boolean
```

Thin wrapper around `useSession()` + `ROLE_PERMISSIONS` lookup. Used to conditionally render UI elements.

### 7.4 `useDebounce()` — Input Debounce

Delays value updates by a configurable interval (default 300ms). Used in search inputs to avoid firing API calls on every keystroke.

### 7.5 `useMediaQuery()` — Responsive Detection

Returns a boolean for a CSS media query string. Used to detect mobile breakpoints and adjust layouts.

---

## 8. Component Analysis

### 8.1 Page Components (Largest Files)

| Page | Approx. Lines | Complexity | Notable Features |
|------|--------------|------------|-----------------|
| `impact/page.tsx` | ~1300 | **Very High** | 4 tabs (Overview, Plan Analysis, ML Analysis, Code Change), scoring functions, radar charts, ML content analysis, quality radar, risk vs readiness comparison |
| `changes/page.tsx` | ~500 | **High** | Search, filters, pagination, detail panel, SN sync |
| `risk-radar/page.tsx` | ~295 | **High** | Radar chart, confidence charts, release selector |
| `analytics/page.tsx` | ~660 | **Very High** | 4 tabs (Failure Analysis, Velocity, Metrics & Trends, Change Health), team radar, health scoring |
| `releases/page.tsx` | ~585 | **High** | Timeline, validation tracking, collapsible details |
| `executive/page.tsx` | ~320 | **Medium** | KPIs, risk gauges, confidence summary |
| `page.tsx` (Overview) | ~375 | **Medium** | KPI cards, state/risk/category/team distribution charts, recent changes |
| `settings/page.tsx` | ~90 | **Low** | Config form |
| `settings/users/page.tsx` | ~225 | **Medium** | User table, role editing, deletion |

### 8.2 Shared Component Complexity

| Component | Lines | Dependencies | State |
|-----------|-------|-------------|-------|
| `sidebar.tsx` | 168 | NextAuth, next/navigation, lucide, constants, auth-types | Session-derived |
| `command-palette.tsx` | ~150 | useData, lucide, next/navigation | Dialog open, search, results |
| `page-header.tsx` | ~39 | ThemeToggle, Bell icon | None (presentational) |
| `theme-toggle.tsx` | ~44 | ThemeProvider context | None (reads context) |
| `card.tsx` | ~30 | CVA, cn | None (presentational) |
| `risk-gauge.tsx` | ~40 | SVG rendering | None (presentational) |

### 8.3 Component Patterns

- **"use client"** directive: All dashboard pages and interactive components are client components (required for hooks, event handlers, SWR)
- **No Server Components**: Since every page uses SWR hooks or event handlers, all pages are client-rendered. Server components are used only for layouts and metadata.
- **PageHeader pattern**: Every dashboard page renders `<PageHeader>` as its first child, providing consistent title bar styling across all pages.
- **Tab pattern**: Pages with multiple views use `useState<TabType>` with a `TabButton` helper for consistent tab UI.

---

## 9. Configuration & Tooling

### 9.1 TypeScript (`tsconfig.json`)

- **Strict mode**: Enabled with `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`
- **Path aliases**: `@/*` → `src/*`
- **Target**: ES2017
- **Module**: ESNext with bundler resolution

### 9.2 ESLint (`.eslintrc.json`)

- Extends: `next/core-web-vitals` + `prettier`
- Integrates with Prettier to avoid formatting conflicts

### 9.3 Prettier (`.prettierrc`)

- Tailwind CSS plugin for class sorting
- Consistent code formatting across all files

### 9.4 Tailwind CSS (`tailwind.config.js`)

- Content paths: `src/**/*.{ts,tsx}`
- Dark mode: `class` strategy (controlled by ThemeProvider)
- Custom colors for risk levels

### 9.5 Jest (`jest.config.ts`)

- Environment: `jsdom` (browser simulation)
- Transform: `ts-jest` for TypeScript
- Module name mapping: `@/*` → `src/*`
- Test location: `src/lib/__tests__/`

---

## 10. Dependency Analysis

### 10.1 Production Dependencies (16 packages)

| Package | Version | Purpose | Weight |
|---------|---------|---------|--------|
| `next` | 14.2.x | Framework | Core |
| `react` / `react-dom` | 18.3.x | UI library | Core |
| `@prisma/client` | 6.19.x | Database ORM | Core |
| `prisma` | 6.19.x | Prisma CLI + engine | Core |
| `next-auth` | 4.24.x | Authentication | Core |
| `swr` | 2.4.x | Data fetching + caching | Core |
| `recharts` | 3.8.x | Chart library | Heavy (~300KB) |
| `bcryptjs` | 3.0.x | Password hashing | Light |
| `sonner` | 2.0.x | Toast notifications | Light |
| `lucide-react` | 0.577.x | Icon library (tree-shakeable) | Medium |
| `class-variance-authority` | 0.7.x | Component variant utility | Light |
| `clsx` | 2.1.x | Conditional className | Light |
| `tailwind-merge` | 3.5.x | Tailwind class merging | Light |
| `uuid` | 13.0.x | UUID generation | Light |

### 10.2 Dev Dependencies (17 packages)

| Category | Packages |
|----------|----------|
| **TypeScript** | `typescript`, `@types/node`, `@types/react`, `@types/react-dom`, `@types/bcryptjs`, `@types/uuid` |
| **Testing** | `jest`, `@jest/types`, `@types/jest`, `jest-environment-jsdom`, `ts-jest`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event` |
| **Styling** | `tailwindcss`, `autoprefixer`, `postcss`, `prettier-plugin-tailwindcss` |
| **Linting** | `eslint`, `eslint-config-next`, `eslint-config-prettier` |
| **Formatting** | `prettier` |
| **Build** | `tsx` (for running TypeScript scripts directly) |

### 10.3 Dependency Health

- All dependencies use caret (`^`) versioning for minor/patch auto-updates
- No known deprecated packages
- `recharts` is the heaviest UI dependency; consider lazy-loading chart-heavy pages if bundle size becomes a concern
- `lucide-react` is tree-shakeable — only imported icons are bundled

---

## 11. Code Patterns & Conventions

### 11.1 Naming Conventions

| Item | Convention | Example |
|------|-----------|---------|
| Files | kebab-case | `use-data.ts`, `risk-badge.tsx` |
| Components | PascalCase | `RiskBadge`, `PageHeader` |
| Hooks | camelCase with `use` prefix | `useData()`, `usePermissions()` |
| Constants | UPPER_SNAKE_CASE | `RISK_THRESHOLDS`, `NAV_SECTIONS` |
| Types/Interfaces | PascalCase | `ChangeRequest`, `UserRole` |
| API routes | `route.ts` in path-based folders | `src/app/api/data/route.ts` |
| CSS | Tailwind utility classes | No custom CSS files per component |

### 11.2 Import Organization

```typescript
// 1. React/Next.js
import { useState } from "react";
import Link from "next/link";

// 2. Third-party libraries
import useSWR from "swr";
import { BarChart } from "recharts";

// 3. Internal components
import { Card } from "@/components/card";

// 4. Internal hooks/utils
import { useData } from "@/hooks/use-data";
import { cn } from "@/lib/utils";

// 5. Types
import type { ChangeRequest } from "@/lib/types";
```

### 11.3 Error Handling Patterns

**API routes**:
```typescript
// Auth check → 401
const session = await getServerSession(authOptions);
if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

// Try/catch → 500
try { ... } catch { return NextResponse.json({ error: "..." }, { status: 500 }); }
```

**Client-side SWR**:
```typescript
// Error propagation via SWR
if (loading) return <Skeleton />;
if (error) return <ErrorMessage>{error}</ErrorMessage>;
```

**ServiceNow sync**:
```typescript
// Per-record error handling (batch continues)
try { await prisma.changeRequest.upsert(...) }
catch (err) { result.errors++; result.errorDetails.push(msg); }
```

### 11.4 State Management Patterns

- **No global state library** — SWR for server state, useState for local UI state
- **Derived state** — Computed values (e.g., `radarData`, `confidenceChartData`) are inline `const` expressions, not stored in state
- **Controlled components** — Form inputs use `useState` + `onChange`
- **URL state** — Not used; all filters/tabs are component-local state (lost on navigation)

---

## 12. Testing Analysis

### 12.1 Test Coverage

Tests are located in `src/lib/__tests__/` and cover:

| Test File | What It Tests |
|-----------|--------------|
| `utils.test.ts` | `cn()`, `getRiskColor()`, `getRiskBg()`, `getRiskLabel()`, `getRiskFill()`, `formatDate()`, `formatNumber()` |
| `constants.test.ts` | `RISK_THRESHOLDS`, `RISK_LABELS`, `PAGINATION`, `NAV_ITEMS`, `APP_CONFIG` structure |
| `auth-types.test.ts` | `ROLE_PERMISSIONS` matrix, `ROLE_LABELS`, `UserRole` type completeness |

### 12.2 Test Strategy

- **Unit tests only** — No integration, E2E, or API tests
- **Utility-focused** — Tests target pure functions and constant structures
- **No component tests** — React components are not tested (no render tests)
- **No API tests** — Route handlers are not tested in isolation

### 12.3 Running Tests

```bash
npm test              # Run all tests
npm run test:coverage # Run with coverage report
npm run validate      # Full validation: typecheck + lint + format:check
```

---

## 13. Technical Debt & Observations

### 13.1 Prisma Generated Client Mismatch

The Prisma generated client may be out of sync with the actual schema. The schema uses ServiceNow field names (`number`, `sys_id`, `assignment_group`), but lint errors suggest the generated client still expects older field names (`id`, `title`, `status`, `author`, `team`). This indicates `npx prisma generate` needs to be re-run after schema changes.

**Impact**: TypeScript errors in `prisma/seed.ts` and `src/app/api/data/analytics/route.ts`. The application works at runtime because the actual database schema is correct.

**Fix**: Run `npx prisma generate` to regenerate the client.

### 13.2 Large Page Components

Some pages exceed 500–800 lines (e.g., `impact/page.tsx`). These could benefit from:
- Extracting tab content into separate components
- Moving scoring functions into utility modules
- Creating shared chart wrapper components

### 13.3 No E2E or Integration Tests

The test suite covers utilities but not:
- API route handlers
- Page rendering
- User interaction flows
- Authentication flows

### 13.4 Filter State Not Persisted in URL

Page filters, search terms, and active tabs are stored in `useState` and lost on navigation. Moving to URL search params (`useSearchParams`) would enable:
- Shareable filtered views
- Browser back/forward support
- Bookmark-able states

### 13.5 Release-ChangeRequest Association

Releases are not formally linked to ChangeRequests in the database (no foreign key or junction table). The association is computed at the API level, which means there's no way to officially "bundle" specific changes into a release.

### 13.6 Legacy Mock Data

`src/lib/data.ts` contains static mock data from before the ServiceNow integration. It serves as a fallback but is not actively used. Consider removing to reduce confusion.

---

## 14. Strengths

### 14.1 Code Quality

- **Strict TypeScript** with comprehensive type definitions
- **Centralized constants** — no magic numbers
- **Consistent patterns** — every page follows the same structure (PageHeader → tabs → content)
- **Clean separation** — hooks encapsulate data, components handle rendering, API routes handle processing

### 14.2 Architecture

- **Next.js App Router** — modern routing with layouts, loading states, and error boundaries
- **SWR caching** — efficient data fetching with deduplication and background revalidation
- **Route groups** — clean separation of auth and dashboard layouts
- **Prisma ORM** — type-safe database access with easy migration path (SQLite → PostgreSQL)

### 14.3 User Experience

- **Command palette** (⌘K) for power users
- **Dark mode** with system preference detection
- **Loading skeletons** for every route
- **Toast notifications** for all user actions
- **Responsive design** with mobile sidebar overlay
- **Accessibility** — skip links, ARIA labels, keyboard navigation

### 14.4 Data Integrity

- **Full ServiceNow field preservation** — all 90+ fields stored verbatim
- **Idempotent sync** — upsert logic handles repeated imports gracefully
- **Per-record error handling** — one bad record doesn't break the batch
- **Display value resolution** — reference fields store human-readable values

### 14.5 Developer Experience

- **Single `npm run validate`** command for full quality check
- **EditorConfig** for cross-editor consistency
- **Prettier + Tailwind plugin** for auto-formatted, sorted classes
- **Path aliases** (`@/`) for clean imports
- **Seed script** for instant development setup
