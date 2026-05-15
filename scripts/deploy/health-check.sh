#!/bin/bash
#
# Health Check Script for Change Request Management AI
# Usage: ./scripts/deploy/health-check.sh [url]
#

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

BASE_URL="${1:-http://localhost:3600}"

echo "Health Check: ${BASE_URL}"
echo "================================"

# Function to check endpoint
check_endpoint() {
    local name="$1"
    local url="$2"
    local expected="${3:-200}"
    
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$url" --max-time 10 || echo "000")
    
    if [[ "$HTTP_STATUS" == "$expected" ]]; then
        echo -e "${GREEN}✓${NC} $name (HTTP $HTTP_STATUS)"
        return 0
    else
        echo -e "${RED}✗${NC} $name (HTTP $HTTP_STATUS, expected $expected)"
        return 1
    fi
}

# Run checks
FAILED=0

check_endpoint "API Health" "${BASE_URL}/api/health" || ((FAILED++))
check_endpoint "Auth Endpoint" "${BASE_URL}/api/auth/session" || ((FAILED++))
check_endpoint "Data API" "${BASE_URL}/api/data" || ((FAILED++))
check_endpoint "Login Page" "${BASE_URL}/login" || ((FAILED++))

echo "================================"

if [[ $FAILED -eq 0 ]]; then
    echo -e "${GREEN}All health checks passed!${NC}"
    exit 0
else
    echo -e "${RED}${FAILED} health check(s) failed${NC}"
    exit 1
fi
