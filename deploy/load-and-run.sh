#!/bin/bash
# NAS Deployment Script for Vocab Master
# Run this script on your NAS after copying the deploy folder

set -e

echo "=== Vocab Master NAS Deployment ==="

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "Creating .env file..."
    # Generate a random JWT secret
    JWT_SECRET=$(openssl rand -hex 32 2>/dev/null || cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 64 | head -n 1)
    echo "JWT_SECRET=$JWT_SECRET" > .env
    echo ".env file created with generated JWT_SECRET"
fi

# Load Docker images
echo ""
echo "Loading Docker images..."
docker load -i images/vocab-master-backend.tar
docker load -i images/vocab-master-frontend.tar

# Stop existing containers if running
echo ""
echo "Stopping existing containers (if any)..."
docker-compose -f docker-compose.prod.yml down 2>/dev/null || true

# Start containers
echo ""
echo "Starting containers..."
docker-compose -f docker-compose.prod.yml up -d

# Wait for backend to be healthy
echo ""
echo "Waiting for backend to be ready..."
sleep 5

# Check health
if curl -s http://localhost:9876/api/health > /dev/null; then
    echo "Backend is healthy!"
else
    echo "Warning: Backend health check failed. Check logs with: docker logs vocab-master-backend"
fi

echo ""
echo "=== Deployment Complete ==="
echo ""
echo "Access the app at: http://192.168.50.35:8080"
echo ""
echo "Useful commands:"
echo "  View logs:     docker-compose -f docker-compose.prod.yml logs -f"
echo "  Stop:          docker-compose -f docker-compose.prod.yml down"
echo "  Restart:       docker-compose -f docker-compose.prod.yml restart"
echo "  Backup data:   docker run --rm -v vocab-master-data:/data -v \$(pwd):/backup alpine tar czf /backup/vocab-backup.tar.gz /data"
