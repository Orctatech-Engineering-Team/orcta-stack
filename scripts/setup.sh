#!/usr/bin/env bash
set -euo pipefail

# ── Colours ────────────────────────────────────────────────────────────────────
RED="\033[0;31m"
GREEN="\033[0;32m"
YELLOW="\033[1;33m"
CYAN="\033[0;36m"
BOLD="\033[1m"
RESET="\033[0m"

info()    { echo -e "${CYAN}ℹ${RESET}  $*"; }
success() { echo -e "${GREEN}✓${RESET}  $*"; }
warn()    { echo -e "${YELLOW}⚠${RESET}  $*"; }
error()   { echo -e "${RED}✗${RESET}  $*" >&2; }
step()    { echo -e "\n${BOLD}$*${RESET}"; }

# ── Prerequisites ───────────────────────────────────────────────────────────────
step "Checking prerequisites..."

# Deno — require ≥2
if ! command -v deno >/dev/null 2>&1; then
  error "Deno not found. Install v2+ from https://deno.com"
  exit 1
fi
DENO_MAJOR=$(deno --version | head -1 | grep -oP '\d+' | head -1)
if [[ "$DENO_MAJOR" -lt 2 ]]; then
  error "Deno v${DENO_MAJOR} found — v2 or higher required."
  exit 1
fi
success "Deno $(deno --version | head -1)"

# pnpm (still needed for frontend deps)
if ! command -v pnpm >/dev/null 2>&1; then
  error "pnpm not found. Install: npm i -g pnpm"
  exit 1
fi
success "pnpm $(pnpm --version)"

# Docker / Docker Compose (optional — used for postgres + redis)
DOCKER_OK=false
if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
  if docker compose version >/dev/null 2>&1; then
    DOCKER_OK=true
    success "Docker $(docker --version | awk '{print $3}' | tr -d ,) (compose available)"
  fi
fi

# ── Dependencies ────────────────────────────────────────────────────────────────
step "Installing dependencies..."
pnpm install
success "Dependencies installed"

# ── Environment files ───────────────────────────────────────────────────────────
step "Setting up environment files..."

if [ ! -f .env ]; then
  if [ ! -f .env.example ]; then
    error ".env.example not found in project root — cannot create .env"
    exit 1
  fi
  cp .env.example .env
  # Generate a secure BETTER_AUTH_SECRET (hex, 64 chars = 32 bytes)
  SECRET=$(openssl rand -hex 32 2>/dev/null || head -c 32 /dev/urandom | xxd -p -c 256)
  # In-place substitute the placeholder (works on both Linux and macOS)
  if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' "s/your-better-auth-secret-min-32-chars/${SECRET}/" .env
  else
    sed -i "s/your-better-auth-secret-min-32-chars/${SECRET}/" .env
  fi
  success "Created .env with generated BETTER_AUTH_SECRET"
  warn "Set DATABASE_URL (and optionally REDIS_URL) in .env before running migrations"
else
  info ".env already exists — skipping"
fi

if [ ! -f apps/frontend/.env ]; then
  if [ -f apps/frontend/.env.example ]; then
    cp apps/frontend/.env.example apps/frontend/.env
    success "Created apps/frontend/.env"
  else
    warn "apps/frontend/.env.example not found — skipping frontend env"
  fi
else
  info "apps/frontend/.env already exists — skipping"
fi

# ── Docker services (optional) ──────────────────────────────────────────────────
if $DOCKER_OK; then
  step "Docker services..."
  # Check if postgres container from our compose is running
  if ! docker compose ps --status running 2>/dev/null | grep -q "postgres\|db"; then
    echo -e "${YELLOW}?${RESET}  Start postgres + redis via Docker Compose? [y/N] "
    read -r START_DOCKER
    if [[ "${START_DOCKER,,}" == "y" ]]; then
      docker compose up -d postgres redis
      success "Docker services started (postgres + redis)"
    else
      info "Skipped Docker services — make sure postgres and redis are reachable"
    fi
  else
    success "Docker services already running"
  fi
else
  warn "Docker not available — ensure PostgreSQL and Redis are running externally"
fi

# ── Build packages ─────────────────────────────────────────────────────────────
step "Verifying packages..."
info "Shared packages are imported via Deno's import maps — no build step needed."

# ── Done ────────────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}${BOLD}Setup complete!${RESET}"
echo ""
echo "Next steps:"
echo "  1. Edit .env — set DATABASE_URL (and REDIS_URL if needed)"
echo "  2. Run migrations:  deno task db:migrate"
echo "  3. Start backend:   deno task dev"
echo "  4. Start frontend:  deno task dev:frontend  (in a separate terminal)"
echo ""
echo "Other useful commands:"
echo "  deno task dev:frontend    Start frontend (Vite)"
echo "  deno test -A              Run all tests"
echo "  deno lint                 Lint backend"
echo "  deno task db:studio       Open Drizzle Studio"
