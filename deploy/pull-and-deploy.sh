#!/bin/bash
# Pull latest images from GHCR and redeploy
# Usage: ./pull-and-deploy.sh

set -e

REGISTRY="ghcr.io/danwangdev"
COMPOSE_FILE="docker-compose.prod.yml"

echo "=== Vocab Master — Pull & Deploy ==="

# Check .env exists
if [ ! -f ".env" ]; then
    echo "ERROR: No .env file found. Create one with at least:"
    echo "  JWT_SECRET=<openssl rand -hex 32>"
    echo "  CORS_ORIGIN=http://<your-nas-ip>:8080"
    echo "  OIDC_ISSUER=https://hub.labf.app"
    echo "  OIDC_CLIENT_ID=vocab-master-client"
    echo "  OIDC_CLIENT_SECRET=<your-secret>"
    exit 1
fi

# Login to GHCR if not already
echo ""
echo "Checking GHCR authentication..."
if ! docker pull "$REGISTRY/vocab-master-backend:latest" > /dev/null 2>&1; then
    echo "Not authenticated. Log in with a GitHub PAT (read:packages scope):"
    echo "  echo YOUR_PAT | docker login ghcr.io -u danwangdev --password-stdin"
    exit 1
fi

# Pull latest images
echo ""
echo "Pulling latest images..."
docker pull "$REGISTRY/vocab-master-backend:latest"
docker pull "$REGISTRY/vocab-master-frontend:latest"

# Stop existing containers
echo ""
echo "Stopping existing containers..."
docker compose -f "$COMPOSE_FILE" down 2>/dev/null || \
docker-compose -f "$COMPOSE_FILE" down 2>/dev/null || true

# Start containers
echo ""
echo "Starting containers..."
docker compose -f "$COMPOSE_FILE" up -d 2>/dev/null || \
docker-compose -f "$COMPOSE_FILE" up -d

# Wait and check health
echo ""
echo "Waiting for backend..."
sleep 5

if curl -sf http://localhost:9876/api/health > /dev/null; then
    echo "Backend is healthy!"
else
    echo "Warning: Health check failed. Check: docker logs vocab-master-backend"
fi

echo ""
echo "=== Deploy Complete ==="
echo "App: http://192.168.50.35:8080"
echo ""
echo "Commands:"
echo "  Logs:    docker compose -f $COMPOSE_FILE logs -f"
echo "  Stop:    docker compose -f $COMPOSE_FILE down"
echo "  Restart: docker compose -f $COMPOSE_FILE restart"
