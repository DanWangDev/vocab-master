# Authentication Flows Reference

Comprehensive documentation of every authentication flow in the vocab-master application.
Last updated: 2026-04-02

---

## Architecture Overview

### System Diagram

```
+------------------+         +-------------------+         +------------------+
|                  |         |                   |         |                  |
|    Frontend      | <-----> |    Backend (BFF)  | <-----> |   11+ Hub OIDC   |
|    (React SPA)   |         |    (Express)      |         |   Provider       |
|                  |         |                   |         |                  |
+------------------+         +-------------------+         +------------------+
        |                           |                             |
        |  1. PKCE auth redirect    |                             |
        |  -----------------------> | (browser redirects to hub)  |
        |                           |                             |
        |  2. Auth code callback    |                             |
        |  <----------------------- |                             |
        |                           |                             |
        |  3. Code + verifier       |  4. Code + client_secret   |
        |  -----------------------> |  -------------------------> |
        |                           |                             |
        |  6. id_token, access,     |  5. Token response          |
        |     refresh_token         |  <------------------------- |
        |  <----------------------- |                             |
        |                           |                             |
        |  7. API calls with        |  8. Verify id_token via     |
        |     Bearer id_token       |     JWKS, sync user to DB   |
        |  -----------------------> |  -------------------------> |
        |                           |                             |
        |  9. Back-channel logout   |                             |
        |                           |  <------------------------- |
        |                           |  (logout_token POST)        |
```

### Key Storage Locations

| Key | Storage | Purpose |
|-----|---------|---------|
| `vocab_master_access_token` | localStorage | The hub-issued `id_token` used as Bearer token for API calls |
| `labf_oidc_id_token` | localStorage | Duplicate of id_token (used for logout `id_token_hint`) |
| `labf_oidc_hub_token` | localStorage | The hub `access_token` (opaque, not currently used for API calls) |
| `labf_oidc_refresh_token` | localStorage | Hub `refresh_token` for obtaining new id_tokens |
| `labf_oidc_code_verifier` | sessionStorage | PKCE code verifier (ephemeral, cleared after exchange) |
| `labf_oidc_state` | sessionStorage | OIDC state parameter (ephemeral, cleared after exchange) |
| `vocab_master_migration_done` | localStorage | Flag indicating localStorage data has been migrated to backend |

### Token Types and Their Purposes

| Token | Issuer | Format | Purpose |
|-------|--------|--------|---------|
| `id_token` | Hub OIDC | JWT (RS256) | Primary Bearer token for all API calls. Contains user claims (sub, email, username, role, etc.). Verified by backend via JWKS. |
| `access_token` | Hub OIDC | Opaque | Hub access token. Stored but not used directly by the vocab-master backend. |
| `refresh_token` | Hub OIDC | Opaque | Used to obtain new id_tokens when the current one expires. Sent to backend BFF which proxies to hub with client_secret. |
| `logout_token` | Hub OIDC | JWT | Sent by hub via back-channel logout. Contains `sub` claim to identify which user to revoke. |

### Environment Variables

**Frontend** (set via Vite `import.meta.env`):

| Variable | Default | Purpose |
|----------|---------|---------|
| `VITE_OIDC_ISSUER` | `http://localhost:3009` | Hub OIDC public issuer URL (browser-facing) |
| `VITE_OIDC_CLIENT_ID` | `vocab-master-client` | OIDC client identifier |
| `VITE_API_URL` | `http://localhost:9876` | Backend API base URL (empty string for Nginx proxy) |

**Backend** (set via `process.env`, read in `packages/backend/src/config/env.ts`):

| Variable | Default | Purpose |
|----------|---------|---------|
| `OIDC_ISSUER` | `http://localhost:3009` | Public issuer URL (must match `iss` claim in JWT) |
| `OIDC_INTERNAL_ISSUER` | Falls back to `OIDC_ISSUER` | Internal issuer URL for server-to-server calls (token endpoint, JWKS) |
| `OIDC_CLIENT_ID` | `vocab-master-client` | Client identifier for token exchange |
| `OIDC_CLIENT_SECRET` | `''` (empty) | Client secret injected by BFF during token exchange |

---

## Flow 1: First-Time Login from Hub

### Trigger
User clicks "Vocab Master" link in the 11+ Hub application and is redirected to the vocab-master frontend without an existing local token.

### Steps
1. User lands on any protected route (e.g., `/`) in the vocab-master SPA.
2. `RootLayout` renders, which contains `AuthProvider` (`packages/frontend/src/contexts/AuthContext.tsx:86`).
3. `AuthProvider.useEffect` fires `checkAuth()` (`AuthContext.tsx:91`).
4. `ApiService.hasTokens()` returns `false` (no `vocab_master_access_token` in localStorage).
5. `dispatch({ type: 'LOGOUT' })` is called (`AuthContext.tsx:104`), setting `isAuthenticated = false`, `isLoading = false`.
6. `ProtectedRoute` (`packages/frontend/src/components/routing/ProtectedRoute.tsx:22`) sees `!state.isAuthenticated` and redirects to `/login`.
7. `AuthPage` (`packages/frontend/src/components/auth/AuthPage.tsx`) renders.
8. The auto-login `useEffect` checks: not loading, not authenticated, no error, and `wasAutoLoginAttempted()` returns false.
9. If all conditions pass, `markAutoLoginAttempted()` sets the sessionStorage circuit breaker and `login()` auto-starts the OIDC flow (Flow 2). The user is seamlessly redirected to the hub.
10. If the circuit breaker is set (e.g. after explicit logout or a previous auto-login attempt), the "Sign in with 11+ Hub" button is shown for manual login.

### Components
- `packages/frontend/src/contexts/AuthContext.tsx` -- checkAuth on mount
- `packages/frontend/src/components/routing/ProtectedRoute.tsx` -- redirect to /login
- `packages/frontend/src/components/auth/AuthPage.tsx` -- login UI
- `packages/frontend/src/services/api/baseApi.ts` -- hasTokens()

### Success Path
User sees the login page and can initiate OIDC login.

### Failure Path
If `checkAuth()` throws an unhandled exception, the user remains in `isLoading: true` state and sees the loading spinner indefinitely. In practice, the try/catch in checkAuth prevents this.

### Known Issues
- The `from` location is saved in router state by ProtectedRoute (`Navigate state={{ from: location }}`), but AuthPage does not use it for post-login redirect. After login, role-based redirect in AuthPage takes over.

---

## Flow 2: OIDC Login Flow

### Trigger
Either: (a) the auto-login `useEffect` in AuthPage fires automatically when no circuit breaker is set, or (b) user clicks the "Sign in with 11+ Hub" button manually.

### Steps
1. User clicks button, which calls `handleLogin()` (`AuthPage.tsx:31`).
2. `handleLogin` calls `login()` from AuthContext (`AuthContext.tsx:110`).
3. `login()` calls `startOidcLogin()` (`packages/frontend/src/services/api/oidcHelpers.ts:51`).
4. `startOidcLogin` generates a PKCE code verifier (64 hex chars) and computes SHA-256 code challenge (`oidcHelpers.ts:52-53`).
5. A random state parameter is generated (32 hex chars) (`oidcHelpers.ts:54`).
6. Code verifier is stored in `sessionStorage` under key `labf_oidc_code_verifier` (`oidcHelpers.ts:56`).
7. State is stored in `sessionStorage` under key `labf_oidc_state` (`oidcHelpers.ts:57`).
8. Browser is redirected to `{OIDC_ISSUER}/oidc/auth?response_type=code&client_id=...&redirect_uri=...&scope=openid+profile+email+hub&code_challenge=...&code_challenge_method=S256&state=...` (`oidcHelpers.ts:69`).
9. User authenticates on the hub (outside vocab-master scope).
10. Hub redirects back to `{origin}/auth/callback?code=...&state=...`.

### Components
- `packages/frontend/src/components/auth/AuthPage.tsx` -- button handler
- `packages/frontend/src/contexts/AuthContext.tsx` -- login() method
- `packages/frontend/src/services/api/oidcHelpers.ts` -- startOidcLogin()

### Success Path
Browser navigates to the hub OIDC authorization endpoint. User authenticates and is redirected back.

### Failure Path
- If `crypto.subtle` is unavailable (non-HTTPS in some browsers), `sha256()` will throw. The user sees no explicit error -- the page simply does not redirect.
- If the hub is unreachable, the browser shows a connection error page (outside app control).

### Known Issues
- PKCE scopes are hardcoded: `openid profile email hub` (`oidcHelpers.ts:3`).
- The redirect URI is computed from `window.location.origin`, which means it must match the hub's registered redirect URI exactly (including port).

---

## Flow 3: OIDC Callback

### Trigger
Hub OIDC provider redirects the browser to `/auth/callback?code=...&state=...` after successful authentication.

### Steps
1. React router matches `/auth/callback` and renders `AuthCallback` (`packages/frontend/src/pages/AuthCallback.tsx:17`).
2. `useRef(exchangeStarted)` prevents double execution in React StrictMode (`AuthCallback.tsx:18,22`).
3. `handleCallback()` extracts `code`, `state`, and `error` from URL query parameters (`AuthCallback.tsx:27-29`).
4. If an `error` parameter is present, the error is displayed to the user (`AuthCallback.tsx:31-33`).
5. If `code` or `state` is missing, an error message is shown (`AuthCallback.tsx:36-38`).
6. `exchangeCodeForTokens(code, state)` is called (Flow 4) (`AuthCallback.tsx:42`).
7. On success, `storeOidcTokens(tokens)` saves all tokens to localStorage (`AuthCallback.tsx:43`).
8. `window.location.href = '/'` performs a full page reload (`AuthCallback.tsx:45`).
9. On reload, AuthProvider re-runs checkAuth (Flow 5) and picks up the new token.

### Components
- `packages/frontend/src/pages/AuthCallback.tsx` -- callback handler
- `packages/frontend/src/services/api/oidcHelpers.ts` -- exchangeCodeForTokens, storeOidcTokens

### Success Path
Tokens are stored, page reloads to `/`, AuthProvider detects tokens and authenticates user.

### Failure Path
- Invalid state parameter: `exchangeCodeForTokens` throws "Invalid OIDC state parameter". Error shown in red card with "Back to Login" link (`AuthCallback.tsx:54-68`).
- Missing code verifier: throws "Missing PKCE code verifier". Same error display.
- Token exchange HTTP failure: error message from hub or generic "Token exchange failed" shown.
- Hub returns `error` param (e.g., user denied consent): `error_description` or `error` is displayed.

### Known Issues
- Uses `window.location.href = '/'` instead of `navigate('/')` intentionally (documented as "gotcha #6" in comments). This ensures AuthProvider completely re-initializes.
- If the user opens the callback URL in a different browser tab (without sessionStorage), the code verifier will be missing and the flow will fail.

---

## Flow 4: Token Exchange (BFF)

### Trigger
`exchangeCodeForTokens()` is called by AuthCallback after receiving the authorization code.

### Steps

**Frontend side:**
1. `exchangeCodeForTokens(code, state)` is called (`oidcHelpers.ts:76`).
2. Saved state from sessionStorage is compared with the `state` parameter (`oidcHelpers.ts:81-85`).
3. Code verifier is retrieved from sessionStorage (`oidcHelpers.ts:82`).
4. Both sessionStorage keys are removed (`oidcHelpers.ts:93-94`).
5. POST request is sent to `{API_BASE_URL}/api/auth/oidc/token` with JSON body: `{ grant_type: 'authorization_code', code, redirect_uri, code_verifier }` (`oidcHelpers.ts:96-105`).

**Backend side:**
6. `POST /api/auth/oidc/token` handler receives the request (`packages/backend/src/routes/auth.ts:57`).
7. Handler validates `grant_type` is present (`auth.ts:62`).
8. For `authorization_code` grant, validates `code`, `redirect_uri`, `code_verifier` are present (`auth.ts:73-76`).
9. Builds URL-encoded body with `client_id` and `client_secret` injected from server env (`auth.ts:67-71`).
10. POST to `{OIDC_INTERNAL_ISSUER}/oidc/token` with the complete body (`auth.ts:92-96`).
11. Response from hub is forwarded to the frontend as-is (`auth.ts:106`).

**Frontend continuation:**
12. Frontend receives `{ id_token, access_token, refresh_token }` from the BFF.
13. `storeOidcTokens()` stores tokens (`oidcHelpers.ts:119-132`):
    - `id_token` -> `vocab_master_access_token` (used as Bearer token)
    - `id_token` -> `labf_oidc_id_token` (used for logout hint)
    - `access_token` -> `labf_oidc_hub_token`
    - `refresh_token` -> `labf_oidc_refresh_token` (if present)

### Components
- `packages/frontend/src/services/api/oidcHelpers.ts` -- exchangeCodeForTokens, storeOidcTokens
- `packages/backend/src/routes/auth.ts` -- POST /api/auth/oidc/token
- `packages/backend/src/config/env.ts` -- OIDC_INTERNAL_ISSUER, OIDC_CLIENT_SECRET

### Success Path
Tokens are returned to frontend and stored in localStorage.

### Failure Path
- Hub rejects the code (expired, already used): hub returns HTTP 4xx, backend forwards error, frontend throws with error_description.
- Missing client_secret on backend: hub returns `invalid_client`, forwarded to frontend.
- Network error between backend and hub: backend catches, returns 500 with `{ error: 'server_error', error_description: 'Token exchange failed' }`.

### Known Issues
- The BFF uses `OIDC_INTERNAL_ISSUER` for the token endpoint (server-to-server) but `OIDC_ISSUER` for JWT verification (must match `iss` claim). If these are misconfigured, token exchange succeeds but subsequent token verification fails.
- `client_secret` defaults to empty string if not configured (`env.ts:8`). This will cause hub rejection if the client is registered as confidential.

---

## Flow 5: Session Restore on Page Load

### Trigger
User refreshes the page or navigates directly to a URL while having tokens in localStorage.

### Steps
1. `AuthProvider` mounts, `useEffect` fires `checkAuth()` (`AuthContext.tsx:91`).
2. `ApiService.hasTokens()` checks `baseApi.accessToken` which was initialized from `localStorage.getItem('vocab_master_access_token')` in the `BaseApi` constructor (`baseApi.ts:24`). Returns `true`.
3. `ApiService.getCurrentUser()` is called (`AuthContext.tsx:94`), which delegates to `authApi.getCurrentUser()` (`authApi.ts:36`).
4. `authApi.getCurrentUser()` calls `baseApi.fetchWithAuth('/api/auth/me')` (`authApi.ts:42`).
5. `fetchWithAuth` attaches `Authorization: Bearer {id_token}` header (`baseApi.ts:62`).
6. Request hits `GET /api/auth/me` on the backend (`auth.ts:162`).
7. `authMiddleware` extracts token from Authorization header (`packages/backend/src/middleware/auth.ts:42`).
8. `verifyToken()` calls `verifyAndSyncHubUser(token)` (`auth.ts:32`, `packages/backend/src/middleware/hubAuth.ts:50`).
9. `verifyAndSyncHubUser` verifies the id_token JWT via JWKS (`hubAuth.ts:28-29`) using `@danwangdev/auth-client/server`.
10. `syncHubUser(claims)` upserts the user in the local SQLite database (`packages/backend/src/services/hubUserSync.ts:28`).
11. `unrevokeSubject(claims.sub)` is called to clear any BCL revocation for this sub (`hubAuth.ts:53`).
12. `isRevoked(payload.hubUserId)` is checked (`auth.ts:33`). If revoked, throws.
13. `req.user` is set with `{ userId, username, role, hubUserId }` (`auth.ts:53`).
14. `updateLastSeen(payload.userId)` updates the `last_seen_at` column (throttled to once per 5 minutes) (`auth.ts:55`).
15. `/me` handler returns user data from the local DB (`auth.ts:174-184`).
16. Frontend receives user, dispatches `AUTH_SUCCESS` (`AuthContext.tsx:96`).

### Components
- `packages/frontend/src/contexts/AuthContext.tsx` -- checkAuth
- `packages/frontend/src/services/api/baseApi.ts` -- constructor, fetchWithAuth
- `packages/frontend/src/services/api/authApi.ts` -- getCurrentUser
- `packages/backend/src/middleware/auth.ts` -- authMiddleware, verifyToken
- `packages/backend/src/middleware/hubAuth.ts` -- verifyAndSyncHubUser, verifyHubToken
- `packages/backend/src/services/hubUserSync.ts` -- syncHubUser
- `packages/backend/src/routes/auth.ts` -- GET /api/auth/me

### Success Path
User is authenticated, `isAuthenticated = true`, protected routes render normally. User data is fresh from the local DB (synced from hub claims on every request).

### Failure Path
- Token expired or invalid: `verifyAndSyncHubUser` throws, `authMiddleware` returns 401. `fetchWithAuth` triggers token refresh (Flow 6). If refresh also fails, `ApiService.clearTokens()` is called and `getCurrentUser()` returns `null`. `checkAuth` dispatches `LOGOUT`, user sees login page.
- Session revoked via BCL: `isRevoked()` returns true, auth middleware returns 401 with "Session revoked via back-channel logout". Same refresh/logout cascade.
- Network error: `fetchWithAuth` throws, caught by checkAuth's catch block, `clearTokens()` called, user redirected to login.

### Known Issues
- `syncHubUser` runs on every authenticated request (every time the token is verified). This updates username, display_name, email, and role from hub claims. This means local profile edits to these fields will be overwritten on the next request if they differ from hub claims.
- The `unrevokeSubject` call on every successful verification means that if a user logs back in, any prior BCL revocation is automatically cleared.

---

## Flow 6: Token Refresh on 401

### Trigger
Any API call returns HTTP 401 and the `retry` parameter is `true` (default).

### Steps
1. `fetchWithAuth` receives a 401 response (`baseApi.ts:72`).
2. `this.refreshAccessToken()` is called (`baseApi.ts:74`).
3. `refreshAccessToken` checks if a refresh is already in progress (deduplication via `this.refreshPromise`) (`baseApi.ts:95-97`).
4. Calls `refreshOidcToken()` from oidcHelpers (`baseApi.ts:100`), which triggers Flow 7.
5. On success, `this.accessToken` is updated with the new id_token (`baseApi.ts:101`).
6. The original request is retried with `retry = false` (`baseApi.ts:75`).

### Components
- `packages/frontend/src/services/api/baseApi.ts` -- fetchWithAuth, refreshAccessToken
- `packages/frontend/src/services/api/oidcHelpers.ts` -- refreshOidcToken

### Success Path
New token is obtained, original request succeeds on retry.

### Failure Path
- Refresh fails (expired refresh_token, hub down): `refreshAccessToken` throws, `clearTokens()` is called (`baseApi.ts:77`), error `"Session expired. Please login again."` is thrown (`baseApi.ts:78`).
- The calling code in AuthContext's `checkAuth` catches this and dispatches `LOGOUT`.
- For non-checkAuth callers (e.g., saving quiz results), the error propagates to the component.

### Known Issues
- Concurrent requests that all get 401 will all attempt refresh, but the deduplication (`this.refreshPromise`) ensures only one actual refresh HTTP call is made. Other callers await the same promise.
- After `clearTokens()` on refresh failure, the in-memory `accessToken` is null but the OIDC-specific localStorage keys (`labf_oidc_*`) are NOT cleared. Only `vocab_master_access_token` is removed. However, this is acceptable because the next login flow will overwrite them, and they cannot be used without the main access token key.
- The retry is done with `retry = false`, so if the refreshed token also gets 401, it will not attempt another refresh -- it will throw the error from the response body.

---

## Flow 7: Token Refresh (BFF)

### Trigger
`refreshOidcToken()` is called by `baseApi.refreshAccessToken()`.

### Steps

**Frontend side:**
1. `refreshOidcToken()` reads `labf_oidc_refresh_token` from localStorage (`oidcHelpers.ts:161`).
2. If no refresh token exists, throws "No refresh token available" (`oidcHelpers.ts:163`).
3. POST to `{API_BASE_URL}/api/auth/oidc/token` with `{ grant_type: 'refresh_token', refresh_token }` (`oidcHelpers.ts:167-174`).

**Backend side:**
4. `POST /api/auth/oidc/token` handler receives the request (`auth.ts:57`).
5. `grant_type` is `refresh_token`, handler validates `refresh_token` is present (`auth.ts:81-85`).
6. Builds URL-encoded body with `client_id`, `client_secret`, `grant_type`, `refresh_token` (`auth.ts:67-71,86`).
7. POST to `{OIDC_INTERNAL_ISSUER}/oidc/token` (`auth.ts:92-96`).
8. Hub returns new token set (new id_token, access_token, possibly new refresh_token).
9. Backend forwards response to frontend (`auth.ts:106`).

**Frontend continuation:**
10. `storeOidcTokens(data)` updates all localStorage keys with new tokens (`oidcHelpers.ts:181`).
11. Returns the new `id_token` (`oidcHelpers.ts:182`).

### Components
- `packages/frontend/src/services/api/oidcHelpers.ts` -- refreshOidcToken
- `packages/backend/src/routes/auth.ts` -- POST /api/auth/oidc/token (refresh_token grant)
- `packages/backend/src/config/env.ts` -- OIDC_INTERNAL_ISSUER, OIDC_CLIENT_SECRET

### Success Path
New tokens are stored. The new `id_token` is returned to `baseApi` for the retry.

### Failure Path
- No refresh token in localStorage: throws immediately, no network call.
- Hub rejects refresh token (expired, revoked): returns HTTP 4xx, frontend throws "Token refresh failed".
- Network error: fetch throws, propagates up.

### Known Issues
- If the hub issues a new refresh_token during refresh (token rotation), `storeOidcTokens` correctly saves it. If the hub does NOT return a new refresh_token, the existing one remains in localStorage (the `if (tokens.refresh_token)` guard in `storeOidcTokens` at line 129 only writes if present, leaving the old value).

---

## Flow 8: Back-Channel Logout (BCL)

### Trigger
User logs out of the 11+ Hub (or an admin force-logs them out). Hub OIDC provider sends a back-channel logout notification.

### Steps
1. Hub POSTs `application/x-www-form-urlencoded` body with `logout_token` to `{vocab-master-backend}/api/auth/backchannel-logout` (`auth.ts:29`).
2. Handler extracts `logout_token` from `req.body` (`auth.ts:32`).
3. If missing or not a string, returns 400 `{ error: 'missing_logout_token' }` (`auth.ts:33-35`).
4. `getJwksUri()` fetches and caches the JWKS URI from hub's OIDC discovery (`hubAuth.ts:15`).
5. `verifyLogoutToken(logoutToken, jwksUri, issuer, clientId)` from `@danwangdev/auth-client/server` verifies the JWT signature and claims (`auth.ts:39`).
6. `revokeSubject(sub)` adds the user's `sub` to an in-memory revocation set (`auth.ts:40`).
7. Responds with 200 (empty body) (`auth.ts:41`).
8. On subsequent API calls from this user, `authMiddleware` calls `verifyToken` which checks `isRevoked(payload.hubUserId)` (`auth.ts:33`). Returns true, throws "Session revoked via back-channel logout".
9. Frontend receives 401, attempts refresh. If refresh succeeds with a new token, `verifyAndSyncHubUser` calls `unrevokeSubject(claims.sub)` (`hubAuth.ts:53`) and the user is re-authenticated.

### Components
- `packages/backend/src/routes/auth.ts` -- POST /api/auth/backchannel-logout
- `packages/backend/src/middleware/hubAuth.ts` -- getJwksUri
- `packages/backend/src/middleware/auth.ts` -- verifyToken, isRevoked check
- `@danwangdev/auth-client/server` -- verifyLogoutToken, revokeSubject, isRevoked, unrevokeSubject

### Success Path
User's session is revoked server-side. Next API call from frontend fails with 401, triggering refresh or logout.

### Failure Path
- Invalid logout_token (bad signature, wrong audience): `verifyLogoutToken` throws, handler returns 400 `{ error: 'invalid_token' }`. User session remains active.
- Hub cannot reach the backend (network issue): BCL fails silently on hub side. User session remains active in vocab-master until the id_token naturally expires.

### Known Issues
- Revocation is **in-memory** (uses `@danwangdev/auth-client/server`'s internal Map/Set). If the backend restarts, all revocations are lost. Users whose sessions were BCL-revoked will be able to use their existing tokens until they expire.
- `unrevokeSubject` is called on every successful token verification (`hubAuth.ts:53`). This means if a user's token is still valid after BCL (before refresh), the verification itself would unrevoke them. However, the `isRevoked` check in `auth.ts:33` happens AFTER `verifyAndSyncHubUser` returns, and `verifyAndSyncHubUser` calls `unrevokeSubject` at line 53 of `hubAuth.ts`. This means a revoked user who still has a valid id_token will be UNREVOKED on their next request. This appears to be intentional -- the assumption is that if the id_token is still valid at the OIDC level, the user should be allowed in.

---

## Flow 9: User-Initiated Logout

### Trigger
User clicks the "Sign Out" button in the UserMenu dropdown.

### Steps
1. User clicks "Sign Out" in `UserMenu` (`packages/frontend/src/components/common/UserMenu.tsx:110-115`).
2. `handleLogout()` is called (`UserMenu.tsx:31`).
3. `setIsOpen(false)` closes the dropdown menu (`UserMenu.tsx:32`).
4. `logout()` is called from AuthContext (`UserMenu.tsx:33`).
5. `AuthContext.logout()` calls `ApiService.clearTokens()` which calls `baseApi.clearTokens()` (`AuthContext.tsx:115`). This removes `vocab_master_access_token` from localStorage and sets `this.accessToken = null`.
6. `dispatch({ type: 'LOGOUT' })` clears auth state (`AuthContext.tsx:116`).
7. `startOidcLogout()` is called (`AuthContext.tsx:117`, `oidcHelpers.ts:137`).
8. `startOidcLogout` reads `labf_oidc_id_token` from localStorage for the logout hint (`oidcHelpers.ts:138`).
9. All OIDC localStorage keys are removed: `vocab_master_access_token`, `labf_oidc_id_token`, `labf_oidc_hub_token`, `labf_oidc_refresh_token` (`oidcHelpers.ts:141-144`).
10. Browser redirects to `{OIDC_ISSUER}/oidc/session/end?post_logout_redirect_uri={origin}&id_token_hint={id_token}` (`oidcHelpers.ts:153`).
11. Hub processes the logout and redirects back to `{origin}` (the app root).
12. On return, AuthProvider runs checkAuth, finds no tokens, shows login page.
13. `navigate('/login')` in UserMenu (`UserMenu.tsx:34`) fires but is superseded by the `window.location.href` redirect in step 10.

### Components
- `packages/frontend/src/components/common/UserMenu.tsx` -- handleLogout
- `packages/frontend/src/contexts/AuthContext.tsx` -- logout()
- `packages/frontend/src/services/api/oidcHelpers.ts` -- startOidcLogout
- `packages/frontend/src/services/api/baseApi.ts` -- clearTokens

### Success Path
All local tokens cleared, browser redirected to hub logout, then back to app origin, user sees login page.

### Failure Path
- Hub logout endpoint unreachable: browser shows connection error. Local tokens are already cleared, so refreshing will show the login page. However, the hub session remains active, and re-login will auto-authenticate without credentials.
- If `id_token_hint` is missing (already cleared), hub may still process logout but cannot identify the session. Behavior depends on hub implementation.

### Known Issues
- `clearTokens()` in `baseApi` only removes `vocab_master_access_token`. The OIDC-specific keys are removed separately by `startOidcLogout`. There is a brief moment between step 5 and step 9 where OIDC keys still exist but the main access token is gone.
- `navigate('/login')` at line 34 of UserMenu.tsx is effectively a no-op because `window.location.href` in `startOidcLogout` triggers a full page navigation that supersedes React Router navigation.
- The "Sign Out" button is disabled while `appState.isSyncing` is true (`UserMenu.tsx:114`), preventing logout during active data sync.

---

## Flow 10: Role-Based Routing

### Trigger
An authenticated user navigates to a route that is restricted to specific roles.

### Steps
1. Routes are defined with `RoleRoute` wrappers in `packages/frontend/src/routes/index.tsx`.
2. Student routes (study, quiz, etc.) are wrapped with `<RoleRoute allowedRoles={['student']} />` (`index.tsx:159`).
3. Parent routes are wrapped with `<RoleRoute allowedRoles={['parent']} />` (`index.tsx:234`).
4. Admin routes are wrapped with `<RoleRoute allowedRoles={['admin']} />` (`index.tsx:243`).
5. Groups and some wordlist routes allow multiple roles (e.g., `['admin', 'parent']`) (`index.tsx:262`).
6. `RoleRoute` (`packages/frontend/src/components/routing/RoleRoute.tsx:8`) reads `state.user?.role` from AuthContext.
7. If user's role is not in `allowedRoles`, redirects to `/` (`RoleRoute.tsx:15`).
8. If role matches, renders child routes via `<Outlet />` (`RoleRoute.tsx:18`).

**Post-login redirect in AuthPage:**
9. When `AuthPage` detects `state.isAuthenticated && state.user`, it redirects based on role (`AuthPage.tsx:16-28`):
   - `parent` -> `/parent`
   - `admin` -> `/admin`
   - Default (student) -> `/`

### Components
- `packages/frontend/src/components/routing/RoleRoute.tsx` -- role check and redirect
- `packages/frontend/src/components/auth/AuthPage.tsx` -- post-login role redirect
- `packages/frontend/src/routes/index.tsx` -- route definitions with RoleRoute wrappers

### Success Path
User is routed to the appropriate dashboard for their role. Students see the main dashboard, parents see the parent dashboard, admins see the admin panel.

### Failure Path
- User with wrong role tries to access a restricted route: silently redirected to `/`. No error message shown.
- User role is undefined (corrupted state): `RoleRoute` treats this as unauthorized and redirects to `/`.

### Known Issues
- The redirect for unauthorized role is to `/` (home), not to a specific "access denied" page. This can be confusing if a parent navigates to a student URL -- they are silently bounced to home.
- Backend role enforcement via `requireRole` middleware (`auth.ts:91-105`) provides a second layer of protection. Even if frontend routing is bypassed, the API will reject requests from wrong roles with 403.
- Role mapping from hub: the hub uses generic roles (e.g., `member`). The `mapHubRole` function in `hubUserSync.ts:12` maps `admin` directly but defaults non-admin to `student` for new users. Existing users preserve their local role. A parent must be explicitly set to `parent` role in the local DB (e.g., via admin panel) -- the hub cannot promote a user to `parent`.

---

## Flow 11: Protected Route Guard

### Trigger
An unauthenticated user (or user with expired/no tokens) tries to access any route under the `ProtectedRoute` wrapper.

### Steps
1. `ProtectedRoute` (`packages/frontend/src/components/routing/ProtectedRoute.tsx:5`) reads auth state.
2. If `state.isLoading` is true, renders a full-screen loading spinner (`ProtectedRoute.tsx:9-17`).
3. If `!state.isAuthenticated`, renders `<Navigate to="/login" state={{ from: location }} replace />` (`ProtectedRoute.tsx:22-24`).
4. If authenticated, renders `<Outlet />` to show child routes (`ProtectedRoute.tsx:26`).

### Components
- `packages/frontend/src/components/routing/ProtectedRoute.tsx`
- `packages/frontend/src/contexts/AuthContext.tsx` -- provides auth state

### Success Path
Authenticated user sees the requested page. Unauthenticated user is redirected to login with the intended destination saved in router state.

### Failure Path
- If AuthContext is stuck in `isLoading: true` (e.g., network timeout on checkAuth), user sees the loading spinner indefinitely with no timeout or retry mechanism.

### Known Issues
- The `from` location is saved in `state` during redirect but is not consumed by AuthPage for post-login redirect. AuthPage always redirects based on role, not to the originally requested URL.
- All protected routes share the same guard. There is no per-route authentication level (e.g., re-authentication for sensitive operations).

---

## Flow 12: Parent Creates Student

### Trigger
A parent user submits the "create student" form in the ParentDashboard.

### Steps

**Frontend side:**
1. Parent calls `authApi.createStudentForParent(username, password, displayName)` (`authApi.ts:14`).
2. `baseApi.fetchWithAuth` sends POST to `/api/auth/create-student` with Bearer token (`authApi.ts:19-22`).

**Backend side:**
3. `authMiddleware` verifies the parent's token (`auth.ts:114`).
4. `requireRole(['parent'])` checks the user is a parent (`auth.ts:114`).
5. `validate(createStudentByParentSchema)` validates the request body (`auth.ts:114`).
6. `authService.createStudentForParent(parentId, username, password, displayName)` is called (`auth.ts:117`).
7. Service checks if username is taken (`authService.ts` -- via userRepository).
8. Password is validated (minimum 8 characters) and hashed with bcrypt.
9. `userRepository.createStudentForParent(username, passwordHash, parentId, displayName)` creates the user record linked to the parent.
10. Default user_settings and user_stats rows are created.
11. Response: `{ success: true, user: { id, username, displayName, role, ... } }` with status 201.

### Components
- `packages/frontend/src/services/api/authApi.ts` -- createStudentForParent
- `packages/backend/src/routes/auth.ts` -- POST /api/auth/create-student
- `packages/backend/src/middleware/auth.ts` -- authMiddleware, requireRole
- `packages/backend/src/services/authService.ts` -- createStudentForParent
- `packages/backend/src/repositories/userRepository.ts` -- createStudentForParent

### Success Path
Student account is created and linked to the parent. Response includes the new user object.

### Failure Path
- Username already taken: 409 `{ error: 'Conflict', message: 'Username already taken' }` (`auth.ts:127`).
- User is not a parent: 403 `{ error: 'Forbidden', message: 'Only parents can create student accounts' }` (`auth.ts:129`).
- Validation error: 400 from validation middleware.
- Password too short: 400 `{ error: 'Bad Request', message: 'Password must be at least 8 characters' }`.
- Token expired: 401, triggers refresh flow.

### Known Issues
- The created student has `auth_provider = 'local'` and a password hash. They can only log in via the hub if their hub account email matches, triggering the email-based sync in `syncHubUser`.
- There is no API to list a parent's linked students in the auth routes (this is handled elsewhere in the app).

---

## Flow 13: Profile Update

### Trigger
User submits a profile update form (e.g., changing their display name or username).

### Steps

**Frontend side:**
1. `updateProfile(data)` is called from AuthContext (`AuthContext.tsx:124`).
2. `ApiService.updateProfile(data)` delegates to `authApi.updateProfile(data)` (`authApi.ts:7`).
3. `baseApi.fetchWithAuth` sends PATCH to `/api/auth/profile` with Bearer token and JSON body (`authApi.ts:8-10`).

**Backend side:**
4. `authMiddleware` verifies the token (`auth.ts:142`).
5. `validate(updateProfileSchema)` validates the request body (`auth.ts:142`).
6. `authService.updateProfile(userId, { username, displayName })` is called (`auth.ts:145`).
7. Service looks up user by ID, validates changes (e.g., username uniqueness).
8. Updates the user record in the database.
9. Returns the updated user object (`auth.ts:147`).

**Frontend continuation:**
10. Response `{ user }` is received.
11. `dispatch({ type: 'UPDATE_USER', payload: response.user })` updates AuthContext state (`AuthContext.tsx:126`).

### Components
- `packages/frontend/src/contexts/AuthContext.tsx` -- updateProfile
- `packages/frontend/src/services/api/authApi.ts` -- updateProfile
- `packages/backend/src/routes/auth.ts` -- PATCH /api/auth/profile
- `packages/backend/src/services/authService.ts` -- updateProfile

### Success Path
User's profile is updated in the database and the frontend auth state is updated to reflect changes.

### Failure Path
- Username already taken: 409 `{ error: 'Conflict', message: 'Username already taken' }` (`auth.ts:149`).
- User not found: 404 `{ error: 'Not Found', message: 'User not found' }` (`auth.ts:151`).
- Validation error: 400 from validation middleware.
- Token expired: 401, triggers refresh flow.

### Known Issues
- Profile changes to `username` and `display_name` will be **overwritten** on the next authenticated request because `syncHubUser` updates these fields from hub claims on every token verification. Local profile edits only persist until the next API call that triggers token verification with different hub claims.
- The `auth.ts:145` handler calls `authService.updateProfile()` without `await` (it is not async). If the repository method throws synchronously, it is caught by the try/catch. But if it were async, the error would be uncaught.

---

## Hub User Sync Strategy

The `syncHubUser` function (`packages/backend/src/services/hubUserSync.ts:28`) runs on every authenticated request and follows this match strategy:

1. **Match by `hub_user_id`** (most common for returning users): Updates username, display_name, email, email_verified, and role.
2. **Match by email** (migration path): Links an existing local/Google user to the hub by setting `hub_user_id` and `auth_provider = 'hub'`.
3. **Match by username** (migration path): Links an existing local user with matching username (only if they don't already have a `hub_user_id`).
4. **Create new user**: Inserts a new row with `auth_provider = 'hub'`, creates default settings and stats rows.

Role mapping: Hub `admin` always maps to local `admin`. All other hub roles preserve the existing local role, or default to `student` for new users.

---

## Test Coverage

Existing test files for auth modules:

| File | Tests |
|------|-------|
| `packages/backend/src/services/__tests__/hubUserSync.test.ts` | Comprehensive: match by hub_id, email, username; role mapping; new user creation; default settings/stats |
| `packages/backend/src/middleware/__tests__/auth.test.ts` | authMiddleware, optionalAuthMiddleware, requireRole; 401/403 scenarios; BCL revocation |
| `packages/backend/src/middleware/__tests__/hubAuth.test.ts` | Hub token verification and user sync |
| `packages/frontend/src/services/api/__tests__/oidcHelpers.test.ts` | OIDC helper functions |
| `packages/frontend/src/services/api/__tests__/baseApi.test.ts` | Token management, fetchWithAuth, 401 retry |
| `packages/frontend/src/services/api/__tests__/authApi.test.ts` | Auth API methods |
| `packages/frontend/src/pages/__tests__/AuthCallback.test.tsx` | Callback handler component |

---

## Change Checklist

When modifying any authentication code, verify the following:

### Token Storage
- [ ] `vocab_master_access_token` is the canonical key used by `baseApi` for Bearer token
- [ ] `storeOidcTokens()` stores id_token under both `vocab_master_access_token` and `labf_oidc_id_token`
- [ ] `startOidcLogout()` clears ALL four OIDC localStorage keys
- [ ] `baseApi.clearTokens()` clears `vocab_master_access_token` and nulls in-memory token
- [ ] Session storage keys (`labf_oidc_code_verifier`, `labf_oidc_state`) are cleaned up after use

### OIDC Configuration
- [ ] Frontend `VITE_OIDC_ISSUER` matches backend `OIDC_ISSUER` (same public URL)
- [ ] Backend `OIDC_INTERNAL_ISSUER` is reachable from the backend container (may differ from public URL in Docker)
- [ ] `OIDC_CLIENT_ID` is consistent across frontend and backend
- [ ] `OIDC_CLIENT_SECRET` is set on the backend for confidential client flows
- [ ] Redirect URI (`{origin}/auth/callback`) is registered with the hub OIDC provider

### Login Flow
- [ ] PKCE code verifier is generated and stored in sessionStorage before redirect
- [ ] State parameter is generated, stored, and validated on callback
- [ ] Token exchange goes through BFF (`/api/auth/oidc/token`), not directly to hub
- [ ] `AuthCallback` uses `window.location.href = '/'` (full reload), not React Router navigate
- [ ] `exchangeStarted` ref prevents double execution in StrictMode

### Token Refresh
- [ ] `refreshOidcToken()` sends refresh_token through BFF
- [ ] BFF injects `client_secret` for the refresh grant
- [ ] `storeOidcTokens()` is called with new tokens after refresh
- [ ] `baseApi.refreshPromise` deduplicates concurrent refresh attempts
- [ ] Failed refresh calls `clearTokens()` and throws session expired error

### Logout
- [ ] `baseApi.clearTokens()` is called before OIDC logout redirect
- [ ] `startOidcLogout()` includes `id_token_hint` if available
- [ ] `post_logout_redirect_uri` is set to `window.location.origin`
- [ ] All four localStorage keys are removed

### Back-Channel Logout
- [ ] BCL endpoint accepts `application/x-www-form-urlencoded` (not JSON)
- [ ] `logout_token` is verified against JWKS with correct issuer and client_id
- [ ] `revokeSubject(sub)` is called on successful verification
- [ ] `isRevoked()` is checked in `authMiddleware` after token verification
- [ ] `unrevokeSubject()` is called in `verifyAndSyncHubUser` on successful auth

### User Sync
- [ ] `syncHubUser` match order: hub_user_id -> email -> username -> create new
- [ ] Role mapping preserves existing local role for non-admin hub users
- [ ] Hub admin role always overrides local role
- [ ] New users get default `user_settings` and `user_stats` rows
- [ ] `auth_provider` is set to `'hub'` on sync

### Route Protection
- [ ] `ProtectedRoute` checks `isLoading` before `isAuthenticated`
- [ ] `RoleRoute` redirects to `/` for unauthorized roles
- [ ] Backend `requireRole` middleware is used on role-restricted endpoints
- [ ] `authMiddleware` is applied to all protected backend routes

### Error Handling
- [ ] 401 from any API call triggers token refresh (once only, no infinite loop)
- [ ] Failed refresh clears tokens and surfaces "Session expired" error
- [ ] `AuthCallback` displays hub error parameters to the user
- [ ] `AuthPage` displays `state.error` from AuthContext

### Cross-Cutting Concerns
- [ ] `last_seen_at` is updated on authenticated requests (throttled to 5 min)
- [ ] `updateProfile` changes may be overwritten by `syncHubUser` on next request
- [ ] Run existing auth test suites after changes:
  - `pnpm --filter backend test -- src/middleware/__tests__/auth.test.ts`
  - `pnpm --filter backend test -- src/services/__tests__/hubUserSync.test.ts`
  - `pnpm --filter backend test -- src/middleware/__tests__/hubAuth.test.ts`
  - `pnpm --filter frontend test -- src/services/api/__tests__/oidcHelpers.test.ts`
  - `pnpm --filter frontend test -- src/services/api/__tests__/baseApi.test.ts`
  - `pnpm --filter frontend test -- src/pages/__tests__/AuthCallback.test.tsx`
