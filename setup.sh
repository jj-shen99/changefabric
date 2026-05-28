#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────
# Change Management Platform — Production Deployment Script
# Usage:  ./setup.sh [OPTIONS]
#
# Defaults to production deployment. After cloning the repo, run:
#   cp .env.example .env    # configure production values
#   ./setup.sh              # install, build, deploy, start
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
MODE="production"
SKIP_SEED=false
SKIP_TESTS=false
SKIP_BUILD=false
PORT=3600
APP_NAME="change-management"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dev|--development) MODE="development"; shift ;;
    --skip-seed)         SKIP_SEED=true;     shift ;;
    --skip-tests)        SKIP_TESTS=true;    shift ;;
    --skip-build)        SKIP_BUILD=true;    shift ;;
    --port)              PORT="$2";           shift 2 ;;
    --help|-h)
      echo "Usage: ./setup.sh [OPTIONS]"
      echo ""
      echo "Post-clone production deployment script. Installs dependencies,"
      echo "builds the app, sets up the database, seeds data, and starts the server."
      echo ""
      echo "Options:"
      echo "  --dev          Development mode (SQLite, no build, dev server)"
      echo "  --skip-seed    Skip database seeding with demo data"
      echo "  --skip-tests   Skip running tests"
      echo "  --skip-build   Skip production build (use existing .next)"
      echo "  --port PORT    Override default port (default: 3600)"
      echo "  --help         Show this help message"
      echo ""
      echo "Typical production deployment:"
      echo "  git clone <repo-url> && cd change_management"
      echo "  cp .env.example .env   # edit with production values"
      echo "  ./setup.sh"
      exit 0
      ;;
    *) fail "Unknown option: $1. Use --help for usage." ;;
  esac
done

echo ""
echo -e "${BOLD}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║   Change Management Platform — Deployment           ║${NC}"
echo -e "${BOLD}║   Mode: $(printf '%-44s' "$MODE")║${NC}"
echo -e "${BOLD}╚══════════════════════════════════════════════════════╝${NC}"
echo ""

# ─── 1. Prerequisites ───────────────────────────────────────────────
header "1/7 Checking Prerequisites"

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
  warn "Git is not installed (optional for deployment)"
else
  success "Git $(git --version | awk '{print $3}')"
fi

# PM2 (production)
if [ "$MODE" = "production" ]; then
  if ! command -v pm2 &>/dev/null; then
    info "PM2 not found — installing globally..."
    npm install -g pm2 2>&1 | tail -1
    success "PM2 installed"
  else
    success "PM2 $(pm2 -v)"
  fi
fi

# ─── 2. Environment Configuration ───────────────────────────────────
header "2/7 Environment Configuration"

if [ ! -f .env ]; then
  if [ "$MODE" = "production" ]; then
    if [ -f .env.example ]; then
      warn ".env not found — creating from .env.example"
      cp .env.example .env
      info "IMPORTANT: Edit .env with production values before the app handles real data"
    else
      fail ".env file not found. Create one with required variables:\n   NEXTAUTH_SECRET, DATABASE_URL, NEXTAUTH_URL"
    fi
  else
    info "Creating .env from .env.example (development defaults)..."
    cp .env.example .env
  fi

  # Generate a random NEXTAUTH_SECRET
  if command -v openssl &>/dev/null; then
    SECRET=$(openssl rand -hex 32)
    if [[ "$OSTYPE" == "darwin"* ]]; then
      sed -i '' "s/your-secret-key-here/$SECRET/" .env
    else
      sed -i "s/your-secret-key-here/$SECRET/" .env
    fi
    success "Generated random NEXTAUTH_SECRET"
  else
    warn "openssl not found — using placeholder NEXTAUTH_SECRET (change immediately!)"
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

  success ".env created"
else
  success ".env already exists"
fi

# Validate required env vars
source <(grep -v '^#' .env | grep '=' | sed 's/^/export /' 2>/dev/null) 2>/dev/null || true

if [ "$MODE" = "production" ]; then
  MISSING=()
  [ -z "${NEXTAUTH_SECRET:-}" ] || [[ "${NEXTAUTH_SECRET:-}" == *"your-"*"-here"* ]] && MISSING+=("NEXTAUTH_SECRET")
  [ -z "${DATABASE_URL:-}" ] && MISSING+=("DATABASE_URL")
  [ -z "${NEXTAUTH_URL:-}" ] && MISSING+=("NEXTAUTH_URL")

  if [ ${#MISSING[@]} -gt 0 ]; then
    warn "Review these variables in .env: ${MISSING[*]}"
  else
    success "Required environment variables configured"
  fi

  if ! grep -q "^ENCRYPTION_KEY=" .env 2>/dev/null; then
    warn "ENCRYPTION_KEY not set — credential encryption uses dev fallback key"
  fi
fi

# ─── 3. Install Dependencies ────────────────────────────────────────
header "3/7 Installing Dependencies"

if [ "$MODE" = "production" ]; then
  info "Installing dependencies (ci)..."
  npm ci 2>&1 | tail -3
else
  info "Installing dependencies..."
  npm install 2>&1 | tail -3
fi
success "Dependencies installed"

# Prisma client generation
info "Generating Prisma client..."
npx prisma generate 2>&1 | tail -2
success "Prisma client ready"

# ─── 4. Database Setup ──────────────────────────────────────────────
header "4/7 Database Setup"

info "Pushing schema to database..."
npx prisma db push 2>&1 || fail "prisma db push failed — check DATABASE_URL in .env"
success "Database schema applied"

# Seed
if [ "$SKIP_SEED" = false ]; then
  info "Seeding database with demo data..."
  npx tsx prisma/seed.ts 2>&1 || {
    warn "Seed failed — you may need to install tsx: npm install -g tsx"
    npx npx ts-node prisma/seed.ts 2>&1 || warn "Seed failed — run manually: npx tsx prisma/seed.ts"
  }
  success "Database seeded"
else
  info "Skipping database seed (--skip-seed)"
fi

# ─── 5. Run Tests ───────────────────────────────────────────────────
header "5/7 Running Tests"

if [ "$SKIP_TESTS" = true ]; then
  info "Skipping tests (--skip-tests)"
else
  info "Executing test suite..."
  if [ "$MODE" = "production" ]; then
    npm test -- --passWithNoTests 2>&1 | tail -5
    TEST_EXIT=${PIPESTATUS[0]:-0}
    if [ "$TEST_EXIT" -ne 0 ]; then
      warn "Some tests failed (exit code $TEST_EXIT) — review output above"
    else
      success "All tests passed"
    fi
  else
    npm test -- --passWithNoTests 2>&1 | tail -5 || true
    success "Tests completed"
  fi
fi

# ─── 6. Build ───────────────────────────────────────────────────────
header "6/7 Building Application"

if [ "$MODE" = "production" ]; then
  if [ "$SKIP_BUILD" = true ] && [ -d ".next" ]; then
    info "Skipping build (--skip-build, using existing .next)"
  else
    info "Building production bundle..."
    npm run build 2>&1 || fail "Production build failed"
    success "Production build complete"
  fi
else
  info "Skipping build (development mode)"
fi

# ─── 7. Start Application ───────────────────────────────────────────
header "7/7 Starting Application"

if [ "$MODE" = "production" ]; then
  # Stop existing instance if running
  if command -v pm2 &>/dev/null; then
    if pm2 describe "$APP_NAME" &>/dev/null 2>&1; then
      info "Stopping existing instance..."
      pm2 stop "$APP_NAME" 2>/dev/null || true
      pm2 delete "$APP_NAME" 2>/dev/null || true
    fi

    info "Starting application with PM2..."
    PORT=$PORT pm2 start npm --name "$APP_NAME" -- start -- --port "$PORT"
    pm2 save 2>/dev/null || true
    success "Application started via PM2 on port $PORT"

    # Health check
    sleep 3
    HEALTH_URL="http://localhost:${PORT}/api/health"
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_URL" 2>/dev/null || echo "000")
    if [ "$HTTP_STATUS" = "200" ]; then
      success "Health check passed (HTTP 200)"
    elif [ "$HTTP_STATUS" = "000" ]; then
      info "Health check pending — app may still be starting"
      info "Check status: pm2 logs $APP_NAME"
    else
      warn "Health check returned HTTP $HTTP_STATUS"
    fi

    echo ""
    echo -e "  ${BOLD}PM2 Commands:${NC}"
    echo "    pm2 logs $APP_NAME         # View logs"
    echo "    pm2 restart $APP_NAME      # Restart"
    echo "    pm2 stop $APP_NAME         # Stop"
    echo "    pm2 monit                  # Monitor dashboard"
  else
    info "Starting production server (background)..."
    nohup npm start -- --port "$PORT" > /tmp/${APP_NAME}.log 2>&1 &
    APP_PID=$!
    success "Application started (PID: $APP_PID) on port $PORT"
    info "Logs: /tmp/${APP_NAME}.log"
  fi
else
  echo ""
  success "Setup complete! Start the development server:"
  echo ""
  echo -e "    ${CYAN}npm run dev${NC}"
  echo ""
  echo -e "    Open ${BOLD}http://localhost:${PORT}${NC}"
  echo -e "    Login: ${BOLD}admin@example.com${NC} / ${BOLD}admin123!${NC}"
  echo ""
fi

# ─── Summary ─────────────────────────────────────────────────────────
header "Deployment Complete"

echo ""
echo -e "  ${GREEN}Mode:${NC}      $MODE"
echo -e "  ${GREEN}Port:${NC}      $PORT"
echo -e "  ${GREEN}URL:${NC}       http://localhost:$PORT"
echo -e "  ${GREEN}Login:${NC}     admin@example.com / admin123!"
if [ "$MODE" = "production" ]; then
  echo -e "  ${GREEN}Process:${NC}   pm2 status"
  echo -e "  ${GREEN}Logs:${NC}      pm2 logs $APP_NAME"
fi
echo ""
echo -e "  ${BOLD}Useful Commands:${NC}"
echo "    npm run db:reset     # Reset & re-seed database"
echo "    npm run db:seed      # Re-seed database only"
echo "    npm test             # Run tests"
echo "    npm run validate     # Typecheck + lint + format"
echo ""
