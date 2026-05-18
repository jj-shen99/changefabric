#!/bin/bash
#
# Rollback Script for Change Request Management AI
# Usage: ./scripts/deploy/rollback.sh [backup_timestamp]
# If no timestamp provided, rolls back to the most recent backup
#

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
APP_NAME="change-management"
DEPLOY_DIR="${DEPLOY_DIR:-/opt/apps/${APP_NAME}}"
BACKUP_DIR="${BACKUP_DIR:-/opt/backups/${APP_NAME}}"
PM2_APP_NAME="${APP_NAME}"

# Get backup timestamp
BACKUP_TIMESTAMP="${1:-}"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Rollback: ${APP_NAME}${NC}"
echo -e "${BLUE}========================================${NC}"

# List available backups
echo -e "\n${BLUE}Available backups:${NC}"
if [[ -d "$BACKUP_DIR" ]]; then
    ls -lt "$BACKUP_DIR" | head -10
else
    echo -e "${RED}Error: No backups found at ${BACKUP_DIR}${NC}"
    exit 1
fi

# Select backup
if [[ -z "$BACKUP_TIMESTAMP" ]]; then
    BACKUP_TIMESTAMP=$(ls -t "$BACKUP_DIR" | head -1)
    echo -e "\n${YELLOW}No timestamp provided. Using most recent: ${BACKUP_TIMESTAMP}${NC}"
fi

BACKUP_PATH="${BACKUP_DIR}/${BACKUP_TIMESTAMP}"

if [[ ! -d "$BACKUP_PATH" ]]; then
    echo -e "${RED}Error: Backup not found at ${BACKUP_PATH}${NC}"
    exit 1
fi

echo -e "\n${YELLOW}Rolling back to: ${BACKUP_TIMESTAMP}${NC}"
read -p "Continue? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Rollback cancelled${NC}"
    exit 0
fi

# Stop application
echo -e "\n${BLUE}[1/4] Stopping application...${NC}"
if command -v pm2 &> /dev/null; then
    pm2 stop "$PM2_APP_NAME" || true
fi
echo -e "${GREEN}✓ Application stopped${NC}"

# Restore files
echo -e "\n${BLUE}[2/4] Restoring files...${NC}"
if [[ -d "$BACKUP_PATH/.next" ]]; then
    rm -rf "$DEPLOY_DIR/.next"
    cp -r "$BACKUP_PATH/.next" "$DEPLOY_DIR/.next"
    echo -e "${GREEN}✓ Build artifacts restored${NC}"
fi

# Restore database (if SQLite backup exists)
echo -e "\n${BLUE}[3/4] Restoring database...${NC}"
if [[ -f "$BACKUP_PATH/dev.db" ]]; then
    cp "$BACKUP_PATH/dev.db" "$DEPLOY_DIR/prisma/dev.db"
    echo -e "${GREEN}✓ Database restored${NC}"
else
    echo -e "${YELLOW}No database backup found (PostgreSQL requires manual restore)${NC}"
fi

# Restart application
echo -e "\n${BLUE}[4/4] Restarting application...${NC}"
if command -v pm2 &> /dev/null; then
    pm2 start "$PM2_APP_NAME"
    echo -e "${GREEN}✓ Application restarted${NC}"
else
    echo -e "${YELLOW}Start the application manually: npm start${NC}"
fi

# Health check
echo -e "\n${BLUE}Running health check...${NC}"
sleep 5
if [[ -n "${NEXTAUTH_URL:-}" ]]; then
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${NEXTAUTH_URL}/api/health" || echo "000")
    if [[ "$HTTP_STATUS" == "200" ]]; then
        echo -e "${GREEN}✓ Health check passed${NC}"
    else
        echo -e "${YELLOW}Warning: Health check returned HTTP $HTTP_STATUS${NC}"
    fi
fi

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}  Rollback complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "  Restored from: ${BACKUP_TIMESTAMP}"
