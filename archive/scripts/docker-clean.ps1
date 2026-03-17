# Docker Cleanup Script
# Usage: ./docker-clean.ps1 [-PruneVolumes] [-All]

param (
    [switch]$PruneVolumes,
    [switch]$All
)

# 1. Stop and Remove Containers
$containers = docker ps -a -q
if ($containers) {
    Write-Host "Stopping and removing $($containers.Count) containers..." -ForegroundColor Yellow
    docker stop $containers 2>$null
    docker rm $containers 2>$null
} else {
    Write-Host "No containers to clean." -ForegroundColor Gray
}

# 2. Remove Images
if ($All) {
    $images = docker images -q
    if ($images) {
        Write-Host "Removing all images..." -ForegroundColor Yellow
        docker rmi $images -f 2>$null
    }
} else {
    Write-Host "Pruning dangling images..." -ForegroundColor Yellow
    docker image prune -f
}

# 3. Prune Volumes
if ($PruneVolumes) {
    Write-Host "Pruning volumes..." -ForegroundColor Yellow
    docker volume prune -f
}

Write-Host "Docker cleanup complete!" -ForegroundColor Green
Write-Host "----------------------------------------"
docker ps -a
