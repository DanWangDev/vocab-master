# Rate Limiting & Bot Protection

> **Date:** 2026-03-05
> **Status:** Implemented

## Overview

The application uses a layered defence strategy for public auth endpoints:

1. **IP-based rate limiting** (express-rate-limit) — tiered limits per endpoint
2. **Cloudflare Turnstile** — invisible bot challenge on web forms (zero user friction)
3. **Login brute-force protection** — progressive per-username lockout
4. **Google OAuth** — inherent bot resistance (can't forge Google tokens)

## Architecture

```
Client Request
     │
     ▼
┌─────────────────────┐
│  Registration Limiter│  5 req / hour / IP (register, google)
│  (express-rate-limit)│
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│  Auth Limiter        │  20 req / 15 min / IP (all /api/auth)
│  (express-rate-limit)│
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│  Brute Force Check   │  Per-username lockout (login only)
│  (in-memory Map)     │
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│  Turnstile Verify    │  Cloudflare bot challenge (register + login)
│  (server-side check) │
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│  Zod Validation      │  Input schema validation
└──────────┬──────────┘
           ▼
     Route Handler
```

## Rate Limiters

| Limiter | Window | Max | Applied To |
|---------|--------|-----|------------|
| `registrationLimiter` | 1 hour | 5 / IP | `/api/auth/register`, `/register/student`, `/register/parent`, `/google` |
| `authLimiter` | 15 min | 20 / IP | All `/api/auth/*` |
| `passwordResetLimiter` | 1 hour | 5 / IP | `/forgot-password`, `/reset-password` |

## Cloudflare Turnstile

### How It Works

1. An invisible Turnstile widget on the web page silently analyses browser signals
2. If the visitor is human, the widget generates a one-time token
3. The form sends this token as `turnstileToken` in the JSON body
4. The backend middleware POSTs the token to Cloudflare's `siteverify` endpoint
5. Cloudflare responds with `success: true/false`

### Middleware: `backend/src/middleware/turnstile.ts`

**Bypass rules:**
- **Dev mode** — if `TURNSTILE_SECRET_KEY` env var is not set, middleware passes through
- **Mobile** — if `X-Client-Platform: mobile` header is present, verification is skipped

**Routes protected:**
| Route | Turnstile | Brute Force |
|-------|-----------|-------------|
| `POST /register` | Yes | No |
| `POST /register/student` | Yes | No |
| `POST /register/parent` | Yes | No |
| `POST /login` | Yes | Yes |
| `POST /google` | No | No |
| `POST /forgot-password` | No | No |

### Frontend Widget: `src/components/auth/TurnstileWidget.tsx`

- Uses `@marsidev/react-turnstile` (~2KB)
- Renders invisible widget when `VITE_TURNSTILE_SITE_KEY` is set
- Renders nothing in development (no site key)
- Passes token via `onVerify` callback to form state

### Setup

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com) > **Turnstile** > **Add Site**
2. Choose **Managed** (invisible) widget mode
3. Set the environment variables:

```env
# Backend
TURNSTILE_SECRET_KEY=0x4AAAAAA...

# Frontend (build arg)
TURNSTILE_SITE_KEY=0x4BBBBB...
```

**Test keys (always pass):**
- Site key: `1x00000000000000000000AA`
- Secret key: `1x0000000000000000000000000000000AA`

## Login Brute-Force Protection

### Middleware: `backend/src/middleware/bruteForce.ts`

In-memory `Map<username, { count, lastAttempt, lockedUntil }>` with progressive lockout:

| Failed Attempts | Lockout Duration |
|-----------------|------------------|
| 5 | 30 seconds |
| 10 | 5 minutes |
| 15 | 30 minutes |

- Successful login resets the counter
- Stale entries (>1 hour old) are cleaned up every 15 minutes
- Response includes `retryAfter` (seconds) in the 429 body

**Note:** This is per-process in-memory storage. It resets on server restart. This is acceptable for a NAS deployment with a single backend instance.

## Mobile Bypass

Mobile clients add `X-Client-Platform: mobile` to all request headers. This tells the backend to skip Turnstile verification since:

- Mobile has no browser environment for Turnstile widgets
- Mobile registration is already protected by rate limiting
- Google OAuth on mobile validates tokens server-side (bots can't forge them)

The header is set in:
- `mobile/src/services/ApiService.ts` — `fetchWithAuth()` default headers and all unauthenticated auth methods

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `TURNSTILE_SECRET_KEY` | No | Cloudflare Turnstile secret key (backend). If unset, verification is skipped. |
| `TURNSTILE_SITE_KEY` | No | Cloudflare Turnstile site key (frontend build arg via `VITE_TURNSTILE_SITE_KEY`). If unset, widget is not rendered. |

Both are configured in `docker-compose.yml`.

## i18n Keys

Added to `en/auth.json` and `zh-CN/auth.json`:

| Key | EN | ZH-CN |
|-----|-----|-------|
| `captchaFailed` | Bot verification failed. Please try again. | 人机验证失败，请重试。 |
| `tooManyRegistrations` | Too many registration attempts. Please try again later. | 注册尝试次数过多，请稍后再试。 |
| `accountLocked` | Account temporarily locked due to too many failed attempts. Please try again later. | 由于多次登录失败，账户已被暂时锁定，请稍后再试。 |

## Files Changed

### New Files
- `backend/src/middleware/turnstile.ts`
- `backend/src/middleware/bruteForce.ts`
- `src/components/auth/TurnstileWidget.tsx`

### Modified Files
- `backend/src/index.ts` — added `registrationLimiter`
- `backend/src/routes/auth.ts` — wired turnstile + brute force middleware
- `backend/src/middleware/validate.ts` — added `turnstileToken` to schemas
- `docker-compose.yml` — added Turnstile env vars
- `package.json` — added `@marsidev/react-turnstile`
- `src/components/auth/LoginForm.tsx` — added TurnstileWidget + token state
- `src/components/auth/StudentRegisterForm.tsx` — same
- `src/components/auth/ParentRegisterForm.tsx` — same
- `src/components/auth/AuthPage.tsx` — forwarded turnstileToken
- `src/contexts/AuthContext.tsx` — added turnstileToken param
- `src/services/ApiService.ts` — added turnstileToken param
- `mobile/src/services/ApiService.ts` — added `X-Client-Platform: mobile` header
- `src/i18n/locales/en/auth.json` — added 3 keys
- `src/i18n/locales/zh-CN/auth.json` — added 3 keys
