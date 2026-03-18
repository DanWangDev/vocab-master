# Security Hardening — Vocab Master

## Overview

This document describes a comprehensive security audit and hardening effort conducted in March 2026. A 3-agent parallel security review covered authentication & access control, API & data layer, and infrastructure & deployment. Findings were categorised by severity and addressed in prioritised phases.

**Context:** Vocab Master is a vocabulary learning app (React + Express/SQLite + React Native) deployed on a NAS with real users. It handles authentication, RBAC (admin/parent/student), Google OAuth, password reset, quiz results, wordlist management, and parent-child linking.

---

## Audit Summary

| Severity | Found | Fixed | Remaining |
|----------|-------|-------|-----------|
| CRITICAL | 4 | 3 | 1 (secret rotation — manual) |
| HIGH | 7 | 7 | 0 |
| MEDIUM | 10 | 9 | 1 (M10 backup — cron setup) |
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
  - Removed `packages/backend/data/vocab-master.db` from git tracking
- **TODO:** Rotate all secrets (JWT, Resend API key, Google OAuth, Turnstile), scrub git history with BFG Repo Cleaner, change admin password from default

#### C2. JWT Secret Has Unsafe Fallback
- **Status:** Fixed
- **File:** `packages/backend/src/services/authService.ts`
- **Before:** `const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production'`
- **After:** App throws `FATAL` error on startup if `JWT_SECRET` is not set or equals the insecure default
- **Impact:** Eliminates the risk of forged JWTs in production

#### C3. Missing Authorization on Admin Endpoints
- **Status:** Fixed
- **File:** `packages/backend/src/routes/admin.ts`
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
- **File:** `packages/backend/src/routes/wordlists.ts`
- **Before:** `GET /:id` and `GET /:id/words` returned any wordlist without ownership check
- **After:** Private wordlists return 403 unless the requester is the owner or an admin
- **Impact:** Prevents users from reading other users' private wordlists

#### H2. CORS Misconfiguration
- **Status:** Fixed
- **File:** `packages/backend/src/index.ts`
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
- **File:** `packages/backend/src/middleware/turnstile.ts`
- **Before:** Any client sending `X-Client-Platform: mobile` header bypassed Turnstile entirely
- **After:**
  - Header-based bypass removed
  - Mobile clients authenticate via `X-Mobile-App-Token` header checked against `MOBILE_APP_SECRET` env var (shared secret)
  - In production, missing `TURNSTILE_SECRET_KEY` returns 503 instead of silently passing
- **Impact:** Bot protection can no longer be trivially bypassed

#### H7. Parent Authorization Null Check
- **Status:** Fixed
- **File:** `packages/backend/src/services/authService.ts`
- **Before:** `targetUser.parent_id !== requesterId` passed when `parent_id` was NULL (unlinked students)
- **After:** Added explicit `!targetUser.parent_id` guard
- **Impact:** Parents can no longer reset passwords for unlinked students

### MEDIUM

#### M1. Weak Password Policy
- **Status:** Fixed
- **Files:** `packages/backend/src/services/authService.ts`
- **Before:** 6-character minimum
- **After:** 8-character minimum across all registration, password reset, and admin reset paths

#### M2. Email Enumeration via Timing
- **Status:** Fixed
- **File:** `packages/backend/src/services/authService.ts`
- **Before:** Artificial delay only on user-not-found path — measurable timing difference
- **After:** All paths through `requestPasswordReset()` enforce a minimum 250ms response time with random jitter via `try/finally`

#### M7. Missing Rate Limit on Reset Token Validation
- **Status:** Fixed
- **File:** `packages/backend/src/index.ts`
- **Before:** `GET /validate-reset-token/:token` had no rate limit
- **After:** Limited to 10 requests per 15 minutes per IP

#### M8. Quiz Results Not Validated
- **Status:** Fixed
- **File:** `packages/backend/src/routes/quizResults.ts`
- **Before:** `POST /api/quiz-results` accepted any body without validation
- **After:** Zod schema validates all fields including nested answer objects, with `correctAnswers <= totalQuestions` refinement

#### M9. Wordlist Upload Missing File Type Validation
- **Status:** Fixed
- **File:** `packages/backend/src/routes/wordlists.ts`
- **Before:** Accepted any MIME type
- **After:** Restricted to `text/csv`, `application/json`, `text/plain` or `.csv`/`.json`/`.txt` extensions

#### M3. Refresh Tokens Not Hashed in DB
- **Status:** Fixed
- **File:** `packages/backend/src/repositories/tokenRepository.ts`
- **Before:** Raw 128-char hex tokens stored in plaintext
- **After:** All tokens hashed with SHA-256 before storage; lookups and deletions hash the raw token before querying
- **Impact:** Database leak no longer exposes active session tokens

#### H6. Tokens Stored in localStorage (XSS Risk)
- **Status:** Fixed
- **Files:** `packages/backend/src/routes/auth.ts`, `packages/backend/src/index.ts`, `packages/frontend/src/services/ApiService.ts`
- **Before:** Both access and refresh tokens stored in localStorage, vulnerable to XSS
- **After:**
  - Refresh token set as `httpOnly`, `secure`, `sameSite=strict` cookie scoped to `/api/auth`
  - Access token kept in memory + localStorage (short-lived, 15min)
  - Frontend sends `credentials: 'include'` on auth requests
  - Mobile clients can still send refresh token in request body as fallback
- **Impact:** Refresh tokens are no longer accessible to JavaScript (XSS-safe)

#### M4. Google Account Auto-Linking Without Consent
- **Status:** Fixed
- **Files:** `packages/backend/src/services/authService.ts`, `packages/backend/src/routes/auth.ts`, `packages/backend/src/middleware/validate.ts`
- **Before:** Auto-linked Google account to existing email without user consent
- **After:** Returns `{ linkPending: true, email }` response; client must re-send with `confirmLink: true` to proceed
- **Impact:** Users must explicitly confirm before their accounts are linked

#### M5. No Audit Logging
- **Status:** Fixed
- **Files:** `packages/backend/src/services/auditService.ts`, `packages/backend/src/services/logger.ts`, `packages/backend/src/migrations/013_add_audit_log.ts`, `packages/backend/src/routes/admin.ts`
- **Before:** No log trail for admin actions
- **After:**
  - New `audit_log` table with indexed columns (action, actor_id, created_at)
  - `auditService.log()` writes to DB and structured JSON logs
  - All admin operations logged: role changes, user creation/deletion, password resets, parent linking, email changes
  - Structured JSON logger (`logger.ts`) replaces all `console.log`/`console.error` calls
- **Impact:** Full audit trail for all sensitive admin operations

---

## Remaining Work

### Phase 3: Token & Session Security (Completed)
1. ~~Hash refresh tokens in database (M3)~~ ✓
2. ~~Move refresh token to httpOnly cookie for web (H6)~~ ✓
3. ~~Require explicit consent for Google account linking (M4)~~ ✓
4. ~~Update Zod password schemas to 8-char minimum~~ ✓

### Phase 4: Operational Security (Completed)
1. ~~Implement audit logging for admin operations (M5)~~ ✓
2. ~~Set up automated database backups (M10)~~ ✓
3. ~~Replace `console.log`/`console.error` with structured logger~~ ✓
4. ~~Document security deployment checklist~~ ✓

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

### Phase 3 (Completed)
- [x] Refresh tokens in DB are hashed (SHA-256)
- [x] Refresh token moved to httpOnly cookie (web); body fallback for mobile
- [x] Google OAuth for existing email prompts for confirmation
- [x] Zod password schemas updated to 8-char minimum

### Phase 4 (Completed)
- [x] Admin role change creates audit log entry
- [x] Database backup script runs and produces valid backup
- [x] All `console.log`/`console.error` replaced with structured JSON logger
- [x] Security deployment checklist documented

---

## M10. Database Backup

**Script:** `packages/backend/scripts/backup.sh`

Features:
- Uses SQLite online backup API (safe during concurrent reads)
- Creates timestamped backups in configurable directory
- 7-day retention by default (configurable via `BACKUP_RETENTION_DAYS`)
- Validates backup file size before keeping
- Structured JSON log output

**Setup (cron):**
```bash
# Daily backup at 2:00 AM
0 2 * * * cd /path/to/vocab-master && ./packages/backend/scripts/backup.sh /path/to/backups >> /var/log/vocab-backup.log 2>&1
```

**Docker volume backup:**
```bash
# Backup from Docker volume
docker run --rm -v vocab-master-data:/data -v /host/backups:/backups alpine \
  cp /data/vocab-master.db /backups/vocab-master_$(date +%Y%m%d_%H%M%S).db
```

---

## Security Deployment Checklist

Before deploying to production, verify all items:

### Secrets & Environment
- [ ] `JWT_SECRET` set to a strong random value (min 64 chars): `openssl rand -hex 32`
- [ ] `JWT_SECRET` does NOT equal `dev-secret-change-in-production`
- [ ] `CORS_ORIGIN` set to exact production domain(s)
- [ ] `MOBILE_APP_SECRET` set: `openssl rand -hex 32`
- [ ] `TURNSTILE_SECRET_KEY` set (required in production)
- [ ] `RESEND_API_KEY` set for email functionality
- [ ] Google OAuth client IDs configured (`GOOGLE_CLIENT_ID_WEB`, etc.)
- [ ] Default admin password changed from initial value
- [ ] No `.env` files committed to git
- [ ] Git history scrubbed of any previously committed secrets

### Infrastructure
- [ ] TLS/HTTPS termination configured (reverse proxy or load balancer)
- [ ] nginx security headers present (HSTS, CSP, Referrer-Policy, Permissions-Policy)
- [ ] SQLite web viewer disabled or bound to localhost only
- [ ] Docker ports not exposed to `0.0.0.0` unnecessarily
- [ ] Database backup cron job configured and tested
- [ ] Backup retention policy active (default: 7 days)

### Application
- [ ] App starts successfully with `NODE_ENV=production`
- [ ] App fails to start without required env vars (JWT_SECRET, CORS_ORIGIN)
- [ ] Rate limiting active on all auth endpoints
- [ ] Brute force protection active on login
- [ ] Turnstile bot protection active (503 if misconfigured)
- [ ] Audit logging writing to `audit_log` table
- [ ] Structured JSON logs visible in Docker logs

### Access Control
- [ ] Admin endpoints require `requireRole(['admin'])`
- [ ] Parent endpoints verify parent-child relationship
- [ ] Private wordlists return 403 for non-owners
- [ ] Password minimum is 8 characters
- [ ] Google account linking requires explicit consent

### Monitoring
- [ ] Health check endpoint responding: `GET /api/health`
- [ ] Docker healthcheck configured and passing
- [ ] Log aggregation set up for structured JSON logs
- [ ] Backup success/failure alerts configured
