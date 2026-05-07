# Change Management — Re-architected (v2)

A vendor-neutral change-management application built on Next.js + Prisma. The
re-architecture introduces a strict **layered design** with a framework-free
**domain core** (workflow + approval engines, analytics, ML risk, impact
analysis) and **adapters** for HTTP and persistence. The previous tight
coupling to ServiceNow has been replaced by an optional plugin.

```
┌────────────────────────────────────────────────────────────┐
│  UI (Next.js App Router pages, React)                      │
│   /changes, /changes/new, /changes/[number]                │
└────────────┬───────────────────────────┬───────────────────┘
             │ fetch                     │ fetch
             ▼                           ▼
┌────────────────────────────────────────────────────────────┐
│  HTTP Layer  (src/app/api/v2/*)                            │
│   /changes  CRUD                                           │
│   /changes/[n]/transitions   workflow events               │
│   /changes/[n]/approvals     multi-person approvals        │
│   /changes/[n]/comments                                    │
│   /changes/[n]/analyze       impact + ML on demand         │
│   /analytics                 dashboard payload             │
│   /workflows                 workflow definitions          │
└────────────┬───────────────────────────────────────────────┘
             │ getChangeRequestService()
             ▼
┌────────────────────────────────────────────────────────────┐
│  Core Domain (src/core)         framework-agnostic         │
│  ┌─────────────┐ ┌──────────────┐ ┌────────────────────┐   │
│  │ schema.ts   │ │ workflow/    │ │ approval/engine.ts │   │
│  │ (types)     │ │ state-machine│ │ (multi-person)     │   │
│  └─────────────┘ │ definitions  │ └────────────────────┘   │
│                  │ runtime      │                          │
│                  └──────────────┘                          │
│  ┌─────────────┐ ┌──────────────┐ ┌────────────────────┐   │
│  │ impact/     │ │ ml/risk.ts   │ │ analytics/index.ts │   │
│  │ analyzer    │ │ (logistic)   │ │ (pure aggregation) │   │
│  └─────────────┘ └──────────────┘ └────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ services/change-request-service.ts                   │  │
│  │  orchestrates: create / update / transition /        │  │
│  │  approve / analyze / comment, audit logging          │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────┬───────────────────────────────────────────────┘
             │ ChangeRequestRepository (interface)
             ▼
┌────────────────────────────────────────────────────────────┐
│  Adapters (src/core/adapters)                              │
│   PrismaChangeRequestRepository  ←──── Prisma + SQLite/PG  │
│   PrismaAuditWriter                                        │
└────────────────────────────────────────────────────────────┘
             ▲
             │ optional
┌────────────┴───────────────────────────────────────────────┐
│  Integrations (src/lib/integrations)                       │
│   servicenow.ts   — pulls SN change_request rows and       │
│                     adapts them to the generic schema.     │
│                     OFF by default (/api/sync returns 410) │
└────────────────────────────────────────────────────────────┘
```

## Generic Change-Request Schema

The `ChangeRequest` type (`src/core/schema.ts`) is the canonical record. The
columns are inspired by ServiceNow's `change_request` table but are
vendor-neutral:

- Identity: `number`, `externalId?`, `externalSource?`, `workflowKey`
- Lifecycle: `state`, `approvalState`, plus `type`, `category`, `priority`,
  `riskLevel`, `impactLevel`, `urgency`
- Plans: `justification`, `implementationPlan`, `backoutPlan`, `testPlan`,
  `riskAndImpactAnalysis`
- Schedule: `plannedStart`, `plannedEnd`, `actualStart`, `actualEnd`
- Ownership: `requestedBy`, `assignedTo`, `assignmentGroup`
- CMDB / context: `configurationItem`, `businessService`, `affectedServices[]`
- Computed: `computedRiskScore`, `computedImpactScore`, `mlRiskScore`,
  `mlConfidence`, `mlExplanation`

Sibling tables: `Approval`, `ApprovalStep`, `Comment`, `Attachment`,
`AuditEvent`, `Notification`, `WorkflowDefinition`, `WorkflowTransitionLog`.

## Hybrid Workflow Model

### State machine

A declarative `WorkflowDefinition` enumerates states + transitions, persisted
in `WorkflowDefinition.definition` (JSON) so admins can override built-in
flows without code changes. Three flows ship:

| Workflow              | Initial | Notable terminal transitions               |
| --------------------- | ------- | ------------------------------------------ |
| `standard`            | draft   | submit → assess → approve → schedule → close |
| `emergency`           | draft   | start → implement → retro-approve → close  |
| `standard_preapproved`| draft   | schedule → implement → close (no approval) |

Each transition can declare:
- `from` / `to` — current and next state
- `requiredRole` — RBAC gate (`viewer` / `manager` / `admin`)
- `guards[]` — name-referenced predicate functions, all must pass
- `effects[]` — name-referenced side-effect functions

The runtime (`src/core/workflow/runtime.ts`) supplies the standard guards
(`hasPlannedWindow`, `allApprovalStepsApproved`, etc.) and effects
(`startApprovalSteps`, `setActualStart`, `setActualEnd`, `setClosed`).
Effects mutate the in-memory CR; the service layer diffs and persists them.

### Approval engine

Each approval gate is an `ApprovalStep` with:

- `ordering` — sequential when distinct, **parallel when equal**
- `policy` — `"all"`, `"any"`, or `"quorum:N"`
- N `Approval` rows — one per individual approver

`activeSteps()` returns the parallel group with the smallest ordering value
that is still pending. Approvers can decide / reject / delegate; the engine
re-evaluates the step status, then `overallApprovalState()` aggregates
across all steps. Once everyone has approved, the workflow guard
`allApprovalStepsApproved` lets the CR transition to `approved`.

## Impact analysis & ML risk

- `analyzeImpact(cr)` produces deterministic per-axis scores (outage,
  performance, functionality, security, data integrity), a blast-radius
  classification, and rollback-complexity rating, plus a rationale list.
- `predictRisk(cr)` runs an in-process logistic-regression-shaped scorer
  with engineered features (risk level, fan-out, plan completeness,
  emergency flag, content keywords). It returns probability, score,
  confidence, top contributing features, and a one-line explanation.
- Both run automatically on `create` and `update` — results are cached on
  `computedRiskScore`, `mlRiskScore`, etc. so list views are fast.
- Re-analysis on demand: `GET /api/v2/changes/:n/analyze`.

## Analytics

`computeDashboardMetrics`, `impactByCategory`, `weeklyTrend`, and
`approvalAnalytics` in `src/core/analytics` are **pure** functions over
materialized records. The HTTP route is a thin wrapper. New endpoint:
`GET /api/v2/analytics?days=30`.

## Audit & traceability

`AuditEvent` rows capture every domain action — CR create/update,
transition, approval decision, comment, analysis. Standard action keys
live in `AUDIT_ACTIONS` for type-safe usage.

## ServiceNow plugin (optional)

ServiceNow refresh is **disabled by default**:

- `/api/sync` returns HTTP 410 Gone with guidance.
- The connector lives at `src/lib/integrations/servicenow.ts`.
- `scripts/import-servicenow.ts` adapts SN rows to the generic schema
  (risk level, plans, requester, etc.) and upserts them.

To enable: invoke the script directly, or expose a re-enabled route that
calls `syncChangeRequests(prisma, options)`.

## Endpoint reference (v2)

| Method | Path                                             | Purpose                          |
| ------ | ------------------------------------------------ | -------------------------------- |
| GET    | `/api/v2/changes`                                | List CRs (filterable)            |
| POST   | `/api/v2/changes`                                | Create a CR                      |
| GET    | `/api/v2/changes/:n`                             | Detail + steps + comments        |
| PATCH  | `/api/v2/changes/:n`                             | Partial update                   |
| DELETE | `/api/v2/changes/:n`                             | Delete                           |
| GET    | `/api/v2/changes/:n/transitions`                 | Legal transitions for state      |
| POST   | `/api/v2/changes/:n/transitions`                 | Fire `{ event, reason? }`        |
| GET    | `/api/v2/changes/:n/approvals`                   | List approval steps              |
| POST   | `/api/v2/changes/:n/approvals`                   | Add a new step                   |
| POST   | `/api/v2/changes/:n/approvals/:stepId`           | Decide `{ decision, comment? }`  |
| GET    | `/api/v2/changes/:n/comments`                    | List                             |
| POST   | `/api/v2/changes/:n/comments`                    | Add `{ body, visibility? }`      |
| GET    | `/api/v2/changes/:n/analyze`                     | Run impact + ML on demand        |
| GET    | `/api/v2/analytics?days=N`                       | Dashboard metrics                |
| GET    | `/api/v2/workflows`                              | Built-in workflow definitions    |

## Test surface

### Core Tests (`src/core/__tests__/`)

- `state-machine.test.ts` — RBAC, terminal states, guards, valid/invalid events
- `approval-engine.test.ts` — `all` / `any` / `quorum:N` policies, parallel
  groups, double-voting, unknown approver, aggregate state
- `analytics.test.ts` — dashboard metrics + category buckets + impact + ML
  scoring on low/high-risk fixtures
- `workflow-runtime.test.ts` — guards (`hasPlannedWindow`, `hasBackoutPlan`, 
  `hasImplementationPlan`, `allApprovalStepsApproved`) and effects 
  (`setActualStart`, `setActualEnd`, `setClosed`, `startApprovalSteps`)
- `impact-analysis.test.ts` — risk scoring, blast radius, rollback complexity,
  rationale generation

### Page Tests (`src/__tests__/pages/`)

- `dashboard.test.tsx` — route validation, data display logic, risk thresholds
- `changes-list.test.tsx` — list rendering, filtering, search, pagination
- `change-detail.test.tsx` — tabs, transitions, approvals, comments, analysis
- `new-change.test.tsx` — template loading, form validation, copy from CR
- `impact.test.tsx` — URL params, plan scoring, filtering, weight calculations

### API Tests (`src/__tests__/api/`)

- `changes.test.ts` — CRUD operations, pagination, filtering
- `templates.test.ts` — template listing, creation, validation

### Component Tests (`src/__tests__/components/`)

- `risk-badge.test.tsx` — score-based rendering, color classes, size variants

### Navigation Tests (`src/__tests__/navigation/`)

- `links.test.tsx` — route validation, URL format, API endpoint verification

Run all tests: `npm test`
Run with coverage: `npm run test:coverage`

## Templates

19 pre-built templates are seeded in `prisma/seed.ts`:

| Category | Templates |
|----------|-----------|
| Database | Database Migration, Schema Change |
| Infrastructure | Infrastructure Change, Network Change |
| Security | Security Patch, Access Control Change |
| Feature | Feature Flag Rollout, A/B Test |
| API | API Deployment, API Deprecation |
| Config | Configuration Change, Environment Update |
| Emergency | Emergency Hotfix, Incident Response |
| Other | Documentation Update, Dependency Update |

Templates include pre-filled: implementation plan, backout plan, test plan,
risk analysis, justification, and appropriate risk/impact levels.
