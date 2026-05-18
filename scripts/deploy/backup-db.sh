#!/bin/bash
#
# Database Backup Script for Change Management Platform
# Usage: ./scripts/deploy/backup-db.sh [output_dir]
#

set -euo pipefail

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

OUTPUT_DIR="${1:-./backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

mkdir -p "$OUTPUT_DIR"

echo -e "${BLUE}Database Backup${NC}"
echo "================================"

# Detect database type from DATABASE_URL
if [[ -z "${DATABASE_URL:-}" ]]; then
    echo "Error: DATABASE_URL not set"
    exit 1
fi

if [[ "$DATABASE_URL" == file:* ]]; then
    # SQLite backup
    DB_FILE="${DATABASE_URL#file:}"
    BACKUP_FILE="${OUTPUT_DIR}/sqlite_backup_${TIMESTAMP}.db"
    
    echo -e "${YELLOW}Backing up SQLite database...${NC}"
    cp "$DB_FILE" "$BACKUP_FILE"
    
    # Compress
    gzip "$BACKUP_FILE"
    BACKUP_FILE="${BACKUP_FILE}.gz"
    
    echo -e "${GREEN}✓ SQLite backup created: ${BACKUP_FILE}${NC}"
    
elif [[ "$DATABASE_URL" == postgresql:* ]]; then
    # PostgreSQL backup
    BACKUP_FILE="${OUTPUT_DIR}/postgres_backup_${TIMESTAMP}.sql"
    
    echo -e "${YELLOW}Backing up PostgreSQL database...${NC}"
    
    # Parse connection string
    # Format: postgresql://user:pass@host:port/dbname
    DB_USER=$(echo "$DATABASE_URL" | sed -n 's|postgresql://\([^:]*\):.*|\1|p')
    DB_HOST=$(echo "$DATABASE_URL" | sed -n 's|.*@\([^:]*\):.*|\1|p')
    DB_PORT=$(echo "$DATABASE_URL" | sed -n 's|.*:\([0-9]*\)/.*|\1|p')
    DB_NAME=$(echo "$DATABASE_URL" | sed -n 's|.*/\([^?]*\).*|\1|p')
    
    # Use pg_dump
    PGPASSWORD=$(echo "$DATABASE_URL" | sed -n 's|.*:\([^@]*\)@.*|\1|p') \
        pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        --no-owner --no-acl -F c -f "$BACKUP_FILE"
    
    # Compress if plain format
    if [[ -f "$BACKUP_FILE" ]]; then
        gzip "$BACKUP_FILE" 2>/dev/null || true
        [[ -f "${BACKUP_FILE}.gz" ]] && BACKUP_FILE="${BACKUP_FILE}.gz"
    fi
    
    echo -e "${GREEN}✓ PostgreSQL backup created: ${BACKUP_FILE}${NC}"
else
    echo "Error: Unsupported database type"
    exit 1
fi

# Show backup info
BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo ""
echo "Backup Details:"
echo "  File: $BACKUP_FILE"
echo "  Size: $BACKUP_SIZE"
echo "  Time: $(date)"

# Cleanup old backups (keep last 10)
echo ""
echo -e "${YELLOW}Cleaning up old backups (keeping last 10)...${NC}"
cd "$OUTPUT_DIR" && ls -t *.gz 2>/dev/null | tail -n +11 | xargs -r rm -f
echo -e "${GREEN}✓ Cleanup complete${NC}"
