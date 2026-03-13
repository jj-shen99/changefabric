# Change Management Analysis — Architecture

> **Version**: 1.2.0
> **Last Updated**: March 12, 2026

---

## System Architecture Overview

```mermaid
graph TB
    subgraph External["External Data Sources"]
        SN[ServiceNow<br/>change_request table]
        GH[GitHub / GitLab<br/>Git Repositories]
    end

    subgraph Ingestion["Data Ingestion Layer"]
        SYNC[Sync Engine<br/>POST /api/sync]
        CLI[CLI Import<br/>scripts/import-servicenow.ts]
        GITAPI[Git Analysis API<br/>GET /api/data/git-analysis]
    end

    subgraph Storage["Storage Layer"]
        DB[(SQLite / PostgreSQL<br/>Prisma ORM)]
        CR_TBL[ChangeRequest<br/>90+ fields]
        VAL_TBL[Validation<br/>Test results]
        REL_TBL[Release<br/>Deployment tracking]
        USR_TBL[User<br/>Auth & RBAC]
    end

    subgraph Analysis["Analysis Engine Layer"]
        direction TB
        DIM[Dimension Scoring Engine<br/>6 SN field dimensions<br/>Weighted 0–100]
        PLAN[Plan Readiness Engine<br/>6 plan dimensions<br/>Keyword analysis]
        ML[ML Content Analyzer<br/>Structure + Completeness<br/>+ Clarity + Risk Awareness]
        GIT[Code Change Analyzer<br/>Commit risk scoring<br/>File type analysis]
    end

    subgraph Presentation["Presentation Layer — Browser"]
        direction TB
        OV[Overview Tab<br/>KPIs, distributions, top risks]
        PA[Plan Analysis Tab<br/>Per-CR scoring, radar, plans]
        MA[ML Analysis Tab<br/>Deep quality analysis, recommendations]
        CA[Code Change Tab<br/>Git risk, heatmaps, trends]
        AN[Analytics Page<br/>Failure, Velocity, Metrics, Health]
        EX[Executive Page<br/>Release KPIs, risk gauges]
        RR[Risk Radar Page<br/>Multi-axis risk, confidence]
    end

    SN -->|"REST API<br/>Basic Auth"| SYNC
    SN -->|"REST API"| CLI
    GH -->|"REST API<br/>OAuth"| GITAPI

    SYNC --> DB
    CLI --> DB
    DB --> CR_TBL
    DB --> VAL_TBL
    DB --> REL_TBL
    DB --> USR_TBL

    CR_TBL --> DIM
    CR_TBL --> PLAN
    CR_TBL --> ML
    GITAPI --> GIT

    DIM --> OV
    DIM --> PA
    PLAN --> OV
    PLAN --> PA
    ML --> MA
    GIT --> CA

    CR_TBL --> AN
    CR_TBL --> EX
    CR_TBL --> RR

    style External fill:#fef3c7,stroke:#d97706
    style Ingestion fill:#e0f2fe,stroke:#0284c7
    style Storage fill:#f3e8ff,stroke:#9333ea
    style Analysis fill:#f0fdf4,stroke:#16a34a
    style Presentation fill:#fce7f3,stroke:#db2777
```

---

## Analysis Pipeline — Per Change Request

```mermaid
flowchart LR
    subgraph Input["Input: Change Request"]
        META[SN Metadata<br/>risk, impact, urgency<br/>priority, type, scope]
        PLANS[Plan Fields<br/>implementation_plan<br/>backout_plan<br/>test_plan<br/>change_plan<br/>risk_impact_analysis<br/>justification]
        REPO[Linked Repository<br/>Git commit history]
    end

    subgraph Scoring["Scoring Engines"]
        DS["Dimension Scoring<br/>━━━━━━━━━━━━━━<br/>Risk × 25%<br/>Impact × 25%<br/>Urgency × 15%<br/>Priority × 15%<br/>Type × 10%<br/>Scope × 10%"]
        PS["Plan Readiness<br/>━━━━━━━━━━━━━━<br/>Implementation × 25%<br/>Backout × 25%<br/>Test Plan × 20%<br/>Risk Analysis × 15%<br/>Change Plan × 10%<br/>Justification × 5%"]
        MLS["ML Quality<br/>━━━━━━━━━━━━━━<br/>Structure × 25%<br/>Completeness × 30%<br/>Clarity × 25%<br/>Risk Awareness × 20%"]
        GS["Code Risk<br/>━━━━━━━━━━━━━━<br/>Files changed<br/>Lines added/deleted<br/>File type risk<br/>Commit patterns<br/>Author concentration"]
    end

    subgraph Output["Output: Risk Profile"]
        DI[Dimension Score<br/>0–100]
        RE[Readiness Score<br/>0–100]
        MQ[ML Quality Score<br/>0–100]
        CR[Code Risk Score<br/>0–100]
        
        DI --> FINAL[Composite Risk<br/>Assessment]
        RE --> FINAL
        MQ --> FINAL
        CR --> FINAL
        
        FINAL --> VERDICT{Assessment Verdict}
        VERDICT -->|"Score ≥ 65"| APP[✅ Approve]
        VERDICT -->|"45–64"| COND[⚠️ Approve w/ Conditions]
        VERDICT -->|"25–44"| REWORK[🔶 Needs Rework]
        VERDICT -->|"< 25"| REJ[🛑 Reject]
    end

    META --> DS
    PLANS --> PS
    PLANS --> MLS
    REPO --> GS
    DS --> DI
    PS --> RE
    MLS --> MQ
    GS --> CR

    style Input fill:#e0f2fe,stroke:#0284c7
    style Scoring fill:#fef3c7,stroke:#d97706
    style Output fill:#f0fdf4,stroke:#16a34a
    style APP fill:#dcfce7,stroke:#16a34a
    style COND fill:#fef9c3,stroke:#ca8a04
    style REWORK fill:#ffedd5,stroke:#ea580c
    style REJ fill:#fee2e2,stroke:#dc2626
```

---

## Data Flow — End to End

```mermaid
sequenceDiagram
    participant User as User / Browser
    participant UI as Next.js Client
    participant API as API Routes
    participant DB as Database
    participant SN as ServiceNow
    participant GH as GitHub

    Note over User,GH: Phase 1 — Data Ingestion
    User->>UI: Click "Pull Data" or run CLI
    UI->>API: POST /api/sync
    API->>SN: GET /api/now/table/change_request (paginated)
    SN-->>API: JSON array (90+ fields per record)
    API->>DB: Prisma upsert loop
    DB-->>API: Sync result (fetched, upserted, errors)
    API-->>UI: Toast notification

    Note over User,GH: Phase 2 — Dashboard Loading
    User->>UI: Navigate to Impact Analysis
    UI->>API: GET /api/data (SWR, 30s refresh)
    API->>DB: Prisma query (CRs + validations + releases)
    DB-->>API: Full dataset
    API-->>UI: JSON response
    UI->>UI: Client-side Dimension Scoring
    UI->>UI: Client-side Plan Readiness Scoring

    Note over User,GH: Phase 3 — ML Analysis (On-Demand)
    User->>UI: Click "Run Analysis" on a CR
    UI->>API: GET /api/data/plan-analysis?number=CHG0000024
    API->>DB: Fetch CR by number
    DB-->>API: CR with all plan fields
    API->>API: ML Content Analysis Engine
    API-->>UI: Quality scores + recommendations

    Note over User,GH: Phase 4 — Code Analysis (On-Demand)
    User->>UI: Enter repo URL, click Analyze
    UI->>API: GET /api/data/git-analysis?repo=owner/repo
    API->>GH: GET /repos/{owner}/{repo}/commits
    GH-->>API: Commit list + file details
    API->>API: Per-commit risk scoring
    API-->>UI: Git analysis results
```

---

## Analytics Processing Pipeline

```mermaid
flowchart TB
    subgraph Input["Raw Data"]
        CRS[All Change Requests]
        RELS[All Releases]
        VALS[All Validations]
    end

    subgraph Analytics["GET /api/data/analytics"]
        AUTH[Auth Check]
        QUERY[Parallel Prisma Queries]
        
        subgraph Aggregation["Aggregation Engine"]
            RRR[Release Risk Radar<br/>Per-release risk dimensions]
            BR[Blast Radius<br/>Impact by assignment group]
            CS[Confidence Scores<br/>Go/no-go recommendations]
            FA[Failure Analysis<br/>DORA change failure rate<br/>Failure by team<br/>Service risk ranking]
            VEL[Velocity<br/>Team deployment rates<br/>Category breakdown<br/>Approval efficiency]
            RI[Rollback Intelligence<br/>Rollback patterns<br/>Complexity analysis]
        end
    end

    subgraph Pages["Dashboard Pages"]
        AN_FA[Failure Analysis Tab]
        AN_VE[Velocity Tab]
        AN_MT[Metrics & Trends Tab]
        AN_CH[Change Health Tab]
        EXE[Executive Summary]
        RISK[Risk Radar]
        CONF[Confidence Scoring]
    end

    CRS --> AUTH
    RELS --> AUTH
    VALS --> AUTH
    AUTH --> QUERY
    QUERY --> RRR
    QUERY --> BR
    QUERY --> CS
    QUERY --> FA
    QUERY --> VEL
    QUERY --> RI

    FA --> AN_FA
    VEL --> AN_VE
    RRR --> AN_MT
    BR --> AN_CH
    CS --> CONF
    RRR --> RISK
    CS --> EXE

    style Input fill:#e0f2fe,stroke:#0284c7
    style Analytics fill:#fef3c7,stroke:#d97706
    style Aggregation fill:#f0fdf4,stroke:#16a34a
    style Pages fill:#fce7f3,stroke:#db2777
```

---

## Authentication & Authorization Flow

```mermaid
flowchart TB
    subgraph Auth["Authentication"]
        LOGIN[Login Page] -->|email + password| CRED[NextAuth Credentials Provider]
        CRED --> PRISMA[Prisma: User lookup]
        PRISMA --> BCRYPT[bcrypt.compare]
        BCRYPT -->|Valid| JWT[JWT Token — 24h<br/>id + email + name + role]
        BCRYPT -->|Invalid| ERR[Error: Invalid credentials]
    end

    subgraph Protection["Route Protection"]
        JWT --> MW[Middleware<br/>Protected route patterns]
        MW -->|Authenticated| ALLOW[Allow access]
        MW -->|Not authenticated| REDIR[Redirect to /login]
    end

    subgraph RBAC["Role-Based Access Control"]
        JWT --> PERM[usePermissions hook]
        PERM --> ADMIN["Admin<br/>━━━━━━━━━━━━━━<br/>✅ Manage users<br/>✅ Manage changes<br/>✅ Approve changes<br/>✅ Manage releases<br/>✅ Edit settings<br/>✅ View metrics"]
        PERM --> MGR["Manager<br/>━━━━━━━━━━━━━━<br/>❌ Manage users<br/>✅ Manage changes<br/>✅ Approve changes<br/>✅ Manage releases<br/>❌ Edit settings<br/>✅ View metrics"]
        PERM --> VIEW["Viewer<br/>━━━━━━━━━━━━━━<br/>❌ Manage users<br/>❌ Manage changes<br/>❌ Approve changes<br/>❌ Manage releases<br/>❌ Edit settings<br/>✅ View metrics"]
    end

    style Auth fill:#e0f2fe,stroke:#0284c7
    style Protection fill:#fef3c7,stroke:#d97706
    style RBAC fill:#f0fdf4,stroke:#16a34a
    style ADMIN fill:#fee2e2,stroke:#dc2626
    style MGR fill:#dbeafe,stroke:#2563eb
    style VIEW fill:#f3f4f6,stroke:#6b7280
```

---

## Technology Stack

```mermaid
graph LR
    subgraph Frontend["Frontend"]
        NEXT[Next.js 14<br/>App Router]
        REACT[React 18]
        TW[Tailwind CSS 3.4]
        CHARTS[Recharts 3.x]
        ICONS[Lucide React]
        SWR_LIB[SWR 2.x]
    end

    subgraph Backend["Backend"]
        NAPI[Next.js API Routes]
        NAUTH[NextAuth.js 4]
        PRISMA_ORM[Prisma ORM 6.x]
        BCRYPT_LIB[bcryptjs]
    end

    subgraph Data["Data"]
        SQLITE[(SQLite)]
        SN_API[ServiceNow REST API]
        GH_API[GitHub REST API]
    end

    NEXT --> NAPI
    REACT --> NEXT
    SWR_LIB --> NAPI
    NAPI --> NAUTH
    NAPI --> PRISMA_ORM
    PRISMA_ORM --> SQLITE
    NAPI --> SN_API
    NAPI --> GH_API

    style Frontend fill:#e0f2fe,stroke:#0284c7
    style Backend fill:#f0fdf4,stroke:#16a34a
    style Data fill:#fef3c7,stroke:#d97706
```
