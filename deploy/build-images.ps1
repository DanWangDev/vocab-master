# Build and export Docker images for NAS deployment
# Run this script from the repo root directory

$ErrorActionPreference = "Stop"

Write-Host "Building Docker images for NAS deployment..." -ForegroundColor Cyan

# Build backend image
Write-Host "`nBuilding backend image..." -ForegroundColor Yellow
docker build -t vocab-master-backend:latest ./packages/backend

# Build frontend image with NAS API URL
Write-Host "`nBuilding frontend image..." -ForegroundColor Yellow
docker build -t vocab-master-frontend:latest `
  --build-arg VITE_API_URL=http://192.168.50.35:9876/api `
  -f packages/frontend/frontend.Dockerfile ./packages/frontend

# Create deploy directory if not exists
if (!(Test-Path -Path "deploy/images")) {
    New-Item -ItemType Directory -Path "deploy/images" -Force
}

# Export images to tar files
Write-Host "`nExporting images to tar files..." -ForegroundColor Yellow
docker save vocab-master-backend:latest -o deploy/images/vocab-master-backend.tar
docker save vocab-master-frontend:latest -o deploy/images/vocab-master-frontend.tar

Write-Host "`nImages exported to deploy/images/" -ForegroundColor Green
Write-Host "  - vocab-master-backend.tar"
Write-Host "  - vocab-master-frontend.tar"

# Show file sizes
$backendSize = (Get-Item "deploy/images/vocab-master-backend.tar").Length / 1MB
$frontendSize = (Get-Item "deploy/images/vocab-master-frontend.tar").Length / 1MB
Write-Host "`nImage sizes:" -ForegroundColor Cyan
Write-Host "  Backend:  $([math]::Round($backendSize, 1)) MB"
Write-Host "  Frontend: $([math]::Round($frontendSize, 1)) MB"

Write-Host "`nNext steps:" -ForegroundColor Cyan
Write-Host "1. Copy deploy/ folder to your NAS"
Write-Host "2. On NAS, run: ./load-and-run.sh"
