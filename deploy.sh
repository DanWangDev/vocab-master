#!/bin/bash
set -e

# ─────────────────────────────────────────
#  Vocab Master — One-Command Redeploy
#  Usage: ./deploy.sh
# ─────────────────────────────────────────

BOLD='\033[1m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Colour

log()  { echo -e "${BOLD}[deploy]${NC} $1"; }
ok()   { echo -e "${GREEN}[✔]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
fail() { echo -e "${RED}[✘]${NC} $1"; exit 1; }

# Use .env.production if it exists, otherwise fall back to .env
ENV_FILE=".env.production"
if [ ! -f "$ENV_FILE" ]; then
  warn ".env.production not found, falling back to .env"
  ENV_FILE=".env"
fi

log "Starting redeployment..."

# 1. Pull latest code
log "Pulling latest changes from git..."
git pull || fail "git pull failed"
ok "Git pull complete"

# 2. Bring containers down
log "Stopping containers..."
docker-compose --env-file "$ENV_FILE" down || fail "docker-compose down failed"
ok "Containers stopped"

# 3. Rebuild and start
log "Building and starting containers..."
docker-compose --env-file "$ENV_FILE" up -d --build || fail "docker-compose up failed"
ok "Containers started"

# 4. Show running containers
echo ""
log "Running services:"
docker-compose ps

echo ""
ok "Redeployment complete! 🚀  App is live at https://vocab-master.labf.app"
