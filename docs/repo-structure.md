# Repository Structure

> **Status:** Current (migrated March 2026)
> **Related:** [project-restructure-recommendations.md](./project-restructure-recommendations.md)

## Overview

The repository uses a `packages/*` layout. Each package has its own `package.json` and runs independent `npm ci` / build commands. There are no npm or pnpm workspaces linking the packages together.

## Directory Layout

```
WordCardShffle/
├── packages/
│   ├── frontend/            # React SPA (Vite, Tailwind, i18n)  [@vocab-master/frontend]
│   │   ├── src/
│   │   │   ├── components/  # UI components organised by domain
│   │   │   ├── contexts/    # React contexts (Auth, Notification, App, Achievement)
│   │   │   ├── hooks/       # Custom React hooks
│   │   │   ├── i18n/        # i18next config and locale files (en, zh-CN)
│   │   │   ├── routes/      # react-router-dom route definitions
│   │   │   ├── services/    # API client modules, StorageService
│   │   │   └── types/       # Frontend TypeScript interfaces
│   │   ├── public/
│   │   ├── package.json
│   │   ├── vite.config.ts
│   │   ├── tailwind.config.js
│   │   └── tsconfig.json
│   │
│   ├── backend/             # Express API (SQLite, JWT auth)  [@vocab-master/backend]
│   │   ├── src/
│   │   │   ├── config/      # Database connection, migration runner
│   │   │   ├── jobs/        # Background job queue
│   │   │   ├── middleware/  # Auth, validation, rate limiting, cache, turnstile
│   │   │   ├── migrations/  # Sequential DB migrations (001–020)
│   │   │   ├── repositories/# Data access layer (interfaces + SQLite implementations)
│   │   │   ├── routes/      # Express route handlers
│   │   │   ├── services/    # Business logic (auth, email, audit, SRS, PvP, etc.)
│   │   │   ├── types/       # Backend TypeScript interfaces
│   │   │   └── index.ts     # Server entry point
│   │   ├── data/            # SQLite database file (gitignored)
│   │   ├── package.json
│   │   ├── Dockerfile
│   │   └── tsconfig.json
│   │
│   ├── shared/              # Shared TypeScript types
│   │   └── src/
│   │
│   └── mobile/              # React Native (Expo)
│       ├── app/             # Expo Router screens
│       ├── src/
│       │   ├── contexts/    # AuthContext, NotificationContext
│       │   └── services/    # ApiService (mobile variant)
│       ├── assets/
│       ├── app.json
│       ├── package.json
│       └── tsconfig.json
│
├── docs/                    # Architecture, security, deployment docs
├── deploy/                  # NAS deployment scripts and prod compose
├── archive/                 # Legacy word extraction scripts and design assets
├── .github/                 # GitHub Actions workflows
│
├── docker-compose.yml       # Multi-container orchestration
├── frontend.Dockerfile      # Web frontend build
├── nginx.conf               # Reverse proxy config
└── .gitignore
```

## Package Details

### `packages/frontend/`

The Vite + React 19 web application. Tailwind CSS for styling, Framer Motion for animations, Recharts for charts, react-router-dom for routing, and i18next for internationalisation (English + Simplified Chinese).

### `packages/backend/`

The Express + TypeScript API server. Uses better-sqlite3 for the database, Zod for input validation, JWT for authentication (access + refresh tokens), and bcrypt for password hashing. The repository pattern separates data access behind interfaces with SQLite implementations.

### `packages/shared/`

Shared TypeScript type definitions used across frontend, backend, and mobile packages. Imported via relative paths (no workspace linking).

### `packages/mobile/`

The Expo / React Native mobile application. Uses Expo Router for navigation, expo-secure-store for token storage, and shares the API client pattern with the web frontend.

## Top-Level Files

| File | Purpose |
|------|---------|
| `docker-compose.yml` | Development and production multi-container orchestration |
| `frontend.Dockerfile` | Multi-stage build for the web frontend |
| `nginx.conf` | Reverse proxy with security headers |
| `.gitignore` | Covers `.env*`, `node_modules`, `data/`, build outputs |

## Building and Running

Each package is built independently:

```bash
# Backend
cd packages/backend && npm ci && npm run build

# Frontend
cd packages/frontend && npm ci && npm run build

# Mobile
cd packages/mobile && npm ci && npx expo start

# Docker (from repo root)
docker-compose up --build -d
```
