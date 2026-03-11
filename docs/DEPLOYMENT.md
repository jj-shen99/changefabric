# Deployment Guide — Change & Release Dashboard

> **Version**: 1.1.0
> **Last Updated**: March 11, 2026

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Local Development Setup](#2-local-development-setup)
3. [Environment Configuration](#3-environment-configuration)
4. [Database Setup](#4-database-setup)
5. [ServiceNow Integration](#5-servicenow-integration)
6. [Production Build](#6-production-build)
7. [Deployment Options](#7-deployment-options)
8. [Post-Deployment Verification](#8-post-deployment-verification)
9. [Maintenance & Operations](#9-maintenance--operations)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. Prerequisites

| Requirement | Minimum Version | Notes |
|-------------|----------------|-------|
| **Node.js** | 18.0+ | LTS recommended (20.x or 22.x) |
| **npm** | 9.0+ | Bundled with Node.js |
| **Git** | 2.30+ | For cloning the repository |
| **Disk Space** | 500 MB | For node_modules + SQLite DB |

Optional (for ServiceNow sync):
- Access to a ServiceNow instance with `change_request` table API enabled
- ServiceNow credentials with read access to the change_request table

---

## 2. Local Development Setup

### 2.1 Clone and Install

```bash
git clone <repo-url>
cd release_change_ai
npm install
```

The `postinstall` script automatically runs `prisma generate` to create the Prisma client.

### 2.2 Start Development Server

```bash
# Initialize the database
npm run db:push
npm run db:seed

# Start the dev server (port 3600)
npm run dev
```

Open [http://localhost:3600](http://localhost:3600) in your browser.

### 2.3 Demo Accounts

The seed script creates three demo users:

| Email | Password | Role |
|-------|----------|------|
| `admin@company.com` | `password123` | Admin |
| `manager@company.com` | `password123` | Manager |
| `viewer@company.com` | `password123` | Viewer |

> ⚠️ **Change these credentials before any production deployment.**

---

## 3. Environment Configuration

### 3.1 Create Environment File

```bash
cp .env.example .env
```

### 3.2 Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | Prisma database connection string | `file:./dev.db` |
| `NEXTAUTH_SECRET` | Secret key for JWT signing (min 32 chars) | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Full URL of the deployed application | `http://localhost:3600` |

### 3.3 Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_APP_NAME` | Application display name | `Change & Release Dashboard` |
| `NEXT_PUBLIC_APP_URL` | Public-facing URL | `http://localhost:3600` |
| `SNOW_INSTANCE` | ServiceNow instance URL | `https://your-instance.service-now.com` |
| `SNOW_USER` | ServiceNow API username | `admin` |
| `SNOW_PASSWORD` | ServiceNow API password | _(none)_ |
| `NEXT_PUBLIC_ENABLE_ANALYTICS` | Enable analytics features | `false` |
| `NEXT_PUBLIC_ENABLE_NOTIFICATIONS` | Enable notifications | `false` |

### 3.4 Generate a Secure Secret

```bash
# Using openssl
openssl rand -base64 32

# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

---

## 4. Database Setup

### 4.1 SQLite (Default — Development & Small Deployments)

SQLite requires no external database server. The database file is stored at `prisma/dev.db`.

```bash
# Push schema to database (creates tables)
npm run db:push

# Seed with demo data
npm run db:seed

# Full reset (drops all data and re-seeds)
npm run db:reset
```

### 4.2 Switching to PostgreSQL (Production Recommended)

1. **Update `prisma/schema.prisma`**:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

2. **Update `.env`**:
```env
DATABASE_URL="postgresql://user:password@host:5432/change_dashboard?schema=public"
```

3. **Regenerate client and push schema**:
```bash
npx prisma generate
npm run db:push
```

### 4.3 Switching to MySQL

1. **Update `prisma/schema.prisma`**:
```prisma
datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}
```

2. **Update `.env`**:
```env
DATABASE_URL="mysql://user:password@host:3306/change_dashboard"
```

3. **Regenerate and push**:
```bash
npx prisma generate
npm run db:push
```

---

## 5. ServiceNow Integration

### 5.1 Configuration

Set the following environment variables to connect to your ServiceNow instance:

```env
SNOW_INSTANCE=https://your-instance.service-now.com
SNOW_USER=api_user
SNOW_PASSWORD=api_password
```

### 5.2 Sync Methods

**Method A — CLI Import Script** (one-time or cron):
```bash
npx tsx scripts/import-servicenow.ts
```

**Method B — API-Triggered Sync** (from the UI):
- Click the **"Pull Data"** button on the Change Requests page
- This calls `POST /api/sync` which fetches all change requests from ServiceNow and upserts them into the local database

### 5.3 What Gets Synced

- All records from the `change_request` table
- All 90+ fields are stored verbatim (display values for reference fields)
- Paginated fetch (100 records per page) to handle large datasets
- Upsert logic: existing records are updated, new records are created

### 5.4 Running Without ServiceNow

The application works fully with seeded demo data. The ServiceNow connection is optional. Use `npm run db:seed` to populate the database with sample change requests.

---

## 6. Production Build

### 6.1 Build

```bash
# Run all quality checks
npm run validate

# Build for production
npm run build
```

This creates an optimized production bundle in `.next/`.

### 6.2 Start Production Server

```bash
npm run start
```

The production server runs on **port 3600** by default.

### 6.3 Custom Port

To change the port, update both:
- `package.json` → `scripts.dev` and `scripts.start`
- `next.config.js` → `env.PORT`
- `.env` → `NEXTAUTH_URL` (must match)

---

## 7. Deployment Options

### 7.1 Vercel (Recommended for Next.js)

1. Push your code to GitHub/GitLab/Bitbucket
2. Import the project in [Vercel Dashboard](https://vercel.com/new)
3. Set environment variables in Vercel project settings:
   - `DATABASE_URL` — use a cloud database (PostgreSQL recommended)
   - `NEXTAUTH_SECRET` — generate a secure secret
   - `NEXTAUTH_URL` — your Vercel deployment URL
4. Deploy

> ⚠️ Vercel's serverless functions don't support SQLite. **Switch to PostgreSQL** (e.g., Vercel Postgres, Neon, Supabase) before deploying.

### 7.2 Docker

Create a `Dockerfile`:

```dockerfile
FROM node:20-alpine AS base

# Install dependencies
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Build
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

# Production
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

EXPOSE 3600
ENV PORT=3600

CMD ["node", "server.js"]
```

Build and run:

```bash
docker build -t change-dashboard .
docker run -p 3600:3600 \
  -e DATABASE_URL="file:./dev.db" \
  -e NEXTAUTH_SECRET="your-secret" \
  -e NEXTAUTH_URL="http://localhost:3600" \
  change-dashboard
```

> **Note**: For Docker + SQLite, mount a volume for the database to persist data:
> ```bash
> docker run -v $(pwd)/data:/app/prisma -p 3600:3600 ... change-dashboard
> ```

### 7.3 Traditional Server (PM2)

```bash
# Install PM2 globally
npm install -g pm2

# Build the application
npm run build

# Start with PM2
pm2 start npm --name "change-dashboard" -- start

# Auto-restart on crash
pm2 save
pm2 startup
```

### 7.4 Netlify

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Build and deploy
npm run build
netlify deploy --prod
```

> ⚠️ Like Vercel, Netlify requires a cloud database (not SQLite).

---

## 8. Post-Deployment Verification

### 8.1 Health Check Checklist

| Check | How to Verify |
|-------|--------------|
| Application loads | Visit the root URL → login page appears |
| Authentication works | Login with demo credentials |
| Database connection | Navigate to Change Requests page → data loads |
| API endpoints | `GET /api/data` returns JSON with `changeRequests` array |
| Dark mode | Toggle theme → persists across page refresh |
| ServiceNow sync | Click "Pull Data" → toast shows success/failure |
| Impact Analysis tabs | Navigate to Impact → all 4 tabs render correctly (Overview, Plan Analysis, ML Analysis, Code Change) |
| Analytics tabs | Navigate to Analytics → all 4 tabs render (Failure Analysis, Velocity, Metrics & Trends, Change Health) |
| ML Analysis | Select a CR in ML Analysis tab → quality scores, radar chart, and recommendations display |

### 8.2 Automated Checks

```bash
# Run unit tests
npm test

# Run linter
npm run lint

# Type check
npm run typecheck

# Full validation suite
npm run validate
```

---

## 9. Maintenance & Operations

### 9.1 Database Backup (SQLite)

```bash
# Simple file copy
cp prisma/dev.db prisma/dev.db.backup

# With timestamp
cp prisma/dev.db "prisma/backup-$(date +%Y%m%d-%H%M%S).db"
```

### 9.2 Database Reset

```bash
# ⚠️ Destroys all data
npm run db:reset
```

### 9.3 Updating Dependencies

```bash
# Check for outdated packages
npm outdated

# Update packages
npm update

# Regenerate Prisma client after updates
npx prisma generate
```

### 9.4 Schema Migrations

When the Prisma schema changes:

```bash
# Development: push schema directly
npm run db:push

# Production: use migrations
npx prisma migrate dev --name describe_change
npx prisma migrate deploy
```

### 9.5 Log Monitoring

- **Development**: Console output from `npm run dev`
- **Production (PM2)**: `pm2 logs change-dashboard`
- **Docker**: `docker logs <container-id>`

### 9.6 Scheduled ServiceNow Sync

Set up a cron job for automatic data refresh:

```bash
# Every 15 minutes
*/15 * * * * cd /path/to/release_change_ai && npx tsx scripts/import-servicenow.ts >> /var/log/snow-sync.log 2>&1
```

---

## 10. Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|-------|-------|---------|
| `NEXTAUTH_SECRET missing` | Environment variable not set | Add `NEXTAUTH_SECRET` to `.env` |
| `PrismaClientInitializationError` | Database file missing or schema mismatch | Run `npm run db:push` |
| `401 Unauthorized` on API calls | Session expired or missing | Clear cookies, log in again |
| `EADDRINUSE: port 3600` | Port already in use | Kill the existing process: `lsof -ti:3600 \| xargs kill -9` |
| ServiceNow sync fails | Wrong credentials or instance URL | Verify `SNOW_INSTANCE`, `SNOW_USER`, `SNOW_PASSWORD` in `.env` |
| Blank page after deploy | Missing environment variables | Ensure all required env vars are set in deployment platform |
| Prisma type errors in IDE | Stale generated client | Run `npx prisma generate` |
| SQLite locked error | Concurrent write access | Use PostgreSQL for multi-instance deployments |

### Reset Everything

```bash
# Nuclear option: reset DB, reinstall deps, rebuild
rm -rf node_modules .next prisma/dev.db
npm install
npm run db:push
npm run db:seed
npm run build
npm run start
```

---

## Appendix: Port Configuration

The application runs on **port 3600** by default. This is configured in three places:

| File | Setting |
|------|---------|
| `package.json` | `scripts.dev` → `--port 3600`, `scripts.start` → `--port 3600` |
| `next.config.js` | `env.PORT` → `"3600"` |
| `.env` | `NEXTAUTH_URL` → `http://localhost:3600` |

All three must be updated if you change the port.
