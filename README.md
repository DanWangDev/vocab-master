# Vocab Master

> Vocabulary learning app for 11+ exam prep — [vocab-master.labf.app](https://vocab-master.labf.app)

## Project Structure

```
packages/frontend/   — React SPA (Vite, Tailwind, i18n)
packages/backend/    — Express API (SQLite, JWT auth)
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

# Backend
cd packages/backend
cp ../../.env.example .env   # edit with your secrets
npm ci
npm run dev            # http://localhost:9876
```

## Deployment (Docker)

```bash
# From repo root
cp .env.example .env   # configure secrets
docker compose up -d --build
```

- Frontend: http://localhost:8080
- Backend API: http://localhost:9876
- DB Viewer: http://localhost:8090 (localhost only)

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for NAS deployment guide.

## Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS, Framer Motion, i18next
- **Backend**: Express, SQLite (better-sqlite3), JWT auth, Zod validation
- **Mobile**: React Native, Expo, NativeWind
- **Infrastructure**: Docker Compose, nginx reverse proxy, GitHub Actions CI/CD

## Documentation

- [App Features](docs/APP-README.md) — feature overview and screenshots
- [Deployment Guide](docs/DEPLOYMENT.md) — Docker and NAS setup
- [Repo Structure](docs/repo-structure.md) — detailed directory layout
- [Security Hardening](docs/security-hardening.md) — audit report and fixes
- [Scale-up Plan](docs/scale-up-plan.md) — phased feature roadmap
