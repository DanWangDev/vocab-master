# Vocab Master Scale-Up Plan

## Context

Vocab Master is running on a NAS via Docker, used by ~15 users (family + friends' kids) and growing toward 50. The app needs both **functional scaling** (new features to keep students engaged and give parents/teachers better tools) and **infrastructure scaling** (architecture that won't break at 50 users and can migrate to cloud later). SQLite stays for now, but we add an abstraction layer so PostgreSQL migration is a one-day job later.

## Phase Summary

| Phase | Name | Size | Depends On | Status | Key Outcome |
|-------|------|------|------------|--------|-------------|
| 1 | Infrastructure Foundation | L | - | DONE | Repo abstraction, pagination, cache, job queue, API split |
| 2 | Gamification & Social | L | P1 | DONE | Achievements, leaderboards, enhanced streaks |
| 3 | Multi-Class/Group Mgmt | L | P1 | DONE | Classes, group wordlists, group stats |
| 4 | Analytics & Reports | M | P1, P2 | DONE | Word mastery, CSV export, learning trends |
| 5 | Richer Learning Modes | L | P4 | DONE | SRS, flashcards, audio, sentence building |
| 6 | PvP Challenges & Polish | M | P2, P3 | DONE | Head-to-head quizzes, error boundaries, code splitting |

Phases 2 and 3 can run in parallel after Phase 1. Phase 4 can start after Phase 2. Each phase is independently deployable.

---

## Phase 1: Infrastructure Foundation (DONE)

No user-facing features. Builds the foundation everything else depends on.

**Branch:** `feature/phase1-infrastructure`
**Tests:** 254 backend + 156 frontend = 410 total

### 1.1 Repository Abstraction Layer (DONE)

Every repository converted from object literal to class with constructor-injected `db`, implementing a TypeScript interface.

**Pattern:**
```typescript
// interfaces/IUserRepository.ts
export interface IUserRepository {
  findById(id: number): UserRow | undefined;
  findByUsername(username: string): UserRow | undefined;
  // ... all current methods
}

// sqlite/SqliteUserRepository.ts
export class SqliteUserRepository implements IUserRepository {
  constructor(private readonly db: Database) {}
  findById(id: number) { return this.db.prepare('...').get(id) as UserRow | undefined; }
}

// index.ts - backward compatible
import { db } from '../config/database';
export const userRepository: IUserRepository = new SqliteUserRepository(db);
```

**Files created:**
- `packages/backend/src/repositories/interfaces/` — 9 interface files + barrel export
- `packages/backend/src/repositories/sqlite/` — 9 implementation files + barrel export
- `packages/backend/src/repositories/index.ts` — rewired to instantiate classes

### 1.2 Enable WAL Mode (DONE)

Added `db.pragma('journal_mode = WAL')` in `packages/backend/src/config/database.ts`.

### 1.3 Pagination Middleware (DONE)

- `packages/backend/src/middleware/pagination.ts` — extracts `page`, `limit`, `sortBy`, `sortOrder` from query params
- `packages/backend/src/types/pagination.ts` — `PaginationParams`, `PaginatedResponse<T>` types
- Backward compatible: defaults to page=1, limit=50 when no params

### 1.4 Split ApiService.ts (DONE)

Split 837-line monolith into domain-specific modules under `packages/frontend/src/services/api/`:
- `baseApi.ts` — shared fetch wrapper, token management, refresh logic
- `authApi.ts`, `statsApi.ts`, `wordlistApi.ts`, `quizApi.ts`, `challengeApi.ts`, `settingsApi.ts`, `notificationApi.ts`, `adminApi.ts`, `linkRequestApi.ts`
- `index.ts` — barrel re-exports
- `ApiService.ts` — thin facade for backward compatibility

### 1.5 In-Memory Response Cache (DONE)

- `packages/backend/src/middleware/cache.ts` — Map-based TTL cache, key = `path:userId:queryHash`
- Configurable TTL per route (default 60s, stats 300s)

### 1.6 Simple Background Job Queue (DONE)

- `packages/backend/src/jobs/jobQueue.ts` — in-process queue using `setInterval`
- Replaced raw `setInterval` calls in `index.ts` with structured queue
- Methods: `register()`, `start()`, `stop()`, `getStatus()`

### 1.7 Health Check Enhancement (DONE)

Enhanced `GET /api/health` with: DB connectivity, DB file size, uptime, memory usage, version.

---

## Phase 2: Gamification & Social (DONE)

**Branch:** `feature/phase2-gamification`
**PR:** #10
**Tests:** 274 backend + 218 frontend = 492 total

### Database Schema (Migrations 015-016) (DONE)

**015_add_achievements.ts:**
- `achievements` table: id, slug (unique), name, description, icon, category, threshold, sort_order
- `user_achievements` table: user_id, achievement_id, earned_at (unique per user+achievement)
- Seeded 15 achievements across 5 categories: quiz (first_quiz, quizzes_10, quizzes_50, perfect_quiz, speed_demon), streak (streak_3, streak_7, streak_14, streak_30), words (words_10, words_50, words_100, words_500), challenge (challenge_first, challenge_10)

**016_add_leaderboards.ts:**
- `leaderboard_entries` table: user_id, period (weekly/monthly/alltime), period_key, score, quizzes_completed, words_mastered, streak_days
- Composite unique index on (user_id, period, period_key)

### Backend (DONE)

- **Repositories:** `IAchievementRepository` + `SqliteAchievementRepository`, `ILeaderboardRepository` + `SqliteLeaderboardRepository`
- **Services:** `achievementService.ts` (evaluates all achievements against user stats, awards new ones, creates notifications), `leaderboardService.ts` (period key generation, score recalculation)
- **Routes:** `achievements.ts` (GET /, GET /mine, POST /check), `leaderboards.ts` (GET /?period=weekly, GET /me)
- **Achievement triggers:** hooked into `quizResults.ts` (after quiz creation) and `challenges.ts` (after challenge completion), returning `newAchievements` in response
- **Background job:** leaderboard recalculation every 15 minutes via job queue
- **Score formula:** `quizzes * avg_score * 0.5 + words * 2 + streak * 10`

### Frontend (DONE)

- **Achievement components:** `AchievementBadge.tsx` (emoji icons, earned/locked states, size variants), `AchievementList.tsx` (grouped by category, progress bar), `AchievementUnlockedToast.tsx` (Framer Motion slide-in, auto-dismiss 5s)
- **Leaderboard components:** `LeaderboardPage.tsx` (period tabs, rank display, current user highlighting), `LeaderboardRow.tsx` (rank badges 🥇🥈🥉, avatar, stats, score)
- **Dashboard:** new Achievement (violet) and Leaderboard (sky blue) mode cards for students
- **API modules:** `achievementApi.ts`, `leaderboardApi.ts` with barrel exports
- **Routes:** lazy-loaded `/achievements` and `/leaderboard` as student-only routes
- **i18n:** English + Chinese translations for both `achievements` and `leaderboard` namespaces, plus dashboard keys

### Deferred Items

- `StreakDisplay.tsx` flame animation and 90-day calendar heatmap — deferred to Phase 4 (Analytics)
- Achievement unlock toast context provider (global) — toast component exists, context wiring deferred

---

## Phase 3: Multi-Class/Group Management (DONE)

**Branch:** `feature/phase3-group-management`
**Tests:** 291 backend + 224 frontend = 515 total

### Database Schema (Migrations 017-018) (DONE)

**017_add_groups.ts:**
- `groups` table: id, name, description, created_by, join_code (6-char unique), max_members, timestamps
- `group_members` table: group_id, user_id, role (owner/admin/member), joined_at (unique per group+user)
- Indexes on created_by, join_code, user_id, group_id

**018_add_group_wordlists.ts:**
- `group_wordlists` table: group_id, wordlist_id, assigned_at (unique per group+wordlist)
- Indexes on group_id, wordlist_id

### Backend (DONE)

- **Repository:** `IGroupRepository` + `SqliteGroupRepository` — CRUD groups, member management, wordlist assignment, `findGroupWordlistIds()` for cross-group wordlist discovery
- **Service:** `groupService.ts` — create/update/delete groups, join by code (6-char hex), member management with role-based authorization (owner > admin > member), wordlist assignment
- **Routes:** `routes/groups.ts` — 9 endpoints: GET /, POST /, GET /:id, PATCH /:id, DELETE /:id, POST /join, DELETE /:id/members/:userId, PATCH /:id/members/:userId/role, POST /:id/wordlists, DELETE /:id/wordlists/:wordlistId
- **Validation schemas:** `createGroupSchema`, `updateGroupSchema`, `joinGroupSchema`, `assignWordlistSchema`, `updateMemberRoleSchema`
- **Authorization:** owners/admins manage; members view; parents see groups they created; students see groups they belong to; system admins bypass all checks

### Frontend (DONE)

- **Group components:** `GroupList.tsx` (list view with join modal), `GroupDetail.tsx` (members, wordlists, join code copy, danger zone), `CreateGroupPage.tsx` (form with name/description)
- **Dashboard:** Groups card (cyan/teal gradient) for both students and parents
- **API module:** `groupApi.ts` with 9 methods matching all backend endpoints
- **Routes:** lazy-loaded `/groups`, `/groups/create`, `/groups/:id` accessible to all authenticated roles
- **i18n:** English + Chinese translations for `groups` namespace, plus dashboard keys

### Deferred Items

- Group stats aggregation (per-member quiz/study stats within group) — deferred to Phase 4
- Group leaderboard (leaderboard filtered by group members) — can be added to Phase 6
- `wordlistRepository.findAll()` modification to include group-assigned wordlists — repository has `findGroupWordlistIds()` ready for integration

---

## Phase 4: Analytics & Reports (DONE)

**Branch:** `feature/phase4-analytics-reports`
**Tests:** 300 backend + 224 frontend = 524 total

### Database Schema (Migration 019) (DONE)

**019_add_word_mastery.ts:**
- `word_mastery` table: user_id, word, wordlist_id, correct_count, incorrect_count, last_correct/incorrect_at, mastery_level (0=new, 1=learning, 2=familiar, 3=mastered), SRS columns (next_review_at, srs_interval_days, srs_ease_factor) — pre-created for Phase 5
- `email_digest_preferences` table: user_id, frequency (daily/weekly/never), last_sent_at

### Backend (DONE)

**Files created:**
- `packages/backend/src/migrations/019_add_word_mastery.ts` — word mastery + email digest tables
- `packages/backend/src/repositories/interfaces/IWordMasteryRepository.ts` — interface with upsert, breakdown, trend queries
- `packages/backend/src/repositories/sqlite/SqliteWordMasteryRepository.ts` — SQLite implementation with mastery level computation
- `packages/backend/src/services/wordMasteryService.ts` — service wrapping repository methods
- `packages/backend/src/services/reportService.ts` — student summary generation and CSV export
- `packages/backend/src/routes/reports.ts` — 5 endpoints

**Files modified:**
- `packages/backend/src/routes/quizResults.ts` — integrated word mastery recording on quiz answer save
- `packages/backend/src/repositories/index.ts` — wired word mastery repository
- `packages/backend/src/index.ts` — registered reports routes

**Endpoints:**
- `GET /api/reports/mastery` — current user's mastery breakdown, weak/strong words
- `GET /api/reports/trend?days=30` — learning trend data (accuracy, quizzes, words per day)
- `GET /api/reports/student/:id/summary` — full student report (parent/admin only)
- `GET /api/reports/student/:id/export` — CSV export of mastery data (parent/admin only)
- `GET /api/reports/my/export` — CSV export of own mastery data

### Frontend (DONE)

**Files created:**
- `packages/frontend/src/components/reports/ReportsPage.tsx` — main reports page with mastery + trends
- `packages/frontend/src/components/reports/MasteryBreakdown.tsx` — animated progress bar with level breakdown
- `packages/frontend/src/components/reports/LearningTrendChart.tsx` — bar charts for accuracy, quizzes, words
- `packages/frontend/src/components/reports/WordMasteryList.tsx` — weak/strong word list display
- `packages/frontend/src/services/api/reportApi.ts` — API module for reports endpoints
- `packages/frontend/src/i18n/locales/en/reports.json` + `zh-CN/reports.json` — translations

**Files modified:**
- `packages/frontend/src/components/dashboard/Dashboard.tsx` — added "My Progress" card for students
- `packages/frontend/src/components/dashboard/ModeCard.tsx` — added 'reports' color variant
- `packages/frontend/src/routes/index.tsx` — lazy-loaded /reports route for students

### Deferred Items

- PDF export (pdfkit) — deferred, CSV sufficient for now
- Email digest service — deferred to future iteration (requires Resend API key)
- Parent `DigestSettings.tsx` — deferred with email digests
- Mastery integration into `UserDetailModal.tsx` — can add when parent view is enhanced

---

## Phase 5: Richer Learning Modes (DONE)

**Branch:** `feature/phase5-learning-modes`
**Tests:** 300 backend + 224 frontend = 524 total
**Database:** No new migration — uses existing `word_mastery` SRS columns from Phase 4

### Backend (DONE)

**Files created:**
- `packages/backend/src/services/srsService.ts` — SM-2 algorithm variant with quality 0-5 scale, interval scheduling, ease factor adjustment
- `packages/backend/src/services/exerciseService.ts` — Sentence building from existing `example_sentences` data
- `packages/backend/src/routes/srs.ts` — 3 endpoints: GET /review-queue, POST /review, GET /count
- `packages/backend/src/routes/exercises.ts` — 1 endpoint: GET /sentence-build

**Files modified:**
- `packages/backend/src/repositories/interfaces/IWordMasteryRepository.ts` — Added `getReviewQueue`, `getReviewQueueCount`, `updateSrsSchedule`, `findByUserAndWord`
- `packages/backend/src/repositories/sqlite/SqliteWordMasteryRepository.ts` — Implemented 4 new methods
- `packages/backend/src/routes/index.ts` — Added srs and exercises route exports
- `packages/backend/src/index.ts` — Mounted `/api/srs` and `/api/exercises` routes

**Endpoints:**
- `GET /api/srs/review-queue?limit=20` — SRS review queue with enriched word data
- `POST /api/srs/review` — Process review with SM-2 algorithm (body: `{ wordMasteryId, quality }`)
- `GET /api/srs/count` — Count of due reviews
- `GET /api/exercises/sentence-build?wordlistId=X&limit=10` — Sentence building exercises

### Frontend (DONE)

**Files created:**
- `packages/frontend/src/hooks/useSpeechSynthesis.ts` — Web Speech API wrapper hook
- `packages/frontend/src/components/common/PronunciationButton.tsx` — Audio pronunciation button
- `packages/frontend/src/components/flashcard/FlashcardCard.tsx` — Swipe-based card with Framer Motion gestures and 3D flip
- `packages/frontend/src/components/flashcard/FlashcardProgress.tsx` — Progress bar with correct/incorrect counters
- `packages/frontend/src/components/flashcard/FlashcardSession.tsx` — Full session controller with SRS queue
- `packages/frontend/src/components/exercises/SentenceBuildCard.tsx` — Tap-to-place token arrangement with answer checking
- `packages/frontend/src/components/exercises/SentenceBuildSession.tsx` — Session controller with wordlist-based exercises
- `packages/frontend/src/services/api/srsApi.ts` — SRS API module
- `packages/frontend/src/services/api/exerciseApi.ts` — Exercise API module
- `packages/frontend/src/i18n/locales/en/flashcard.json` + `zh-CN/flashcard.json` — Flashcard translations
- `packages/frontend/src/i18n/locales/en/exercises.json` + `zh-CN/exercises.json` — Exercise translations

**Files modified:**
- `packages/frontend/src/components/study/FlashCard.tsx` — Added PronunciationButton to word display
- `packages/frontend/src/components/dashboard/Dashboard.tsx` — Added Flashcard Review and Sentence Builder ModeCards
- `packages/frontend/src/components/dashboard/ModeCard.tsx` — Added 'flashcard' (fuchsia) and 'exercises' (lime) color variants
- `packages/frontend/src/routes/index.tsx` — Added lazy-loaded `/flashcards` and `/exercises/sentence-build` routes
- `packages/frontend/src/services/api/index.ts` — Added srsApi and exerciseApi exports
- `packages/frontend/src/hooks/index.ts` — Added useSpeechSynthesis export
- `packages/frontend/src/i18n/index.ts` — Registered flashcard and exercises namespaces
- `packages/frontend/src/i18n/types.ts` — Added flashcard and exercises type declarations
- Dashboard i18n files — Added flashcards, flashcardsDesc, sentenceBuild, sentenceBuildDesc keys

### Deferred Items

- Image-based vocabulary — deferred (requires API key management for Unsplash/Pixabay)
- PronunciationButton in QuizMode `QuestionCard` — can add when quiz UI is refreshed
- SRS fallback to active wordlist for users with no review history — session shows empty state instead

---

## Phase 6: PvP Challenges & Polish (DONE)

**Branch:** `feature/phase6-pvp-polish`
**Tests:** 300 backend (all passing), frontend TypeScript clean

### Database Schema (Migration 020)

**020_add_pvp_challenges.ts:**
- `pvp_challenges` table: challenger/opponent IDs, wordlist_id, status (pending/active/completed/expired/declined), scores, winner_id, question_count, expires_at, timestamps
- `pvp_answers` table: challenge_id, user_id, question_index, word, correct_answer, selected_answer, is_correct, time_spent
- 5 indexes for efficient queries

### Backend (DONE)

- New: `IPvpRepository` interface + `SqlitePvpRepository` implementation
- New: `pvpService.ts` — full challenge lifecycle (create, accept, decline, questions, submit, resolve, expire)
- New: `routes/pvp.ts` — 9 endpoints: POST /challenge, GET /opponents, GET /pending, GET /active, GET /history, GET /:id, GET /:id/questions, POST /:id/accept, POST /:id/decline, POST /:id/submit
- Background job: `pvp-expiration` runs hourly to expire stale challenges
- Notifications at each stage (challenge received, declined, turn, results)
- Achievement triggers for both players on completion

### Frontend (DONE)

- New: `pvp/ChallengeList.tsx` — tabs for pending/active/history, accept/decline actions
- New: `pvp/CreateChallengeModal.tsx` — opponent search, wordlist selection, question count slider
- New: `pvp/ChallengeQuiz.tsx` — multiple-choice quiz with auto-advance, auto-submit
- New: `pvp/ChallengeResults.tsx` — winner/loser/draw display with score comparison
- New: `pvpApi.ts` — all API methods + types
- New: `pvp` i18n namespace (en + zh-CN, 47 keys)
- Dashboard: PvP card with Swords icon, red-orange gradient
- Routes: /pvp, /pvp/:id/play, /pvp/:id/results (lazy-loaded)

### Polish (DONE)

- **Code splitting:** All route components lazy-loaded with `React.lazy()` + `Suspense` (already in place since Phase 1)
- **Error boundaries:** `common/ErrorBoundary.tsx` with retry button, wrapping `RootLayout` Outlet
- **Offline handling / backup improvements:** Deferred — current NAS setup with existing backup script is sufficient for ~50 users

---

## Verification Strategy

After each phase:

1. **Backend tests**: `cd packages/backend && npm test` — all existing + new tests pass
2. **Frontend tests**: `cd packages/frontend && npm test` — all existing + new tests pass
3. **TypeScript**: `npx tsc --noEmit` clean on both frontend and backend
4. **CI**: Push to feature branch, verify GitHub Actions green
5. **Docker build**: `docker compose build` succeeds
6. **Manual smoke test**: Deploy on NAS, verify existing features still work + new features functional
7. **Migration safety**: All migrations are additive (new tables/columns only), no data loss risk

## Implementation Order

Start with **Phase 1** (infrastructure) as it unblocks everything. Then **Phase 2** (gamification) for immediate user engagement. Then **Phase 3** (groups) and **Phase 4** (analytics) can be done in parallel or sequentially. **Phase 5** (SRS/flashcards) and **Phase 6** (PvP) are the final layers.
