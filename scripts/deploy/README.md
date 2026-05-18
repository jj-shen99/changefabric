# Production Deployment Scripts

This directory contains scripts and configuration for deploying the Change Management Platform to production.

## Quick Start

### Docker Compose (Recommended)

```bash
# Set required environment variables
export NEXTAUTH_SECRET="your-secure-secret-key"
export DB_PASSWORD="your-db-password"

# Start all services
docker-compose -f scripts/deploy/docker-compose.yml up -d

# View logs
docker-compose -f scripts/deploy/docker-compose.yml logs -f app

# Stop services
docker-compose -f scripts/deploy/docker-compose.yml down
```

### Manual Deployment

```bash
# Make scripts executable
chmod +x scripts/deploy/*.sh

# Deploy to staging
./scripts/deploy/deploy.sh staging

# Deploy to production
./scripts/deploy/deploy.sh production

# Rollback if needed
./scripts/deploy/rollback.sh
```

## Files

| File | Description |
|------|-------------|
| `deploy.sh` | Main deployment script with pre-checks, build, and restart |
| `rollback.sh` | Rollback to a previous backup |
| `health-check.sh` | Verify application health after deployment |
| `backup-db.sh` | Backup database (SQLite or PostgreSQL) |
| `docker-compose.yml` | Docker Compose configuration for full stack |
| `Dockerfile` | Multi-stage Docker build for production |
| `nginx.conf` | Nginx reverse proxy configuration |
| `init-db.sql` | PostgreSQL initialization script |

## Environment Variables

Create `.env.staging` and `.env.production` files:

```bash
# Required
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="https://your-domain.com"
DATABASE_URL="postgresql://user:pass@host:5432/dbname"

# Optional: LLM
LLM_PROVIDER="openai"
OPENAI_API_KEY="sk-..."

# Optional: Docker
DB_PASSWORD="your-db-password"
```

## Docker Services

The `docker-compose.yml` includes:

- **app**: Next.js application (port 3600)
- **db**: PostgreSQL 16 database
- **nginx**: Reverse proxy with SSL termination
- **redis**: Optional session caching (use `--profile with-redis`)

### SSL Setup

1. Place SSL certificates in `scripts/deploy/ssl/`:
   - `fullchain.pem`
   - `privkey.pem`

2. Or use Let's Encrypt:
   ```bash
   certbot certonly --webroot -w /var/www/certbot -d your-domain.com
   ```

## Deployment Workflow

1. **Pre-deployment checks**
   - Node.js version
   - Environment variables
   - Database connectivity

2. **Backup**
   - Current build artifacts
   - Database snapshot

3. **Build**
   - Install dependencies
   - TypeScript check
   - Lint
   - Run tests
   - Build application

4. **Database**
   - Run Prisma migrations

5. **Restart**
   - Restart application (PM2 or Docker)
   - Health check

6. **Cleanup**
   - Remove old backups

## Monitoring

### Health Checks

```bash
# Quick health check
./scripts/deploy/health-check.sh https://your-domain.com

# Docker health
docker-compose -f scripts/deploy/docker-compose.yml ps
```

### Logs

```bash
# Docker logs
docker-compose -f scripts/deploy/docker-compose.yml logs -f app

# PM2 logs
pm2 logs change-management
```

## Backup & Restore

### Backup

```bash
# Backup database
./scripts/deploy/backup-db.sh ./backups

# Docker backup
docker exec change-mgmt-db pg_dump -U changemgmt change_management > backup.sql
```

### Restore

```bash
# Restore from backup
./scripts/deploy/rollback.sh 20240515_120000

# Docker restore
docker exec -i change-mgmt-db psql -U changemgmt change_management < backup.sql
```

## Troubleshooting

### Application won't start

```bash
# Check logs
docker-compose logs app
pm2 logs

# Verify environment
docker-compose exec app env | grep -E "(DATABASE|NEXTAUTH)"
```

### Database connection issues

```bash
# Test connection
docker-compose exec db psql -U changemgmt -d change_management -c "SELECT 1"

# Check migrations
npx prisma migrate status
```

### SSL issues

```bash
# Verify certificates
openssl x509 -in scripts/deploy/ssl/fullchain.pem -text -noout

# Test SSL
curl -vI https://your-domain.com
```
