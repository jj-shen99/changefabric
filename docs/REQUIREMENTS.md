# Requirements Document — GCS Change & Release Management Dashboard

> **Version**: 1.2.0
> **Last Updated**: March 12, 2026

---

## 1. Product Overview

The **GCS Change & Release Management Dashboard** is a full-stack web application that provides real-time visibility into software change requests sourced from ServiceNow. It enables engineering and release management teams to assess risk, analyze impact, track validations, and make data-driven release decisions.

---

## 2. Functional Requirements

### 2.1 Dashboard & Overview

| ID | Requirement | Priority |
|----|------------|----------|
| FR-01 | Display KPI cards (total changes, open, closed, risk distribution) computed from real ServiceNow data | High |
| FR-02 | Show state distribution bar chart and risk distribution bar chart | High |
| FR-03 | List recent high-risk change requests with clickable drill-down | Medium |
| FR-04 | Auto-refresh data every 30 seconds via SWR | High |

### 2.2 Change Requests

| ID | Requirement | Priority |
|----|------------|----------|
| FR-05 | Searchable, filterable, paginated list of all change requests | High |
| FR-06 | Detail panel showing all ServiceNow fields for a selected change | High |
| FR-07 | "Pull Data" button to trigger live sync from ServiceNow instance | High |
| FR-08 | Support filtering by state, priority, risk, category, assignment group | Medium |

### 2.3 Impact Analysis

| ID | Requirement | Priority |
|----|------------|----------|
| FR-09 | **Overview tab**: KPI summary (impact + risk + plan readiness), impact/risk/state/type/priority distribution charts, plan coverage, readiness by team and SN risk level, top risk CRs table, risk vs readiness correlation insights | High |
| FR-10 | **Plan Analysis tab**: Per-CR plan readiness scoring with editable dimension weights (Implementation, Backout, Test, Risk/Impact, Change, Justification), radar chart, plan content viewer, ML quality score KPI | High |
| FR-11 | **ML Analysis tab**: Deep ML content analysis per CR with Structure/Completeness/Clarity/Risk Awareness scores, quality radar chart, ML vs readiness comparison, detected actions/risks, severity-rated recommendations | High |
| FR-12 | **Code Change Analysis tab**: Git commit analysis for code-level risk factors, file change heatmap, commit frequency | High |
| FR-13 | Plan readiness formula: `Overall = Σ(dimension_score × weight)` with 6 plan dimensions scored 0–100 | High |
| FR-13a | ML quality formula: `Overall = Structure×25% + Completeness×30% + Clarity×25% + RiskAwareness×20%` | High |

### 2.4 Plan Quality & ML Analysis

The Impact Analysis page uses two complementary scoring approaches:

**Plan Readiness Score** (weighted dimension scoring):
- 6 dimensions: Implementation Plan (25%), Backout Plan (25%), Test Plan (20%), Risk/Impact Analysis (15%), Change Plan (10%), Justification (5%)
- Weights are user-adjustable with live formula display
- Score range: 0–100

**ML Content Analysis** (NLP-based quality scoring):
```
ML Quality = Structure×25% + Completeness×30% + Clarity×25% + RiskAwareness×20%
```
- **Structure**: Numbered steps, bullets, line count, pre/post checks
- **Completeness**: Element checklist coverage (8 elements), word count depth
- **Clarity**: Words-per-line ratio, sequence words, conditionals
- **Risk Awareness**: Rollback refs, risk keywords, monitoring, backups, communication

ML Analysis also provides: detected actions, detected risks/gaps, severity-rated recommendations, change nature profiling, and application profiling.

### 2.5 Analytics & Advanced Pages

| ID | Requirement | Priority |
|----|------------|----------|
| FR-14 | **Risk Radar**: Multi-dimensional radar chart per release, release selector, risk factor assessment, blast radius by assignment group | High |
| FR-14a | **Change Health** (Analytics tab): Overall health score formula (DeployRate×40% + RiskInverse×30% + FailureInverse×30%), team performance radar, team risk ranking, team health summary table | High |
| FR-15 | **Confidence Scoring**: Release confidence scores with continue/pause/rollback recommendations | Medium |
| FR-16 | **Executive Summary**: High-level KPIs, risk gauges, and confidence indicators for leadership | Medium |
| FR-17 | **Releases**: Timeline view, deployment readiness, bundled change tracking | Medium |

### 2.6 Authentication & Authorization

| ID | Requirement | Priority |
|----|------------|----------|
| FR-18 | Login, Register, and Reset Password flows with form validation | High |
| FR-19 | JWT-based sessions via NextAuth.js Credentials provider | High |
| FR-20 | Role-based access control: Admin, Manager, Viewer | High |
| FR-21 | Role-gated UI: sidebar items, action buttons, and pages conditionally rendered | High |
| FR-22 | Admin-only user management (list, change roles, delete accounts) | Medium |

### 2.7 ServiceNow Integration

| ID | Requirement | Priority |
|----|------------|----------|
| FR-23 | Fetch all `change_request` records from ServiceNow REST API (`/api/now/table/change_request`) | High |
| FR-24 | Paginated fetch with `sysparm_display_value=true` for human-readable reference fields | High |
| FR-25 | Upsert records into local SQLite database via Prisma | High |
| FR-26 | Support both CLI import (`scripts/import-servicenow.ts`) and API-triggered sync (`POST /api/sync`) | Medium |
| FR-27 | Store all 90+ ServiceNow change_request fields verbatim | High |

### 2.8 Settings & Configuration

| ID | Requirement | Priority |
|----|------------|----------|
| FR-28 | Dashboard policy configuration (admin/manager only) | Low |
| FR-29 | Alert threshold management | Low |

---

## 3. Non-Functional Requirements

### 3.1 Performance

| ID | Requirement | Target |
|----|------------|--------|
| NFR-01 | Page load time (after initial JS bundle) | < 2 seconds |
| NFR-02 | API response time for data endpoints | < 500ms |
| NFR-03 | Client-side data caching and deduplication | Via SWR |
| NFR-04 | Static page generation where possible | Next.js SSG |

### 3.2 Security

| ID | Requirement |
|----|------------|
| NFR-05 | All API routes require authenticated session (401 if missing) |
| NFR-06 | Passwords hashed with bcryptjs before storage |
| NFR-07 | JWT tokens with configurable secret (`NEXTAUTH_SECRET`) |
| NFR-08 | Environment variables for all secrets (never hardcoded) |
| NFR-09 | Middleware-enforced auth on all dashboard routes |

### 3.3 Accessibility

| ID | Requirement |
|----|------------|
| NFR-10 | Skip-to-content link for keyboard users |
| NFR-11 | ARIA labels on navigation, forms, and icon buttons |
| NFR-12 | Dark mode with system preference detection and localStorage persistence |
| NFR-13 | Responsive layout for desktop and mobile |

### 3.4 Code Quality

| ID | Requirement |
|----|------------|
| NFR-14 | TypeScript strict mode |
| NFR-15 | ESLint with Next.js + Prettier rules |
| NFR-16 | Jest unit tests (minimum coverage on utils, constants, auth) |
| NFR-17 | EditorConfig for cross-editor consistency |

---

## 4. Technical Requirements

### 4.1 Runtime Environment

| Requirement | Specification |
|-------------|--------------|
| **Node.js** | 18.0 or higher |
| **npm** | 9.0 or higher |
| **OS** | macOS, Linux, or Windows |

### 4.2 Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| **Framework** | Next.js (App Router) | 14.2.x |
| **Language** | TypeScript | 5.9.x |
| **Styling** | Tailwind CSS | 3.4.x |
| **Database** | SQLite via Prisma ORM | Prisma 6.x |
| **Auth** | NextAuth.js (JWT + Credentials) | 4.x |
| **Data Fetching** | SWR | 2.x |
| **Charts** | Recharts | 3.x |
| **Icons** | Lucide React | 0.577.x |
| **Notifications** | Sonner | 2.x |
| **Testing** | Jest + React Testing Library | Jest 30.x |

### 4.3 Database Schema

The application uses 5 Prisma models:

- **User** — Authentication accounts with role-based access
- **ChangeRequest** — All 90+ ServiceNow `change_request` fields stored as strings
- **Validation** — Change request validation results (tests, approvals, etc.)
- **Release** — Release tracking with risk scoring
- **DashboardMetric** — Point-in-time dashboard snapshots

### 4.4 API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/data` | Required | All change requests, releases, dashboard metrics |
| GET | `/api/data/analytics` | Required | Computed analytics (risk radar, blast radius, confidence, failure analysis, velocity) |
| GET | `/api/data/plan-analysis` | Required | ML content analysis for a specific CR (structure, completeness, clarity, risk awareness scores, recommendations) |
| POST | `/api/data/changes` | Required | Create change request |
| PUT | `/api/data/changes` | Required | Update change request |
| DELETE | `/api/data/changes` | Required | Delete change request |
| POST | `/api/sync` | Required | Trigger ServiceNow data sync |
| GET | `/api/admin/users` | Admin | List all users |
| PUT | `/api/admin/users` | Admin | Update user role |
| DELETE | `/api/admin/users` | Admin | Delete user account |
| POST | `/api/auth/register` | Public | Register new account |
| POST | `/api/auth/reset-password` | Public | Reset password flow |

### 4.5 External Dependencies

| Service | Purpose | Required |
|---------|---------|----------|
| **ServiceNow Instance** | Source of change request data | Optional (seed data available) |

---

## 5. User Roles & Permissions

| Permission | Admin | Manager | Viewer |
|-----------|-------|---------|--------|
| View dashboard & analytics | ✅ | ✅ | ✅ |
| View change requests | ✅ | ✅ | ✅ |
| Create/edit change requests | ✅ | ✅ | ❌ |
| Delete change requests | ✅ | ❌ | ❌ |
| Trigger ServiceNow sync | ✅ | ✅ | ❌ |
| Manage dashboard settings | ✅ | ✅ | ❌ |
| Manage users | ✅ | ❌ | ❌ |

---

## 6. Browser Support

| Browser | Minimum Version |
|---------|----------------|
| Chrome | 90+ |
| Firefox | 90+ |
| Safari | 15+ |
| Edge | 90+ |
