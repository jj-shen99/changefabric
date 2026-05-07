# Deployment Guide

## Prerequisites

- Node.js 18+
- npm 9+
- PostgreSQL (production) or SQLite (development)

## Local Development

```bash
# Clone and install
git clone https://github.com/jj-shen99/change-request-management-ai.git
cd change-request-management-ai
npm install

# Set up environment
cp .env.example .env
# Edit .env and set NEXTAUTH_SECRET to a secure random string

# Set up database (SQLite)
npm run db:push
npm run db:seed

# Start development server (port 3600)
npm run dev
```

Open [http://localhost:3600](http://localhost:3600)

## Environment Variables

```bash
# Required
NEXTAUTH_SECRET="your-secret-key-here"
NEXTAUTH_URL="http://localhost:3600"

# Database (SQLite for dev)
DATABASE_URL="file:./dev.db"

# Database (PostgreSQL for prod)
DATABASE_URL="postgresql://user:pass@host:5432/dbname?schema=public"

# Optional: LLM Provider
LLM_PROVIDER="openai"           # openai | anthropic | ollama | disabled
OPENAI_API_KEY="sk-..."
OPENAI_MODEL="gpt-4o-mini"

# Optional: Anthropic
ANTHROPIC_API_KEY="sk-ant-..."
ANTHROPIC_MODEL="claude-3-5-sonnet-20241022"

# Optional: Ollama (local)
OLLAMA_BASE_URL="http://localhost:11434"
OLLAMA_MODEL="llama3.2"

# Optional: ML Risk Model
ML_RISK_ENABLED="true"
```

## Production Deployment

### PostgreSQL Setup

```bash
# 1. Provision PostgreSQL (Docker example)
docker run -d --name change-mgmt-pg \
  -e POSTGRES_USER=changemgmt \
  -e POSTGRES_PASSWORD=secure-password \
  -e POSTGRES_DB=change_management \
  -p 5432:5432 postgres:16

# 2. Update .env
DATABASE_URL="postgresql://changemgmt:secure-password@localhost:5432/change_management?schema=public"

# 3. Apply schema and seed
npm run db:push
npm run db:seed

# 4. Build and start
npm run build
npm start
```

### Docker Deployment

```dockerfile
# Dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3600
CMD ["node", "server.js"]
```

```bash
# Build and run
docker build -t change-mgmt .
docker run -p 3600:3600 \
  -e DATABASE_URL="postgresql://..." \
  -e NEXTAUTH_SECRET="..." \
  change-mgmt
```

### Vercel Deployment

1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy

### Netlify Deployment

1. Connect your GitHub repository to Netlify
2. Build command: `npm run build`
3. Publish directory: `.next`
4. Set environment variables

## Database Operations

```bash
# Push schema changes
npm run db:push

# Seed with demo data
npm run db:seed

# Reset database (destructive)
npm run db:reset

# Generate Prisma client
npx prisma generate

# Open Prisma Studio (GUI)
npx prisma studio
```

## Scripts Reference

| Script | Description |
|--------|-------------|
| `npm run dev` | Start dev server (port 3600) |
| `npm run build` | Production build |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Fix lint issues |
| `npm run format` | Format with Prettier |
| `npm test` | Run tests |
| `npm run test:coverage` | Tests with coverage |
| `npm run typecheck` | TypeScript check |
| `npm run validate` | typecheck + lint + format |
| `npm run db:push` | Push Prisma schema |
| `npm run db:seed` | Seed database |
| `npm run db:reset` | Reset + re-seed |

## Health Checks

```bash
# API health
curl http://localhost:3600/api/health

# Database connectivity
curl http://localhost:3600/api/v2/changes?limit=1
```

## Troubleshooting

### Database Connection Issues

```bash
# Check DATABASE_URL format
# SQLite: file:./dev.db
# PostgreSQL: postgresql://user:pass@host:5432/db

# Regenerate Prisma client
npx prisma generate
```

### Authentication Issues

```bash
# Ensure NEXTAUTH_SECRET is set
# Ensure NEXTAUTH_URL matches your deployment URL
```

### Build Failures

```bash
# Clear cache and rebuild
rm -rf .next node_modules
npm install
npm run build
```
