# UI Component Tree

Frontend component hierarchy and page structure.

## Application Layout

```mermaid
graph TD
    subgraph "Root Layout"
        HTML[html]
        BODY[body]
        TP[ThemeProvider]
        SP[SessionProvider]
    end

    subgraph "Dashboard Layout"
        DL["(dashboard)/layout.tsx"]
        SB[Sidebar]
        MAIN[Main Content Area]
        CP[CommandPalette]
        SKP[SkipToContent]
    end

    subgraph "Sidebar Components"
        NAV[Navigation Sections]
        TT[ThemeToggle]
        ROLE[Role Badge]
        USER[User Info]
    end

    subgraph "Shared Components"
        CARD[Card / CardHeader / CardTitle]
        PH[PageHeader]
        RB[RiskBadge]
        RG[RiskGauge]
        SBG[StatusBadge]
        SKEL[Skeleton]
    end

    HTML --> BODY --> TP --> SP --> DL
    DL --> SB & MAIN & CP & SKP
    SB --> NAV & TT & ROLE & USER

    style "Root Layout" fill:#f0fdf4,stroke:#22c55e
    style "Dashboard Layout" fill:#eff6ff,stroke:#3b82f6
    style "Sidebar Components" fill:#fefce8,stroke:#eab308
    style "Shared Components" fill:#fdf4ff,stroke:#a855f7
```

## Page Hierarchy

```mermaid
graph TD
    subgraph "Changes Section"
        HOME["/ — Overview Dashboard"]
        CHG["/changes — Change Requests"]
        IMP["/impact — Impact Analysis"]
        CODE["/code-analysis — Code Analysis"]
        RPT["/reports — Saved Reports"]
        ANA["/analytics — CHG Analytics"]
    end

    subgraph "Settings Section"
        INT["/settings/integrations — Integrations"]
        USR["/settings/users — User Management 🔒"]
        ACCT["/settings/account — My Account"]
    end

    subgraph "Auth Pages"
        LOGIN["/login"]
        REG["/register"]
    end

    style "Changes Section" fill:#dbeafe,stroke:#3b82f6
    style "Settings Section" fill:#fef3c7,stroke:#f59e0b
    style "Auth Pages" fill:#d1fae5,stroke:#10b981
```

## Data Hooks

```mermaid
graph LR
    subgraph "Custom Hooks"
        UD["useData()"]
        UA["useAnalytics(days)"]
        UP["usePermissions()"]
        UDB["useDebounce(value)"]
    end

    subgraph "Data Sources"
        API_DATA["/api/data"]
        API_ANA["/api/data/analytics"]
        SESSION["NextAuth Session"]
    end

    UD -->|SWR fetch| API_DATA
    UA -->|SWR fetch| API_ANA
    UP -->|useSession| SESSION

    subgraph "Pages Using Hooks"
        P1["Overview, Changes, Impact"]
        P2["Analytics"]
        P3["All pages with role checks"]
    end

    UD --> P1
    UA --> P2
    UP --> P3

    style "Custom Hooks" fill:#eff6ff,stroke:#3b82f6
    style "Data Sources" fill:#fef3c7,stroke:#f59e0b
    style "Pages Using Hooks" fill:#f0fdf4,stroke:#22c55e
```

## Component Inventory

| Component | File | Purpose |
|-----------|------|---------|
| `Card` | `components/card.tsx` | Container card with header/title/description |
| `CommandPalette` | `components/command-palette.tsx` | Keyboard-driven navigation (Cmd+K) |
| `PageHeader` | `components/page-header.tsx` | Consistent page title + subtitle |
| `RiskBadge` | `components/risk-badge.tsx` | Color-coded risk level pill |
| `RiskGauge` | `components/risk-gauge.tsx` | Visual risk score gauge |
| `SessionProvider` | `components/session-provider.tsx` | NextAuth session context wrapper |
| `Sidebar` | `components/sidebar.tsx` | Navigation sidebar with role badge |
| `Skeleton` | `components/skeleton.tsx` | Loading placeholder |
| `SkipToContent` | `components/skip-to-content.tsx` | Accessibility skip link |
| `StatusBadge` | `components/status-badge.tsx` | Change/validation status badge |
| `ThemeProvider` | `components/theme-provider.tsx` | Dark/light theme context |
| `ThemeToggle` | `components/theme-toggle.tsx` | Dark/light mode switch |
