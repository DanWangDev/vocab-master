import { discoverOidc, verifyIdToken } from '@danwangdev/auth-client/server';
import type { HubTokenClaims } from '@danwangdev/auth-client/server';
import { env } from '../config/env.js';
import { syncHubUser } from '../services/hubUserSync.js';
import type { JWTPayload } from '../types/index.js';

let cachedJwksUri: string | null = null;

/**
 * Discover OIDC metadata and cache the jwks_uri.
 * Handles the Docker internal issuer rewrite (gotcha #8 from migration guide).
 */
async function getJwksUri(): Promise<string> {
  if (cachedJwksUri) return cachedJwksUri;

  const metadata = await discoverOidc(env.OIDC_INTERNAL_ISSUER);
  let jwksUri = metadata.jwks_uri;

  // Rewrite jwks_uri if internal issuer differs from public issuer
  if (env.OIDC_INTERNAL_ISSUER !== env.OIDC_ISSUER) {
    jwksUri = jwksUri.replace(env.OIDC_ISSUER, env.OIDC_INTERNAL_ISSUER);
  }

  cachedJwksUri = jwksUri;
  return jwksUri;
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

  return {
    userId: localUser.id,
    username: localUser.username,
    role: localUser.role,
  };
}

/**
 * Clear the cached JWKS URI (useful for testing).
 */
export function clearHubAuthCache(): void {
  cachedJwksUri = null;
}
