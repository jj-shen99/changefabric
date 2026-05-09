# Architecture Overview

A vendor-neutral change management application built on Next.js 14 + Prisma with a layered architecture separating domain logic from framework concerns.

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT (Browser)                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │  Dashboard  │  │   Changes   │  │   Impact    │  │     Analytics       │ │
│  │    Page     │  │  List/CRUD  │  │  Analysis   │  │    Dashboard        │ │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘ │
└─────────┼────────────────┼────────────────┼────────────────────┼────────────┘
          │                │                │                    │
          ▼                ▼                ▼                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           NEXT.JS APP ROUTER                                 │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                        API Routes (/api/v2/*)                         │   │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────────┐  │   │
│  │  │  /changes  │  │/transitions│  │ /approvals │  │   /analytics   │  │   │
│  │  │   CRUD     │  │  workflow  │  │  decisions │  │    metrics     │  │   │
│  │  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘  └───────┬────────┘  │   │
│  └────────┼───────────────┼───────────────┼─────────────────┼───────────┘   │
└───────────┼───────────────┼───────────────┼─────────────────┼───────────────┘
            │               │               │                 │
            ▼               ▼               ▼                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CORE DOMAIN (src/core/)                              │
│                        Framework-Agnostic Business Logic                     │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    ChangeRequestService                              │    │
│  │         Orchestrates: create, update, transition, approve            │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│       │              │                │                │                     │
│       ▼              ▼                ▼                ▼                     │
│  ┌─────────┐   ┌──────────┐   ┌────────────┐   ┌─────────────┐              │
│  │Workflow │   │ Approval │   │   Impact   │   │     ML      │              │
│  │ Engine  │   │  Engine  │   │  Analyzer  │   │Risk Scorer  │              │
│  └─────────┘   └──────────┘   └────────────┘   └─────────────┘              │
└─────────────────────────────────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         ADAPTERS (src/core/adapters/)                        │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │              PrismaChangeRequestRepository                           │    │
│  │                    Database Operations                               │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              DATABASE                                        │
│                     SQLite (dev) / PostgreSQL (prod)                         │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────────────────┐ │
│  │ChangeReq   │  │  Approval  │  │  Comment   │  │    AuditEvent          │ │
│  │ Template   │  │   Step     │  │            │  │                        │ │
│  └────────────┘  └────────────┘  └────────────┘  └────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Workflow State Machine

```
                                    ┌─────────────────────────────────────┐
                                    │         STANDARD WORKFLOW           │
                                    │   (11 states, no assessing/reviewing)│
                                    └─────────────────────────────────────┘

    ┌───────┐     submit      ┌───────────┐    request_approval    ┌───────────────────┐
    │ DRAFT │ ───────────────▶│ SUBMITTED │ ──────────────────────▶│ AWAITING_APPROVAL │
    └───────┘                 └───────────┘                        └─────────┬─────────┘
        │                                                                    │
        │ cancel                                                    approve (guard: allApprovalStepsApproved)
        ▼                                                                    │
    ┌──────────┐                                                            ▼
    │ CANCELED │◀────────────────────────────────────────┐          ┌──────────┐
    └──────────┘                                         │          │ APPROVED │
        ▲                                                │          └────┬─────┘
        │ (only from draft, submitted,                   │               │
        │  awaiting_approval, approved, scheduled)       │          schedule (guard: hasPlannedWindow)
        │                                                │               │
    ┌──────────┐                                         │               ▼
    │ REJECTED │◀────────────────────────────────────────┤        ┌───────────┐
    └──────────┘                                         │        │ SCHEDULED │
                                                         │        └─────┬─────┘
                                                         │              │
                                                         │         start (effect: setActualStart)
                                                         │              │
                                                         │              ▼
                                                         │       ┌─────────────┐    rollback    ┌─────────────┐
                                                         │       │ IN_PROGRESS │ ─────────────▶│ ROLLED_BACK │
                                                         │       └──────┬──────┘               └─────────────┘
                                                         │              │                              ▲
                                                         │        complete (effect: setActualEnd)      │
                                                         │              │                              │
                                                         │              ▼                              │
                                                         │       ┌─────────────┐    rollback           │
                                                         │       │ IMPLEMENTED │ ──────────────────────┘
                                                         │       └──────┬──────┘
                                                         │              │
                                                         │         close (effect: setClosed)
                                                         │              │
                                                         │              ▼
                                                         │        ┌────────┐
                                                         └────────│ CLOSED │
                                                                  └────────┘

  Terminal States: CLOSED, REJECTED, CANCELED, ROLLED_BACK
  No-Cancel States: IN_PROGRESS, IMPLEMENTED, ROLLED_BACK, CLOSED, REJECTED (use rollback instead)
```

## Approval Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           APPROVAL ENGINE                                    │
└─────────────────────────────────────────────────────────────────────────────┘

  ChangeRequest                    ApprovalStep                    Approval
  ┌──────────────┐                ┌──────────────┐               ┌──────────┐
  │ CHG0000001   │───────────────▶│ Step 1       │──────────────▶│ User A   │
  │              │                │ ordering: 1  │               │ APPROVED │
  │ state:       │                │ policy: ALL  │               └──────────┘
  │ awaiting_    │                │              │               ┌──────────┐
  │ approval     │                │              │──────────────▶│ User B   │
  └──────────────┘                └──────────────┘               │ APPROVED │
                                                                 └──────────┘
                                  ┌──────────────┐               ┌──────────┐
                                  │ Step 2       │──────────────▶│ User C   │
                                  │ ordering: 2  │               │ PENDING  │
                                  │ policy: ANY  │               └──────────┘
                                  │              │               ┌──────────┐
                                  │              │──────────────▶│ User D   │
                                  └──────────────┘               │ PENDING  │
                                                                 └──────────┘

  Policies:
  ┌─────────────────────────────────────────────────────────────────────────┐
  │  ALL      │  Every approver must approve                                │
  │  ANY      │  At least one approver must approve                         │
  │  QUORUM:N │  At least N approvers must approve                          │
  └─────────────────────────────────────────────────────────────────────────┘

  Parallel Groups (same ordering = parallel):
  ┌─────────────────────────────────────────────────────────────────────────┐
  │  Step 1 (ordering: 1) ──┬── Approver A                                  │
  │                         └── Approver B    ← Both run in parallel        │
  │                                                                         │
  │  Step 2 (ordering: 2) ──┬── Approver C    ← Waits for Step 1            │
  │                         └── Approver D                                  │
  └─────────────────────────────────────────────────────────────────────────┘
```

## Data Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          CREATE CHANGE REQUEST                               │
└─────────────────────────────────────────────────────────────────────────────┘

  User Input                    API Route                      Core Service
  ┌──────────┐                 ┌──────────┐                   ┌──────────────┐
  │ Form     │ ───POST────────▶│ /api/v2/ │ ─────────────────▶│ ChangeReq    │
  │ Data     │   /changes      │ changes  │                   │ Service      │
  └──────────┘                 └──────────┘                   └──────┬───────┘
                                                                     │
                    ┌────────────────────────────────────────────────┤
                    │                                                │
                    ▼                                                ▼
            ┌──────────────┐                                ┌──────────────┐
            │ Impact       │                                │ ML Risk      │
            │ Analyzer     │                                │ Scorer       │
            └──────┬───────┘                                └──────┬───────┘
                   │                                               │
                   │  computedImpactScore                          │ mlRiskScore
                   │  blastRadius                                  │ mlConfidence
                   │  rollbackComplexity                           │ mlExplanation
                   │                                               │
                   └───────────────────┬───────────────────────────┘
                                       │
                                       ▼
                               ┌──────────────┐
                               │   Prisma     │
                               │  Repository  │
                               └──────┬───────┘
                                      │
                                      ▼
                               ┌──────────────┐
                               │   Database   │
                               │ ChangeRequest│
                               │   + Audit    │
                               └──────────────┘
```

## API Routes

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v2/changes` | List CRs (filterable, paginated) |
| POST | `/api/v2/changes` | Create a CR |
| GET | `/api/v2/changes/:n` | Get CR detail with steps & comments |
| PATCH | `/api/v2/changes/:n` | Partial update |
| DELETE | `/api/v2/changes/:n` | Delete CR |
| GET | `/api/v2/changes/:n/transitions` | Get available transitions |
| POST | `/api/v2/changes/:n/transitions` | Fire transition event |
| GET | `/api/v2/changes/:n/approvals` | List approval steps |
| POST | `/api/v2/changes/:n/approvals` | Add approval step |
| POST | `/api/v2/changes/:n/approvals/:stepId` | Submit decision |
| GET | `/api/v2/changes/:n/comments` | List comments |
| POST | `/api/v2/changes/:n/comments` | Add comment |
| GET | `/api/v2/changes/:n/analyze` | Run impact + ML analysis |
| GET | `/api/v2/templates` | List CR templates |
| POST | `/api/v2/templates` | Create template |
| GET | `/api/v2/analytics?days=N` | Dashboard metrics |
| GET | `/api/v2/workflows` | Workflow definitions |

## Database Schema

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              DATABASE SCHEMA                                 │
└─────────────────────────────────────────────────────────────────────────────┘

  ┌────────────────────┐         ┌────────────────────┐
  │   ChangeRequest    │         │ ChangeReqTemplate  │
  ├────────────────────┤         ├────────────────────┤
  │ number (PK)        │         │ id (PK)            │
  │ title              │         │ name               │
  │ state              │         │ description        │
  │ workflowKey        │         │ workflowKey        │
  │ riskLevel          │         │ category           │
  │ impactLevel        │         │ riskLevel          │
  │ urgency            │         │ implementationPlan │
  │ priority           │         │ backoutPlan        │
  │ category           │         │ testPlan           │
  │ type               │         │ ...                │
  │ implementationPlan │         └────────────────────┘
  │ backoutPlan        │
  │ testPlan           │         ┌────────────────────┐
  │ riskAndImpact...   │         │   ApprovalStep     │
  │ justification      │         ├────────────────────┤
  │ plannedStart       │◀────────│ changeRequestNum   │
  │ plannedEnd         │         │ ordering           │
  │ actualStart        │         │ name               │
  │ actualEnd          │         │ policy (all/any)   │
  │ requestedBy        │         │ status             │
  │ assignedTo         │         └─────────┬──────────┘
  │ assignmentGroup    │                   │
  │ computedRiskScore  │                   │ 1:N
  │ mlRiskScore        │                   ▼
  │ ...                │         ┌────────────────────┐
  └─────────┬──────────┘         │     Approval       │
            │                    ├────────────────────┤
            │ 1:N                │ stepId             │
            │                    │ approverEmail      │
            ▼                    │ decision           │
  ┌────────────────────┐         │ comment            │
  │      Comment       │         │ decidedAt          │
  ├────────────────────┤         └────────────────────┘
  │ changeRequestNum   │
  │ authorEmail        │         ┌────────────────────┐
  │ body               │         │    AuditEvent      │
  │ visibility         │         ├────────────────────┤
  │ createdAt          │         │ changeRequestNum   │
  └────────────────────┘         │ action             │
                                 │ actorEmail         │
                                 │ details (JSON)     │
                                 │ timestamp          │
                                 └────────────────────┘
```

## Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14 (App Router), React 18, TypeScript |
| Styling | Tailwind CSS 3.4, Lucide Icons |
| Charts | Recharts |
| State | SWR (data fetching), React hooks |
| Auth | NextAuth.js 4 (JWT + Credentials) |
| Database | Prisma ORM, SQLite (dev) / PostgreSQL (prod) |
| Testing | Jest, React Testing Library |
| Notifications | Sonner (toast) |
