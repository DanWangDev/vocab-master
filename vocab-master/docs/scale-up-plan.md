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
| 5 | Richer Learning Modes | L | P4 | Planned | SRS, flashcards, audio, sentence building |
| 6 | PvP Challenges & Polish | M | P2, P3 | Planned | Head-to-head quizzes, code splitting, offline |

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
- `backend/src/repositories/interfaces/` — 9 interface files + barrel export
- `backend/src/repositories/sqlite/` — 9 implementation files + barrel export
- `backend/src/repositories/index.ts` — rewired to instantiate classes

### 1.2 Enable WAL Mode (DONE)

Added `db.pragma('journal_mode = WAL')` in `backend/src/config/database.ts`.

### 1.3 Pagination Middleware (DONE)

- `backend/src/middleware/pagination.ts` — extracts `page`, `limit`, `sortBy`, `sortOrder` from query params
- `backend/src/types/pagination.ts` — `PaginationParams`, `PaginatedResponse<T>` types
- Backward compatible: defaults to page=1, limit=50 when no params

### 1.4 Split ApiService.ts (DONE)

Split 837-line monolith into domain-specific modules under `src/services/api/`:
- `baseApi.ts` — shared fetch wrapper, token management, refresh logic
- `authApi.ts`, `statsApi.ts`, `wordlistApi.ts`, `quizApi.ts`, `challengeApi.ts`, `settingsApi.ts`, `notificationApi.ts`, `adminApi.ts`, `linkRequestApi.ts`
- `index.ts` — barrel re-exports
- `ApiService.ts` — thin facade for backward compatibility

### 1.5 In-Memory Response Cache (DONE)

- `backend/src/middleware/cache.ts` — Map-based TTL cache, key = `path:userId:queryHash`
- Configurable TTL per route (default 60s, stats 300s)

### 1.6 Simple Background Job Queue (DONE)

- `backend/src/jobs/jobQueue.ts` — in-process queue using `setInterval`
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
- `backend/src/migrations/019_add_word_mastery.ts` — word mastery + email digest tables
- `backend/src/repositories/interfaces/IWordMasteryRepository.ts` — interface with upsert, breakdown, trend queries
- `backend/src/repositories/sqlite/SqliteWordMasteryRepository.ts` — SQLite implementation with mastery level computation
- `backend/src/services/wordMasteryService.ts` — service wrapping repository methods
- `backend/src/services/reportService.ts` — student summary generation and CSV export
- `backend/src/routes/reports.ts` — 5 endpoints

**Files modified:**
- `backend/src/routes/quizResults.ts` — integrated word mastery recording on quiz answer save
- `backend/src/repositories/index.ts` — wired word mastery repository
- `backend/src/index.ts` — registered reports routes

**Endpoints:**
- `GET /api/reports/mastery` — current user's mastery breakdown, weak/strong words
- `GET /api/reports/trend?days=30` — learning trend data (accuracy, quizzes, words per day)
- `GET /api/reports/student/:id/summary` — full student report (parent/admin only)
- `GET /api/reports/student/:id/export` — CSV export of mastery data (parent/admin only)
- `GET /api/reports/my/export` — CSV export of own mastery data

### Frontend (DONE)

**Files created:**
- `src/components/reports/ReportsPage.tsx` — main reports page with mastery + trends
- `src/components/reports/MasteryBreakdown.tsx` — animated progress bar with level breakdown
- `src/components/reports/LearningTrendChart.tsx` — bar charts for accuracy, quizzes, words
- `src/components/reports/WordMasteryList.tsx` — weak/strong word list display
- `src/services/api/reportApi.ts` — API module for reports endpoints
- `src/i18n/locales/en/reports.json` + `zh-CN/reports.json` — translations

**Files modified:**
- `src/components/dashboard/Dashboard.tsx` — added "My Progress" card for students
- `src/components/dashboard/ModeCard.tsx` — added 'reports' color variant
- `src/routes/index.tsx` — lazy-loaded /reports route for students

### Deferred Items

- PDF export (pdfkit) — deferred, CSV sufficient for now
- Email digest service — deferred to future iteration (requires Resend API key)
- Parent `DigestSettings.tsx` — deferred with email digests
- Mastery integration into `UserDetailModal.tsx` — can add when parent view is enhanced

---

## Phase 5: Richer Learning Modes

### Backend

- New: `srsService.ts` — SM-2 algorithm variant (correct: interval *= ease_factor; incorrect: reset to 1 day)
- New: `routes/exercises.ts`, `exerciseService.ts`
- Endpoints: GET /srs/review-queue?limit=20, POST /srs/review, GET /exercises/sentence-build?wordlistId=X
- Uses `word_mastery` table from Phase 4

### Frontend

**Flashcard mode (swipe-based):**
- `flashcard/FlashcardSession.tsx`, `FlashcardCard.tsx` (Framer Motion gesture), `FlashcardProgress.tsx`
- Pulls from SRS review queue; falls back to active wordlist for new users

**Audio pronunciation:**
- `hooks/useSpeechSynthesis.ts` — wraps Web Speech API (no backend/storage needed)
- `common/PronunciationButton.tsx` — add to study card, flashcard, and quiz question components

**Sentence building:**
- `exercises/SentenceBuildSession.tsx`, `SentenceBuildCard.tsx` (drag-and-drop word tokens)
- Reuses existing `example_sentences` from `wordlist_words` table

**Image-based vocabulary (optional):**
- Migration 020: add `image_url` column to `wordlist_words`
- `imageService.ts` — Unsplash/Pixabay free tier fetch + cache
- `common/WordImage.tsx` — lazy-loaded with fallback
- Can defer if API key management is undesirable

---

## Phase 6: PvP Challenges & Polish

### Database Schema (Migration 021)

**021_add_pvp_challenges.ts:**
- `pvp_challenges` table: challenger/opponent IDs, wordlist_id, status (pending/active/completed/expired/declined), scores, winner_id, expires_at
- `pvp_answers` table: challenge_id, user_id, question_index, word, answers, is_correct, time_spent

### Backend

- New: `pvpRepository.ts`, `pvpService.ts`, `routes/pvp.ts`, `jobs/pvpExpirationJob.ts`
- Endpoints: POST /pvp/challenge, GET /pvp/pending, POST /pvp/:id/accept|decline|submit, GET /pvp/history
- Flow: async (not real-time) — both players answer independently, results compared when both done
- Notifications at each stage via existing notification system
- Achievement triggers for PvP wins

### Frontend

- New: `pvp/ChallengeList.tsx`, `CreateChallengeModal.tsx`, `ChallengeQuiz.tsx` (reuses QuestionCard), `ChallengeResults.tsx`, `OpponentSelector.tsx`
- New: `pvpApi.ts`

### Polish

- **Code splitting:** React `lazy()` + `Suspense` for role-based bundles (admin, parent, student)
- **Error boundaries:** `common/ErrorBoundary.tsx` with retry button, wrapping each major section
- **Offline handling:** `hooks/useOnlineStatus.ts`, `common/OfflineIndicator.tsx`, queue failed POSTs and replay
- **Backup improvements:** Daily SQLite backup via `.backup` API with 7-day retention

---

## Verification Strategy

After each phase:

1. **Backend tests**: `cd vocab-master/backend && npm test` — all existing + new tests pass
2. **Frontend tests**: `cd vocab-master && npm test` — all existing + new tests pass
3. **TypeScript**: `npx tsc --noEmit` clean on both frontend and backend
4. **CI**: Push to feature branch, verify GitHub Actions green
5. **Docker build**: `docker compose build` succeeds
6. **Manual smoke test**: Deploy on NAS, verify existing features still work + new features functional
7. **Migration safety**: All migrations are additive (new tables/columns only), no data loss risk

## Implementation Order

Start with **Phase 1** (infrastructure) as it unblocks everything. Then **Phase 2** (gamification) for immediate user engagement. Then **Phase 3** (groups) and **Phase 4** (analytics) can be done in parallel or sequentially. **Phase 5** (SRS/flashcards) and **Phase 6** (PvP) are the final layers.
