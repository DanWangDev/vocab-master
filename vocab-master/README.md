# 11+ Vocabulary Master

A full-stack vocabulary learning application for children preparing for the 11+ exam (and beyond). Features flashcard study, quizzes, daily challenges, parent dashboards, and custom wordlists — with web and mobile clients backed by a shared API.

## Features

### Learning
- **Flashcard Study** — swipe-through word cards with definitions, synonyms, and example sentences
- **Quiz Mode** — multiple-choice and matching quizzes with accuracy tracking
- **Daily Challenges** — one scored challenge per day with streaks and leaderboards
- **Custom Wordlists** — create, import (CSV), and manage personal word collections; set an active wordlist per user
- **Weak Word Tracking** — automatically identifies words the student gets wrong most often

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
| Auth | JWT (access + refresh tokens), bcrypt, Google OAuth (google-auth-library) |
| Email | Resend (password reset, welcome emails) |
| Icons | Lucide React |
| i18n | i18next, react-i18next |
| Containerisation | Docker, Docker Compose, Nginx reverse proxy |

## Project Structure

```
vocab-master/
├── backend/                  # Express API server
│   ├── src/
│   │   ├── config/           # Database, migration runner
│   │   ├── middleware/       # Auth, validation, rate limiting
│   │   ├── migrations/       # Sequential DB migrations (001–012)
│   │   ├── repositories/     # Data access layer (SQLite)
│   │   ├── routes/           # Express route handlers
│   │   ├── services/         # Business logic (auth, email, Google OAuth)
│   │   ├── types/            # Shared TypeScript interfaces
│   │   └── index.ts          # Server entry point
│   └── Dockerfile
├── mobile/                   # Expo React Native app
│   ├── app/                  # Expo Router screens
│   ├── src/
│   │   ├── contexts/         # AuthContext, NotificationContext
│   │   └── services/         # ApiService (mobile variant)
│   └── app.json
├── src/                      # Web frontend (Vite + React)
│   ├── components/
│   │   ├── admin/            # Admin panel components
│   │   ├── auth/             # Login, register, Google sign-in, profile completion
│   │   ├── common/           # Shared UI primitives (Button, etc.)
│   │   ├── linking/          # Student search & link request modals
│   │   ├── notifications/    # NotificationBell
│   │   ├── parent/           # Parent dashboard, user list, modals
│   │   ├── quiz/             # Quiz mode components
│   │   └── study/            # Flashcard study components
│   ├── contexts/             # AuthContext, NotificationContext
│   ├── i18n/                 # i18next config and locale files (en, zh-CN)
│   └── services/             # ApiService, StorageService
├── shared/                   # Shared types and i18n locales
├── docs/                     # Architecture and planning documents
├── docker-compose.yml        # Multi-container orchestration
├── frontend.Dockerfile       # Web frontend build
├── nginx.conf                # Reverse proxy config
└── package.json              # Root package (web frontend)
```

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

## Getting Started

### Prerequisites
- Node.js 18+
- npm or pnpm
- Docker & Docker Compose (for containerised deployment)

### Local Development

**Backend:**
```bash
cd backend
npm install
npm run dev          # Starts on http://localhost:9876
```

**Web Frontend:**
```bash
npm install
npm run dev          # Starts on http://localhost:5173
```

**Mobile:**
```bash
cd mobile
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
- **DB Viewer:** http://localhost:8090 (SQLite web UI)

See [DEPLOYMENT.md](DEPLOYMENT.md) for NAS deployment instructions.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `JWT_SECRET` | Yes | Secret key for JWT signing |
| `DATABASE_PATH` | No | SQLite database file path (default: `./data/vocab-master.db`) |
| `PORT` | No | Backend port (default: `9876`) |
| `CORS_ORIGIN` | No | Allowed CORS origin (default: `http://localhost:8080`) |
| `VITE_API_URL` | No | Frontend API base URL (default: `http://localhost:9876/api`) |
| `VITE_GOOGLE_CLIENT_ID` | No | Google OAuth client ID for web |
| `GOOGLE_CLIENT_ID_WEB` | No | Google OAuth client ID (backend validation) |
| `GOOGLE_CLIENT_ID_IOS` | No | Google OAuth client ID for iOS |
| `GOOGLE_CLIENT_ID_ANDROID` | No | Google OAuth client ID for Android |
| `RESEND_API_KEY` | No | Resend API key for transactional emails |
| `EMAIL_FROM` | No | Sender email address |

## Database

SQLite with auto-running migrations on server start. Migrations are numbered sequentially (`001` through `012`) and tracked in a `migrations` table.

Key tables: `users`, `user_settings`, `user_stats`, `refresh_tokens`, `password_reset_tokens`, `daily_challenges`, `quiz_results`, `quiz_answers`, `study_sessions`, `user_vocabulary`, `notifications`, `link_requests`, `wordlists`, `wordlist_words`, `user_active_wordlist`, `push_tokens`.

## License

Private project.
