# Changelog

All notable changes to the Vocab Master project are documented here.

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

- `a84e93d` feat(auth): add Google OAuth sign-in support
