# System Overview

High-level architecture of the GCS Release Change Analysis Dashboard.

```mermaid
graph TB
    subgraph Client["Browser Client"]
        UI[Next.js React UI - Port 3600]
        Auth[NextAuth.js - Session Management]
    end

    subgraph Server["Next.js Server"]
        MW[Middleware - Auth Guard]
        API[API Routes - 18 endpoints]
        SSR[Server-Side Rendering]
    end

    subgraph External["External Services"]
        SNOW[ServiceNow Instance - REST API]
        GIT[Git Enterprise - REST API]
    end

    subgraph Storage["Data Layer"]
        DB[(SQLite via Prisma - prisma/dev.db)]
        ENV[.env - Encrypted Secrets]
    end

    UI -->|HTTP Requests| MW
    MW -->|Authenticated| API
    MW -->|Redirect| Auth
    API -->|Prisma ORM| DB
    API -->|Fetch CRs| SNOW
    API -->|Fetch Commits| GIT
    API -->|Read Secrets| ENV
    SSR -->|Prisma ORM| DB

    style Client fill:#dbeafe,stroke:#3b82f6
    style Server fill:#fef3c7,stroke:#f59e0b
    style External fill:#fce7f3,stroke:#ec4899
    style Storage fill:#d1fae5,stroke:#10b981
```

## Technology Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, Next.js 14, Recharts, TailwindCSS, Lucide Icons |
| **Auth** | NextAuth.js, bcryptjs, JWT |
| **Backend** | Next.js API Routes (Node.js) |
| **Database** | SQLite + Prisma ORM |
| **Encryption** | AES-256-GCM (credentials at rest) |
| **External APIs** | ServiceNow REST API, GitHub Enterprise REST API |
| **Testing** | Jest, Testing Library |
