# Access Control Model

Role-based access control (RBAC) architecture for the dashboard.

## Role Hierarchy

```mermaid
graph TD
    Admin["Admin<br/>Full access to all data and settings"]
    Manager["Manager<br/>Own data + change management"]

    Admin -->|superset of| Manager

    style Admin fill:#fecaca,stroke:#ef4444
    style Manager fill:#bfdbfe,stroke:#3b82f6
```

## Permission Matrix

```mermaid
graph LR
    subgraph Permissions
        MU[Manage Users]
        MC[Manage Changes]
        AC[Approve Changes]
        MR[Manage Releases]
        ES[Edit Settings]
        VM[View Metrics]
        VAD[View All Data]
    end

    subgraph Admin Role
        A_MU[✅]
        A_MC[✅]
        A_AC[✅]
        A_MR[✅]
        A_ES[✅]
        A_VM[✅]
        A_VAD[✅]
    end

    subgraph Manager Role
        M_MU[❌]
        M_MC[✅]
        M_AC[✅]
        M_MR[✅]
        M_ES[❌]
        M_VM[✅]
        M_VAD[❌]
    end

    style Admin Role fill:#fecaca,stroke:#ef4444
    style Manager Role fill:#bfdbfe,stroke:#3b82f6
```

## Data Visibility Flow

```mermaid
flowchart TD
    REQ[API Request] --> AUTH{Authenticated?}
    AUTH -->|No| R401[401 Unauthorized]
    AUTH -->|Yes| ROLE{User Role?}

    ROLE -->|Admin| ALL[Return ALL records]
    ROLE -->|Manager| FILTER[Filter by syncedBy / createdBy]
    FILTER --> OWN[Return user's OWN records only]

    subgraph Filtered Endpoints
        E1["/api/data — Change Requests"]
        E2["/api/data/analytics — Analytics"]
        E3["/api/data/changes — Change Details"]
        E4["/api/analysis — Saved Analyses"]
        E5["/api/analysis/:id — Single Analysis"]
        E6["/api/analysis/:id/html — HTML Report"]
    end

    ALL --> E1 & E2 & E3 & E4 & E5 & E6
    OWN --> E1 & E2 & E3 & E4 & E5 & E6

    style R401 fill:#fecaca,stroke:#ef4444
    style ALL fill:#d1fae5,stroke:#10b981
    style OWN fill:#dbeafe,stroke:#3b82f6
```

## Credential Isolation

```mermaid
flowchart LR
    subgraph "User A"
        A_SNOW[SNOW instance + creds]
        A_GIT[Git repo + creds]
    end
    subgraph "User B"
        B_SNOW[SNOW instance + creds]
        B_GIT[Git repo + creds]
    end
    subgraph "IntegrationSetting Table"
        DB["userId + type + key = UNIQUE<br/>Each user has isolated credentials"]
    end

    A_SNOW --> DB
    A_GIT --> DB
    B_SNOW --> DB
    B_GIT --> DB
```

## Page Access Rules

| Page | Path | Auth Required | Admin Only | Data Filtered |
|------|------|:---:|:---:|:---:|
| Overview | `/` | ✅ | — | By syncedBy |
| Change Requests | `/changes` | ✅ | — | By syncedBy |
| Impact Analysis | `/impact` | ✅ | — | By syncedBy |
| Code Analysis | `/code-analysis` | ✅ | — | Own credentials |
| Reports | `/reports` | ✅ | — | By createdBy |
| Analytics | `/analytics` | ✅ | — | By syncedBy |
| Integrations | `/settings/integrations` | ✅ | — | Per-user creds |
| User Management | `/settings/users` | ✅ | ✅ | — |
| Account | `/settings/account` | ✅ | — | Own account |
