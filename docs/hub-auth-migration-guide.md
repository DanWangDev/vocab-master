# Migrating to Hub OIDC Auth (@danwangdev/auth-client)

Guide for migrating vocab-master from standalone JWT auth to the 11plus-hub OIDC identity provider, based on lessons learned from writing-buddy's migration.

## Overview

The hub acts as an OpenID Connect (OIDC) identity provider. Client apps (writing-buddy, vocab-master) delegate authentication to the hub and receive JWT id_tokens with user claims. The `@danwangdev/auth-client` npm package provides helpers for OIDC discovery, JWT verification, and React hooks.

**Package:** `@danwangdev/auth-client` (GitHub Packages, `@danwangdev` scope)

## Architecture

```
Browser                    Hub (localhost:3009)              App Backend
  |                              |                              |
  |-- OIDC /auth redirect ------>|                              |
  |<-- login page ---------------|                              |
  |-- credentials -------------->|                              |
  |<-- redirect + auth code ---->|                              |
  |-- POST /oidc/token -------->|  (PKCE exchange)             |
  |<-- id_token + access_token --|                              |
  |                              |                              |
  |-- Bearer: id_token -------------------------------->        |
  |                              |   discoverOidc() -------->   |
  |                              |   <-- jwks_uri -----------   |
  |                              |   verifyIdToken() ------->   |
  |                              |   <-- verified claims ----   |
  |<--------------------------------------------- user data     |
```

## Key Gotchas (Issues Encountered)

### 1. Hub OIDC Endpoints Use /oidc/ Prefix

All OIDC endpoints are mounted under `/oidc/`:
- Authorization: `{issuer}/oidc/auth`
- Token exchange: `{issuer}/oidc/token`
- JWKS: `{issuer}/oidc/jwks`
- Session end: `{issuer}/oidc/session/end`
- Discovery: `{issuer}/oidc/.well-known/openid-configuration`

The `discoverOidc()` helper from auth-client already appends `/oidc/.well-known/openid-configuration` to the issuer URL. **Do NOT add `/oidc` to the issuer URL itself** — pass `http://localhost:3009`, not `http://localhost:3009/oidc`.

### 2. Hub Issues Opaque Access Tokens, Not JWTs

The hub's `access_token` is an opaque string (not a JWT). The `id_token` is the JWT containing user claims. **Use the id_token as the Bearer token** for backend API calls.

```typescript
// In the auth callback after token exchange:
const bearerToken = data.id_token ?? data.access_token
setTokens(bearerToken, data.refresh_token ?? null)

// Store opaque access token separately for hub API calls (e.g., refresh)
localStorage.setItem('app_oidc_hub_token', data.access_token)
```

### 3. PKCE Is Required (Public Client, No Client Secret)

The hub enforces PKCE with S256 for all clients. The client is registered with `token_endpoint_auth_method: "none"` — no client secret needed.

```typescript
// Generate PKCE pair before redirect
const codeVerifier = generateRandomHex(32)
const codeChallenge = base64url(sha256(codeVerifier))

sessionStorage.setItem('app_oidc_code_verifier', codeVerifier)
sessionStorage.setItem('app_oidc_state', state)

// Include in auth URL
const params = new URLSearchParams({
  response_type: 'code',
  client_id: clientId,
  redirect_uri: redirectUri,
  scope: 'openid profile email hub',
  code_challenge: codeChallenge,
  code_challenge_method: 'S256',
  state,
})
```

### 4. OIDC Client Must Be Registered in Hub DB

The OIDC client needs to be manually inserted into the hub's `oidc_payloads` table. Without this, you'll get `"client is invalid"` errors.

```sql
INSERT INTO oidc_payloads (id, type, payload)
VALUES (
  'vocab-master-client',
  'client',
  '{
    "client_id": "vocab-master-client",
    "client_name": "Vocab Master",
    "token_endpoint_auth_method": "none",
    "grant_types": ["authorization_code"],
    "response_types": ["code"],
    "redirect_uris": [
      "http://localhost:5173/auth/callback",
      "http://localhost:8080/auth/callback",
      "https://vocab-master.labf.app/auth/callback"
    ],
    "post_logout_redirect_uris": [
      "http://localhost:5173",
      "http://localhost:8080",
      "https://vocab-master.labf.app"
    ],
    "scope": "openid profile email hub"
  }'
);
```

**Important:**
- `grant_types` must only contain `"authorization_code"` — adding `"refresh_token"` causes `"grant_types can only contain implicit or authorization_code"`.
- Include ALL redirect URIs: dev port, Docker port, and production domain.

### 5. React StrictMode Breaks Async useEffect Patterns

React 18+ StrictMode mounts components twice in development. The common pattern of `let cancelled = false` with cleanup `cancelled = true` breaks async flows because:
1. First mount starts the async token exchange
2. StrictMode cleanup runs, setting `cancelled = true`
3. Second mount skips (if guarded by ref)
4. First mount's async code completes, but `cancelled` is now `true` — redirect never fires

**Fix:** Use a `useRef` to prevent double execution, and don't guard the redirect with `cancelled`:

```typescript
const exchangeStarted = useRef(false)

useEffect(() => {
  if (exchangeStarted.current) return
  exchangeStarted.current = true

  async function handleCallback() {
    // ... token exchange ...
    // DO NOT wrap this in `if (!cancelled)` — the ref prevents double execution
    window.location.href = '/'
  }

  handleCallback()
}, [])
```

### 6. Use Full Page Reload After Auth, Not navigate()

After storing tokens, do NOT use React Router's `navigate('/')`. The `AuthProvider`'s `useEffect([], [])` has already run and won't re-trigger. Use `window.location.href = '/'` to force a full page reload so the AuthProvider re-initializes with the token from localStorage.

### 7. JwtVerifier Hardcodes Wrong JWKS Path

The `JwtVerifier` class from auth-client hardcodes `/.well-known/jwks.json` for JWKS discovery, but the hub serves JWKS at `/oidc/jwks`. **Use `discoverOidc()` + `verifyIdToken()` instead:**

```typescript
import { discoverOidc, verifyIdToken } from '@danwangdev/auth-client/server'

const metadata = await discoverOidc(env.OIDC_ISSUER)
const user = await verifyIdToken(token, metadata.jwks_uri, env.OIDC_ISSUER, env.OIDC_CLIENT_ID)
```

### 8. Docker: Backend Can't Reach localhost:3009

Inside a Docker container, `localhost` refers to the container itself, not the host. The backend needs to reach the hub for OIDC discovery and JWKS fetching.

**Solution:** Use two env vars — one for JWT validation (public issuer), one for network discovery (internal):

```typescript
// config/env.ts
OIDC_ISSUER: process.env.OIDC_ISSUER || 'http://localhost:3009',
OIDC_INTERNAL_ISSUER: process.env.OIDC_INTERNAL_ISSUER || process.env.OIDC_ISSUER || 'http://localhost:3009',
```

```typescript
// auth-setup.ts
const metadata = await discoverOidc(env.OIDC_INTERNAL_ISSUER)
// Rewrite jwks_uri if internal differs from public
const jwksUri = env.OIDC_INTERNAL_ISSUER !== env.OIDC_ISSUER
  ? metadata.jwks_uri.replace(env.OIDC_ISSUER, env.OIDC_INTERNAL_ISSUER)
  : metadata.jwks_uri
const user = await verifyIdToken(token, jwksUri, env.OIDC_ISSUER, env.OIDC_CLIENT_ID)
```

The discovered `jwks_uri` contains the public hostname (e.g., `http://localhost:3009/oidc/jwks`) which is unreachable from Docker. The rewrite swaps it to the internal hostname.

**docker-compose.yml:**
```yaml
backend:
  environment:
    - OIDC_ISSUER=http://localhost:3009           # public (matches JWT iss claim)
    - OIDC_INTERNAL_ISSUER=http://hub-app:3009    # internal (Docker network)
  networks:
    - default
    - hub

networks:
  hub:
    external: true
    name: 11plus-hub_default
```

### 9. Helmet CSP Blocks OIDC Redirects (Hub-Side, Already Fixed)

The hub's default `helmet()` CSP had `form-action: 'self'`, which blocked cross-origin OIDC redirects. This is already fixed on hub main — `form-action` now allows `http://localhost:*` and `https://*.labf.app`.

### 10. Hub Generates Ephemeral Signing Keys in Dev

If `OIDC_SIGNING_KEY` is not set, the hub generates a new RSA key on every restart. This means all existing tokens become invalid after a hub restart. In production, set `OIDC_SIGNING_KEY` to a persistent JWK.

### 11. GitHub Packages Auth for npm Install

The `@danwangdev/auth-client` package is hosted on GitHub Packages. Both CI and Docker builds need auth.

**.npmrc** (project root):
```
@danwangdev:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
```

**Dockerfile:**
```dockerfile
COPY package.json package-lock.json .npmrc ./
ARG NODE_AUTH_TOKEN
RUN NODE_AUTH_TOKEN=${NODE_AUTH_TOKEN} npm ci
```

**CI (.github/workflows):**
- Use a classic PAT with `read:packages` scope (fine-grained tokens don't work with GitHub Packages npm)
- Store as a **repository secret** (not environment secret), named `GH_PACKAGE_TOKEN`
- Configure `setup-node` with registry-url and the token

### 12. localStorage Key Collisions

If you store both the bearer token (id_token) and the opaque access token, use distinct localStorage keys. Writing-buddy originally stored both under `labf_oidc_access_token`, causing the opaque token to overwrite the JWT.

**Recommended keys:**
- `labf_oidc_access_token` — the JWT id_token (used as Bearer token)
- `labf_oidc_hub_token` — the opaque access token (for hub API calls)
- `labf_oidc_id_token` — backup copy of the id_token (for logout `id_token_hint`)
- `labf_oidc_refresh_token` — refresh token

## Step-by-Step Migration Plan for Vocab-Master

### Phase 1: Install and Configure

1. Install `@danwangdev/auth-client` package
2. Add `.npmrc` for GitHub Packages
3. Register `vocab-master-client` in hub's `oidc_payloads` table
4. Add env vars: `OIDC_ISSUER`, `OIDC_CLIENT_ID`, `OIDC_INTERNAL_ISSUER`

### Phase 2: Backend Auth Middleware

1. Create `middleware/hub-auth.ts` — extracts Bearer token, calls `discoverOidc()` + `verifyIdToken()`
2. Create `services/user-sync.ts` — upserts hub user claims into local `app_users` table
3. Create `routes/auth-setup.ts` — wires up the middleware with user sync
4. Create migration `XXX-hub-auth-migration.ts`:
   - Create `app_users` table (hub_user_id, email, username, display_name, role, plan, etc.)
   - Migrate existing users where possible (match by email)
5. Update `routes/me.ts` — return user from `app_users` instead of legacy `users` table

### Phase 3: Frontend Auth Flow

1. Create `pages/AuthCallback.tsx` — handles OIDC callback with PKCE exchange
2. Update `contexts/AuthContext.tsx`:
   - Replace login/register with OIDC redirect
   - Replace logout with hub session end
   - Remove password-related methods
3. Update `services/api.ts`:
   - Store/send id_token as Bearer
   - Update refresh token flow to use OIDC token endpoint
   - Fix endpoint URLs to use `/oidc/` prefix
4. Update routes — add `/auth/callback`, remove `/register`, update `/login`

### Phase 4: Docker & CI

1. Update both Dockerfiles — add `.npmrc` copy and `NODE_AUTH_TOKEN` arg
2. Update `docker-compose.yml` — add `NODE_AUTH_TOKEN` build arg, OIDC env vars, hub network
3. Update CI workflow — use `GH_PACKAGE_TOKEN` for npm registry auth

### Phase 5: Cleanup

1. Remove standalone auth routes (register, login, password reset)
2. Remove `authService.ts`, `bcryptjs` dependency
3. Remove Turnstile/CAPTCHA (hub handles this)
4. Remove Google OAuth routes (hub handles this)
5. Keep legacy `users` table read-only for data migration period

## Reference: Hub User Claims in id_token

```json
{
  "sub": "1",
  "username": "BigDaddy",
  "display_name": "Big Daddy",
  "role": "admin",
  "email": "admin@labf.app",
  "email_verified": true,
  "plan": "bundle",
  "features": ["writing", "vocab"],
  "apps": [],
  "aud": "vocab-master-client",
  "exp": 1774446008,
  "iat": 1774442408,
  "iss": "http://localhost:3009"
}
```

The `HubTokenClaims` type from `@danwangdev/auth-client/types` provides TypeScript types for these claims. Note: `display_name` is snake_case in the JWT but your app may use `displayName` (camelCase) — map accordingly.

## Reference: writing-buddy PR

See [PR #23](https://github.com/DanWangDev/writing-buddy/pull/23) for the complete diff of the migration.
