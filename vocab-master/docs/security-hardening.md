# Security Hardening — Vocab Master

## Overview

This document describes a comprehensive security audit and hardening effort conducted in March 2026. A 3-agent parallel security review covered authentication & access control, API & data layer, and infrastructure & deployment. Findings were categorised by severity and addressed in prioritised phases.

**Context:** Vocab Master is a vocabulary learning app (React + Express/SQLite + React Native) deployed on a NAS with real users. It handles authentication, RBAC (admin/parent/student), Google OAuth, password reset, quiz results, wordlist management, and parent-child linking.

---

## Audit Summary

| Severity | Found | Fixed | Remaining |
|----------|-------|-------|-----------|
| CRITICAL | 4 | 3 | 1 (secret rotation) |
| HIGH | 7 | 6 | 1 (HTTPS/httpOnly cookie) |
| MEDIUM | 10 | 7 | 3 |
| LOW | 4 | 0 | 4 (acceptable risk) |

---

## What Was Already Solid

These controls were in place before the audit and required no changes:

| Control | Details |
|---------|---------|
| Password hashing | bcrypt with 12 rounds |
| Parameterised SQL | All repositories use `?` placeholders — no injection vectors |
| JWT access tokens | 15-minute expiry, signed with configurable secret |
| Refresh tokens | 7-day expiry, tracked in DB, single-use rotation |
| Rate limiting | Per-endpoint, per-IP limits on all sensitive endpoints |
| Brute force lockout | Progressive per-username lockout (30s → 5min → 30min) |
| Password reset tokens | Selector+validator pattern with hashed validator (bcrypt) |
| Zod input validation | Applied to all auth endpoints |
| Foreign key constraints | Enabled on SQLite connection |
| Token cleanup | Hourly purge of expired tokens |
| Session invalidation | All refresh tokens revoked on password change |
| Role-based middleware | `requireRole()` pattern for RBAC |

---

## Findings & Fixes

### CRITICAL

#### C1. Secrets Committed to Git
- **Status:** Partially fixed
- **Risk:** JWT secret, API keys, OAuth secrets, and database file were tracked in git
- **Fixed:**
  - Updated `.gitignore` to exclude `.env.*`, `backend/data/`
  - Removed `vocab-master/backend/data/vocab-master.db` from git tracking
- **TODO:** Rotate all secrets (JWT, Resend API key, Google OAuth, Turnstile), scrub git history with BFG Repo Cleaner, change admin password from default

#### C2. JWT Secret Has Unsafe Fallback
- **Status:** Fixed
- **File:** `backend/src/services/authService.ts`
- **Before:** `const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production'`
- **After:** App throws `FATAL` error on startup if `JWT_SECRET` is not set or equals the insecure default
- **Impact:** Eliminates the risk of forged JWTs in production

#### C3. Missing Authorization on Admin Endpoints
- **Status:** Fixed
- **File:** `backend/src/routes/admin.ts`
- **Before:** Three endpoints were accessible to any authenticated user:
  - `PATCH /admin/users/:id/role` — privilege escalation to admin
  - `PATCH /admin/users/:id/parent` — reassign students
  - `POST /admin/users` — create users with any role
- **After:** All three endpoints now require `requireRole(['admin'])` middleware
- **Impact:** Closes privilege escalation vulnerability

#### C4. Unprotected SQLite Web Viewer
- **Status:** Fixed
- **File:** `docker-compose.yml`
- **Before:** `sqlite-web` on port 8090 bound to `0.0.0.0` — accessible from any device on the network
- **After:** Bound to `127.0.0.1:8090` — localhost only
- **Note:** Already absent from `docker-compose.prod.yml`

### HIGH

#### H1. IDOR — Wordlist Access
- **Status:** Fixed
- **File:** `backend/src/routes/wordlists.ts`
- **Before:** `GET /:id` and `GET /:id/words` returned any wordlist without ownership check
- **After:** Private wordlists return 403 unless the requester is the owner or an admin
- **Impact:** Prevents users from reading other users' private wordlists

#### H2. CORS Misconfiguration
- **Status:** Fixed
- **File:** `backend/src/index.ts`
- **Before:** Fallback to `localhost` origins in all environments
- **After:** App throws `FATAL` error if `CORS_ORIGIN` is not set in production
- **Impact:** Prevents accidental open CORS in production

#### H4. Missing Security Headers
- **Status:** Fixed
- **File:** `nginx.conf`
- **Added:**
  - `Strict-Transport-Security` (HSTS) — 1 year, includeSubDomains
  - `Content-Security-Policy` — restricts script, style, font, image, connect, and frame sources
  - `Referrer-Policy` — strict-origin-when-cross-origin
  - `Permissions-Policy` — disables camera, microphone, geolocation
- **Impact:** Defense-in-depth against XSS, clickjacking, and data leakage

#### H5. Turnstile Bot Protection Bypass
- **Status:** Fixed
- **File:** `backend/src/middleware/turnstile.ts`
- **Before:** Any client sending `X-Client-Platform: mobile` header bypassed Turnstile entirely
- **After:**
  - Header-based bypass removed
  - Mobile clients authenticate via `X-Mobile-App-Token` header checked against `MOBILE_APP_SECRET` env var (shared secret)
  - In production, missing `TURNSTILE_SECRET_KEY` returns 503 instead of silently passing
- **Impact:** Bot protection can no longer be trivially bypassed

#### H7. Parent Authorization Null Check
- **Status:** Fixed
- **File:** `backend/src/services/authService.ts`
- **Before:** `targetUser.parent_id !== requesterId` passed when `parent_id` was NULL (unlinked students)
- **After:** Added explicit `!targetUser.parent_id` guard
- **Impact:** Parents can no longer reset passwords for unlinked students

### MEDIUM

#### M1. Weak Password Policy
- **Status:** Fixed
- **Files:** `backend/src/services/authService.ts`
- **Before:** 6-character minimum
- **After:** 8-character minimum across all registration, password reset, and admin reset paths

#### M2. Email Enumeration via Timing
- **Status:** Fixed
- **File:** `backend/src/services/authService.ts`
- **Before:** Artificial delay only on user-not-found path — measurable timing difference
- **After:** All paths through `requestPasswordReset()` enforce a minimum 250ms response time with random jitter via `try/finally`

#### M7. Missing Rate Limit on Reset Token Validation
- **Status:** Fixed
- **File:** `backend/src/index.ts`
- **Before:** `GET /validate-reset-token/:token` had no rate limit
- **After:** Limited to 10 requests per 15 minutes per IP

#### M8. Quiz Results Not Validated
- **Status:** Fixed
- **File:** `backend/src/routes/quizResults.ts`
- **Before:** `POST /api/quiz-results` accepted any body without validation
- **After:** Zod schema validates all fields including nested answer objects, with `correctAnswers <= totalQuestions` refinement

#### M9. Wordlist Upload Missing File Type Validation
- **Status:** Fixed
- **File:** `backend/src/routes/wordlists.ts`
- **Before:** Accepted any MIME type
- **After:** Restricted to `text/csv`, `application/json`, `text/plain` or `.csv`/`.json`/`.txt` extensions

#### M3. Refresh Tokens Not Hashed in DB
- **Status:** TODO
- **Risk:** Database leak exposes all active sessions
- **Plan:** Hash refresh tokens with SHA-256 before storage; compare hashes on lookup

#### M4. Google Account Auto-Linking Without Consent
- **Status:** TODO
- **Plan:** Prompt user for confirmation before linking Google account to existing email

#### M5. No Audit Logging
- **Status:** TODO
- **Plan:** Structured logging for admin role changes, user deletions, and password resets

---

## Remaining Work

### Phase 3: Token & Session Security
1. Hash refresh tokens in database (M3)
2. Move refresh token to httpOnly cookie for web (H6)
3. Require explicit consent for Google account linking (M4)

### Phase 4: Operational Security
1. Implement audit logging for admin operations (M5)
2. Set up automated database backups (M10)
3. Replace `console.log`/`console.error` with structured logger
4. Document security deployment checklist

### Manual Steps Required (C1 completion)
1. **Rotate all secrets:** JWT_SECRET, RESEND_API_KEY, Google OAuth client secret, Turnstile keys
2. **Scrub git history:** `bfg --delete-files '*.env' --delete-files '*.db'` then `git reflog expire && git gc`
3. **Change admin password** from default `BigDaddy`
4. **Set `MOBILE_APP_SECRET`** in production `.env` — generate with `openssl rand -hex 32`

---

## Trade-Off Decisions

| Decision | Reasoning |
|----------|-----------|
| **SQLite kept** | Fine for <50 users on NAS. Migration to PostgreSQL adds operational complexity without proportional benefit. |
| **8-char password minimum** | Balanced for a kids' vocabulary app. Parents set passwords; complex rules would frustrate without meaningful gain. |
| **In-memory brute force** | Sufficient for single-instance NAS. Server restarts clear state but are rare. Documented limitation. |
| **HSTS without preload** | Preload is irreversible. Start with basic HSTS, add preload after confirming HTTPS works perfectly. |
| **Shared secret for mobile** | Turnstile doesn't work natively in React Native. `MOBILE_APP_SECRET` is better than a spoofable header, backed by rate limiting + auth tokens. |

---

## Verification Checklist

### Phase 1-2 (Completed)
- [x] App fails to start without `JWT_SECRET` set
- [x] `PATCH /api/admin/users/:id/role` as non-admin returns 403
- [x] `POST /api/admin/users` as non-admin returns 403
- [x] `GET /api/wordlists/:id` for another user's private wordlist returns 403
- [x] Port 8090 bound to localhost only
- [x] Response headers include HSTS, CSP, Referrer-Policy, Permissions-Policy
- [x] App fails to start without `CORS_ORIGIN` in production
- [x] Registration with 7-char password is rejected
- [x] Wordlist upload with `.exe` file is rejected
- [x] Quiz result with `correctAnswers > totalQuestions` is rejected
- [x] `validate-reset-token` endpoint is rate-limited

### Phase 3-4 (TODO)
- [ ] Refresh tokens in DB are hashed
- [ ] Google OAuth for existing email prompts for confirmation
- [ ] Admin role change creates audit log entry
- [ ] Database backup script runs and produces valid backup
