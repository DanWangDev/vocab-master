import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// We need to test the actual baseApi singleton, so we import it after setting up mocks
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Mock OIDC token refresh
const mockRefreshOidcToken = vi.fn();
vi.mock('../oidcHelpers', () => ({
  refreshOidcToken: (...args: unknown[]) => mockRefreshOidcToken(...args),
}));

// Must import after stubbing fetch since constructor reads localStorage
const { baseApi } = await import('../baseApi');

describe('baseApi', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockRefreshOidcToken.mockReset();
    localStorage.clear();
    baseApi.clearTokens();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('setTokens', () => {
    it('stores access token in memory and localStorage', () => {
      baseApi.setTokens({ accessToken: 'test-token-123' });

      expect(localStorage.getItem('vocab_master_access_token')).toBe('test-token-123');
      expect(baseApi.hasTokens()).toBe(true);
    });

    it('stores access token from a full TokenPair', () => {
      baseApi.setTokens({ accessToken: 'access-abc', refreshToken: 'refresh-xyz' });

      expect(localStorage.getItem('vocab_master_access_token')).toBe('access-abc');
      expect(baseApi.getAccessToken()).toBe('access-abc');
    });
  });

  describe('clearTokens', () => {
    it('removes access token from memory and localStorage', () => {
      baseApi.setTokens({ accessToken: 'token-to-clear' });
      baseApi.clearTokens();

      expect(localStorage.getItem('vocab_master_access_token')).toBeNull();
      expect(baseApi.hasTokens()).toBe(false);
      expect(baseApi.getAccessToken()).toBeNull();
    });
  });

  describe('hasTokens', () => {
    it('returns false when no token is set', () => {
      expect(baseApi.hasTokens()).toBe(false);
    });

    it('returns true after setTokens', () => {
      baseApi.setTokens({ accessToken: 'some-token' });
      expect(baseApi.hasTokens()).toBe(true);
    });
  });

  describe('getAccessToken', () => {
    it('returns null when no token is set', () => {
      expect(baseApi.getAccessToken()).toBeNull();
    });

    it('returns the current access token after setTokens', () => {
      baseApi.setTokens({ accessToken: 'my-access-token' });
      expect(baseApi.getAccessToken()).toBe('my-access-token');
    });
  });

  describe('getBaseUrl', () => {
    it('returns the API base URL', () => {
      const url = baseApi.getBaseUrl();
      expect(typeof url).toBe('string');
      expect(url.length).toBeGreaterThan(0);
    });
  });

  describe('fetchWithAuth', () => {
    it('adds Authorization header when token is set', async () => {
      baseApi.setTokens({ accessToken: 'bearer-token' });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: 'test' }),
      });

      await baseApi.fetchWithAuth('/test-endpoint');

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [, options] = mockFetch.mock.calls[0];
      expect(options.headers['Authorization']).toBe('Bearer bearer-token');
    });

    it('omits Authorization header when no token is set', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: 'test' }),
      });

      await baseApi.fetchWithAuth('/test-endpoint');

      const [, options] = mockFetch.mock.calls[0];
      expect(options.headers['Authorization']).toBeUndefined();
    });

    it('includes credentials: include in all requests', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({}),
      });

      await baseApi.fetchWithAuth('/endpoint');

      const [, options] = mockFetch.mock.calls[0];
      expect(options.credentials).toBe('include');
    });

    it('handles successful JSON response', async () => {
      const responseData = { users: [{ id: 1, name: 'Alice' }] };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(responseData),
      });

      const result = await baseApi.fetchWithAuth('/users');
      expect(result).toEqual(responseData);
    });

    it('handles error response with JSON error body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: 'Bad Request', message: 'Invalid input data' }),
      });

      await expect(baseApi.fetchWithAuth('/bad', {}, false)).rejects.toThrow('Invalid input data');
    });

    it('handles non-JSON error response with status code fallback', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.reject(new Error('not json')),
      });

      await expect(baseApi.fetchWithAuth('/fail', {}, false)).rejects.toThrow(
        'Request failed with status 500'
      );
    });

    it('retries on 401 by refreshing the token via OIDC', async () => {
      baseApi.setTokens({ accessToken: 'expired-token' });

      // First call: 401
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: 'Unauthorized', message: 'Token expired' }),
      });

      // OIDC refresh returns new token
      mockRefreshOidcToken.mockResolvedValueOnce('new-oidc-token');

      // Retry call: success
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ result: 'success' }),
      });

      const result = await baseApi.fetchWithAuth('/protected');

      expect(result).toEqual({ result: 'success' });
      expect(mockRefreshOidcToken).toHaveBeenCalledTimes(1);
      expect(baseApi.getAccessToken()).toBe('new-oidc-token');
    });

    it('clears tokens and throws on failed refresh', async () => {
      baseApi.setTokens({ accessToken: 'expired-token' });

      // First call: 401
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: 'Unauthorized', message: 'Token expired' }),
      });

      // OIDC refresh fails
      mockRefreshOidcToken.mockRejectedValueOnce(new Error('No refresh token'));

      await expect(baseApi.fetchWithAuth('/protected')).rejects.toThrow(
        'Session expired. Please login again.'
      );
      expect(baseApi.hasTokens()).toBe(false);
    });

    it('does not retry when retry=false', async () => {
      baseApi.setTokens({ accessToken: 'expired-token' });

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: 'Unauthorized', message: 'Token expired' }),
      });

      await expect(baseApi.fetchWithAuth('/protected', {}, false)).rejects.toThrow('Token expired');
      // Only 1 call, no refresh attempt
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('deduplicates concurrent refresh attempts', async () => {
      baseApi.setTokens({ accessToken: 'expired-token' });

      const make401 = () => ({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: 'Unauthorized', message: 'expired' }),
      });

      const makeSuccess = () => ({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: 'ok' }),
      });

      // Two initial 401 responses
      mockFetch.mockResolvedValueOnce(make401());
      mockFetch.mockResolvedValueOnce(make401());

      // OIDC refresh returns new token (shared by both concurrent requests)
      mockRefreshOidcToken.mockResolvedValueOnce('refreshed-oidc-token');

      // Two retry responses
      mockFetch.mockResolvedValueOnce(makeSuccess());
      mockFetch.mockResolvedValueOnce(makeSuccess());

      const [result1, result2] = await Promise.all([
        baseApi.fetchWithAuth('/endpoint1'),
        baseApi.fetchWithAuth('/endpoint2'),
      ]);

      expect(result1).toEqual({ data: 'ok' });
      expect(result2).toEqual({ data: 'ok' });

      // OIDC refresh should be deduplicated — only 1 call even though 2 requests got 401
      expect(mockRefreshOidcToken).toHaveBeenCalledTimes(1);
      expect(baseApi.getAccessToken()).toBe('refreshed-oidc-token');
    });

    it('sets Content-Type to application/json by default', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({}),
      });

      await baseApi.fetchWithAuth('/test');

      const [, options] = mockFetch.mock.calls[0];
      expect(options.headers['Content-Type']).toBe('application/json');
    });

    it('constructs URL using base URL + endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({}),
      });

      await baseApi.fetchWithAuth('/my-endpoint');

      const [url] = mockFetch.mock.calls[0];
      expect(url).toBe(`${baseApi.getBaseUrl()}/my-endpoint`);
    });
  });
});
