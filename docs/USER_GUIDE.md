# User Guide — GCS Change & Release Management Dashboard

> **Version**: 1.3.0
> **Last Updated**: April 23, 2026

---

## Table of Contents

1. [Getting Started](#1-getting-started)
2. [Navigation](#2-navigation)
3. [Overview Dashboard](#3-overview-dashboard)
4. [Change Requests](#4-change-requests)
5. [Impact Analysis](#5-impact-analysis)
6. [Analytics](#6-analytics)
7. [Executive Summary](#7-executive-summary)
8. [Releases & Validations](#8-releases--validations)
9. [Risk & Confidence](#9-risk--confidence)
10. [Settings & Administration](#10-settings--administration)
11. [Keyboard Shortcuts & Accessibility](#11-keyboard-shortcuts--accessibility)
12. [Dark Mode](#12-dark-mode)
13. [ServiceNow Data Sync](#13-servicenow-data-sync)
14. [FAQ & Troubleshooting](#14-faq--troubleshooting)

---

## 1. Getting Started

### 1.1 Logging In

1. Open the application URL in your browser (default: `http://localhost:3600`)
2. You will be redirected to the **Login** page
3. Enter your **email** and **password**
4. Click **Sign In**

### 1.2 Creating an Account

1. On the login page, click **Create an account**
2. Fill in your **Name**, **Email**, and **Password**
3. Click **Register**
4. New accounts are created with the **Manager** role by default
5. An administrator can change your role from the User Management page

### 1.3 Resetting Your Password

1. On the login page, click **Forgot password?**
2. Enter your email address
3. Follow the reset flow to set a new password

### 1.4 User Roles

Your role determines what you can see and do:

| Capability | Admin | Manager |
|-----------|-------|--------|
| View all change requests and analyses | ✅ | Own only |
| View all dashboards and analytics | ✅ | Own data |
| Pull data from ServiceNow | ✅ | ✅ |
| Create/edit change requests | ✅ | ✅ |
| Save and view analysis reports | ✅ | Own only |
| Configure integrations (credentials) | ✅ | Own only |
| Manage users (roles, delete) | ✅ | ❌ |

> **Note**: Non-admin users only see change requests they synced and analyses they created. Each user stores their own ServiceNow/Git credentials.

Your current role is displayed as a badge next to your name in the sidebar.

---

## 2. Navigation

### 2.1 Sidebar

The left sidebar is the primary navigation. It is organized into two sections:

**CHANGES**
- **Overview** — Dashboard home with KPIs and summary charts
- **Change Requests** — Full list of all change requests
- **Impact Analysis** — Risk scoring and what-if analysis
- **Analytics** — Advanced analytics and trend charts

**RELEASES**
- **Release Overview** — Executive-level summary
- **Releases & Validations** — Release timeline and validation tracking
- **Risk & Confidence** — Risk radar and confidence scoring

**Bottom section** (role-dependent):
- **User Management** — Admin only
- **Settings** — Admin and Manager only

### 2.2 Mobile Navigation

On mobile devices (< 768px):
1. Tap the **hamburger menu** (☰) in the top-left
2. The sidebar slides in as an overlay
3. Tap any link to navigate (sidebar auto-closes)
4. Tap the dark backdrop to close without navigating

### 2.3 Command Palette (Quick Search)

Press **⌘K** (Mac) or **Ctrl+K** (Windows/Linux) to open the command palette:

- Type to search across **pages**, **change requests**, **releases**, and **validations**
- Use **↑↓** arrow keys to navigate results
- Press **Enter** to open the selected result
- Press **Escape** to close
- Results are grouped by category for easy scanning

---

## 3. Overview Dashboard

The Overview page is your landing page after login. It provides a high-level summary of all change request activity.

### 3.1 KPI Cards

The top row shows key performance indicators computed from real ServiceNow data:

- **Total Changes** — Total number of change requests in the system
- **Open Changes** — Count of non-closed/non-canceled change requests
- **Closed Changes** — Count of completed change requests
- **Risk Distribution** — Breakdown by risk level

### 3.2 Charts

- **State Distribution** — Bar chart showing how many changes are in each state (New, Assess, Authorize, Scheduled, Implement, Review, Closed, Canceled)
- **Risk Distribution** — Bar chart showing change counts by risk level (High, Moderate, Low)

### 3.3 Recent Changes

A table of the most recent change requests with quick-access links.

### 3.4 Change Health Charts

Below the recent changes table, four additional distribution charts provide deeper insight:

- **Change Status Distribution** — Pie chart of CR statuses
- **Risk Level Distribution** — Pie chart of risk buckets (Critical, High, Medium, Low)
- **Changes by Category** — Horizontal bar chart of CR categories
- **Avg Risk Score by Team** — Horizontal bar chart with color-coded risk levels per team

---

## 4. Change Requests

### 4.1 Browsing Changes

The Change Requests page displays all change requests in a searchable, filterable, paginated table.

**Each row shows**:
- Change number (e.g., CHG0000024)
- Short description
- State and priority
- Risk level (color-coded badge)
- Assignment group
- Opened date

### 4.2 Searching

Type in the search box to filter by:
- Change number
- Short description
- Assignment group
- Any visible field

Search is debounced (300ms delay) for smooth performance.

### 4.3 Filtering

Use the filter dropdowns to narrow results by:
- **State** — New, Assess, Authorize, Scheduled, Implement, Review, Closed, Canceled
- **Priority** — Critical, High, Medium, Low
- **Risk** — High, Moderate, Low
- **Category** — Software, Hardware, Network, etc.

### 4.4 Pagination

- Results are paginated (default: 10 per page)
- Use the **Previous** / **Next** buttons to navigate pages
- The current page and total count are displayed

### 4.5 Change Detail

Click on any change request row to expand a detailed view showing all ServiceNow fields:
- Core fields (description, justification, plans)
- Dates (opened, closed, scheduled, work start/end)
- People (assigned to, opened by, requested by)
- Approval information
- Implementation, backout, and test plans
- Validation results

### 4.6 Pulling Data from ServiceNow

*(Admin and Manager only)*

1. Click the **Pull Data** button in the page header
2. The system fetches all change requests from your ServiceNow instance
3. A toast notification confirms success or reports errors
4. The table refreshes automatically with the latest data

---

## 5. Impact Analysis

The Impact Analysis page provides multi-dimensional risk, plan readiness, and ML-powered content analysis for every change request. For detailed scoring methodology, see [Impact Analysis Documentation](IMPACT_ANALYSIS.md). It has **four tabs**:

### 5.1 Overview Tab (Default)

- **KPI Summary** — Average impact score, critical/high risk counts, average plan readiness, plan coverage percentage
- **Risk Score Distribution** — Pie chart of computed risk scores (Critical, High, Medium, Low)
- **Impact Score Distribution** — Pie chart across score ranges
- **Readiness Distribution** — Pie chart of plan readiness scores
- **State & Type & Priority Distributions** — Charts showing CR breakdowns
- **Top Risk CRs Table** — Top 8 highest-impact CRs with impact score, readiness, SN risk, state, and type — clickable to navigate to Plan Analysis
- **Risk vs Readiness Insights** — Highlights high-impact/low-readiness CRs needing attention and low-impact/high-readiness CRs that are well-prepared

### 5.2 Plan Analysis Tab

Per-CR plan readiness scoring:

**Plan Readiness Score = Σ(dimension_score × weight)**

Six plan dimensions:
| Dimension | Default Weight | What it measures |
|-----------|---------------|------------------|
| **Implementation Plan** | 25% | Quality and detail of implementation steps |
| **Backout Plan** | 25% | Rollback procedure quality |
| **Test Plan** | 20% | Testing coverage and approach |
| **Risk/Impact Analysis** | 15% | Risk identification and mitigation |
| **Change Plan** | 10% | Change execution planning |
| **Justification** | 5% | Business justification quality |

- Use the **sliders** to adjust each dimension's weight
- The formula updates in real-time
- Click **Reset to Defaults** to restore original weights
- **Plan Quality Radar** — Visual comparison of all dimensions
- **Plan Content Viewer** — View raw plan text for the selected CR
- **ML Quality Score KPI** — Shows the ML-computed overall quality alongside the weighted score

### 5.3 ML Analysis Tab

Deep ML-powered content analysis for each change request:

1. **Select a CR** from the filterable table
2. The system runs ML content analysis on the implementation plan
3. Results include:
   - **Assessment Verdict** — Approve / Approve with Conditions / Needs Rework / Reject
   - **Quality Scores** — Structure, Completeness, Clarity, Risk Awareness (each 0–100)
   - **Quality Radar Chart** — Visual comparison of the 4 quality dimensions
   - **ML vs Plan Readiness Comparison** — Side-by-side scores with gap analysis
   - **Change Nature Profile** — Change type, risk tier, complexity, category tags
   - **Application Profile** — Application name, service category, criticality, technology stack
   - **Detected Actions** — Actions identified in the plan text
   - **Detected Risks & Gaps** — Missing elements or risk factors
   - **Recommendations** — Severity-rated action items (critical, high, medium, info)

**ML Quality Formula**: `Overall = Structure×25% + Completeness×30% + Clarity×25% + RiskAwareness×20%`

### 5.4 Code Change Analysis Tab

Git-based code change risk analysis:

- Analyzes git commit history for the selected change request
- Shows file change frequency, commit patterns, and code-level risk factors
- Helps identify changes with high code churn or complex file modifications

---

## 6. Analytics

The Analytics page provides deep-dive analytics across your change data. It has **four tabs**:

### 6.1 Failure Analysis Tab
- **Change Failure Rate** — DORA metric showing percentage of failed deployments
- **Failure by Team** — Bar chart of failure rates per team
- **Service Risk Ranking** — Which services have the highest risk exposure

### 6.2 Velocity Tab
- **Team Velocity** — Deployment rates and throughput by team
- **Category Breakdown** — Change volume by category
- **Approval Efficiency** — Lead time analysis for approvals

### 6.3 Metrics & Trends Tab
- **DORA Metrics** — Deployment frequency, lead time, change failure rate, MTTR
- **Risk Trends** — Average risk score over time
- **Validation Trends** — Pass rate over time
- **Team Health Table** — Per-team metrics with health indicators

### 6.4 Change Health Tab
- **Health KPIs** — Overall health score, avg deploy rate, avg team risk, failure rate, active teams
- **Team Performance Radar** — Radar chart comparing deploy rate vs risk across teams
- **Team Risk Ranking** — Horizontal bar chart of average risk per team
- **Health Score Formula** — `Health = DeployRate×40% + (100−AvgRisk)×30% + (100−FailureRate)×30%`
- **Team Health Summary Table** — Detailed per-team breakdown with health grades (Excellent/Good/Fair/Poor)

---

## 7. Executive Summary

A high-level view designed for leadership and release managers:

- **Release-level KPIs** — Overall risk, confidence, readiness
- **Risk Gauges** — Visual indicators for each active release
- **Confidence Scores** — Go/no-go recommendations
- **Key Blockers** — Critical issues requiring attention

---

## 8. Releases & Validations

### 8.1 Release Timeline

- Visual timeline of all releases ordered by scheduled date
- Each release shows: name, version, status, risk level, release manager

### 8.2 Release Statuses

| Status | Meaning |
|--------|---------|
| **Planning** | Release is being planned |
| **Staging** | Changes are in staging environment |
| **Canary** | Canary deployment in progress |
| **Rolling Out** | Full rollout in progress |
| **Completed** | Successfully deployed |
| **Rolled Back** | Deployment was rolled back |

### 8.3 Validation Tracking

Each release shows its bundled change requests and their validation results:
- **Unit Tests** — Automated test pass/fail
- **Integration Tests** — Cross-system verification
- **Security Scans** — Vulnerability checks
- **Code Reviews** — Peer review status
- **UAT** — User acceptance testing
- **Smoke Tests** — Post-deployment verification

---

## 9. Risk & Confidence

### 9.1 Risk Radar Tab

A **multi-dimensional radar chart** showing risk across five axes:
- **Overall Risk** — Aggregate risk score
- **Code Churn** — Volume of code changes
- **Service Spread** — Number of services impacted
- **Test Coverage** — Inverse of test coverage (higher = more risk)
- **Change Volume** — Number of changes in the release

**Release Selector**: Click release buttons at the top to switch between releases.

**KPI Cards**: Risk Score, Changes, Code Churn, Services, Pass Rate.

**Risk Factor Assessment**: Shows risk levels (High/Medium/Low) for:
- Code Churn
- Service Spread
- Test Coverage
- Rollback Complexity

**Affected Services**: Lists all services impacted by the selected release.

### 9.2 Confidence Tab

**Release confidence scoring** with actionable recommendations:

| Confidence | Recommendation | Meaning |
|-----------|---------------|---------|
| 80–100 | ✅ **Continue** | Safe to proceed with deployment |
| 50–79 | ⚠️ **Pause** | Review issues before proceeding |
| 0–49 | 🛑 **Rollback** | High risk, consider rolling back |

**Confidence Breakdown**:
- Test pass rate
- Test coverage
- Risk score
- Failed test count
- Blocker status
- Rollback complexity

---

## 10. Settings & Administration

### 10.1 Dashboard Settings

*(Admin and Manager only)*

Navigate to **Settings** in the sidebar to configure:
- Dashboard policies
- Alert thresholds

### 10.2 User Management

*(Admin only)*

Navigate to **User Management** in the sidebar to:

- **View all users** — Name, email, role, creation date
- **Change user roles** — Promote or demote users (Admin/Manager/Viewer)
- **Delete user accounts** — Remove users from the system

---

## 11. Keyboard Shortcuts & Accessibility

### 11.1 Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| **⌘K** / **Ctrl+K** | Open command palette |
| **Escape** | Close command palette / modal |
| **↑ ↓** | Navigate command palette results |
| **Enter** | Select command palette result |
| **Tab** | Move focus to next interactive element |

### 11.2 Accessibility Features

- **Skip to content** link — Press Tab on page load to skip sidebar navigation
- **ARIA labels** — All navigation, forms, buttons, and icons are labeled
- **Screen reader support** — Semantic HTML with proper heading hierarchy
- **Keyboard navigation** — All interactive elements are keyboard-accessible
- **Focus indicators** — Visible focus rings on all focusable elements
- **Color contrast** — Meets WCAG AA standards in both light and dark modes

---

## 12. Dark Mode

### 12.1 Toggling Theme

Click the **sun/moon icon** in the page header (top-right corner) to toggle between light and dark modes.

### 12.2 Behavior

- Your preference is saved in `localStorage` and persists across sessions
- On first visit, the app detects your **system preference** (OS-level dark mode setting)
- All charts, cards, tables, and UI elements adapt to the selected theme

---

## 13. ServiceNow Data Sync

### 13.1 How It Works

The dashboard connects to your ServiceNow instance to pull live change request data:

1. **Pull Data** button on the Change Requests page triggers a sync
2. The system fetches all records from the `change_request` table
3. Records are upserted — new ones are created, existing ones are updated
4. All 90+ ServiceNow fields are stored exactly as they appear in SN

### 13.2 What Gets Synced

- All change request records (paginated, handles large datasets)
- Display values for reference fields (assigned_to, assignment_group, cmdb_ci, etc.)
- All states, dates, plans, approvals, and metadata

### 13.3 Without ServiceNow

The application works fully with demo data. Run `npm run db:seed` to populate sample change requests for testing and demonstration.

---

## 14. FAQ & Troubleshooting

### Q: I can't see the Settings or User Management pages
**A:** These pages are role-restricted. Settings requires Admin or Manager role. User Management requires Admin role. Contact your administrator to update your role.

### Q: The data looks stale / hasn't updated
**A:** Data auto-refreshes every 30 seconds. You can also:
- Refresh the browser page
- Click "Pull Data" to sync fresh data from ServiceNow
- Check if the ServiceNow connection is configured correctly

### Q: I see "Session expired" errors
**A:** Your login session lasts 24 hours. After expiration, you'll be redirected to the login page. Simply log in again.

### Q: Charts are empty or show no data
**A:** This usually means:
- The database has no records — run `npm run db:seed` or pull data from ServiceNow
- The API returned an error — check the browser console for details

### Q: The command palette (⌘K) doesn't open
**A:** Ensure you're on a dashboard page (not the login page). The command palette is only available within the dashboard layout.

### Q: How do I change my password?
**A:** Use the **Forgot password?** link on the login page, or ask an administrator to reset your account.

### Q: Can I export data?
**A:** Data export is not currently built into the UI. You can access the raw data via the API endpoints (`GET /api/data`) or directly from the SQLite database.

### Q: The risk scores seem wrong
**A:** Risk scores are derived from ServiceNow fields (risk, impact, urgency, priority, type, scope). If a change request has empty or unexpected field values in ServiceNow, the scores may not reflect reality. Check the source data in the Change Request detail view.
