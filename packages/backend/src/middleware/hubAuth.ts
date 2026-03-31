import { discoverOidc, verifyIdToken, unrevokeSubject } from '@danwangdev/auth-client/server';
import type { HubTokenClaims } from '@danwangdev/auth-client/server';
import { env } from '../config/env.js';
import { syncHubUser } from '../services/hubUserSync.js';
import type { JWTPayload } from '../types/index.js';

let cachedJwksUri: string | null = null;

/**
 * Discover OIDC metadata and cache the jwks_uri.
 * auth-client v0.3.1+ handles internal/public issuer rewriting automatically:
 *   - jwks_uri, token_endpoint → internal issuer (server-to-server)
 *   - authorization_endpoint, end_session_endpoint → public issuer (browser-facing)
 */
export async function getJwksUri(): Promise<string> {
  if (cachedJwksUri) return cachedJwksUri;

  const metadata = await discoverOidc(env.OIDC_ISSUER, env.OIDC_INTERNAL_ISSUER);
  cachedJwksUri = metadata.jwks_uri;
  return cachedJwksUri;
}

/**
 * Verify a hub-issued id_token and return the claims.
 * Uses the public issuer for JWT validation (must match the `iss` claim).
 */
export async function verifyHubToken(token: string): Promise<HubTokenClaims> {
  const jwksUri = await getJwksUri();
  const user = await verifyIdToken(token, jwksUri, env.OIDC_ISSUER, env.OIDC_CLIENT_ID);

  return {
    sub: user.sub,
    email: user.email,
    username: user.username,
    displayName: user.display_name,
    role: user.role,
    plan: user.plan,
    features: [...user.features],
    apps: [...user.apps],
    expiresAt: user.expires_at ?? null,
    iat: 0,
    exp: 0,
  };
}

/**
 * Verify a hub token and sync the user into the local DB.
 * Returns a JWTPayload compatible with the existing req.user shape.
 */
export async function verifyAndSyncHubUser(token: string): Promise<JWTPayload> {
  const claims = await verifyHubToken(token);
  const localUser = syncHubUser(claims);
  unrevokeSubject(claims.sub);

  return {
    userId: localUser.id,
    username: localUser.username,
    role: localUser.role,
    hubUserId: claims.sub,
  };
}

/**
 * Clear the cached JWKS URI (useful for testing).
 */
export function clearHubAuthCache(): void {
  cachedJwksUri = null;
}
