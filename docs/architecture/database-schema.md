# Database Schema

Entity-relationship diagram for the SQLite database (Prisma ORM).

## ER Diagram

```mermaid
erDiagram
    User {
        string id PK
        string email UK
        string name
        string hashedPassword
        string role "admin | manager"
        datetime createdAt
        datetime updatedAt
        string resetToken
        datetime resetTokenExpiry
    }

    ChangeRequest {
        string number PK
        string sys_id UK
        string short_description
        string description
        string category
        string state
        string type
        string priority
        string risk
        string impact
        string assigned_to
        string assignment_group
        string business_service
        string syncedBy "User email who synced"
    }

    Validation {
        string id PK
        string changeRequestId FK
        string type
        string status
        string result
        string details
        string blockers
    }

    Release {
        string id PK
        string name
        string version
        string status
        datetime scheduledDate
        datetime actualDate
        int overallRisk
        string releaseManager
        string notes
    }

    DashboardMetric {
        string id PK
        int totalChanges
        int pendingChanges
        int deployedToday
        int failedDeployments
        float avgRiskScore
        float validationPassRate
        datetime recordedAt
    }

    IntegrationSetting {
        string id PK
        string userId "User email - per-user isolation"
        string type "snow | git"
        string key "instance | user | password"
        string value "AES-256-GCM encrypted"
        boolean encrypted
        datetime createdAt
        datetime updatedAt
    }

    SavedAnalysis {
        string id PK
        string name
        string description
        string analysisType "plan | ml | code | combined"
        string changeRequestId
        string repoUrl
        float overallScore
        string analysisData "JSON blob"
        string createdBy "User email"
        datetime createdAt
        datetime updatedAt
    }

    ChangeRequest ||--o{ Validation : "has"
    User ||--o{ IntegrationSetting : "owns credentials"
    User ||--o{ SavedAnalysis : "created"
    User ||--o{ ChangeRequest : "syncedBy"
```

## Key Constraints

| Table | Unique Constraint | Purpose |
|-------|-------------------|---------|
| `User` | `email` | One account per email |
| `ChangeRequest` | `sys_id` | Deduplicate ServiceNow records |
| `IntegrationSetting` | `(userId, type, key)` | Per-user credential isolation |
| `SavedAnalysis` | — | Indexed on `createdBy`, `analysisType`, `changeRequestId` |

## Data Ownership

- **ChangeRequest.syncedBy** — Tracks which user synced the record; non-admin users only see CRs they synced
- **SavedAnalysis.createdBy** — Tracks who created the analysis; non-admin users only see their own
- **IntegrationSetting.userId** — Each user stores their own encrypted credentials independently
