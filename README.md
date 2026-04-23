# GCS Change & Release Management Dashboard

A full-stack **software change validation and release impact analysis dashboard** built with Next.js 14, Prisma, and NextAuth.js.

![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8?logo=tailwindcss)
![Prisma](https://img.shields.io/badge/Prisma-6.x-2D3748?logo=prisma)

## Features

### Core Dashboard
- **Overview** — KPI cards, risk gauges, deployment frequency charts, recent change requests, **change status/risk/category/team distribution charts**
- **Change Requests** — Searchable/filterable list with detail panel, validation progress bars, **CRUD operations** (create, delete), **pagination**
- **Impact Analysis** — 4-tab interface:
  - **Overview** — KPI summary (impact + risk + plan readiness), impact/risk/state/type/priority distribution charts, plan coverage, readiness by team and SN risk level, **top risk CRs table**, **risk vs readiness correlation insights**
  - **Plan Analysis** — Per-CR plan readiness scoring with editable dimension weights, radar chart, plan content viewer, ML quality score integration
  - **ML Analysis** — Deep ML content analysis per CR: structure/completeness/clarity/risk-awareness scores, **quality radar chart**, **ML vs readiness comparison**, detected actions/risks, recommendations with severity
  - **Code Change Analysis** — Git commit analysis for code-level risk factors, **file type risk breakdown chart**, **commit message pattern analysis**, **cumulative risk trend area chart**, **directory risk heatmap**, **author activity heatmap** (day-of-week grid), **repository risk profile radar**, **AI Code Change Insights** (automated risk signal synthesis)
- **Analytics** — 4-tab interface:
  - **Failure Analysis** — Deployment outcome KPIs, failure by team bar chart, service risk ranking, rollback intelligence, **failure root cause analysis**, **rollback frequency by service**, **failure rate vs risk score trend**, **AI Failure Intelligence summary**
  - **Velocity** — Team velocity table, category breakdown, approval efficiency, **team efficiency radar**, **weekly throughput & risk trend**, **change window analysis** (low/standard/high-risk windows), **Velocity Intelligence insights**
  - **Metrics & Trends** — DORA metrics KPIs, risk score trend, validation pass rate trend, lead time breakdown, deployment frequency & outcomes, weekly deploy health table, **MTTR trend chart**, **SLA compliance dashboard**, **DORA Performance Classification** (elite/high/medium/low tiers with current position)
  - **Change Health** — Health score KPIs, team performance radar, team risk ranking, health score formula, team health table, **weekly health score trend**, **risk-velocity quadrant** (team scatter plot), **health improvement actions** (prioritized P1-P3 recommendations), **AI Health Intelligence summary**
- **Validations** — Pie/bar charts, pass rate by team, blocker alerts, type/status filters
- **Releases** — Timeline view, bundled changes, deployment readiness bars, **collapsible per-release validation details**
- **Metrics & Trends** — DORA metrics, risk/validation trends, lead time breakdown, weekly health (see Analytics page for enhanced version)
- **Settings** — Dashboard configuration (admin/manager only)
- **User Management** — Admin-only page to list users, change roles, delete accounts

### Authentication & Authorization
- **Login / Register / Reset Password** pages with form validation
- **JWT-based sessions** via NextAuth.js with credentials provider
- **Role-based access**: Admin and Manager roles with permission matrix
- **Per-user data isolation** — non-admin users only see their own synced change requests and analyses
- **Per-user credential storage** — each user saves their own ServiceNow/Git credentials (AES-256-GCM encrypted)
- **Role-based UI gating** — sidebar items, CRUD buttons, and pages hidden based on permissions
- User avatar, role badge, and sign-out in sidebar

### Real-Time Data with SWR
- All dashboard pages fetch from `/api/data` (database-backed) via **SWR**
- **Auto-refresh** every 30 seconds, revalidation on focus/reconnect
- Request **deduplication** and client-side caching across pages
- Optimistic UI updates for CRUD operations

### Global Command Palette
- **⌘K / Ctrl+K** to open a searchable command palette
- Search across **pages, change requests, releases, and validations**
- Keyboard navigation (↑↓ navigate, ↵ open, Esc close)
- Grouped results by category

### Database
- **SQLite** via Prisma ORM (easily swappable to PostgreSQL/MySQL)
- Full schema for Users, ChangeRequests, ImpactAnalysis, Validations, Releases, DashboardMetrics
- Seed script with 3 demo users, 8 change requests, 3 releases
- **CRUD API** for change requests (`POST`/`PUT`/`DELETE /api/data/changes`)
- **Admin API** for user management (`GET`/`PUT`/`DELETE /api/admin/users`)

### UI/UX
- **Dark mode** toggle with localStorage persistence and system preference detection
- **Responsive / mobile layout** — collapsible sidebar with hamburger menu, mobile header
- **Toast notifications** via Sonner for login, CRUD actions, and errors
- **Pagination** on change requests (configurable page size)
- **Loading skeletons** for every route
- **Error boundary** (`error.tsx`) and **404 page** (`not-found.tsx`)
- **Skip-to-content** link for keyboard accessibility
- **ARIA labels** on navigation, form controls, and icons
- **Inter font** via `next/font/google`

### Testing & Code Quality
- **Jest + React Testing Library** with 113 unit tests covering utils, constants, auth-types, crypto, access control, API authorization, page accessibility, boundary cases, and negative cases
- **ESLint** with Next.js + TypeScript + Prettier rules
- **Prettier** with Tailwind CSS class sorting
- **Strict TypeScript** (`noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`)
- **EditorConfig** for cross-editor consistency
- Constants module to eliminate magic numbers

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm 9+

### Installation

```bash
# Clone and install
git clone <repo-url>
cd release_change_ai
npm install

# Set up environment
cp .env.example .env
# Edit .env and set NEXTAUTH_SECRET to a secure random string

# Set up database
npm run db:push
npm run db:seed

# Start development server (port 3600)
npm run dev
```

Open [http://localhost:3600](http://localhost:3600) in your browser.

### Demo Accounts

| Email | Password | Role |
|---|---|---|
| `admin@servicenow.com` | `admin123!` | Admin |
| `manager@servicenow.com` | `manager123!` | Manager |
| `jane@servicenow.com` | `manager123!` | Manager |

## Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start dev server on port 3600 |
| `npm run build` | Production build |
| `npm run start` | Start production server on port 3600 |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Run ESLint with auto-fix |
| `npm run format` | Format code with Prettier |
| `npm run format:check` | Check formatting without writing |
| `npm run typecheck` | Run TypeScript compiler check |
| `npm test` | Run Jest unit tests |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run validate` | Run typecheck + lint + format:check |
| `npm run db:push` | Push Prisma schema to database |
| `npm run db:seed` | Seed database with demo data |
| `npm run db:reset` | Force reset database + re-seed |

## Project Structure

```
src/
├── app/
│   ├── (auth)/              # Auth pages (no sidebar)
│   │   ├── login/
│   │   ├── register/
│   │   └── reset-password/
│   ├── (dashboard)/         # Dashboard pages (with sidebar)
│   │   ├── analytics/       # CHG Analytics (4-tab)
│   │   ├── changes/         # Change Requests (CRUD + sync)
│   │   ├── code-analysis/   # Git commit risk analysis
│   │   ├── impact/          # Impact Analysis (4-tab)
│   │   ├── reports/         # Saved analysis reports
│   │   ├── settings/
│   │   │   ├── account/     # User's own account
│   │   │   ├── integrations/ # Per-user credential management
│   │   │   └── users/       # Admin-only user management
│   │   └── layout.tsx       # Responsive layout + command palette
│   ├── api/
│   │   ├── admin/users/     # Admin-only user CRUD API
│   │   ├── analysis/        # Saved analysis CRUD + HTML reports
│   │   ├── auth/            # NextAuth + register + reset-password + account
│   │   ├── data/
│   │   │   ├── route.ts     # Dashboard data API (user-filtered)
│   │   │   ├── analytics/   # Analytics API (user-filtered)
│   │   │   ├── changes/     # Change request CRUD API
│   │   │   ├── git-analysis/ # Git commit risk analysis API
│   │   │   └── plan-analysis/ # ML plan content analysis API
│   │   ├── settings/integrations/ # Per-user credential storage
│   │   └── sync/            # ServiceNow sync (sets syncedBy)
│   ├── error.tsx            # Global error boundary
│   ├── not-found.tsx        # Custom 404
│   ├── globals.css
│   └── layout.tsx           # Root layout with providers + Toaster
├── components/
│   ├── card.tsx
│   ├── command-palette.tsx   # ⌘K global search
│   ├── risk-badge.tsx
│   ├── risk-gauge.tsx
│   ├── session-provider.tsx
│   ├── sidebar.tsx           # Responsive + role-gated sidebar
│   ├── skeleton.tsx
│   ├── skip-to-content.tsx
│   ├── status-badge.tsx
│   ├── theme-provider.tsx
│   └── theme-toggle.tsx
├── hooks/
│   ├── use-analytics.ts      # Analytics data fetching hook
│   ├── use-data.ts           # SWR-based data fetching hook
│   ├── use-debounce.ts
│   ├── use-media-query.ts
│   └── use-permissions.ts    # Role permission hook
├── lib/
│   ├── __tests__/            # Jest unit tests
│   ├── auth.ts               # NextAuth configuration
│   ├── auth-types.ts         # Role types + permission matrix
│   ├── constants.ts          # App-wide constants
│   ├── crypto.ts             # AES-256-GCM encryption/decryption
│   ├── data.ts               # Static mock data (legacy fallback)
│   ├── prisma.ts             # Prisma client singleton
│   ├── servicenow.ts         # ServiceNow sync client
│   ├── types.ts              # Domain types
│   └── utils.ts              # Utility functions
├── middleware.ts              # Auth middleware
prisma/
├── schema.prisma             # Database schema
├── seed.ts                   # Database seeder
└── dev.db                    # SQLite database
```

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript 5.9
- **Styling**: Tailwind CSS 3.4
- **Database**: SQLite via Prisma ORM
- **Auth**: NextAuth.js 4 (JWT + Credentials)
- **Data Fetching**: SWR (caching, revalidation, deduplication)
- **Charts**: Recharts
- **Icons**: Lucide React
- **Notifications**: Sonner (toast system)
- **Testing**: Jest + React Testing Library
- **Utilities**: clsx, tailwind-merge, class-variance-authority

## Documentation

| Document | Description |
|----------|-------------|
| [Architecture](docs/ARCHITECTURE.md) | Legacy system architecture overview |
| [Architecture Diagrams](docs/architecture/) | Mermaid diagrams: system overview, access control, data flow, API routes, DB schema, UI components |
| [Impact Analysis](docs/IMPACT_ANALYSIS.md) | Scoring methodology for Plan, ML, and Dimension analysis |
| [Change Management Architecture](docs/CHANGE_MANAGEMENT_ARCHITECTURE.md) | End-to-end architecture graphs for the analysis pipeline |
| [User Guide](docs/USER_GUIDE.md) | Feature guide for all dashboard pages |
| [Codebase Analysis](docs/CODEBASE_ANALYSIS.md) | Deep dive into code structure and patterns |
| [Deployment Guide](docs/DEPLOYMENT.md) | Setup, deployment, and operations guide |
| [Requirements](docs/REQUIREMENTS.md) | Functional and non-functional requirements |

## License

ISC
