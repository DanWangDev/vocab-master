import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock crypto before importing the module
const mockGetRandomValues = vi.fn((array: Uint8Array) => {
  for (let i = 0; i < array.length; i++) {
    array[i] = i % 256;
  }
  return array;
});

const mockDigest = vi.fn(async (_algo: string, _data: BufferSource) => {
  // Return a deterministic 32-byte ArrayBuffer for testing
  const result = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    result[i] = i * 7;
  }
  return result.buffer;
});

vi.stubGlobal('crypto', {
  getRandomValues: mockGetRandomValues,
  subtle: { digest: mockDigest },
});

import {
  getOidcConfig,
  getRedirectUri,
  startOidcLogin,
  exchangeCodeForTokens,
  storeOidcTokens,
  startOidcLogout,
  refreshOidcToken,
} from '../oidcHelpers';

describe('oidcHelpers', () => {
  let lastAssignedHref: string | undefined;
  const originalLocation = window.location;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    lastAssignedHref = undefined;

    // Replace window.location with a writable mock so we can intercept
    // href assignments (jsdom's location.href is not configurable).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (window as any).location;
    window.location = {
      ...originalLocation,
      origin: originalLocation.origin,
      href: originalLocation.href,
    } as Location;

    Object.defineProperty(window.location, 'href', {
      set(value: string) {
        lastAssignedHref = value;
      },
      get() {
        return lastAssignedHref ?? originalLocation.href;
      },
      configurable: true,
    });
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).location = originalLocation;
  });

  describe('getOidcConfig', () => {
    it('returns default issuer and clientId', () => {
      const config = getOidcConfig();

      expect(config).toEqual({
        issuer: 'http://localhost:3009',
        clientId: 'vocab-master-client',
      });
    });
  });

  describe('getRedirectUri', () => {
    it('returns origin + /auth/callback', () => {
      const uri = getRedirectUri();

      expect(uri).toBe(`${window.location.origin}/auth/callback`);
    });
  });

  describe('startOidcLogin', () => {
    it('stores code verifier and state in sessionStorage', async () => {
      await startOidcLogin();

      const codeVerifier = sessionStorage.getItem('labf_oidc_code_verifier');
      const state = sessionStorage.getItem('labf_oidc_state');

      expect(codeVerifier).toBeTruthy();
      expect(typeof codeVerifier).toBe('string');
      expect(codeVerifier!.length).toBeGreaterThan(0);

      expect(state).toBeTruthy();
      expect(typeof state).toBe('string');
      expect(state!.length).toBeGreaterThan(0);
    });

    it('redirects to OIDC issuer with correct params', async () => {
      await startOidcLogin();

      expect(lastAssignedHref).toBeDefined();
      const href = lastAssignedHref!;
      expect(href).toContain('http://localhost:3009/oidc/auth?');

      const url = new URL(href);
      expect(url.searchParams.get('response_type')).toBe('code');
      expect(url.searchParams.get('client_id')).toBe('vocab-master-client');
      expect(url.searchParams.get('redirect_uri')).toBe(
        `${window.location.origin}/auth/callback`
      );
      expect(url.searchParams.get('scope')).toBe('openid profile email hub');
      expect(url.searchParams.get('code_challenge')).toBeTruthy();
      expect(url.searchParams.get('code_challenge_method')).toBe('S256');
      expect(url.searchParams.get('state')).toBeTruthy();
    });

    it('generates a code_challenge from the code_verifier via S256', async () => {
      await startOidcLogin();

      expect(mockGetRandomValues).toHaveBeenCalled();
      expect(mockDigest).toHaveBeenCalledWith(
        'SHA-256',
        expect.anything()
      );

      expect(lastAssignedHref).toBeDefined();
      const url = new URL(lastAssignedHref!);
      const codeChallenge = url.searchParams.get('code_challenge');

      // base64url encoding should not contain +, /, or trailing =
      expect(codeChallenge).toBeTruthy();
      expect(codeChallenge).not.toContain('+');
      expect(codeChallenge).not.toContain('/');
      expect(codeChallenge).not.toMatch(/=+$/);
    });
  });

  describe('exchangeCodeForTokens', () => {
    const mockTokenResponse = {
      id_token: 'mock-id-token',
      access_token: 'mock-access-token',
      refresh_token: 'mock-refresh-token',
    };

    function setupSessionState(state: string, codeVerifier: string) {
      sessionStorage.setItem('labf_oidc_state', state);
      sessionStorage.setItem('labf_oidc_code_verifier', codeVerifier);
    }

    it('calls /api/auth/oidc/token and returns tokens on valid state and code verifier', async () => {
      setupSessionState('test-state', 'test-verifier');

      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTokenResponse),
      });
      vi.stubGlobal('fetch', mockFetch);

      const result = await exchangeCodeForTokens('auth-code', 'test-state');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/auth/oidc/token'),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            grant_type: 'authorization_code',
            code: 'auth-code',
            redirect_uri: `${window.location.origin}/auth/callback`,
            code_verifier: 'test-verifier',
          }),
        },
      );
      expect(result).toEqual(mockTokenResponse);
    });

    it('throws on state mismatch', async () => {
      setupSessionState('saved-state', 'test-verifier');

      await expect(
        exchangeCodeForTokens('auth-code', 'different-state')
      ).rejects.toThrow('Invalid OIDC state parameter');
    });

    it('throws when no state is saved in sessionStorage', async () => {
      sessionStorage.setItem('labf_oidc_code_verifier', 'test-verifier');

      await expect(
        exchangeCodeForTokens('auth-code', 'some-state')
      ).rejects.toThrow('Invalid OIDC state parameter');
    });

    it('throws when code verifier is missing', async () => {
      sessionStorage.setItem('labf_oidc_state', 'test-state');

      await expect(
        exchangeCodeForTokens('auth-code', 'test-state')
      ).rejects.toThrow('Missing PKCE code verifier');
    });

    it('cleans up sessionStorage after successful exchange', async () => {
      setupSessionState('test-state', 'test-verifier');

      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTokenResponse),
      });
      vi.stubGlobal('fetch', mockFetch);

      await exchangeCodeForTokens('auth-code', 'test-state');

      expect(sessionStorage.getItem('labf_oidc_state')).toBeNull();
      expect(sessionStorage.getItem('labf_oidc_code_verifier')).toBeNull();
    });

    it('throws with error_description from API error response', async () => {
      setupSessionState('test-state', 'test-verifier');

      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        json: () =>
          Promise.resolve({
            error: 'invalid_grant',
            error_description: 'Authorization code expired',
          }),
      });
      vi.stubGlobal('fetch', mockFetch);

      await expect(
        exchangeCodeForTokens('auth-code', 'test-state')
      ).rejects.toThrow('Authorization code expired');
    });

    it('throws with error field when no error_description', async () => {
      setupSessionState('test-state', 'test-verifier');

      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'server_error' }),
      });
      vi.stubGlobal('fetch', mockFetch);

      await expect(
        exchangeCodeForTokens('auth-code', 'test-state')
      ).rejects.toThrow('server_error');
    });

    it('throws fallback message when API returns non-JSON error', async () => {
      setupSessionState('test-state', 'test-verifier');

      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        json: () => Promise.reject(new Error('not JSON')),
      });
      vi.stubGlobal('fetch', mockFetch);

      await expect(
        exchangeCodeForTokens('auth-code', 'test-state')
      ).rejects.toThrow('token_exchange_failed');
    });
  });

  describe('storeOidcTokens', () => {
    it('stores id_token as vocab_master_access_token and labf_oidc_id_token', () => {
      storeOidcTokens({
        id_token: 'my-id-token',
        access_token: 'my-access-token',
      });

      expect(localStorage.getItem('vocab_master_access_token')).toBe(
        'my-id-token'
      );
      expect(localStorage.getItem('labf_oidc_id_token')).toBe('my-id-token');
    });

    it('stores access_token as labf_oidc_hub_token', () => {
      storeOidcTokens({
        id_token: 'my-id-token',
        access_token: 'my-access-token',
      });

      expect(localStorage.getItem('labf_oidc_hub_token')).toBe(
        'my-access-token'
      );
    });

    it('stores refresh_token when provided', () => {
      storeOidcTokens({
        id_token: 'my-id-token',
        access_token: 'my-access-token',
        refresh_token: 'my-refresh-token',
      });

      expect(localStorage.getItem('labf_oidc_refresh_token')).toBe(
        'my-refresh-token'
      );
    });

    it('does not set refresh_token key when not provided', () => {
      storeOidcTokens({
        id_token: 'my-id-token',
        access_token: 'my-access-token',
      });

      expect(localStorage.getItem('labf_oidc_refresh_token')).toBeNull();
    });
  });

  describe('startOidcLogout', () => {
    it('clears all OIDC tokens from localStorage', () => {
      localStorage.setItem('vocab_master_access_token', 'token1');
      localStorage.setItem('labf_oidc_id_token', 'token2');
      localStorage.setItem('labf_oidc_hub_token', 'token3');
      localStorage.setItem('labf_oidc_refresh_token', 'token4');

      startOidcLogout();

      expect(localStorage.getItem('vocab_master_access_token')).toBeNull();
      expect(localStorage.getItem('labf_oidc_id_token')).toBeNull();
      expect(localStorage.getItem('labf_oidc_hub_token')).toBeNull();
      expect(localStorage.getItem('labf_oidc_refresh_token')).toBeNull();
    });

    it('redirects to hub logout endpoint with post_logout_redirect_uri', () => {
      startOidcLogout();

      expect(lastAssignedHref).toBeDefined();
      expect(lastAssignedHref).toContain(
        'http://localhost:3009/oidc/session/end?'
      );

      const url = new URL(lastAssignedHref!);
      expect(url.searchParams.get('post_logout_redirect_uri')).toBe(
        window.location.origin
      );
    });

    it('includes id_token_hint when id_token was stored', () => {
      localStorage.setItem('labf_oidc_id_token', 'stored-id-token');

      startOidcLogout();

      expect(lastAssignedHref).toBeDefined();
      const url = new URL(lastAssignedHref!);
      expect(url.searchParams.get('id_token_hint')).toBe('stored-id-token');
    });

    it('works without id_token_hint when no token was stored', () => {
      startOidcLogout();

      expect(lastAssignedHref).toBeDefined();
      const url = new URL(lastAssignedHref!);
      expect(url.searchParams.has('id_token_hint')).toBe(false);
    });
  });

  describe('refreshOidcToken', () => {
    it('calls /api/auth/oidc/token with refresh_token grant', async () => {
      localStorage.setItem('labf_oidc_refresh_token', 'my-refresh-token');

      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            id_token: 'new-id-token',
            access_token: 'new-access-token',
          }),
      });
      vi.stubGlobal('fetch', mockFetch);

      await refreshOidcToken();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/auth/oidc/token'),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            grant_type: 'refresh_token',
            refresh_token: 'my-refresh-token',
          }),
        },
      );
    });

    it('stores new tokens via storeOidcTokens', async () => {
      localStorage.setItem('labf_oidc_refresh_token', 'my-refresh-token');

      const newTokens = {
        id_token: 'new-id-token',
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
      };
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(newTokens),
      });
      vi.stubGlobal('fetch', mockFetch);

      await refreshOidcToken();

      expect(localStorage.getItem('vocab_master_access_token')).toBe(
        'new-id-token'
      );
      expect(localStorage.getItem('labf_oidc_id_token')).toBe('new-id-token');
      expect(localStorage.getItem('labf_oidc_hub_token')).toBe(
        'new-access-token'
      );
      expect(localStorage.getItem('labf_oidc_refresh_token')).toBe(
        'new-refresh-token'
      );
    });

    it('returns new id_token', async () => {
      localStorage.setItem('labf_oidc_refresh_token', 'my-refresh-token');

      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            id_token: 'fresh-id-token',
            access_token: 'fresh-access-token',
          }),
      });
      vi.stubGlobal('fetch', mockFetch);

      const result = await refreshOidcToken();

      expect(result).toBe('fresh-id-token');
    });

    it('throws when no refresh token in localStorage', async () => {
      await expect(refreshOidcToken()).rejects.toThrow(
        'No refresh token available'
      );
    });

    it('throws when API returns error', async () => {
      localStorage.setItem('labf_oidc_refresh_token', 'my-refresh-token');

      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'invalid_grant' }),
      });
      vi.stubGlobal('fetch', mockFetch);

      await expect(refreshOidcToken()).rejects.toThrow('Token refresh failed');
    });
  });
});
