# Change & Release Dashboard

A full-stack **software change validation and release impact analysis dashboard** built with Next.js 14, Prisma, and NextAuth.js.

![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8?logo=tailwindcss)
![Prisma](https://img.shields.io/badge/Prisma-6.x-2D3748?logo=prisma)

## Features

### Core Dashboard
- **Overview** — KPI cards, risk gauges, deployment frequency charts, recent change requests
- **Change Requests** — Searchable/filterable list with detail panel, validation progress bars, **CRUD operations** (create, delete), **pagination**
- **Impact Analysis** — Risk heatmap, radar chart per change, bar chart by category
- **Validations** — Pie/bar charts, pass rate by team, blocker alerts, type/status filters
- **Releases** — Timeline view, bundled changes, deployment readiness bars, **collapsible per-release validation details**
- **Metrics & Trends** — DORA metrics, risk/validation trends, lead time breakdown, weekly health
- **Settings** — Dashboard configuration (admin/manager only)
- **User Management** — Admin-only page to list users, change roles, delete accounts

### Authentication & Authorization
- **Login / Register / Reset Password** pages with form validation
- **JWT-based sessions** via NextAuth.js with credentials provider
- **Role-based access**: Admin, Manager, Viewer with permission matrix
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
- **Jest + React Testing Library** with 24 unit tests across utils, constants, and auth-types
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

| Email || Role |
|---|---|---|
| `admin@company.com` | | Admin |
| `manager@company.com` | | Manager |
| `viewer@company.com` | | Viewer |

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
│   │   ├── changes/
│   │   ├── impact/
│   │   ├── metrics/
│   │   ├── releases/
│   │   ├── settings/
│   │   │   └── users/       # Admin user management
│   │   ├── validations/
│   │   └── layout.tsx       # Responsive layout + command palette
│   ├── api/
│   │   ├── admin/users/     # Admin user CRUD API
│   │   ├── auth/            # NextAuth + register + reset-password
│   │   └── data/
│   │       ├── route.ts     # Dashboard data API
│   │       └── changes/     # Change request CRUD API
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
│   ├── use-data.ts           # SWR-based data fetching hook
│   ├── use-debounce.ts
│   ├── use-media-query.ts
│   └── use-permissions.ts    # Role permission hook
├── lib/
│   ├── __tests__/            # Jest unit tests
│   ├── auth.ts               # NextAuth configuration
│   ├── auth-types.ts         # Role types + permissions
│   ├── constants.ts          # App-wide constants
│   ├── data.ts               # Static mock data (legacy fallback)
│   ├── prisma.ts             # Prisma client singleton
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

## License

ISC
