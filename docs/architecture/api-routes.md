# API Route Map

All API endpoints with authentication and authorization requirements.

## Route Diagram

```mermaid
graph TD
    subgraph "Authentication"
        AUTH["POST /api/auth/[...nextauth] - NextAuth.js handler"]
        REG["POST /api/auth/register - New user registration"]
        RESET["POST /api/auth/reset-password - Password reset"]
        ACCT["GET|PUT /api/auth/account - Own account details"]
    end

    subgraph "Admin Only"
        USERS["GET|POST|PUT|DELETE /api/admin/users - User management"]
    end

    subgraph "Data — User Filtered"
        DATA["GET /api/data - Change requests + releases"]
        ANALYTICS["GET /api/data/analytics - Failure, velocity, blast radius"]
        CHANGES["GET /api/data/changes - Change request details"]
    end

    subgraph "Analysis — User Filtered"
        ANA_LIST["GET /api/analysis - List saved analyses"]
        ANA_SAVE["POST /api/analysis - Save new analysis"]
        ANA_DEL["DELETE /api/analysis - Delete analysis"]
        ANA_GET["GET /api/analysis/:id - Single analysis"]
        ANA_HTML["GET /api/analysis/:id/html - HTML report"]
    end

    subgraph "External Integrations"
        SYNC["POST /api/sync - Sync CRs from ServiceNow"]
        GIT_ANA["POST /api/data/git-analysis - Git commit analysis"]
        PLAN_ANA["POST /api/data/plan-analysis - Plan readiness analysis"]
    end

    subgraph "Settings — Per User"
        INT_GET["GET /api/settings/integrations - Load user credentials"]
        INT_POST["POST /api/settings/integrations - Save user credentials"]
        INT_CRED["GET /api/settings/integrations/credentials - Decrypted credentials"]
        TEST_SNOW["POST /api/settings/integrations/test-snow - Test SNOW connection"]
        TEST_GIT["POST /api/settings/integrations/test-git - Test Git connection"]
    end

    style Authentication fill:#f0fdf4,stroke:#22c55e
    style "Admin Only" fill:#fef2f2,stroke:#ef4444
    style "Data — User Filtered" fill:#eff6ff,stroke:#3b82f6
    style "Analysis — User Filtered" fill:#fefce8,stroke:#eab308
    style "External Integrations" fill:#fdf4ff,stroke:#a855f7
    style "Settings — Per User" fill:#f0fdfa,stroke:#14b8a6
```

## Endpoint Reference

| Method | Path | Auth | Admin Only | User Filtered | Description |
|--------|------|:----:|:----------:|:-------------:|-------------|
| `*` | `/api/auth/[...nextauth]` | — | — | — | NextAuth handler |
| `POST` | `/api/auth/register` | — | — | — | Register new user |
| `POST` | `/api/auth/reset-password` | — | — | — | Reset password |
| `GET/PUT` | `/api/auth/account` | ✅ | — | Own | Account details |
| `GET/POST/PUT/DELETE` | `/api/admin/users` | ✅ | ✅ | — | User CRUD |
| `GET` | `/api/data` | ✅ | — | syncedBy | Change requests |
| `GET` | `/api/data/analytics` | ✅ | — | syncedBy | Analytics data |
| `GET` | `/api/data/changes` | ✅ | — | syncedBy | Change details |
| `POST` | `/api/data/git-analysis` | ✅ | — | — | Git analysis |
| `POST` | `/api/data/plan-analysis` | ✅ | — | — | Plan analysis |
| `GET` | `/api/analysis` | ✅ | — | createdBy | List analyses |
| `POST` | `/api/analysis` | ✅ | — | — | Save analysis |
| `DELETE` | `/api/analysis` | ✅ | — | createdBy | Delete analysis |
| `GET` | `/api/analysis/:id` | ✅ | — | createdBy | Single analysis |
| `GET` | `/api/analysis/:id/html` | ✅ | — | createdBy | HTML report |
| `POST` | `/api/sync` | ✅ | — | — | Sync from ServiceNow |
| `GET` | `/api/settings/integrations` | ✅ | — | userId | Load settings |
| `POST` | `/api/settings/integrations` | ✅ | — | userId | Save settings |
| `GET` | `/api/settings/integrations/credentials` | ✅ | — | userId | Decrypted creds |
| `POST` | `/api/settings/integrations/test-snow` | ✅ | — | — | Test SNOW |
| `POST` | `/api/settings/integrations/test-git` | ✅ | — | — | Test Git |
