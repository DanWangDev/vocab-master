# 11+ Vocabulary Master

> **Note:** For the current repository layout, see [docs/repo-structure.md](./repo-structure.md). This document describes the application features and API surface.

A full-stack vocabulary learning application for children preparing for the 11+ exam (and beyond). Features flashcard study, quizzes, daily challenges, parent dashboards, and custom wordlists — with web and mobile clients backed by a shared API.

## Features

### Learning
- **Flashcard Study** — swipe-through word cards with definitions, synonyms, and example sentences
- **Quiz Mode** — multiple-choice and matching quizzes with accuracy tracking; achievement unlock toasts on completion
- **Daily Challenges** — one scored challenge per day with streaks and leaderboards; achievement unlock toasts on completion
- **Custom Wordlists** — create, import (CSV), and manage personal word collections; set an active wordlist per user
- **Weak Word Tracking** — automatically identifies words the student gets wrong most often
- **Spelling Exercises** — two modes: definition prompt and fill-in-the-blank; forced retry on mistakes for muscle memory reinforcement
- **Timed Challenge Mode** — exam simulation with per-question countdown (easy/medium/hard difficulty); auto-advance on timeout
- **Achievements** — 22 achievements across 5 categories, unlock conditions, toast notifications on quiz/challenge/exercise completion
- **Leaderboards** — weekly/monthly/alltime periods, scoring formula (`quizzes * avg_score * 0.5 + words * 2 + streak * 10`)
- **Groups/Classes** — creation, 6-char join codes, member roles (owner/admin/member), group wordlists
- **Analytics & Reports** — word mastery levels (new/learning/familiar/mastered), learning trends, CSV export
- **SRS Flashcards** — SM-2 spaced repetition, review queue, pronunciation button, swipe gestures
- **Sentence Building** — tap-to-place token exercises generated from example sentences
- **PvP Challenges** — head-to-head quizzes, matchmaking, turn-based play, persisted questions for fairness, results comparison, rematch support

### Accounts & Roles
- **Hub SSO** — all authentication delegated to the 11+ Hub via OIDC (PKCE + BFF pattern); sign in once at the hub, access all Lab F apps
- **Student accounts** — auto-created on first hub login
- **Parent accounts** — hub-managed; parent-child linking handled in-app
- **Self-service profile editing** — parents can update their username and display name from the dashboard
- **Admin panel** — full user management (create, delete, role changes, password resets, email updates)

### Parent Dashboard
- View linked students' quiz history, study sessions, accuracy trends, and streak data
- Create student accounts (auto-linked) or send link requests to existing students
- Reset student passwords
- Edit own profile (username and display name)

### Notifications & Linking
- In-app notification bell with unread counts
- Parent-to-student link requests (send, accept, reject, cancel)
- Push notifications on mobile via Expo push tokens

### Security
- **Hub OIDC** — authentication delegated to the 11+ Hub (PKCE + BFF pattern with confidential client); hub handles bot protection, brute-force, and password policy
- **Token security** — OIDC id_tokens used as Bearer tokens for API calls; refresh tokens proxied through backend BFF with `client_secret`
- **Back-channel logout** — hub-initiated session revocation via `/backchannel-logout` endpoint
- **IDOR protection** — private wordlists return 403 for non-owners; parent endpoints verify parent-child relationship
- **Security headers** — HSTS, CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy
- **Input validation** — Zod schemas on auth endpoints and quiz results; file type validation on wordlist imports
- **Startup checks** — app refuses to start without `JWT_SECRET` in any environment or without `CORS_ORIGIN` in production
- **Audit logging** — all admin operations (role changes, user creation/deletion, password resets) logged to `audit_log` table with actor, target, and IP
- **Structured logging** — JSON-formatted log output for all backend services (compatible with log aggregation tools)
- **Database backups** — automated backup script with configurable retention (`packages/backend/scripts/backup.sh`)

See [docs/security-hardening.md](docs/security-hardening.md) for the full security audit report.

### Internationalisation
- English and Simplified Chinese (zh-CN) across all screens
- Language preference persisted per user

### Mobile App (Expo / React Native)
- Shared API service and auth context with the web client
- Haptic feedback, EAS Build configuration
- Push notification support

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend (web) | React 19, TypeScript, Vite, Tailwind CSS, Framer Motion, Recharts, react-router-dom |
| Frontend (mobile) | React Native (Expo), Expo Router, expo-secure-store |
| Backend | Node.js, Express, TypeScript, Zod validation |
| Database | SQLite (via better-sqlite3), auto-migrating schema |
| Auth | OIDC via 11+ Hub (PKCE + BFF pattern, `@danwangdev/auth-client`) |
| Container Registry | GitHub Container Registry (GHCR) |
| Icons | Lucide React |
| i18n | i18next, react-i18next |
| Containerisation | Docker, Docker Compose, Nginx reverse proxy |

## Project Structure

```
WordCardShffle/                  # Repository root
├── packages/
│   ├── frontend/                # React SPA (Vite, Tailwind, i18n)
│   │   ├── src/
│   │   │   ├── components/      # UI components by domain
│   │   │   ├── contexts/        # AuthContext, NotificationContext, AchievementContext
│   │   │   ├── hooks/           # Custom React hooks
│   │   │   ├── i18n/            # i18next config and locale files (en, zh-CN)
│   │   │   └── services/        # ApiService, StorageService
│   │   └── package.json
│   ├── backend/                 # Express API (SQLite, JWT auth)
│   │   ├── src/
│   │   │   ├── config/          # Database, migration runner
│   │   │   ├── middleware/      # Auth, validation, rate limiting
│   │   │   ├── migrations/      # Sequential DB migrations
│   │   │   ├── repositories/    # Data access layer (SQLite)
│   │   │   ├── routes/          # Express route handlers
│   │   │   ├── services/        # Business logic (auth, email, audit, logger)
│   │   │   └── types/           # TypeScript interfaces
│   │   └── package.json
│   ├── shared/                  # Shared TypeScript types
│   └── mobile/                  # React Native (Expo)
│       ├── app/                 # Expo Router screens
│       ├── src/
│       │   ├── contexts/        # AuthContext, NotificationContext
│       │   └── services/        # ApiService (mobile variant)
│       └── app.json
├── docs/                        # Architecture, security, deployment docs
├── deploy/                      # NAS deployment scripts and prod compose
├── archive/                     # Legacy word extraction scripts and design assets
├── docker-compose.yml           # Multi-container orchestration (repo root)
├── nginx.conf                   # Reverse proxy config
└── frontend.Dockerfile          # Web frontend build
```

See [docs/repo-structure.md](./repo-structure.md) for full details.

## API Endpoints

### Authentication (`/api/auth`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/oidc/token` | No | BFF token exchange (authorization_code or refresh_token grant) |
| POST | `/backchannel-logout` | No | Hub-initiated session revocation |
| POST | `/logout` | No | Invalidate refresh token |
| GET | `/me` | Yes | Get current user |
| PATCH | `/profile` | Yes | Update own username/display name |
| POST | `/create-student` | Parent | Create student linked to parent |

### User Data
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET/PUT | `/api/settings` | Yes | Get/update user settings |
| GET/PATCH | `/api/stats` | Yes | Get/update user stats |
| POST | `/api/stats/increment` | Yes | Increment stat counters |
| GET | `/api/stats/weak-words` | Yes | Get words with lowest accuracy |
| GET | `/api/stats/activity` | Yes | Get activity summary |

### Quizzes & Study
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/quiz-results` | Yes | Save quiz result with answers |
| POST | `/api/study-stats` | Yes | Save study session |
| GET | `/api/challenges/today` | Yes | Get today's challenge status |
| POST | `/api/challenges/complete` | Yes | Submit daily challenge score |
| GET | `/api/challenges/history` | Yes | Challenge history |
| GET | `/api/challenges/streak` | Yes | Current streak and best score |

### Wordlists
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/wordlists` | Yes | List all wordlists |
| POST | `/api/wordlists` | Yes | Create wordlist |
| POST | `/api/wordlists/import` | Yes | Import wordlist from CSV |
| GET/PUT | `/api/wordlists/active` | Yes | Get/set active wordlist |
| GET/PUT/DELETE | `/api/wordlists/:id` | Yes | CRUD single wordlist |
| GET/POST | `/api/wordlists/:id/words` | Yes | Get/add words |
| PUT/DELETE | `/api/wordlists/:id/words/:wordId` | Yes | Update/delete word |

### Notifications & Linking
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/notifications` | Yes | List notifications |
| GET | `/api/notifications/count` | Yes | Unread count |
| PATCH | `/api/notifications/:id/read` | Yes | Mark as read |
| POST | `/api/notifications/read-all` | Yes | Mark all as read |
| GET | `/api/link-requests` | Yes | List link requests |
| POST | `/api/link-requests` | Parent | Send link request |
| PATCH | `/api/link-requests/:id` | Yes | Accept/reject request |
| DELETE | `/api/link-requests/:id` | Yes | Cancel request |
| GET | `/api/link-requests/search?q=` | Parent | Search for students |

### Admin (`/api/admin`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/admin/users` | Admin/Parent | List users with stats |
| POST | `/admin/users` | Admin | Create user |
| GET | `/admin/users/:id/details` | Admin/Parent | User quiz/study details |
| PATCH | `/admin/users/:id/role` | Admin | Change user role |
| PATCH | `/admin/users/:id/parent` | Admin | Change parent assignment |
| PATCH | `/admin/users/:id/email` | Admin | Update user email |
| PATCH | `/admin/users/:id/password` | Admin/Parent | Reset user password |
| DELETE | `/admin/users/:id` | Admin | Delete user |

### Push Tokens (Mobile)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/push-tokens` | Yes | Register Expo push token |
| DELETE | `/api/push-tokens` | Yes | Unregister push token |

### Achievements (`/api/achievements`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/achievements` | Yes | Get all achievements with user's earned status |
| GET | `/api/achievements/mine` | Yes | Get only earned achievements |
| POST | `/api/achievements/check` | Yes | Manually trigger achievement check |

### Leaderboards (`/api/leaderboards`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/leaderboards?period=` | Yes | Get rankings for a period (weekly/monthly/alltime) |
| GET | `/api/leaderboards/me?period=` | Yes | Get current user's ranking |

### Groups (`/api/groups`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/groups` | Yes | List groups the user belongs to or created |
| POST | `/api/groups` | Parent/Admin | Create a new group |
| GET | `/api/groups/:id` | Yes | Get group detail (must be member or admin) |
| PATCH | `/api/groups/:id` | Owner/Admin | Update group name/description |
| DELETE | `/api/groups/:id` | Owner | Delete a group |
| POST | `/api/groups/join` | Yes | Join a group by 6-char code |
| DELETE | `/api/groups/:id/members/:userId` | Yes | Remove member (or leave if self) |
| PATCH | `/api/groups/:id/members/:userId/role` | Owner | Change a member's role |
| POST | `/api/groups/:id/wordlists` | Owner/Admin | Assign a wordlist to the group |
| DELETE | `/api/groups/:id/wordlists/:wordlistId` | Owner/Admin | Unassign a wordlist |

### Reports (`/api/reports`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/reports/mastery` | Yes | Get current user's mastery breakdown and weak/strong words |
| GET | `/api/reports/trend?days=` | Yes | Get learning trend data (7-90 days) |
| GET | `/api/reports/student/:id/summary` | Parent/Admin | Get full student report |
| GET | `/api/reports/student/:id/export` | Parent/Admin | Export student mastery as CSV |
| GET | `/api/reports/my/export` | Yes | Export current user's mastery as CSV |

### SRS (`/api/srs`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/srs/review-queue?limit=` | Yes | Get SRS review queue (max 50 items) |
| POST | `/api/srs/review` | Yes | Submit review with SM-2 quality rating (0-5) |
| GET | `/api/srs/count` | Yes | Get number of items due for review |

### Exercises (`/api/exercises`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/exercises/sentence-build?wordlistId=&limit=` | Yes | Get sentence building exercises (wordlistId optional — falls back to active wordlist) |
| GET | `/api/exercises/spelling?wordlistId=&mode=&limit=` | Yes | Get spelling exercises (mode: `definition` or `fill_blank`) |
| POST | `/api/exercises/results` | Yes | Submit exercise results (sentence_build or spelling) |

### PvP (`/api/pvp`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/pvp/opponents?q=` | Yes | Search for opponents by username |
| POST | `/api/pvp/challenge` | Yes | Create a new PvP challenge (persists questions) |
| GET | `/api/pvp/pending` | Yes | Get pending challenges |
| GET | `/api/pvp/active` | Yes | Get active challenges |
| GET | `/api/pvp/history?limit=` | Yes | Get challenge history |
| GET | `/api/pvp/:id` | Yes | Get challenge details |
| GET | `/api/pvp/:id/questions` | Yes | Get questions for a challenge |
| POST | `/api/pvp/:id/accept` | Yes | Accept a challenge |
| POST | `/api/pvp/:id/decline` | Yes | Decline a challenge |
| POST | `/api/pvp/:id/submit` | Yes | Submit answers for a challenge |
| POST | `/api/pvp/:id/rematch` | Yes | Create a rematch challenge |
| GET | `/api/pvp/:id/comparison` | Yes | Get per-question comparison for both players |

## Getting Started

### Prerequisites
- Node.js 18+
- npm or pnpm
- Docker & Docker Compose (for containerised deployment)

### Local Development

**Backend:**
```bash
cd packages/backend
npm install
npm run dev          # Starts on http://localhost:9876
```

**Web Frontend:**
```bash
cd packages/frontend
npm install
npm run dev          # Starts on http://localhost:5173
```

**Mobile:**
```bash
cd packages/mobile
npm install
npx expo start
```

### Docker Deployment

```bash
# Copy and configure environment
cp .env.example .env
# Edit .env with your JWT_SECRET, OIDC credentials, etc.

# Build and start all services
docker-compose up --build -d
```

Services:
- **Frontend:** http://localhost:8080
- **Backend API:** http://localhost:9876/api/health

For production NAS deployment, use the compose files in `deploy/`. See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed instructions.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `JWT_SECRET` | Yes | Secret key for JWT signing (app won't start without it) |
| `NODE_ENV` | No | Environment (`development` or `production`) |
| `DATABASE_PATH` | No | SQLite database file path (default: `./data/vocab-master.db`) |
| `PORT` | No | Backend port (default: `9876`) |
| `CORS_ORIGIN` | Prod | Allowed CORS origin. **Required in production** (default in dev: `http://localhost:5173`) |
| `OIDC_ISSUER` | Yes | Hub OIDC public issuer URL (browser-facing, must match `iss` claim in JWT) |
| `OIDC_INTERNAL_ISSUER` | No | Internal issuer URL for server-to-server calls (falls back to `OIDC_ISSUER`) |
| `OIDC_CLIENT_ID` | Yes | OIDC client identifier registered in the hub |
| `OIDC_CLIENT_SECRET` | Yes | OIDC client secret for confidential client BFF token exchange |
| `VITE_API_URL` | No | Frontend API base URL (default: `http://localhost:9876`) |
| `VITE_OIDC_ISSUER` | No | Hub OIDC issuer URL for frontend redirect |
| `VITE_OIDC_CLIENT_ID` | No | OIDC client ID for frontend PKCE flow |
| `NODE_AUTH_TOKEN` | CI | GitHub Packages classic PAT with `read:packages` scope (for `@danwangdev/auth-client`) |

## Database

SQLite with auto-running migrations on server start. Migrations are numbered sequentially (`001` through `027`) and tracked in a `migrations` table.

Key tables: `users`, `user_settings`, `user_stats`, `refresh_tokens`, `daily_challenges`, `quiz_results`, `quiz_answers`, `study_sessions`, `user_vocabulary`, `notifications`, `link_requests`, `wordlists`, `wordlist_words`, `user_active_wordlist`, `push_tokens`, `audit_log`, `achievements`, `user_achievements`, `leaderboard_entries`, `groups`, `group_members`, `group_wordlists`, `word_mastery`, `pvp_challenges`, `pvp_answers`, `pvp_questions`, `exercise_results`, `exercise_answers`, `user_xp`, `streak_rewards`, `user_rewards`.

## License

Private project.
