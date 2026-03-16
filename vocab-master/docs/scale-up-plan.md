# Vocab Master Scale-Up Plan

## Context

Vocab Master is running on a NAS via Docker, used by ~15 users (family + friends' kids) and growing toward 50. The app needs both **functional scaling** (new features to keep students engaged and give parents/teachers better tools) and **infrastructure scaling** (architecture that won't break at 50 users and can migrate to cloud later). SQLite stays for now, but we add an abstraction layer so PostgreSQL migration is a one-day job later.

## Phase Summary

| Phase | Name | Size | Depends On | Status | Key Outcome |
|-------|------|------|------------|--------|-------------|
| 1 | Infrastructure Foundation | L | - | DONE | Repo abstraction, pagination, cache, job queue, API split |
| 2 | Gamification & Social | L | P1 | Planned | Achievements, leaderboards, enhanced streaks |
| 3 | Multi-Class/Group Mgmt | L | P1 | Planned | Classes, group wordlists, group stats |
| 4 | Analytics & Reports | M | P1, P2 | Planned | Word mastery, CSV/PDF export, email digests |
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

## Phase 2: Gamification & Social

### Database Schema (Migrations 015-016)

**015_add_achievements.ts:**
- `achievements` table: id, slug (unique), name, description, icon, category, threshold, sort_order
- `user_achievements` table: user_id, achievement_id, earned_at (unique per user+achievement)
- Seed ~15 achievements: first_quiz, quizzes_10/50, streak_3/7/14/30, words_10/50/100/500, perfect_quiz, speed_demon

**016_add_leaderboards.ts:**
- `leaderboard_entries` table: user_id, period (weekly/monthly/alltime), period_key, score, quizzes_completed, words_mastered, streak_days

### Backend

- New repositories: `achievementRepository.ts`, `leaderboardRepository.ts` (with interfaces)
- New services: `achievementService.ts` (check & award after quiz/study/challenge), `leaderboardService.ts` (score recalculation)
- New routes: `achievements.ts` (GET /achievements, GET /achievements/mine), `leaderboards.ts` (GET /leaderboards?period=weekly, GET /leaderboards/me)
- Background job: recalculate leaderboard scores every 15 minutes
- Achievement triggers: hook into existing quiz and challenge flows

### Frontend

- New components: `achievements/AchievementBadge.tsx`, `AchievementList.tsx`, `AchievementUnlockedToast.tsx`
- New components: `leaderboard/LeaderboardPage.tsx`, `LeaderboardRow.tsx`, `PeriodSelector.tsx`
- Enhanced: `dashboard/StreakDisplay.tsx` with flame animation (Framer Motion) and 90-day calendar heatmap
- New API modules: `achievementApi.ts`, `leaderboardApi.ts`
- Achievement unlock toast via context provider (global)
- Leaderboard as new page in student navigation

---

## Phase 3: Multi-Class/Group Management

### Database Schema (Migrations 017-018)

**017_add_groups.ts:**
- `groups` table: id, name, description, created_by, join_code (6-char unique), max_members, timestamps
- `group_members` table: group_id, user_id, role (owner/admin/member), joined_at

**018_add_group_wordlists.ts:**
- `group_wordlists` table: group_id, wordlist_id, assigned_at

### Backend

- New: `groupRepository.ts`, `groupService.ts`, `routes/groups.ts`
- Endpoints: CRUD groups, manage members, assign/unassign wordlists, group stats, group leaderboard, join-by-code
- Validation schemas: `createGroupSchema`, `addGroupMemberSchema`, `joinGroupSchema`
- Authorization: owners/admins manage; members view; parents see groups they created; students see groups they belong to
- Modify `wordlistRepository.findAll()` to include wordlists assigned to user's groups

### Frontend

- New components: `groups/GroupList.tsx`, `GroupDetail.tsx`, `GroupMemberList.tsx`, `GroupStats.tsx`, `CreateGroupModal.tsx`, `JoinGroupModal.tsx`, `AssignWordlistModal.tsx`
- "Classes" section in parent dashboard; students see groups in navigation
- New: `groupApi.ts`

---

## Phase 4: Analytics & Reports

### Database Schema (Migration 019)

**019_add_word_mastery.ts:**
- `word_mastery` table: user_id, word, wordlist_id, correct_count, incorrect_count, last_correct/incorrect_at, mastery_level (0=new, 1=learning, 2=familiar, 3=mastered), SRS columns (next_review_at, srs_interval_days, srs_ease_factor) — pre-created for Phase 5
- `email_digest_preferences` table: user_id, frequency (daily/weekly/never), last_sent_at

### Backend

- New: `wordMasteryRepository.ts`, `wordMasteryService.ts` — mastery level calculation
- Modify: quiz answer saving to update `word_mastery` per word answered
- New: `reportService.ts`, `routes/reports.ts` — student summary (JSON), CSV export (Node streams), PDF export (pdfkit)
- New: `digestService.ts`, `jobs/emailDigestJob.ts` — weekly parent email digest (Mondays) via existing Resend integration
- Endpoints: GET /reports/student/:id/summary, /export?format=csv|pdf, GET/PATCH /settings/digest

### Frontend

- New: `reports/ReportDownloadButton.tsx`, `MasteryBreakdown.tsx`, `LearningTrendChart.tsx`
- New: `parent/DigestSettings.tsx`
- Integrate mastery breakdown into existing `UserDetailModal.tsx`
- New: `reportApi.ts`

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
