# Deployment Guide for NAS

This guide explains how to deploy the **11+ Vocabulary Master** application to a Network Attached Storage (NAS) device that supports Docker (e.g., Synology, QNAP, TrueNAS).

## Prerequisites
1.  **Docker Support**: Your NAS must have Docker (often called "Container Manager" on Synology) installed.
2.  **SSH Access**: Recommended for running commands, though some steps can be done via the NAS web UI.
3.  **Port Availability**: Ensure ports `8080` (Frontend) and `9876` (Backend) are free on your NAS.
4.  **11plus-hub**: The hub must be running on the same Docker host. Vocab Master delegates authentication to the hub via OIDC. Both backends must join the shared `labf-net` Docker network so `hub-backend:3009` is resolvable.
5.  **Shared network**: Run `bootstrap.sh` once to create the `labf-net` Docker network before starting any app compose files. Hub owns the canonical bootstrap; see [11plus-hub](https://github.com/DanWangDev/11plus-hub).

## Step 1: Prepare the Application
Before moving files, ensure you have the latest production build configuration.

1.  **Check Environment Variables**:
    Required file: `.env` (at the repository root)
    Ensure it exists. If not, copy `.env.example` to `.env`:
    ```bash
    cp .env.example .env
    ```
    *Note: You may need to update `VITE_API_URL` if you plan to access the app from other devices (see [Configuration checks](#configuration-checks)).*

2.  **Verify Database**:
    Word data is seeded automatically by the migration system (migration 009). No manual file preparation is needed.

## Production Deploy (GHCR Images)

For production deployments, use the pre-built GHCR images and compose file in `deploy/`:

```bash
cd /volume1/docker/vocab-master
docker compose -f deploy/docker-compose.prod.yml pull
docker compose -f deploy/docker-compose.prod.yml up -d
```

The prod compose file has OIDC and network defaults baked in. Only `OIDC_CLIENT_SECRET` must be replaced from the placeholder value.

Use `deploy/pull-and-deploy.sh` for a one-command update that pulls the latest images and restarts containers.

### Continuous Delivery

Deployment is automated via a self-hosted GitHub Actions runner on the NAS.

```
┌─ GitHub ──────────────────────────────────────────┐
│                                                    │
│  CI workflow (push to main)                        │
│  ├── lint → typecheck → test → build               │
│  ├── docker-backend  ─┐                            │
│  └── docker-frontend ─┘ (build + push to GHCR)     │
│                         │                          │
│  deploy job ◄──────────┘ (needs: [docker-*])       │
│  runs-on: nas                                      │
│  steps: cd repo && docker compose pull && up -d    │
│                                                    │
└──────────────────────┬─────────────────────────────┘
                       │ outbound HTTPS (poll + job pickup)
                       ▼
┌─ Synology DS918+ ──────────────────────────────────┐
│                                                    │
│  actions-runner (Docker container)                 │
│  - ghcr.io/actions/actions-runner:latest           │
│  - Mounts: /var/run/docker.sock                    │
│            /volume1/docker → /repos                │
│  - Labels: nas, deploy                             │
│  - Outbound only (polls GitHub for work)           │
│                                                    │
│  App containers (managed by runner)                │
│  - hub-backend, hub-frontend, hub-db               │
│  - writing-buddy-backend, writing-buddy-frontend   │
│  - vocab-master-backend, vocab-master-frontend     │
│  - story-sleuth-backend, story-sleuth-frontend     │
│                                                    │
└────────────────────────────────────────────────────┘
```

- **Runner:** Docker container (`ghcr.io/actions/actions-runner`) registered at org level with `nas` label
- **Networking:** Outbound HTTPS only — no inbound ports
- **Manual deploy:** `./deploy.sh --ghcr` still works for ad-hoc deploys

## Step 2: Transfer Files to NAS
You need to copy the repository to your NAS.

**Method A: SMB/Network Share (Easiest)**
1.  Mount your NAS shared folder on your computer.
2.  Create a folder on the NAS (e.g., `/docker/vocab-master`).
3.  Copy all files from the repository root to the NAS folder.
    *   *Exclude*: `node_modules`, `.git`, `dist` (these will be rebuilt/ignored).

**Method B: SCP/Command Line**
```bash
scp -r . user@nas-ip:/volume1/docker/vocab-master
```

## Step 3: Run with Docker Compose
1.  **SSH into your NAS**:
    ```bash
    ssh user@your-nas-ip
    ```
2.  **Navigate to the project root**:
    ```bash
    cd /volume1/docker/vocab-master
    ```
    The `docker-compose.yml` file is at the repository root.
3.  **Start the application**:
    ```bash
    sudo docker-compose up -d --build
    ```
    *   `-d`: Detached mode (runs in background).
    *   `--build`: Forces a rebuild of the images to ensure they match your source code.

## Step 4: Verify Deployment
1.  Open your browser.
2.  Go to `http://<your-nas-ip>:8080`.
3.  The application should load.

## Configuration Checks

### Accessing from other devices (Important!)
By default, the frontend tries to call the API at `http://localhost:9876`.
- If you access the app from your phone or another laptop, `localhost` will refer to *that* device, not the NAS.
- **Fix**: You generally need to configure the frontend to know the NAS's IP address.

**Option 1: Rebuild with Environment Variable**
1.  Open `docker-compose.yml`.
2.  Under the `frontend` service, add/update the `args` or `environment`:
    ```yaml
    frontend:
      build:
        args:
          VITE_API_URL: "http://<your-nas-ip>:9876"
    ```
3.  Rebuild: `docker-compose up -d --build`

**Option 2: Nginx Reverse Proxy (Advanced)**
If you want to access it via a domain (e.g., `vocab-master.labf.app`), configure your NAS's Reverse Proxy settings to point to `localhost:8080` and `localhost:9876`.

## Troubleshooting

- **"Connection Refused"**: Check if the container is running:
  ```bash
  docker ps
  ```
- **Backend Health Check Fails**: View logs:
  ```bash
  docker logs vocab-master-backend
  ```
- **Hub Auth Fails**: Verify the backend can reach the hub via `labf-net` and `OIDC_CLIENT_SECRET` is correctly set. Check that `bootstrap.sh` was run to create the shared network.
- **Permission Errors**: Ensure the user running docker has permission to read the files in the directory.
