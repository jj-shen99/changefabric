# Change Request Management AI Dashboard

A full-stack **software change validation and release impact analysis dashboard** built with Next.js 14, Prisma, and NextAuth.js. Features a complete **workflow state machine** for change request lifecycle management, **ML-powered risk analysis**, and **comprehensive plan quality scoring**.

![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8?logo=tailwindcss)
![Prisma](https://img.shields.io/badge/Prisma-6.x-2D3748?logo=prisma)
![Tests](https://img.shields.io/badge/Tests-450+-green)

## Features

### Core Dashboard
- **Overview** — KPI cards, risk gauges, deployment frequency charts, recent change requests, **change status/risk/category/team distribution charts**
- **Change Requests** — Full CRUD with workflow state machine:
  - **List View** — Searchable/filterable list with risk scores, state badges, pagination
  - **Detail View** — Tabbed interface (Overview, Approvals, Comments, Analysis)
  - **Create New** — Template-based creation, copy from existing CR
  - **Workflow Transitions** — State machine with guards (e.g., `hasPlannedWindow`, `allApprovalStepsApproved`)
  - **Approval Management** — Multi-step approval with configurable policies (all/any)
- **Impact Analysis** — 2-tab interface with URL parameter support (`/impact?cr=CHG0000001`):
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
- **6 Core User Roles** with granular permission matrix:
  - **Super Admin** — Global access across all organizations, user management, organization management
  - **Admin** — Full system access within organization, user management, settings, CR deletion
  - **Manager** — Create/edit CRs, approve, implement, manage releases (includes approver + implementer abilities)
  - **Approver** — Approve CRs assigned to them, view activity logs
  - **Implementer** — Execute approved changes, cannot create/approve
  - **Requester** — Create and edit their own CRs, view metrics for own CRs
- **Role Hierarchy** — Super Admin > Admin > Manager > Approver/Implementer > Requester
- **Multi-Tenancy** — Organization-based data isolation (see [MULTI_TENANCY.md](docs/MULTI_TENANCY.md))
- **Per-user data isolation** — non-admin users only see their own synced change requests and analyses
- **Per-user credential storage** — each user saves their own ITSM/Git credentials (AES-256-GCM encrypted)
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
- **Dual-provider Prisma ORM** — SQLite for development, **PostgreSQL for production**
  - Configurable via `DATABASE_PROVIDER` env (auto-detected from `DATABASE_URL`)
  - SQLite (`file:./dev.db`) for zero-setup local dev
  - PostgreSQL (`postgresql://...`) recommended for multi-user / high-volume production
- Full schema for Users, ChangeRequests, ImpactAnalysis, Validations, Releases, DashboardMetrics, SavedAnalysis, IntegrationSettings
- Seed script with 3 demo users, 8 change requests, 3 releases
- **CRUD API** for change requests (`POST`/`PUT`/`DELETE /api/data/changes`)
- **Admin API** for user management (`GET`/`PUT`/`DELETE /api/admin/users`)
- Encrypted `DATABASE_URL` support (`enc:` prefix → AES-256-GCM auto-decrypt at boot)

### LLM-Powered Quality Analysis
- **Pluggable LLM backend** — choose `openai`, `anthropic`, `ollama`, or `disabled`
- LLM enriches plan analysis with: executive summary, reviewer-style feedback, structured issues + suggestions, calibrated quality score (0–100)
- **Always-safe** — heuristic fallback runs deterministically if LLM is disabled, the API key is missing, the network fails, or the response is malformed
- Local-first option via **Ollama** for on-prem environments without external API access
- Endpoint: `POST /api/data/risk-predict` with `{ number, includeLLM: true }`

### Predictive Risk Model (ML)
- **Logistic-regression risk model** with hand-crafted, fully-explainable features
- Predicts `riskScore` (0–100), `riskTier` (low/medium/high/critical), `successProbability`, `recommendation` (approve / review-recommended / additional-controls / block-pending-review)
- **Per-feature contribution breakdown** — shows exactly which fields are pushing risk up or down
- **Confidence score** based on input completeness
- **Calibration script** (`npx tsx scripts/train-risk-model.ts`) — runs Brier-score calibration against historical CR outcomes
- Endpoint: `POST /api/data/risk-predict`

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

### Workflow State Machine
- **Three workflow types**: Standard, Pre-approved, Emergency
- **11 workflow states**: draft, submitted, awaiting_approval, approved, scheduled, in_progress, implemented, rolled_back, closed, rejected, canceled
- **State transitions** with configurable guards and effects
- **Guards**: `hasPlannedWindow`, `allApprovalStepsApproved`, `hasBackoutPlan`, `hasImplementationPlan`
- **Effects**: `setActualStart`, `setActualEnd`, `setClosed`, `setRolledBack`, `startApprovalSteps`
- **Rollback support**: CRs can be rolled back from `in_progress` or `implemented` states
- **Cancel restrictions**: CRs cannot be canceled from `in_progress` or later states (use rollback instead)
- **Planned date validation**: Start must be before end, both must be in the future
- **Helpful error messages** when guards fail (e.g., "Please set Planned Start and Planned End dates before scheduling")

### Change Types & Approval
- **Standard CRs**: Full approval workflow with risk-based approval tiers
  - Critical (80-100): 3 approvers (Tech Lead, Security, CAB)
  - High (60-79): 2 approvers (Tech Lead, Manager)
  - Medium (0-59): 1 approver (Tech Lead)
  - All Standard CRs require at least one approval regardless of risk score
- **Emergency CRs**: Fast-track emergency approval, then retrospective approval after implementation
- **Pre-approved CRs**: No approval required, direct scheduling for low-risk templated changes

### Change Request Templates
- **25+ pre-built templates** covering various workflows and categories
- **Detailed templates** with comprehensive implementation, backout, and test plans:
  - Database Schema Migration, Microservice Deployment, Kubernetes Cluster Upgrade
  - API Version Deprecation, Data Center Migration, Third-Party Integration
  - Compliance Audit Remediation, Security Incident Response
- Templates include: Database Migration, API Deployment, Security Patch, Feature Flag, Infrastructure, and more
- **Copy from existing CR** feature for quick duplication

### Settings & Administration
- **Groups Management** — Create, edit, delete assignment groups with "Import Defaults" for standard groups
- **Services Management** — Manage service catalog with "Import Defaults" for common infrastructure services
- **User Management** — Admin user management with organization name display (not UUIDs)
- **Super Admin Features** — Create users for any organization, manage all orgs

### Testing & Code Quality
- **Jest + React Testing Library** with **450+ unit tests** covering:
  - Core modules: workflow runtime, state machine, impact analysis, approval engine, analytics
  - API routes: changes, templates, transitions, approvals
  - Components: risk badge, navigation links
  - Pages: dashboard, changes list, change detail, impact analysis, new change
  - Libraries: utils, constants, auth-types, crypto, access control, ML risk, LLM quality
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

### PostgreSQL (Production) Setup

For multi-user / high-volume production deployments, switch from SQLite to PostgreSQL:

```bash
# 1. Provision a PostgreSQL database (e.g. via Docker)
docker run -d --name release-pg \
  -e POSTGRES_USER=release \
  -e POSTGRES_PASSWORD=changeme \
  -e POSTGRES_DB=release_change_ai \
  -p 5432:5432 postgres:16

# 2. Update .env
DATABASE_PROVIDER="postgresql"
DATABASE_URL="postgresql://release:changeme@localhost:5432/release_change_ai?schema=public"

# 3. Apply schema and seed
npm run db:push
npm run db:seed

# 4. Restart the app
npm run build && npm start
```

The Prisma schema auto-detects the provider from `DATABASE_URL`, so the same codebase runs on either backend without changes.

### LLM-Powered Quality Analysis

Optional. The system works fully without an LLM (deterministic heuristics). To enable richer reviewer feedback:

```bash
# OpenAI
LLM_PROVIDER="openai"
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini

# OR Anthropic Claude
LLM_PROVIDER="anthropic"
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-3-5-sonnet-20241022

# OR self-hosted Ollama (no external API)
LLM_PROVIDER="ollama"
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2
```

Then call `POST /api/data/risk-predict` with `{ "number": "CHG0030001", "includeLLM": true }`.

### Predictive Risk Model (ML)

The ML risk model is enabled by default (`ML_RISK_ENABLED=true`). It runs in-process with no external dependencies. To re-calibrate against your historical CR outcomes:

```bash
npx tsx scripts/train-risk-model.ts
```

This loads all closed CRs from the DB, computes the Brier score, and prints calibration buckets so you can tune `WEIGHTS` in `src/lib/ml-risk.ts` if needed.

### Demo Accounts

| Email | Password | Role |
|---|---|---|
| `superadmin@example.com` | `superadmin123!` | Super Admin |
| `admin@example.com` | `admin123!` | Admin |
| `mike@example.com` | `manager123!` | Manager |
| `lisa@example.com` | `manager123!` | Manager |
| `approver1@example.com` | `approver1` | Approver |
| `approver2@example.com` | `approver2` | Approver |
| `implementer1@example.com` | `implementer1` | Implementer |
| `devops1@example.com` | `devops1` | Implementer |
| `requester1@example.com` | `requester1` | Requester |
| `developer1@example.com` | `developer1` | Requester |

> **Note**: For new role users (approver, implementer, requester), the password is the email prefix (e.g., `approver1@example.com` → password `approver1`)

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
│   │   ├── changes/         # Change Requests
│   │   │   ├── page.tsx     # List view with filters
│   │   │   ├── new/         # Create new CR (templates + copy)
│   │   │   └── [number]/    # Detail view with tabs
│   │   ├── code-analysis/   # Git commit risk analysis
│   │   ├── impact/          # Impact Analysis (2-tab)
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
│   │   ├── data/            # Dashboard data APIs
│   │   └── v2/              # V2 API routes
│   │       ├── changes/     # CR CRUD + transitions + approvals + comments
│   │       └── templates/   # CR template management
│   ├── error.tsx            # Global error boundary
│   ├── not-found.tsx        # Custom 404
│   ├── globals.css
│   └── layout.tsx           # Root layout with providers + Toaster
├── core/                     # Core business logic
│   ├── workflow/            # State machine + runtime
│   │   ├── definitions.ts   # Workflow definitions (standard, preapproved, emergency)
│   │   ├── state-machine.ts # State machine engine
│   │   └── runtime.ts       # Guards and effects
│   ├── approval/            # Approval engine
│   ├── impact/              # Impact analysis
│   ├── ml/                  # ML risk scoring
│   ├── analytics/           # Analytics calculations
│   └── schema.ts            # Core domain types
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
│   ├── prisma.ts             # Prisma client singleton
│   ├── servicenow.ts         # External ITSM sync client
│   └── utils.ts              # Utility functions
├── __tests__/                # Additional test suites
│   ├── api/                  # API route tests
│   ├── components/           # Component tests
│   ├── navigation/           # Link validation tests
│   └── pages/                # Page tests
├── middleware.ts              # Auth middleware
prisma/
├── schema.prisma             # Database schema (20+ models)
├── seed.ts                   # Database seeder (20 CRs, 19 templates)
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
| [Architecture](docs/ARCHITECTURE.md) | System architecture with diagrams (workflow, approval, data flow, RBAC) |
| [API Reference](docs/API.md) | Complete REST API documentation |
| [User Guide](docs/USER_GUIDE.md) | Feature guide for all dashboard pages |
| [Deployment Guide](docs/DEPLOYMENT.md) | Setup, deployment, and operations guide |
| [Testing Guide](docs/TESTING.md) | Test structure, running tests, writing tests |
| [Architecture Diagrams](docs/diagrams/) | Mermaid diagrams (PNG + source) for system visualization |

## License

ISC
