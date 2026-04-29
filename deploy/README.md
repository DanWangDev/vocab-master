# Vocab Master NAS Deployment

## Quick Deploy

### On your Windows PC:

```powershell
cd vocab-master
.\deploy\build-images.ps1
```

### Copy to NAS:

Copy the entire `deploy/` folder to your NAS via:
- SMB/File sharing
- SCP: `scp -r deploy/ user@192.168.50.35:/path/to/vocab-master/`
- USB drive

### On your NAS (SSH in):

```bash
cd /path/to/vocab-master/deploy
chmod +x load-and-run.sh
./load-and-run.sh
```

## Access

- **App URL**: http://192.168.50.35:8080
- **API Health**: http://192.168.50.35:9876/api/health

## Folder Structure

```
deploy/
├── docker-compose.prod.yml         # Production compose file (GHCR images)
├── pull-and-deploy.sh              # Pull latest GHCR images and restart
├── build-images.ps1                # Windows build script (tar-based deploy)
├── load-and-run.sh                 # NAS deployment script (tar-based deploy)
└── README.md                       # This file
```

## Management Commands

```bash
# View logs
docker-compose -f docker-compose.prod.yml logs -f

# View specific service logs
docker logs vocab-master-backend
docker logs vocab-master-frontend

# Restart services
docker-compose -f docker-compose.prod.yml restart

# Stop services
docker-compose -f docker-compose.prod.yml down

# Update (after copying new images)
docker-compose -f docker-compose.prod.yml down
docker load -i images/vocab-master-backend.tar
docker load -i images/vocab-master-frontend.tar
docker-compose -f docker-compose.prod.yml up -d
```

## Backup & Restore

### Backup database:
```bash
docker run --rm \
  -v vocab-master-data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/vocab-backup-$(date +%Y%m%d).tar.gz /data
```

### Restore database:
```bash
docker-compose -f docker-compose.prod.yml down
docker run --rm \
  -v vocab-master-data:/data \
  -v $(pwd):/backup \
  alpine sh -c "cd /data && tar xzf /backup/vocab-backup-YYYYMMDD.tar.gz --strip 1"
docker-compose -f docker-compose.prod.yml up -d
```

## Ports

| Service  | Port | Description |
|----------|------|-------------|
| Frontend | 8080 | Web UI (nginx) |
| Backend  | 9876 | API server |

## Troubleshooting

### Backend won't start
```bash
docker logs vocab-master-backend
```

### CORS errors
Check that `CORS_ORIGIN` in docker-compose.prod.yml matches your access URL.

### Database issues
The SQLite database is stored in a Docker volume `vocab-master-data`.
To reset: `docker volume rm vocab-master-data` (WARNING: deletes all data)

## Environment Variables

Create a `.env` file alongside `docker-compose.prod.yml`:

```env
GITHUB_OWNER=danwangdev
JWT_SECRET=your-secure-random-string-here
CORS_ORIGIN=http://your-nas-ip:8080

# OIDC — required for authentication (delegates to 11plus-hub)
OIDC_ISSUER=https://hub.labf.app
OIDC_INTERNAL_ISSUER=http://hub-backend:3009
OIDC_CLIENT_ID=vocab-master-client
OIDC_CLIENT_SECRET=your-client-secret
```

Generate a secure JWT secret:
```bash
openssl rand -hex 32
```

**Note:** The backend must be on the shared `labf-net` Docker network (alongside hub-backend) for OIDC token exchange to work. Run `bootstrap.sh` once to create it, then the compose file attaches automatically.
