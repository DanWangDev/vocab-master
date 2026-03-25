const OIDC_ISSUER = import.meta.env.VITE_OIDC_ISSUER || 'http://localhost:3009';
const OIDC_CLIENT_ID = import.meta.env.VITE_OIDC_CLIENT_ID || 'vocab-master-client';
const OIDC_SCOPES = 'openid profile email hub';

// Storage keys
const CODE_VERIFIER_KEY = 'labf_oidc_code_verifier';
const STATE_KEY = 'labf_oidc_state';
const HUB_TOKEN_KEY = 'labf_oidc_hub_token';
const ID_TOKEN_KEY = 'labf_oidc_id_token';
const REFRESH_TOKEN_KEY = 'labf_oidc_refresh_token';

function generateRandomHex(bytes: number): string {
  const array = new Uint8Array(bytes);
  crypto.getRandomValues(array);
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
}

async function sha256(plain: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  return crypto.subtle.digest('SHA-256', encoder.encode(plain));
}

function base64url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function getOidcConfig() {
  return { issuer: OIDC_ISSUER, clientId: OIDC_CLIENT_ID };
}

export function getRedirectUri(): string {
  return `${window.location.origin}/auth/callback`;
}

/**
 * Redirect to the hub's OIDC authorization endpoint with PKCE.
 */
export async function startOidcLogin(): Promise<void> {
  const codeVerifier = generateRandomHex(32);
  const codeChallenge = base64url(await sha256(codeVerifier));
  const state = generateRandomHex(16);

  sessionStorage.setItem(CODE_VERIFIER_KEY, codeVerifier);
  sessionStorage.setItem(STATE_KEY, state);

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: OIDC_CLIENT_ID,
    redirect_uri: getRedirectUri(),
    scope: OIDC_SCOPES,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    state,
  });

  window.location.href = `${OIDC_ISSUER}/oidc/auth?${params.toString()}`;
}

/**
 * Exchange the authorization code for tokens using PKCE.
 * Returns the token response from the hub.
 */
export async function exchangeCodeForTokens(code: string, state: string): Promise<{
  id_token: string;
  access_token: string;
  refresh_token?: string;
}> {
  const savedState = sessionStorage.getItem(STATE_KEY);
  const codeVerifier = sessionStorage.getItem(CODE_VERIFIER_KEY);

  if (!savedState || savedState !== state) {
    throw new Error('Invalid OIDC state parameter');
  }
  if (!codeVerifier) {
    throw new Error('Missing PKCE code verifier');
  }

  // Clean up session storage
  sessionStorage.removeItem(STATE_KEY);
  sessionStorage.removeItem(CODE_VERIFIER_KEY);

  const response = await fetch(`${OIDC_ISSUER}/oidc/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: getRedirectUri(),
      client_id: OIDC_CLIENT_ID,
      code_verifier: codeVerifier,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'token_exchange_failed' }));
    throw new Error(error.error_description || error.error || 'Token exchange failed');
  }

  return response.json();
}

/**
 * Store tokens from the OIDC token response.
 * The id_token is used as the Bearer token for API calls.
 */
export function storeOidcTokens(tokens: {
  id_token: string;
  access_token: string;
  refresh_token?: string;
}): void {
  // id_token is the JWT Bearer token — store under the app's access token key
  localStorage.setItem('vocab_master_access_token', tokens.id_token);
  // Also store as dedicated OIDC keys
  localStorage.setItem(ID_TOKEN_KEY, tokens.id_token);
  localStorage.setItem(HUB_TOKEN_KEY, tokens.access_token);
  if (tokens.refresh_token) {
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token);
  }
}

/**
 * Redirect to the hub's logout endpoint.
 */
export function startOidcLogout(): void {
  const idToken = localStorage.getItem(ID_TOKEN_KEY);

  // Clear all OIDC tokens
  localStorage.removeItem('vocab_master_access_token');
  localStorage.removeItem(ID_TOKEN_KEY);
  localStorage.removeItem(HUB_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);

  const params = new URLSearchParams({
    post_logout_redirect_uri: window.location.origin + '/login',
  });
  if (idToken) {
    params.set('id_token_hint', idToken);
  }

  window.location.href = `${OIDC_ISSUER}/oidc/session/end?${params.toString()}`;
}

/**
 * Refresh the id_token using the hub's token endpoint.
 * Returns the new id_token or throws if refresh fails.
 */
export async function refreshOidcToken(): Promise<string> {
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
  if (!refreshToken) {
    throw new Error('No refresh token available');
  }

  const response = await fetch(`${OIDC_ISSUER}/oidc/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: OIDC_CLIENT_ID,
    }),
  });

  if (!response.ok) {
    throw new Error('Token refresh failed');
  }

  const data = await response.json();
  storeOidcTokens(data);
  return data.id_token;
}
