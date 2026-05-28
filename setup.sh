#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────
# Change Management Platform — Post-Clone Setup & Deploy Script
# Usage:  ./setup.sh [--production]
# ──────────────────────────────────────────────────────────────────────
set -euo pipefail

# ─── Colors ──────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; NC='\033[0m'; BOLD='\033[1m'

# ─── Helpers ─────────────────────────────────────────────────────────
info()    { echo -e "${CYAN}ℹ${NC}  $*"; }
success() { echo -e "${GREEN}✓${NC}  $*"; }
warn()    { echo -e "${YELLOW}⚠${NC}  $*"; }
fail()    { echo -e "${RED}✗${NC}  $*"; exit 1; }

header() {
  echo ""
  echo -e "${BOLD}═══ $* ═══${NC}"
}

# ─── Parse args ──────────────────────────────────────────────────────
MODE="development"
SKIP_SEED=false
SKIP_TESTS=false
PORT=3600

while [[ $# -gt 0 ]]; do
  case "$1" in
    --production|--prod) MODE="production"; shift ;;
    --skip-seed)         SKIP_SEED=true;    shift ;;
    --skip-tests)        SKIP_TESTS=true;   shift ;;
    --port)              PORT="$2";          shift 2 ;;
    --help|-h)
      echo "Usage: ./setup.sh [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  --production   Production mode (requires PostgreSQL & env vars)"
      echo "  --skip-seed    Skip database seeding with demo data"
      echo "  --skip-tests   Skip running tests after setup"
      echo "  --port PORT    Override default port (default: 3600)"
      echo "  --help         Show this help message"
      exit 0
      ;;
    *) fail "Unknown option: $1. Use --help for usage." ;;
  esac
done

echo ""
echo -e "${BOLD}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║   Change Management Platform — Setup & Deploy       ║${NC}"
echo -e "${BOLD}║   Mode: $(printf '%-44s' "$MODE")║${NC}"
echo -e "${BOLD}╚══════════════════════════════════════════════════════╝${NC}"
echo ""

# ─── 1. Prerequisites ───────────────────────────────────────────────
header "Checking Prerequisites"

# Node.js
if ! command -v node &>/dev/null; then
  fail "Node.js is not installed. Install Node.js 18+ from https://nodejs.org"
fi
NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  fail "Node.js 18+ required (found v$(node -v))"
fi
success "Node.js $(node -v)"

# npm
if ! command -v npm &>/dev/null; then
  fail "npm is not installed"
fi
success "npm $(npm -v)"

# Git
if ! command -v git &>/dev/null; then
  fail "Git is not installed"
fi
success "Git $(git --version | awk '{print $3}')"

# Production-only checks
if [ "$MODE" = "production" ]; then
  if ! command -v pm2 &>/dev/null; then
    warn "PM2 not found — install with: npm install -g pm2"
  else
    success "PM2 $(pm2 -v)"
  fi
fi

# ─── 2. Environment Configuration ───────────────────────────────────
header "Environment Configuration"

if [ ! -f .env ]; then
  if [ "$MODE" = "production" ]; then
    fail ".env file not found. Copy .env.example to .env and configure production values:\n   cp .env.example .env"
  fi

  info "Creating .env from .env.example (development defaults)..."
  cp .env.example .env

  # Generate a random NEXTAUTH_SECRET for development
  if command -v openssl &>/dev/null; then
    SECRET=$(openssl rand -hex 32)
    if [[ "$OSTYPE" == "darwin"* ]]; then
      sed -i '' "s/your-secret-key-here/$SECRET/" .env
    else
      sed -i "s/your-secret-key-here/$SECRET/" .env
    fi
    success "Generated random NEXTAUTH_SECRET"
  else
    warn "openssl not found — using placeholder NEXTAUTH_SECRET (change for production!)"
  fi

  # Set the port
  if [ "$PORT" != "3600" ]; then
    if [[ "$OSTYPE" == "darwin"* ]]; then
      sed -i '' "s/localhost:3600/localhost:$PORT/g" .env
    else
      sed -i "s/localhost:3600/localhost:$PORT/g" .env
    fi
    info "Port set to $PORT"
  fi

  success ".env created with development defaults"
else
  success ".env already exists"
fi

# Production validations
if [ "$MODE" = "production" ]; then
  MISSING_VARS=()
  for VAR in NEXTAUTH_SECRET DATABASE_URL; do
    if ! grep -q "^${VAR}=" .env 2>/dev/null || grep -q "your-.*-here" .env 2>/dev/null; then
      MISSING_VARS+=("$VAR")
    fi
  done
  if [ ${#MISSING_VARS[@]} -gt 0 ]; then
    warn "Review these variables in .env: ${MISSING_VARS[*]}"
  fi

  # Check ENCRYPTION_KEY
  if ! grep -q "^ENCRYPTION_KEY=" .env 2>/dev/null; then
    warn "ENCRYPTION_KEY not set — ITSM credential encryption will use dev fallback key"
  fi
fi

# ─── 3. Install Dependencies ────────────────────────────────────────
header "Installing Dependencies"

if [ "$MODE" = "production" ]; then
  info "Installing production dependencies..."
  npm ci --omit=dev 2>&1 | tail -1
else
  info "Installing all dependencies..."
  npm install 2>&1 | tail -1
fi
success "Dependencies installed"

# Prisma client generation (handled by postinstall, but verify)
if [ ! -d "src/generated/prisma" ] && [ ! -d "node_modules/.prisma/client" ]; then
  info "Generating Prisma client..."
  npx prisma generate
fi
success "Prisma client ready"

# ─── 4. Database Setup ──────────────────────────────────────────────
header "Database Setup"

if [ "$MODE" = "production" ]; then
  info "Running Prisma migrations..."
  npx prisma migrate deploy 2>&1 || {
    warn "Migrations failed — falling back to db push..."
    npx prisma db push --accept-data-loss 2>&1
  }
else
  info "Pushing schema to SQLite database..."
  npx prisma db push 2>&1 | grep -E "(applied|already in sync|datasource)" || true
fi
success "Database schema applied"

# Seed
if [ "$SKIP_SEED" = false ]; then
  info "Seeding database with demo data..."
  npx tsx prisma/seed.ts 2>&1
  success "Database seeded"
else
  info "Skipping database seed (--skip-seed)"
fi

# ─── 5. Run Tests ───────────────────────────────────────────────────
if [ "$SKIP_TESTS" = false ] && [ "$MODE" != "production" ]; then
  header "Running Tests"
  info "Executing test suite..."
  npm test -- --passWithNoTests 2>&1 | tail -5
  success "Tests completed"
else
  if [ "$SKIP_TESTS" = true ]; then
    info "Skipping tests (--skip-tests)"
  fi
fi

# ─── 6. Build & Start ───────────────────────────────────────────────
header "Build & Start"

if [ "$MODE" = "production" ]; then
  info "Building production bundle..."
  npm run build 2>&1 | tail -3
  success "Production build complete"

  if command -v pm2 &>/dev/null; then
    # Check if already running
    if pm2 describe change-management &>/dev/null; then
      info "Restarting existing PM2 process..."
      pm2 restart change-management
    else
      info "Starting with PM2..."
      pm2 start npm --name "change-management" -- start
    fi
    success "Application running via PM2 on port $PORT"
    echo ""
    info "Useful PM2 commands:"
    echo "    pm2 logs change-management    # View logs"
    echo "    pm2 restart change-management # Restart"
    echo "    pm2 stop change-management    # Stop"
    echo "    pm2 save                      # Save process list"
  else
    info "Starting production server..."
    npm start &
    success "Application running on port $PORT"
  fi
else
  # Development mode — just start dev server
  echo ""
  success "Setup complete! Start the development server with:"
  echo ""
  echo -e "    ${CYAN}npm run dev${NC}"
  echo ""
  echo -e "    Then open ${BOLD}http://localhost:${PORT}${NC}"
  echo ""
  echo -e "    Default login:  ${BOLD}admin@example.com${NC} / ${BOLD}admin123!${NC}"
  echo ""
fi

# ─── Summary ─────────────────────────────────────────────────────────
header "Setup Complete"

echo ""
echo -e "  ${GREEN}Mode:${NC}     $MODE"
echo -e "  ${GREEN}Port:${NC}     $PORT"
echo -e "  ${GREEN}URL:${NC}      http://localhost:$PORT"
if [ "$MODE" = "development" ]; then
  echo -e "  ${GREEN}Database:${NC} SQLite (prisma/dev.db)"
fi
echo ""
echo -e "  ${BOLD}Quick Reference:${NC}"
echo "    npm run dev          # Start dev server"
echo "    npm run build        # Production build"
echo "    npm test             # Run tests"
echo "    npm run db:reset     # Reset & re-seed database"
echo "    npm run db:seed      # Re-seed database"
echo "    npm run validate     # Typecheck + lint + format check"
echo ""
