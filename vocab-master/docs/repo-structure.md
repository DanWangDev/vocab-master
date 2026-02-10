# Monorepo Structure

> **Related:** [mobile-migration-plan.md](./mobile-migration-plan.md)  
> **Date:** 2026-02-10

## Decision: Monorepo

A monorepo using **npm/pnpm workspaces** was chosen over a multi-repo approach.

### Why Monorepo

- **Shared code** — `ApiService`, types, quiz logic, and i18n are used by both web and mobile. A monorepo makes sharing trivial via workspace dependencies.
- **Atomic changes** — A type change can be updated across web, mobile, and backend in a single commit/PR.
- **Simpler CI** — One pipeline can test everything together.
- **Right for the team size** — Multi-repo overhead (publishing packages, versioning, cross-repo PRs) isn't justified until 10+ developers.

## Target Structure

```
WordCardShuffle/
├── packages/
│   ├── shared/                        # Shared business logic
│   │   ├── src/
│   │   │   ├── types/                 # TypeScript interfaces
│   │   │   │   ├── wordlist.ts
│   │   │   │   ├── user.ts
│   │   │   │   └── index.ts
│   │   │   ├── services/
│   │   │   │   ├── ApiService.ts      # REST client
│   │   │   │   └── QuizGenerator.ts   # Quiz logic
│   │   │   ├── i18n/                  # Translations & config
│   │   │   │   ├── en.json
│   │   │   │   ├── zh.json
│   │   │   │   └── index.ts
│   │   │   ├── contexts/              # Shared React contexts
│   │   │   │   ├── AuthContext.tsx
│   │   │   │   └── NotificationContext.tsx
│   │   │   └── utils/                 # Shared utilities
│   │   ├── package.json               # name: "@wordcard/shared"
│   │   └── tsconfig.json
│   │
│   ├── web/                           # Current frontend (moved)
│   │   ├── src/
│   │   │   ├── components/            # Web-specific React components
│   │   │   │   ├── admin/
│   │   │   │   ├── auth/
│   │   │   │   ├── quiz/
│   │   │   │   ├── study/
│   │   │   │   ├── dashboard/
│   │   │   │   └── ...
│   │   │   ├── hooks/                 # Web-specific hooks
│   │   │   ├── layouts/               # Web layouts
│   │   │   ├── routes/                # react-router-dom routes
│   │   │   ├── services/
│   │   │   │   └── StorageService.ts  # localStorage implementation
│   │   │   ├── App.tsx
│   │   │   ├── main.tsx
│   │   │   └── index.css
│   │   ├── public/
│   │   ├── index.html
│   │   ├── package.json               # name: "@wordcard/web"
│   │   ├── vite.config.ts
│   │   ├── tailwind.config.js
│   │   └── tsconfig.json
│   │
│   ├── mobile/                        # React Native (Expo)
│   │   ├── app/                       # Expo Router screens
│   │   │   ├── (tabs)/
│   │   │   │   ├── index.tsx          # Dashboard
│   │   │   │   ├── study.tsx          # Study mode
│   │   │   │   ├── quiz.tsx           # Quiz mode
│   │   │   │   └── profile.tsx        # Settings/profile
│   │   │   ├── auth/
│   │   │   │   ├── login.tsx
│   │   │   │   └── register.tsx
│   │   │   ├── _layout.tsx
│   │   │   └── +not-found.tsx
│   │   ├── components/                # RN-specific components
│   │   │   ├── FlashCard.tsx
│   │   │   ├── QuizCard.tsx
│   │   │   ├── StatsChart.tsx
│   │   │   └── ...
│   │   ├── services/
│   │   │   └── StorageService.ts      # AsyncStorage implementation
│   │   ├── constants/
│   │   ├── assets/
│   │   ├── app.json
│   │   ├── package.json               # name: "@wordcard/mobile"
│   │   └── tsconfig.json
│   │
│   └── backend/                       # Current backend (moved)
│       ├── src/
│       │   ├── config/
│       │   ├── controllers/
│       │   ├── middleware/
│       │   ├── migrations/
│       │   ├── repositories/
│       │   ├── routes/
│       │   ├── services/
│       │   ├── types/
│       │   └── index.ts
│       ├── data/
│       ├── package.json               # name: "@wordcard/backend"
│       ├── Dockerfile
│       └── tsconfig.json
│
├── package.json                       # Workspace root
├── pnpm-workspace.yaml                # (if using pnpm)
├── docker-compose.yml
├── docs/
│   ├── mobile-migration-plan.md
│   └── repo-structure.md              # This file
├── .github/
│   └── workflows/
└── .gitignore
```

## Workspace Configuration

### Root `package.json`

```json
{
  "private": true,
  "workspaces": ["packages/*"],
  "scripts": {
    "dev:web": "npm -w @wordcard/web run dev",
    "dev:mobile": "npm -w @wordcard/mobile run start",
    "dev:backend": "npm -w @wordcard/backend run dev",
    "build:web": "npm -w @wordcard/web run build",
    "build:backend": "npm -w @wordcard/backend run build",
    "lint": "npm run lint --workspaces"
  }
}
```

### Shared package dependency (in web & mobile `package.json`)

```json
{
  "dependencies": {
    "@wordcard/shared": "workspace:*"
  }
}
```

### Usage in code

```typescript
// In packages/web/src/components/quiz/QuizScreen.tsx
// or packages/mobile/app/(tabs)/quiz.tsx

import { ApiService } from '@wordcard/shared/services/ApiService';
import { QuizGenerator } from '@wordcard/shared/services/QuizGenerator';
import type { Wordlist } from '@wordcard/shared/types';
```

## Platform-Specific Implementations

The `StorageService` is the primary example of platform-specific code. Both web and mobile implement the same interface but use different storage backends:

```typescript
// Interface (in @wordcard/shared)
export interface IStorageService {
  getSettings(): UserSettings;
  saveSettings(settings: UserSettings): void;
  getStats(): UserStats;
  saveStats(stats: UserStats): void;
}

// Web implementation: localStorage
// Mobile implementation: AsyncStorage
```

## Migration Steps

1. Create `packages/` directory
2. Move `backend/` → `packages/backend/`
3. Move frontend source → `packages/web/` (keep config files at correct level)
4. Extract shared code → `packages/shared/`
5. Update all import paths
6. Set up workspace root `package.json`
7. Update Docker config to point to new paths
8. Update GitHub Actions workflows
9. Verify web + backend still work
10. Scaffold `packages/mobile/` with `npx create-expo-app`
