# Testing Guide

## Overview

The application includes 575+ unit tests covering core modules, API routes, components, and pages.
This includes advanced testing techniques such as **combinatorial testing** and **prime path coverage**
for comprehensive workflow validation.

## Test Structure

```
src/
├── core/__tests__/           # Core business logic tests
│   ├── state-machine.test.ts
│   ├── workflow-runtime.test.ts
│   ├── approval-engine.test.ts
│   ├── impact-analysis.test.ts
│   └── analytics.test.ts
├── lib/__tests__/            # Library/utility tests
│   ├── utils.test.ts
│   ├── constants.test.ts
│   ├── crypto.test.ts
│   ├── auth-types.test.ts
│   ├── access-control.test.ts
│   ├── ml-risk.test.ts
│   ├── llm.test.ts
│   └── ...
└── __tests__/                # Integration tests
    ├── api/
    │   ├── changes.test.ts
    │   └── templates.test.ts
    ├── components/
    │   └── risk-badge.test.tsx
    ├── navigation/
    │   └── links.test.tsx
    └── pages/
        ├── dashboard.test.tsx
        ├── changes-list.test.tsx
        ├── change-detail.test.tsx
        ├── new-change.test.tsx
        └── impact.test.tsx
```

## Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- src/core/__tests__/state-machine.test.ts

# Run tests matching pattern
npm test -- --testPathPatterns="workflow"

# Watch mode
npm test -- --watch
```

## Test Categories

### Core Module Tests

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          CORE MODULE TESTS                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  state-machine.test.ts                                                       │
│  ├── Valid state transitions                                                 │
│  ├── Invalid state transitions (blocked)                                     │
│  ├── RBAC enforcement                                                        │
│  ├── Terminal states                                                         │
│  └── Guard evaluation                                                        │
│                                                                              │
│  workflow-runtime.test.ts                                                    │
│  ├── hasPlannedWindow guard                                                  │
│  ├── hasBackoutPlan guard                                                    │
│  ├── hasImplementationPlan guard                                             │
│  ├── allApprovalStepsApproved guard                                          │
│  ├── setActualStart effect                                                   │
│  ├── setActualEnd effect                                                     │
│  └── setClosed effect                                                        │
│                                                                              │
│  approval-engine.test.ts                                                     │
│  ├── ALL policy (everyone must approve)                                      │
│  ├── ANY policy (one approval sufficient)                                    │
│  ├── QUORUM:N policy (N approvals needed)                                    │
│  ├── Parallel approval groups                                                │
│  ├── Sequential approval steps                                               │
│  ├── Double-voting prevention                                                │
│  └── Overall approval state aggregation                                      │
│                                                                              │
│  impact-analysis.test.ts                                                     │
│  ├── Risk score calculation                                                  │
│  ├── Blast radius classification                                             │
│  ├── Rollback complexity rating                                              │
│  └── Rationale generation                                                    │
│                                                                              │
│  analytics.test.ts                                                           │
│  ├── Dashboard metrics computation                                           │
│  ├── Category aggregation                                                    │
│  ├── Weekly trend calculation                                                │
│  └── Risk distribution                                                       │
│                                                                              │
│  workflow-combinatorial.test.ts                                              │
│  ├── Pairwise coverage: Workflow × Role                                      │
│  ├── Pairwise coverage: State × Event                                        │
│  ├── Pairwise coverage: Role × Guard Condition                               │
│  ├── Pairwise coverage: Workflow × Terminal State                            │
│  ├── 3-way combinatorial: Workflow × State × Role                            │
│  └── Boundary value analysis                                                 │
│                                                                              │
│  workflow-prime-path.test.ts                                                 │
│  ├── Happy path (main success scenario)                                      │
│  ├── Alternative paths to terminal states                                    │
│  ├── Cycle paths (return to draft)                                           │
│  ├── Skip schedule path (direct implementation)                              │
│  ├── Edge coverage verification (all transitions)                            │
│  ├── Node coverage verification (all states reachable)                       │
│  └── Path length analysis                                                    │
│                                                                              │
│  workflow-in-progress.test.ts                                                │
│  ├── In Progress state definition (all workflows)                            │
│  ├── Implementer role hierarchy                                              │
│  ├── Implement and complete actions                                          │
│  ├── Full implementation flow (scheduled → in_progress → implemented)        │
│  ├── Rollback from in_progress state                                         │
│  └── Effects (setActualStart, setActualEnd)                                  │
│                                                                              │
│  approval-auto-transition.test.ts                                            │
│  ├── Overall approval state computation                                      │
│  ├── Step evaluation with all/any/quorum policies                            │
│  ├── System context for auto-transition                                      │
│  └── Draft CR visibility rules                                               │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### API Route Tests

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           API ROUTE TESTS                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  changes.test.ts                                                             │
│  ├── GET /api/v2/changes - List with filters                                 │
│  ├── POST /api/v2/changes - Create CR                                        │
│  ├── GET /api/v2/changes/:n - Get detail                                     │
│  ├── PATCH /api/v2/changes/:n - Update                                       │
│  ├── DELETE /api/v2/changes/:n - Delete                                      │
│  ├── Pagination                                                              │
│  └── Validation errors                                                       │
│                                                                              │
│  templates.test.ts                                                           │
│  ├── GET /api/v2/templates - List templates                                  │
│  ├── POST /api/v2/templates - Create template                                │
│  └── Validation                                                              │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Page Tests

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            PAGE TESTS                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  dashboard.test.tsx                                                          │
│  ├── Route validation                                                        │
│  ├── Data display logic                                                      │
│  └── Risk threshold calculations                                             │
│                                                                              │
│  changes-list.test.tsx                                                       │
│  ├── List rendering                                                          │
│  ├── Search functionality                                                    │
│  ├── Filter logic                                                            │
│  └── Pagination                                                              │
│                                                                              │
│  change-detail.test.tsx                                                      │
│  ├── Tab navigation                                                          │
│  ├── Transition buttons                                                      │
│  ├── Approval display                                                        │
│  └── Comment thread                                                          │
│                                                                              │
│  new-change.test.tsx                                                         │
│  ├── Template loading                                                        │
│  ├── Form validation                                                         │
│  └── Copy from CR                                                            │
│                                                                              │
│  impact.test.tsx                                                             │
│  ├── URL parameter handling                                                  │
│  ├── Plan quality scoring                                                    │
│  ├── Risk level filtering                                                    │
│  └── Weight calculations                                                     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Writing Tests

### Core Module Test Example

```typescript
import { createStateMachine } from "../workflow/state-machine";
import { WORKFLOWS } from "../workflow/definitions";

describe("State Machine", () => {
  const machine = createStateMachine(WORKFLOWS.standard);

  it("allows valid transition", () => {
    const result = machine.canTransition("draft", "submit", "manager");
    expect(result.allowed).toBe(true);
  });

  it("blocks invalid transition", () => {
    const result = machine.canTransition("draft", "approve", "manager");
    expect(result.allowed).toBe(false);
  });
});
```

### API Test Example

```typescript
/**
 * @jest-environment node
 */
import { NextRequest } from "next/server";

describe("Changes API", () => {
  it("returns paginated results", async () => {
    const req = new NextRequest("http://localhost/api/v2/changes?limit=10");
    const res = await GET(req);
    const data = await res.json();
    
    expect(data.changes).toHaveLength(10);
    expect(data.total).toBeGreaterThan(0);
  });
});
```

### Component Test Example

```typescript
import { render, screen } from "@testing-library/react";
import { RiskBadge } from "@/components/risk-badge";

describe("RiskBadge", () => {
  it("renders low risk correctly", () => {
    render(<RiskBadge score={20} />);
    expect(screen.getByText("Low")).toBeInTheDocument();
  });

  it("renders critical risk correctly", () => {
    render(<RiskBadge score={85} />);
    expect(screen.getByText("Critical")).toBeInTheDocument();
  });
});
```

## Coverage

Run coverage report:

```bash
npm run test:coverage
```

Coverage targets:
- Core modules: 90%+
- API routes: 80%+
- Components: 70%+
- Pages: 60%+

## Mocking

### Mock Prisma

```typescript
jest.mock("@/lib/prisma", () => ({
  prisma: {
    changeRequest: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}));
```

### Mock Next.js Navigation

```typescript
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/",
}));
```

### Mock NextAuth Session

```typescript
jest.mock("next-auth/react", () => ({
  useSession: () => ({
    data: { user: { email: "admin@example.com", role: "admin" } },
    status: "authenticated",
  }),
}));
```

## Advanced Testing Techniques

### Combinatorial Testing (Pairwise Coverage)

Combinatorial testing ensures all pairs of input parameters are tested together at least once.
This provides good coverage with fewer test cases than exhaustive testing.

**Parameters tested for workflows:**
- Workflow type: `standard`, `emergency`, `standard_preapproved`
- User role: `requester`, `manager`, `admin`
- Current state: all states in each workflow
- Target event: all events in each workflow
- Guard conditions: met, not met

```bash
# Run combinatorial tests
npm test -- --testPathPatterns="workflow-combinatorial"
```

**Coverage levels:**
- 2-way (pairwise): All pairs of parameters tested
- 3-way: Critical three-parameter combinations tested
- Boundary values: Edge cases and empty/undefined inputs

### Prime Path Coverage

Prime path coverage is a graph-based testing technique that ensures all prime paths
(maximal simple paths that are not subpaths of other simple paths) are tested.

**For workflow state machines:**
- **Nodes** = States (draft, submitted, approved, etc.)
- **Edges** = Transitions (submit, approve, implement, etc.)
- **Prime paths** = Maximal simple paths through the state graph

```bash
# Run prime path tests
npm test -- --testPathPatterns="workflow-prime-path"
```

**Coverage includes:**
- Happy path (main success scenario)
- Alternative paths to all terminal states
- Cycle paths (e.g., return to draft)
- Edge coverage (all transitions tested)
- Node coverage (all states reachable)

### Workflow State Graph (Standard)

```
                                    ┌─────────────┐
                                    │   rejected  │ (terminal)
                                    └──────▲──────┘
                                           │ reject
┌───────┐  submit   ┌───────────┐  request  ┌─────────────────┐  approve  ┌──────────┐
│ draft │─────────▶│ submitted │─────────▶│awaiting_approval│──────────▶│ approved │
└───┬───┘          └─────┬─────┘           └────────┬────────┘           └────┬─────┘
    │                    │                          │                         │
    │ cancel             │ return_to_draft          │ cancel                  │ schedule
    │                    │                          │                         ▼
    │                    ▼                          │                   ┌───────────┐
    │              ┌───────┐                        │                   │ scheduled │
    │              │ draft │                        │                   └─────┬─────┘
    │              └───────┘                        │                         │
    │                                               │                    implement
    │                                               │                         │
    ▼                                               ▼                         ▼
┌──────────┐◀────────────────────────────────────────────────────────┌─────────────┐
│ canceled │ (terminal)                                               │ implemented │
└──────────┘                                                          └──────┬──────┘
                                                                             │
                                                              ┌──────────────┼──────────────┐
                                                              │              │              │
                                                           close         rollback          │
                                                              │              │              │
                                                              ▼              ▼              │
                                                        ┌────────┐   ┌─────────────┐       │
                                                        │ closed │   │ rolled_back │       │
                                                        └────────┘   └─────────────┘       │
                                                        (terminal)     (terminal)          │
```

### Running All Workflow Tests

```bash
# Run all workflow-related tests
npm test -- --testPathPatterns="workflow|approval"

# Run with coverage
npm test -- --testPathPatterns="workflow|approval" --coverage
```
