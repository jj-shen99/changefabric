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

The system has 6 user roles with different permission levels:

| Permission | Admin | Change Manager | Approver | Implementer | Requester | CAB Member |
|------------|:-----:|:--------------:|:--------:|:-----------:|:---------:|:----------:|
| View Dashboard | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| View Own CRs | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| View All CRs | ✓ | ✓ | ✗ | ✗ | ✗ | ✓ |
| Create CR | ✓ | ✓ | ✗ | ✗ | ✓ | ✗ |
| Edit Own CR | ✓ | ✓ | ✗ | ✗ | ✓ | ✗ |
| Edit Any CR | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ |
| Approve CR | ✓ | ✓ | ✓ | ✗ | ✗ | ✓ |
| Implement CR | ✓ | ✓ | ✗ | ✓ | ✗ | ✗ |
| Manage Releases | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ |
| Manage Users | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Manage Settings | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| View Metrics | ✓ | ✓ | ✓ | ✓ | ✗ | ✓ |

**Role Descriptions:**
- **Admin**: Full system access including user management and settings
- **Change Manager**: Create/edit CRs, approve changes, implement changes, manage releases
- **Approver**: Review and approve CRs assigned to them
- **Implementer**: Execute approved changes (DevOps, SREs, DBAs)
- **Requester**: Create and manage their own CRs (developers, product managers)
- **CAB Member**: Change Advisory Board member, can approve changes and view all data

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
- Pagination (configurable page size)
- Click to view details

**Actions:**
- **+ New Change** - Create a new CR
- **Click row** - View CR details

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
│  │  CR Number  │  Title                    │  Score  │  Gaps  │  Risk  │   │
│  ├─────────────┼───────────────────────────┼─────────┼────────┼────────┤   │
│  │  CHG0000001 │  Payment Gateway          │   72    │   1    │  Med   │   │
│  │  CHG0000002 │  Redis Caching            │   85    │   0    │  Low   │   │
│  │  CHG0000003 │  Auth Hotfix              │   45    │   3    │  High  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  Plan Quality Dimensions:                                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Implementation Plan  ████████████████████░░░░  80%                 │   │
│  │  Backout Plan         ██████████████░░░░░░░░░░  60%                 │   │
│  │  Test Plan            ████████████████████████  95%                 │   │
│  │  Risk Analysis        ████████████░░░░░░░░░░░░  50%                 │   │
│  │  Justification        ██████████████████░░░░░░  70%                 │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### ML Analysis Tab
- Deep ML content analysis
- Structure, completeness, clarity, risk-awareness scores
- Detected actions and risks
- Recommendations with severity

## Workflow States

Change requests follow a defined workflow based on their type:

### Standard Workflow
```
draft → submitted → assessing → awaiting_approval → approved → 
scheduled → in_progress → implemented → reviewing → closed
```

### Emergency Workflow
```
draft → in_progress → implemented → reviewing → closed
```

### Pre-approved Workflow
```
draft → scheduled → in_progress → implemented → reviewing → closed
```

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
