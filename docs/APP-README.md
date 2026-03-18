# 11+ Vocabulary Master

> **Note:** For the current repository layout, see the root [README](../README.md) and [docs/repo-structure.md](./repo-structure.md). This document describes the application features and API surface.

A full-stack vocabulary learning application for children preparing for the 11+ exam (and beyond). Features flashcard study, quizzes, daily challenges, parent dashboards, and custom wordlists — with web and mobile clients backed by a shared API.

## Features

### Learning
- **Flashcard Study** — swipe-through word cards with definitions, synonyms, and example sentences
- **Quiz Mode** — multiple-choice and matching quizzes with accuracy tracking; achievement unlock toasts on completion
- **Daily Challenges** — one scored challenge per day with streaks and leaderboards; achievement unlock toasts on completion
- **Custom Wordlists** — create, import (CSV), and manage personal word collections; set an active wordlist per user
- **Weak Word Tracking** — automatically identifies words the student gets wrong most often
- **Achievements** — 15 achievements across 5 categories; unlock conditions tracked automatically; toast notifications on quiz and challenge completion
- **Leaderboards** — weekly, monthly, and all-time periods; scoring formula: `quizzes * avg_score * 0.5 + words * 2 + streak * 10`
- **Groups / Classes** — create and manage study groups; 6-character join codes; member roles (owner / admin / member); assign wordlists to groups
- **Analytics & Reports** — word mastery levels (new / learning / familiar / mastered); learning trends over 7-90 days; CSV export for parents and admins
- **SRS Flashcards** — SM-2 spaced repetition algorithm; review queue with configurable limit; pronunciation button; swipe gestures
- **Sentence Building** — tap-to-place token exercises generated from example sentences in wordlists
- **PvP Challenges** — head-to-head vocabulary quizzes; opponent search; accept/decline flow; turn-based answer submission; results comparison

### Accounts & Roles
- **Student accounts** — simple signup (no email required)
- **Parent accounts** — email-based registration with password recovery
- **Google OAuth** — one-click Google sign-in for parents, with post-signup profile completion modal
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
- **Rate limiting** — tiered IP-based limits (registration: 5/hr, auth: 20/15min, password reset: 5/hr, token validation: 10/15min)
- **Cloudflare Turnstile** — invisible bot challenge on web login and registration forms (zero user friction)
- **Brute-force protection** — progressive per-username lockout on login (5 fails: 30s, 10: 5min, 15: 30min)
- **Mobile auth** — mobile clients authenticate via signed app token (`MOBILE_APP_SECRET`) instead of Turnstile
- **Token security** — refresh tokens hashed with SHA-256 in database; served as `httpOnly`, `secure`, `sameSite=strict` cookies (XSS-safe)
- **Password policy** — 8-character minimum enforced on registration, password reset, and admin reset paths
- **IDOR protection** — private wordlists return 403 for non-owners; parent endpoints verify parent-child relationship
- **Google linking consent** — linking a Google account to an existing email requires explicit user confirmation
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
| Auth | JWT (access + refresh tokens), bcrypt, Google OAuth (google-auth-library), Cloudflare Turnstile |
| Email | Resend (password reset, welcome emails) |
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
│   │   │   ├── hooks/           # Custom React hooks (useQuiz, useAudio, useSpeechSynthesis, etc.)
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
| POST | `/register` | No | Legacy student registration |
| POST | `/register/student` | No | Student registration (no email) |
| POST | `/register/parent` | No | Parent registration (email required) |
| POST | `/login` | No | Username + password login |
| POST | `/google` | No | Google OAuth login/register |
| POST | `/logout` | No | Invalidate refresh token |
| POST | `/refresh` | No | Refresh access token |
| GET | `/me` | Yes | Get current user |
| PATCH | `/profile` | Yes | Update own username/display name |
| POST | `/create-student` | Parent | Create student linked to parent |
| POST | `/forgot-password` | No | Request password reset email |
| POST | `/reset-password` | No | Reset password with token |
| GET | `/validate-reset-token/:token` | No | Check if reset token is valid |

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
| GET | `/` | Yes | All achievements with current user's earned status |
| GET | `/mine` | Yes | Only achievements the current user has earned |
| POST | `/check` | Yes | Manually trigger achievement check; returns newly earned |

### Leaderboards (`/api/leaderboards`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/?period=weekly` | Yes | Leaderboard rankings for a period (weekly / monthly / alltime) |
| GET | `/me?period=weekly` | Yes | Current user's ranking in a given period |

### Groups (`/api/groups`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | Yes | List groups the current user belongs to |
| POST | `/` | Parent/Admin | Create a new group |
| GET | `/:id` | Yes | Group detail (must be a member or admin) |
| PATCH | `/:id` | Owner/Admin | Update group name/description |
| DELETE | `/:id` | Owner | Delete a group |
| POST | `/join` | Yes | Join a group by 6-character code |
| DELETE | `/:id/members/:userId` | Yes | Remove a member or leave group |
| PATCH | `/:id/members/:userId/role` | Owner | Change a member's role |
| POST | `/:id/wordlists` | Owner/Admin | Assign a wordlist to the group |
| DELETE | `/:id/wordlists/:wordlistId` | Owner/Admin | Unassign a wordlist from the group |

### Reports (`/api/reports`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/mastery` | Yes | Current user's mastery breakdown + weak/strong words |
| GET | `/trend?days=30` | Yes | Learning trend data (7-90 days) |
| GET | `/student/:id/summary` | Parent/Admin | Full student report |
| GET | `/student/:id/export` | Parent/Admin | Export student mastery as CSV |
| GET | `/my/export` | Yes | Export current user's mastery as CSV |

### SRS (`/api/srs`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/review-queue?limit=20` | Yes | Get review queue (SM-2 spaced repetition) |
| POST | `/review` | Yes | Submit a review (wordMasteryId + quality 0-5) |
| GET | `/count` | Yes | Count of words due for review |

### Exercises (`/api/exercises`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/sentence-build?wordlistId=X&limit=10` | Yes | Get sentence-building exercises for a wordlist |

### PvP Challenges (`/api/pvp`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/opponents?q=` | Yes | Search for opponents |
| POST | `/challenge` | Yes | Create a new PvP challenge |
| GET | `/pending` | Yes | Get pending challenges |
| GET | `/active` | Yes | Get active challenges |
| GET | `/history?limit=20` | Yes | Get challenge history |
| GET | `/:id` | Yes | Get challenge details |
| GET | `/:id/questions` | Yes | Get questions for a challenge |
| POST | `/:id/accept` | Yes | Accept a challenge |
| POST | `/:id/decline` | Yes | Decline a challenge |
| POST | `/:id/submit` | Yes | Submit answers for a challenge |

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
# Edit .env with your JWT_SECRET, Google OAuth client IDs, etc.

# Build and start all services
docker-compose up --build -d
```

Services:
- **Frontend:** http://localhost:8080
- **Backend API:** http://localhost:9876/api/health
- **DB Viewer:** http://localhost:8090 (SQLite web UI, localhost only)

See [DEPLOYMENT.md](DEPLOYMENT.md) for NAS deployment instructions.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `JWT_SECRET` | Yes | Secret key for JWT signing (app won't start without it) |
| `NODE_ENV` | No | Environment (`development` or `production`). Controls startup checks and Turnstile behaviour |
| `DATABASE_PATH` | No | SQLite database file path (default: `./data/vocab-master.db`) |
| `PORT` | No | Backend port (default: `9876`) |
| `CORS_ORIGIN` | Prod | Allowed CORS origin. **Required in production** (default in dev: `http://localhost:5173`) |
| `VITE_API_URL` | No | Frontend API base URL (default: `http://localhost:9876/api`) |
| `VITE_GOOGLE_CLIENT_ID` | No | Google OAuth client ID for web |
| `GOOGLE_CLIENT_ID_WEB` | No | Google OAuth client ID (backend validation) |
| `GOOGLE_CLIENT_ID_IOS` | No | Google OAuth client ID for iOS |
| `GOOGLE_CLIENT_ID_ANDROID` | No | Google OAuth client ID for Android |
| `RESEND_API_KEY` | No | Resend API key for transactional emails |
| `EMAIL_FROM` | No | Sender email address |
| `TURNSTILE_SECRET_KEY` | Prod | Cloudflare Turnstile secret key. In dev, verification is skipped if unset. In production, returns 503 if unset |
| `TURNSTILE_SITE_KEY` | No | Cloudflare Turnstile site key (passed as `VITE_TURNSTILE_SITE_KEY` build arg). If unset, widget is not rendered |
| `MOBILE_APP_SECRET` | No | Shared secret for mobile app Turnstile bypass. Generate with `openssl rand -hex 32` |

## Database

SQLite with auto-running migrations on server start. Migrations are numbered sequentially (`001` through `013`) and tracked in a `migrations` table.

Key tables: `users`, `user_settings`, `user_stats`, `refresh_tokens`, `password_reset_tokens`, `daily_challenges`, `quiz_results`, `quiz_answers`, `study_sessions`, `user_vocabulary`, `notifications`, `link_requests`, `wordlists`, `wordlist_words`, `user_active_wordlist`, `push_tokens`, `audit_log`.

## License

Private project.
