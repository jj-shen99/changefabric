# User Guide

Complete guide to using the Change Request Management AI Dashboard.

## Quick Start

### Demo Accounts

| Email | Password | Role |
|-------|----------|------|
| `admin@example.com` | `admin123!` | Admin |
| `mike@example.com` | `manager123!` | Manager |
| `lisa@example.com` | `manager123!` | Manager |
| `approver1@example.com` | `approver1` | Approver |
| `implementer1@example.com` | `implementer1` | Implementer |
| `requester1@example.com` | `requester1` | Requester |
| `developer1@example.com` | `developer1` | Requester |

> **Note**: For approver, implementer, and requester roles, the password is the email prefix (e.g., `approver1@example.com` → password `approver1`)

### Role Permissions

The system has 5 core user roles with different permission levels:

| Permission | Admin | Manager | Approver | Implementer | Requester |
|------------|:-----:|:-------:|:--------:|:-----------:|:---------:|
| View Dashboard | ✓ | ✓ | ✓ | ✓ | ✓ |
| View Own CRs | ✓ | ✓ | ✓ | ✓ | ✓ |
| View All CRs | ✓ | ✓ | ✗ | ✗ | ✗ |
| Create CR | ✓ | ✓ | ✗ | ✗ | ✓ |
| Edit Own CR | ✓ | ✓ | ✗ | ✗ | ✓ |
| Edit Any CR | ✓ | ✓ | ✗ | ✗ | ✗ |
| Approve CR | ✓ | ✓ | ✓ | ✗ | ✗ |
| Implement CR | ✓ | ✓ | ✗ | ✓ | ✗ |
| Manage Releases | ✓ | ✓ | ✗ | ✗ | ✗ |
| Manage Users | ✓ | ✗ | ✗ | ✗ | ✗ |
| Manage Settings | ✓ | ✗ | ✗ | ✗ | ✗ |
| View Metrics | ✓ | ✓ | ✓ | ✓ | ✓ |
| Delete CRs (draft/awaiting) | ✓ | ✗ | ✗ | ✗ | ✗ |

**Role Descriptions:**
- **Admin**: Full system access including user management, settings, and CR deletion
- **Manager**: Create/edit CRs, approve changes, implement changes, manage releases (includes approver + implementer abilities)
- **Approver**: Review and approve CRs assigned to them, view activity logs
- **Implementer**: Execute approved changes (DevOps, SREs, DBAs)
- **Requester**: Create and manage their own CRs, view metrics for own CRs

**Role Hierarchy:**
- Admin supersedes all roles (no additional roles needed)
- Manager includes approver + implementer abilities (system prevents adding redundant roles)

## Dashboard Pages

### 1. Main Dashboard (`/`)

Overview of change request metrics and recent activity.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              DASHBOARD                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │ Total CRs    │  │ Pending      │  │ High Risk    │  │ Avg Risk     │    │
│  │     24       │  │     8        │  │     3        │  │    45        │    │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘    │
│                                                                              │
│  ┌─────────────────────────────────┐  ┌─────────────────────────────────┐  │
│  │      Risk Trend Chart          │  │      State Distribution         │  │
│  │         (Area Chart)           │  │         (Pie Chart)             │  │
│  └─────────────────────────────────┘  └─────────────────────────────────┘  │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     Recent Change Requests                           │   │
│  │  CHG0000001  │  Payment Gateway Migration  │  High  │  In Progress  │   │
│  │  CHG0000002  │  Redis Caching Layer        │  Low   │  Scheduled    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2. Change Requests (`/changes`)

List, search, filter, and manage change requests.

**Features:**
- Search by CR number, title, or description
- Filter by state, risk level, category, team
- **Column sorting** - Click any column header to sort
- Pagination (configurable page size)
- Click to view details

**Sorting:**
Click any column header to sort the table. Click again to toggle between ascending and descending order.

| Column | Sort Behavior |
|--------|---------------|
| Number | Alphanumeric (CHG0000001, CHG0000002, ...) |
| Title | Alphabetical (A-Z or Z-A) |
| State | Alphabetical by state name |
| Approval | Alphabetical by approval status |
| Risk | Numeric by computed risk score (0-100) |
| ML | Numeric by ML risk score (0-100) |
| Requester | Alphabetical by requester name |
| Created | Chronological (oldest/newest first) |

**Visual Indicators:**
- Active sort column shows highlighted chevron icons
- ▲ indicates ascending order
- ▼ indicates descending order

**Actions:**
- **+ New Change** - Create a new CR
- **Click column header** - Sort by that column
- **Click row** - View CR details

### Editing Restrictions

**Pre-Approval States** (draft, submitted, assessing, awaiting_approval):
- All fields are editable by the CR owner

**Post-Approval States** (approved, scheduled, in_progress, implemented, reviewing, closed, rolled_back):
- Only **Assigned To**, **Planned Start**, and **Planned End** can be modified
- All other fields are locked to preserve the approved change details
- A notice is displayed when editing in post-approval states

This ensures that once a change is approved, its core details (implementation plan, risk assessment, etc.) remain unchanged while still allowing operational adjustments like reassigning the implementer or rescheduling the change window.

### 3. Change Request Detail (`/changes/[number]`)

Detailed view with tabs for different aspects of the CR.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  CHG0000001 - Payment Gateway Migration                                      │
│  State: IN_PROGRESS    Risk: HIGH (75)    Type: Normal                       │
├─────────────────────────────────────────────────────────────────────────────┤
│  [Overview]  [Approvals]  [Comments]  [Analysis]                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  OVERVIEW TAB:                                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Implementation Plan    │  Backout Plan    │  Test Plan             │   │
│  │  ─────────────────────────────────────────────────────────────────  │   │
│  │  1. Deploy to staging   │  1. Revert flag  │  1. Unit tests         │   │
│  │  2. Run shadow traffic  │  2. Restore DB   │  2. Integration tests  │   │
│  │  3. Canary rollout      │  3. Notify team  │  3. Load tests         │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  Available Transitions:                                                      │
│  [Complete] [Cancel]                                                         │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Tabs:**
- **Overview** - CR details, plans, schedule, ownership
- **Approvals** - Approval steps and decisions
- **Comments** - Discussion thread
- **Analysis** - Impact and ML risk analysis

### 4. Create New Change (`/changes/new`)

Create a new change request using templates or by copying an existing CR.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CREATE NEW CHANGE REQUEST                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Start From:                                                                 │
│  ┌─────────────────────────┐  ┌─────────────────────────┐                   │
│  │  📋 Use Template        │  │  📄 Copy Existing CR    │                   │
│  │  19 templates available │  │  Clone from any CR      │                   │
│  └─────────────────────────┘  └─────────────────────────┘                   │
│                                                                              │
│  Templates by Category:                                                      │
│  ├── Database (2)                                                            │
│  │   ├── Database Migration                                                  │
│  │   └── Schema Change                                                       │
│  ├── Infrastructure (2)                                                      │
│  ├── Security (2)                                                            │
│  ├── Feature (2)                                                             │
│  ├── API (2)                                                                 │
│  └── Emergency (2)                                                           │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5. Impact Analysis (`/impact`)

Analyze plan quality and ML risk scores for change requests.

**URL Parameters:**
- `/impact?cr=CHG0000001` - Pre-select a specific CR

**Tabs:**

#### Plan Analysis Tab
```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           PLAN ANALYSIS                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│  Filters: [Search...] [Risk Level ▼] [State ▼] [Team ▼]                     │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Change ▲▼  │  Readiness ▲▼  │  Risk  │  Gaps ▲▼  │  State ▲▼      │   │
│  ├─────────────┼────────────────┼────────┼───────────┼────────────────┤   │
│  │  CHG0000001 │      72        │  Med   │     1     │  draft         │   │
│  │  CHG0000002 │      85        │  Low   │     0     │  approved      │   │
│  │  CHG0000003 │      45        │  High  │     3     │  awaiting      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Sorting (Plan Analysis & ML Analysis):**
Click any sortable column header to sort. Click again to toggle direction.

| Column | Sort Behavior |
|--------|---------------|
| Change | Alphanumeric by CR number |
| Readiness | Numeric by overall plan score (0-100) |
| Gaps | Numeric by number of missing plans (0-5) |
| State | Alphabetical by workflow state |

**Visual Indicators:**
- Active sort column shows teal-highlighted chevron icons
- ▲ indicates ascending order (lowest first for scores)
- ▼ indicates descending order (highest first for scores)

**Plan Quality Dimensions:**
```
┌─────────────────────────────────────────────────────────────────────┐
│  Implementation Plan  ████████████████████░░░░  80%                 │
│  Backout Plan         ██████████████░░░░░░░░░░  60%                 │
│  Test Plan            ████████████████████████  95%                 │
│  Risk Analysis        ████████████░░░░░░░░░░░░  50%                 │
│  Justification        ██████████████████░░░░░░  70%                 │
└─────────────────────────────────────────────────────────────────────┘
```

#### ML Analysis Tab
- Deep ML content analysis
- Structure, completeness, clarity, risk-awareness scores
- Detected actions and risks
- Recommendations with severity
- **Same sorting functionality** as Plan Analysis tab (independent sort state)

## Workflow States

Change requests follow a defined workflow based on their type:

### Standard Workflow (v4)
```
draft → submitted → awaiting_approval → approved → scheduled → in_progress → implemented → closed
                                      ↘ (skip schedule) ↗
```

**Key transitions:**
- `submit`: draft → submitted (requester)
- `request_approval`: submitted → awaiting_approval (manager)
- `approve`: awaiting_approval → approved (manager, after all approval steps complete)
- `schedule`: approved → scheduled (manager, requires planned window)
- `implement`: approved/scheduled → in_progress (implementer, sets actual start time)
- `complete`: in_progress → implemented (implementer, sets actual end time)
- `close`: implemented → closed (manager)
- `rollback`: in_progress/implemented → rolled_back (manager)

### Emergency Workflow (v5)
```
draft → submitted → emergency_approval → in_progress → implemented → awaiting_approval → closed
```

**Key transitions:**
- `submit`: draft → submitted (requester)
- `request_emergency_approval`: submitted → emergency_approval (manager, starts emergency approval)
- `approve_emergency`: emergency_approval → in_progress (manager, after emergency approval granted)
- `implement`: in_progress → implemented (implementer)
- `request_approval`: implemented → awaiting_approval (retrospective approval)
- `approve`: awaiting_approval → closed (manager)
- `rollback`: in_progress/implemented → rolled_back (manager)

**Emergency Approval:**
Emergency changes require manager approval before implementation begins. This is a streamlined approval process designed for urgent situations, but still ensures proper authorization before changes are made to production systems.

### Pre-approved Workflow (v4)
```
draft → scheduled → in_progress → implemented → closed
```

**Key transitions:**
- `schedule`: draft → scheduled (manager, no approval needed)
- `implement`: scheduled → in_progress (implementer)
- `complete`: in_progress → implemented (implementer)
- `close`: implemented → closed (manager)

### Implementer Role

The **implementer** role is specifically designed for users who execute changes (DevOps engineers, SREs, DBAs). Implementers can:
- See the "Implement" button when a CR is in `approved` or `scheduled` state
- Click "Implement" to start implementation (transitions to `in_progress`)
- See the "Complete" button when a CR is in `in_progress` state
- Click "Complete" to finish implementation (transitions to `implemented`)

The role hierarchy is: `requester` < `implementer` < `manager` < `admin`

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `⌘K` / `Ctrl+K` | Open command palette |
| `↑` / `↓` | Navigate in lists |
| `Enter` | Select / Open |
| `Esc` | Close modal / Cancel |

## Tips

1. **Use Templates** - Start with a template to ensure all required fields are filled
2. **Check Plan Quality** - Use Impact Analysis to identify gaps in your plans
3. **Monitor Risk Scores** - High risk CRs require additional approvals
4. **Add Comments** - Document decisions and discussions on the CR
5. **Review Before Transition** - Ensure all guards are satisfied before transitioning
