#!/bin/bash
#
# Production Deployment Script for Change Request Management AI
# Usage: ./scripts/deploy/deploy.sh [environment]
# Environments: staging, production
#

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="change-request-management-ai"
DEPLOY_USER="${DEPLOY_USER:-deploy}"
DEPLOY_DIR="${DEPLOY_DIR:-/opt/apps/${APP_NAME}}"
BACKUP_DIR="${BACKUP_DIR:-/opt/backups/${APP_NAME}}"
LOG_DIR="${LOG_DIR:-/var/log/${APP_NAME}}"
NODE_VERSION="18"
PM2_APP_NAME="${APP_NAME}"

# Default environment
ENVIRONMENT="${1:-staging}"

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(staging|production)$ ]]; then
    echo -e "${RED}Error: Invalid environment '$ENVIRONMENT'. Use 'staging' or 'production'.${NC}"
    exit 1
fi

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Deploying to: ${YELLOW}${ENVIRONMENT}${NC}"
echo -e "${BLUE}========================================${NC}"

# Load environment-specific config
ENV_FILE=".env.${ENVIRONMENT}"
if [[ -f "$ENV_FILE" ]]; then
    echo -e "${GREEN}Loading environment from ${ENV_FILE}${NC}"
    export $(grep -v '^#' "$ENV_FILE" | xargs)
else
    echo -e "${YELLOW}Warning: ${ENV_FILE} not found, using default .env${NC}"
fi

# Pre-deployment checks
echo -e "\n${BLUE}[1/8] Running pre-deployment checks...${NC}"

# Check Node.js version
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is not installed${NC}"
    exit 1
fi

NODE_CURRENT=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [[ "$NODE_CURRENT" -lt "$NODE_VERSION" ]]; then
    echo -e "${RED}Error: Node.js ${NODE_VERSION}+ required (found v${NODE_CURRENT})${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Node.js v$(node -v)${NC}"

# Check npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}Error: npm is not installed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ npm v$(npm -v)${NC}"

# Check required environment variables
REQUIRED_VARS=("DATABASE_URL" "NEXTAUTH_SECRET" "NEXTAUTH_URL")
for var in "${REQUIRED_VARS[@]}"; do
    if [[ -z "${!var:-}" ]]; then
        echo -e "${RED}Error: Required environment variable $var is not set${NC}"
        exit 1
    fi
done
echo -e "${GREEN}✓ Required environment variables set${NC}"

# Create backup
echo -e "\n${BLUE}[2/8] Creating backup...${NC}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_PATH="${BACKUP_DIR}/${TIMESTAMP}"
mkdir -p "$BACKUP_PATH"

if [[ -d "$DEPLOY_DIR" ]]; then
    # Backup current deployment
    cp -r "$DEPLOY_DIR/.next" "$BACKUP_PATH/.next" 2>/dev/null || true
    cp "$DEPLOY_DIR/package.json" "$BACKUP_PATH/" 2>/dev/null || true
    
    # Backup database (if SQLite)
    if [[ -f "$DEPLOY_DIR/prisma/dev.db" ]]; then
        cp "$DEPLOY_DIR/prisma/dev.db" "$BACKUP_PATH/dev.db"
    fi
    echo -e "${GREEN}✓ Backup created at ${BACKUP_PATH}${NC}"
else
    echo -e "${YELLOW}No existing deployment to backup${NC}"
fi

# Install dependencies
echo -e "\n${BLUE}[3/8] Installing dependencies...${NC}"
npm ci --production=false
echo -e "${GREEN}✓ Dependencies installed${NC}"

# Run type checking
echo -e "\n${BLUE}[4/8] Running type check...${NC}"
npm run typecheck || {
    echo -e "${RED}Error: TypeScript type check failed${NC}"
    exit 1
}
echo -e "${GREEN}✓ Type check passed${NC}"

# Run linting
echo -e "\n${BLUE}[5/8] Running linter...${NC}"
npm run lint || {
    echo -e "${YELLOW}Warning: Linting issues found (continuing deployment)${NC}"
}
echo -e "${GREEN}✓ Linting complete${NC}"

# Run tests (optional in staging, required in production)
echo -e "\n${BLUE}[6/8] Running tests...${NC}"
if [[ "$ENVIRONMENT" == "production" ]]; then
    npm test || {
        echo -e "${RED}Error: Tests failed. Aborting production deployment.${NC}"
        exit 1
    }
    echo -e "${GREEN}✓ All tests passed${NC}"
else
    npm test || {
        echo -e "${YELLOW}Warning: Some tests failed (continuing staging deployment)${NC}"
    }
fi

# Build application
echo -e "\n${BLUE}[7/8] Building application...${NC}"
npm run build || {
    echo -e "${RED}Error: Build failed${NC}"
    exit 1
}
echo -e "${GREEN}✓ Build successful${NC}"

# Database migrations
echo -e "\n${BLUE}[8/8] Running database migrations...${NC}"
npx prisma db push --accept-data-loss=false || {
    echo -e "${RED}Error: Database migration failed${NC}"
    exit 1
}
echo -e "${GREEN}✓ Database migrations complete${NC}"

# Restart application
echo -e "\n${BLUE}Restarting application...${NC}"
if command -v pm2 &> /dev/null; then
    pm2 restart "$PM2_APP_NAME" --update-env || pm2 start npm --name "$PM2_APP_NAME" -- start
    echo -e "${GREEN}✓ Application restarted with PM2${NC}"
else
    echo -e "${YELLOW}PM2 not found. Start the application manually:${NC}"
    echo -e "  npm start"
fi

# Health check
echo -e "\n${BLUE}Running health check...${NC}"
sleep 5
HEALTH_URL="${NEXTAUTH_URL}/api/health"
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_URL" || echo "000")

if [[ "$HTTP_STATUS" == "200" ]]; then
    echo -e "${GREEN}✓ Health check passed (HTTP $HTTP_STATUS)${NC}"
else
    echo -e "${YELLOW}Warning: Health check returned HTTP $HTTP_STATUS${NC}"
fi

# Cleanup old backups (keep last 5)
echo -e "\n${BLUE}Cleaning up old backups...${NC}"
cd "$BACKUP_DIR" && ls -t | tail -n +6 | xargs -r rm -rf
echo -e "${GREEN}✓ Old backups cleaned${NC}"

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}  Deployment to ${ENVIRONMENT} complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "  URL: ${NEXTAUTH_URL}"
echo -e "  Backup: ${BACKUP_PATH}"
echo -e "  Logs: ${LOG_DIR}"
