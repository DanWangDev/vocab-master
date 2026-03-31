# Changelog

All notable changes to the Vocab Master project are documented here.

## 2026-03-31

### Hub Auth Migration — OIDC with PKCE (PR #35)

Authentication now goes through the 11plus-hub instead of standalone JWT. Sign in once at the hub, access all Lab F apps.

**What's new:**
- **Single sign-on via 11+ Hub** — click "Sign in with 11+ Hub" and authenticate at the central hub; no more app-specific passwords
- **Hub link in user menu** — jump to the hub dashboard from the user profile dropdown
- **Back-channel logout** — signing out of the hub automatically signs you out of Vocab Master
- **Automatic user sync** — your hub profile (name, role, email) syncs to Vocab Master on each login

**What's removed:**
- Standalone registration, login, password reset, and Google sign-in forms (all handled by the hub now)
- Turnstile bot protection and brute-force lockout (hub-side responsibility)
- Email service and password reset tokens

**Technical details:**
- OIDC Authorization Code flow with PKCE (S256)
- BFF pattern: backend proxies token exchange, injects `client_secret` (confidential client)
- Hub user sync with 4-level matching: `hub_user_id` → email → username → create new
- 78 new unit tests across auth middleware, user sync, OIDC helpers, and AuthCallback
- Docker compose updated with OIDC env vars and hub network

**Schema changes (migrations 026–027):**
- `hub_user_id` column added to users table for hub identity linking
- Legacy auth columns cleaned up (password reset tokens, brute force tracking)

**Key commits:**
- `3728969` feat: migrate auth from standalone JWT to 11plus-hub OIDC
- `53d2140` fix: confidential client BFF, auth-client v0.2.0, user sync improvements
- `a67bd35` feat: add back-channel logout support using auth-client v0.3.0
- `aed61d0` fix: use auth-client v0.3.1 two-arg discoverOidc
- `e1da9ab` fix: OIDC token exchange bugs and add auth test coverage
- `3cbd560` feat: add 11+ Hub link to user profile dropdown

## 2026-03-22

### Phase 7a — Enhanced Learning & Exam Prep (PR #24)

Sentence building result persistence, spelling exercises (definition + fill-in-the-blank modes), PvP question persistence with rematch support, timed challenge mode (exam simulation), and 7 new achievements (22 total).

**New features:**
- **Spelling exercises** — two modes: definition prompt (type the word from its definition) and fill-in-the-blank (type the missing word in a sentence); forced retry on mistakes for muscle memory reinforcement
- **Timed challenge mode** — exam simulation with per-question countdown at 3 difficulty levels (easy 15s, medium 10s, hard 6s); auto-advance on timeout
- **PvP question persistence** — questions now stored at challenge creation for fairness; rematch button; per-question comparison view
- **Exercise result tracking** — sentence building and spelling results now persist to `exercise_results`/`exercise_answers` tables, feed into word mastery and achievements

**Schema changes (migrations 021–023):**
- `exercise_results` + `exercise_answers` tables for persisting exercise session data
- `pvp_questions` table for storing challenge questions at creation time
- `pvp_challenges.rematch_of` column for rematch tracking
- `quiz_results` CHECK constraint updated to include `'timed'` quiz type
- 7 new achievements: `pvp_wins_5`, `pvp_wins_10`, `pvp_streak_3`, `spelling_20`, `perfect_speller`, `speed_round`, `time_master`

**Key commits:**
- `7d1e828` feat: Phase 7a enhanced learning — exercises, spelling, PvP persistence, timed mode

## 2026-03-18

### Post-Phase Fixes

- `ec2554c` feat: add pronunciation button to quiz mode + fix aria-label i18n
- `6897dba` fix: add error handling for quiz, challenge, study, PvP, and parent dashboard flows
- `21eb56a` test: add service tests for pvp, srs, exercise, group, leaderboard
- `5d54cf7` docs: comprehensive documentation overhaul

## 2026-03-17

### Monorepo Restructure (PR #16)

Migrated the entire repository to a `packages/*` monorepo layout with independent `frontend`, `backend`, `shared`, and `mobile` packages. Updated all path references, CI workflows, and documentation.

- `1f226f4` refactor: monorepo restructure into packages/* layout (#16)

### Post-Phase Fixes

- **PR #17** `6d4cbff` fix: mobile responsive views + achievement unlock animations
- **PR #18** `10b4c36` fix: resolve lint errors in AchievementContext + update docs
- `f6e2969` fix: compact student dashboard + stale chunk handling (#15)

### Phase 6 -- PvP Challenges & Polish (PR #14)

Head-to-head vocabulary challenges with opponent search, accept/decline flow, turn-based answer submission, results comparison, and an error boundary.

- `31939d1` feat: add Phase 6 PvP challenges, error boundary, and polish

### Phase 5 -- Richer Learning Modes (PR #13)

SRS flashcards (SM-2 spaced repetition), sentence-building exercises, word mastery tracking, and review queue.

- `fdf905e` feat: add Phase 5 richer learning modes

## 2026-03-16

### Phase 4 -- Analytics & Reports (PR #12)

Word mastery levels (new / learning / familiar / mastered), learning trends, student summary reports, and CSV export. CI upgraded to GitHub Actions v5 and Node.js 22.

- `b7200bf` feat: add Phase 4 analytics & reports
- `985afdf` ci: upgrade GitHub Actions to v5 and Node.js 22

### Phase 3 -- Group Management (PR #11)

Multi-class/group management with 6-character join codes, member roles (owner / admin / member), and group wordlists.

- `bccaf7d` feat: Phase 3 - multi-class/group management

### Phase 2 -- Gamification (PR #10)

Achievements system (15 achievements, 5 categories) and leaderboards (weekly / monthly / all-time).

- `3e92946` feat: Phase 2 gamification - achievements system and leaderboards

### Phase 1 -- Infrastructure (PR #9)

Repository pattern abstraction, cursor-based pagination, in-memory cache middleware, background job queue, and API route splitting.

- `443fcb5` feat: Phase 1 infrastructure - repository abstraction, pagination, cache, job queue, API split

## 2026-03-14

### Testing & CI (PR #7, PR #8)

Added testing infrastructure with Vitest, CI pipeline with GitHub Actions, and type safety improvements. Fixed chart date parsing, timezone grouping, and accuracy averaging.

- `edd93b2` feat: add testing infrastructure, CI pipeline, and type safety improvements
- `6754702` fix: chart date parsing, timezone grouping, and accuracy averaging

## 2026-03-08

### Security Hardening (PRs #2, #3, #4)

Four phases of security improvements: rate limiting with tiered IP-based limits, Cloudflare Turnstile bot protection, brute-force login protection, security headers (HSTS, CSP, etc.), IDOR protection, audit logging, and structured JSON logging.

- `d4a8076` feat(auth): add rate limiting, Cloudflare Turnstile, and brute-force protection
- `8f15720` Feature/security improvements (#3)
- `9dee64d` Feature/security improvements (#4)

### Enhanced Parent Dashboard (PRs #5, #6)

Practice deep-links from parent weak words, push notifications for student inactivity, configurable on-track thresholds, computed stats replacing cached `user_stats` table.

- `38f94c7` Feature/parent dashboard improvements (#5)
- `7d326be` Feature/enhanced parent insights (#6)

## 2026-03-05

### Mobile App (PR #1)

Expo / React Native mobile app with shared API service, auth context, haptic feedback, EAS Build configuration, and push notification support.

- `d9261a2` Feature/mobile app (#1)

### Google OAuth

Google Sign-In support for parents with post-signup profile completion modal.

- `aa209e9` feat(user): enable user to choose username after logged in via Google

## 2026-01-17 to 2026-01-23 — Initial Development

- `99557d0` Initial commit with vocabulary list
- `eed397d` Containerized deployment with Docker Compose and Nginx
- `f20c8e7` feat(rbac): role-based access control (student/parent/admin)
- `af407f4` feat(stats): unique word tracking and user vocabulary
- `6700844` feat: admin/parent dashboard and add user function
- `4f0c75c` feat: UI redesign, DB migrations, and Docker enhancements
