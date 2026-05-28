# Change Management Platform

A full-stack **enterprise change management and release impact analysis platform** built with Next.js 14, Prisma, and NextAuth.js. Features a complete **workflow state machine** for change request lifecycle management, **ML-powered risk analysis**, and **comprehensive plan quality scoring**.

![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8?logo=tailwindcss)
![Prisma](https://img.shields.io/badge/Prisma-6.x-2D3748?logo=prisma)
![Tests](https://img.shields.io/badge/Tests-1900+-green)

## Overview

This platform provides a comprehensive solution for managing IT change requests, from initial submission through approval workflows to deployment tracking. It integrates with external ITSM systems and provides advanced analytics for risk assessment and impact analysis.

## Features

### Core Dashboard
- **Overview** — KPI cards, risk gauges, deployment frequency charts, recent change requests
- **Analytics** — Change status/risk/category/team distribution charts
- **Real-time Updates** — Live data refresh and notifications

### Change Request Management
- **List View** — Searchable/filterable list with risk scores, state badges, pagination
- **Detail View** — Tabbed interface (Overview, Approvals, Comments, Analysis)
- **Create New** — Template-based creation, copy from existing CR
- **Workflow Transitions** — State machine with guards (e.g., `hasPlannedWindow`, `allApprovalStepsApproved`)
- **Approval Management** — Multi-step approval with configurable policies (all/any)

### Workflow State Machine
Complete lifecycle management with the following states:
- `draft` → `submitted` → `awaiting_approval` → `scheduled` → `in_progress` → `completed`
- Emergency and rollback paths supported
- Configurable approval policies by risk level

### Risk Analysis
- **ML-Powered Scoring** — Logistic regression model for risk prediction
- **Impact Analysis** — Multi-dimensional impact scoring (scope, complexity, dependencies)
- **Plan Quality** — Automated assessment of implementation and rollback plans

### Release Management
- **Release Tracking** — Group related change requests into releases
- **Risk Radar** — Visual risk assessment across releases
- **Executive Dashboard** — High-level metrics and trends

### Settings & Administration
- **User Management** — Role-based access control with multiple roles
- **Role Management** — Admin, Change Manager, Approver, Implementer, Requester, CAB Member
- **Services Catalog** — Manage affected services and their criticality
- **Integrations** — External ITSM import, Git integration
- **Approval Policies** — Risk-based approval requirements

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript 5.9 |
| Styling | Tailwind CSS 3.4 |
| Database | PostgreSQL with Prisma ORM |
| Authentication | NextAuth.js with credentials provider |
| Charts | Recharts |
| Icons | Lucide React |
| Testing | Jest + React Testing Library |

## Getting Started

### Prerequisites
- Node.js 18+
- npm 9+
- SQLite (development, zero setup) or PostgreSQL (production)

### Quick Start (Production)

```bash
git clone <repo-url> && cd change_management
cp .env.example .env      # edit with production values
./setup.sh                # install → build → db push → seed → start via PM2
```

The script defaults to **production deployment**: installs deps, builds the app, pushes the DB schema, seeds demo data, and starts via PM2 with health checks.

### Quick Start Options

```bash
./setup.sh                  # Production deploy (default)
./setup.sh --dev            # Development mode (SQLite, no build)
./setup.sh --skip-seed      # Skip seeding demo data
./setup.sh --skip-tests     # Skip running tests
./setup.sh --skip-build     # Skip build (use existing .next)
./setup.sh --port 4000      # Use a custom port
```

### Manual Installation

```bash
npm install                         # Install dependencies
cp .env.example .env                # Create environment config
npx prisma generate                 # Generate Prisma client
npx prisma db push                  # Apply database schema
npx tsx prisma/seed.ts              # Seed demo data
npm run build                       # Build production bundle
npm start                           # Start on port 3600
```

The application will be available at `http://localhost:3600`

Default login: `admin@example.com` / `admin123!`

### Environment Variables

See `.env.example` for the full list. Key variables:

```env
# Database (SQLite for dev, PostgreSQL for production)
DATABASE_PROVIDER="sqlite"
DATABASE_URL="file:./prisma/dev.db"

# Authentication
NEXTAUTH_SECRET="<generated-by-setup-script>"
NEXTAUTH_URL="http://localhost:3600"

# Credential Encryption (required for production)
# ENCRYPTION_KEY=<64-char-hex-string>

# ITSM Integration (optional)
# GIT_USER=your-git-username
# GIT_PASSWORD=your-git-token
```

## Project Structure

```
├── prisma/
│   ├── schema.prisma      # Database schema
│   └── seed.ts            # Database seeding
├── src/
│   ├── app/               # Next.js App Router pages
│   │   ├── (dashboard)/   # Dashboard pages
│   │   │   ├── changes/   # Change request pages
│   │   │   ├── impact/    # Impact analysis
│   │   │   ├── releases/  # Release management
│   │   │   ├── settings/  # Settings pages
│   │   │   └── ...
│   │   └── api/           # API routes
│   ├── components/        # React components
│   ├── core/              # Core business logic
│   │   ├── schema.ts      # Type definitions
│   │   ├── workflow.ts    # State machine
│   │   └── service.ts     # Change request service
│   ├── hooks/             # React hooks
│   ├── lib/               # Utilities
│   │   ├── integrations/  # External integrations
│   │   ├── prisma.ts      # Prisma client
│   │   └── auth.ts        # Auth configuration
│   └── __tests__/         # Test suites
├── scripts/               # Utility & deploy scripts
├── setup.sh               # Post-clone setup & deploy script
└── public/                # Static assets
```

## Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm test -- --coverage

# Run specific test file
npm test -- --testPathPatterns="settings"

# Run tests in watch mode
npm test -- --watch
```

### Test Coverage
- **1900+ tests** covering:
  - API routes and endpoints
  - Core business logic and workflows
  - UI components and interactions
  - Prisma schema validation
  - Settings and configuration
  - Integration logic
  - Security regression tests
  - Data pipeline and filtering

## API Endpoints

### Change Requests
- `GET /api/v2/changes` — List change requests
- `POST /api/v2/changes` — Create change request
- `GET /api/v2/changes/[number]` — Get change request details
- `PATCH /api/v2/changes/[number]` — Update change request
- `POST /api/v2/changes/[number]/transition` — Transition workflow state

### Templates
- `GET /api/v2/templates` — List templates
- `POST /api/v2/templates` — Create template

### Admin
- `GET /api/admin/users` — List users
- `POST /api/admin/users` — Create user
- `GET /api/admin/roles` — List roles
- `GET /api/admin/services` — List services

### Settings
- `GET /api/settings` — Get settings
- `POST /api/settings` — Update settings

## Role-Based Access Control

| Role | Permissions |
|------|-------------|
| Admin | Full access, user management, settings |
| Change Manager | Manage changes, approvals, releases |
| Approver | Approve changes, view metrics |
| Implementer | Implement changes, view metrics |
| Requester | Create and edit own changes |
| CAB Member | Approve changes, view all data |

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is proprietary software. All rights reserved.

## Security

- **Authentication** — bcrypt password hashing, JWT sessions, secure cookies in production
- **Credentials** — AES-256-GCM encryption for stored ITSM/Git credentials
- **Logging** — Email addresses masked in auth logs, no password validation results logged
- **API Responses** — `hashedPassword` excluded from all user API responses via Prisma `select`
- **Environment** — `.env` gitignored, `.env.example` contains only placeholder values
- **Production Checks** — Warns if `ENCRYPTION_KEY` is not set in production

## Support

For questions or issues, please open a GitHub issue or contact the development team.
