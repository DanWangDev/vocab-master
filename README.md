# Vocab Master

> Vocabulary learning app for 11+ exam prep — [vocab-master.labf.app](https://vocab-master.labf.app)

## Project Structure

```
packages/frontend/   — React SPA (Vite, Tailwind, i18n)
packages/backend/    — Express API (SQLite, OIDC auth via 11plus-hub)
packages/shared/     — Shared TypeScript types
packages/mobile/     — React Native (Expo)
docs/                — Architecture, security, deployment docs
deploy/              — NAS deployment scripts and prod compose
archive/             — Legacy word extraction scripts and design assets
```

## Quick Start (Development)

```bash
# Frontend
cd packages/frontend
npm ci
npm run dev            # http://localhost:5173

# Backend (requires 11plus-hub running on localhost:3009)
cd packages/backend
cp ../../.env.example .env   # edit with your secrets (OIDC_* vars required)
npm ci
npm run dev            # http://localhost:4567
```

## Deployment (Docker)

The backend joins the shared `labf-net` Docker bridge to reach hub-backend for OIDC authentication. The network must exist before starting any app. Create it once per host:

```bash
# First time only (idempotent — safe to re-run)
./bootstrap.sh

# Then start the app
cp .env.example .env   # configure secrets
docker compose up -d --build
```

- Frontend: http://localhost:8080
- Backend API: http://localhost:9876
- DB Viewer: http://localhost:8090 (localhost only)

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for NAS deployment guide.

## Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS, Framer Motion, i18next
- **Backend**: Express, SQLite (better-sqlite3), OIDC auth (11plus-hub), Zod validation
- **Mobile**: React Native, Expo, NativeWind
- **Infrastructure**: Docker Compose, nginx reverse proxy, GitHub Actions CI/CD

## Documentation

- [App Features](docs/APP-README.md) — feature overview and screenshots
- [Deployment Guide](docs/DEPLOYMENT.md) — Docker and NAS setup
- [Hub Auth Migration](docs/hub-auth-migration-guide.md) — OIDC migration guide and gotchas
- [Repo Structure](docs/repo-structure.md) — detailed directory layout
- [Security Hardening](docs/security-hardening.md) — audit report and fixes
- [Scale-up Plan](docs/scale-up-plan.md) — phased feature roadmap
- [Gamification Design](docs/gamification-design.md) — streaks, XP, levels, and cosmetic rewards system design
