# Project Restructure -- Completed Migration Summary

> **Status:** Completed (March 2026)
> **Related:** [repo-structure.md](./repo-structure.md)

## What Was Done

The repository was restructured from a nested `vocab-master/` subdirectory layout into a flat `packages/*` layout at the repository root.

### Before

```
WordCardShffle/
├── vocab-master/
│   ├── src/                 # Web frontend source
│   ├── backend/             # Express API
│   ├── mobile/              # React Native (Expo)
│   ├── shared/              # Shared types
│   ├── docker-compose.yml
│   └── package.json
├── scripts/                 # Word extraction scripts
├── resources/               # Design assets, source PDFs
└── docs/
```

The actual product lived one level down inside `vocab-master/`, making the repository root feel disconnected from the real project. Vocabulary extraction scripts and design assets were mixed alongside the product code at the top level.

### After

```
WordCardShffle/
├── packages/
│   ├── frontend/            # React SPA (was vocab-master/src/)
│   ├── backend/             # Express API (was vocab-master/backend/)
│   ├── mobile/              # React Native (was vocab-master/mobile/)
│   └── shared/              # Shared types (was vocab-master/shared/)
├── docs/                    # Architecture, security, deployment docs
├── deploy/                  # NAS deployment scripts and prod compose
├── archive/                 # Legacy word extraction scripts and design assets
├── docker-compose.yml       # Moved to repo root
└── nginx.conf
```

### Path Mapping

| Before | After |
|--------|-------|
| `vocab-master/src/` | `packages/frontend/src/` |
| `vocab-master/backend/` | `packages/backend/` |
| `vocab-master/mobile/` | `packages/mobile/` |
| `vocab-master/shared/` | `packages/shared/` |
| `vocab-master/docker-compose.yml` | `docker-compose.yml` (repo root) |
| `vocab-master/nginx.conf` | `nginx.conf` (repo root) |
| `vocab-master/frontend.Dockerfile` | `frontend.Dockerfile` (repo root) |
| `scripts/` (word extraction) | `archive/` |
| `resources/` (design assets) | `archive/` |

## Why

1. **Fix messy nesting.** The `vocab-master/` subdirectory added an unnecessary layer of indirection. Every Docker path, CI script, and developer workflow had to account for the extra nesting. The product code should live at a predictable location relative to the repository root.

2. **Align naming with "Vocab Master" branding.** The repository is named `WordCardShffle` (a legacy name), but the product is called "Vocab Master". The package names now use `@vocab-master/*` to match the product identity, while the repository name stays unchanged to avoid breaking GitHub links and CI references.

3. **Separate product code from legacy tooling.** Word extraction scripts, source PDFs, and design assets are not part of the runtime product. Moving them to `archive/` makes it clear what is the application and what is historical tooling.

4. **Simplify deployment.** With `docker-compose.yml` at the repository root, deployment commands no longer require `cd vocab-master` first. The `deploy/` directory holds NAS-specific scripts and production compose overrides.

## What Changed

### File moves
- All product source code moved from `vocab-master/*` into `packages/*`
- The web frontend moved from `vocab-master/src/` to `packages/frontend/src/` (the package was also renamed from the implicit root project to an explicit `frontend` package)
- `docker-compose.yml`, `nginx.conf`, and `frontend.Dockerfile` moved to the repository root
- Legacy scripts and resources consolidated into `archive/`

### Docker and CI
- Dockerfile build contexts updated to reference `packages/backend/` and `packages/frontend/`
- `docker-compose.yml` volume mounts and build paths adjusted
- GitHub Actions workflows updated for new paths

### No workspace linking
- The packages do not use npm or pnpm workspaces
- Each package runs independent `npm ci` and build commands
- Shared types are imported via relative paths, not workspace protocol

### No internal refactoring
- The internal structure of each package (backend layers, frontend components, mobile screens) was not changed during the migration
- All import paths within each package remain the same
- The migration was purely a top-level directory reorganisation

## Design Decisions

| Decision | Reasoning |
|----------|-----------|
| `packages/*` not `apps/*` + `packages/*` | The project is small enough that a single `packages/` directory is sufficient. Splitting into `apps/` and `packages/` adds structure that is not yet justified. |
| No workspace linking | Each package is small and has its own dependency tree. Workspace linking adds tooling complexity without meaningful benefit at this scale. |
| `archive/` not `tools/` | The word extraction scripts are no longer actively maintained. `archive/` signals that more clearly than `tools/` would. |
| `frontend/` not `web/` | Aligns with the `@vocab-master/frontend` package name and is more descriptive for a project that also has a mobile client. |
