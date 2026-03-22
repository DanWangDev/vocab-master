import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

vi.mock('../baseApi', () => ({
  baseApi: {
    fetchWithAuth: vi.fn(),
    getBaseUrl: vi.fn().mockReturnValue('http://localhost:9876'),
    setTokens: vi.fn(),
    clearTokens: vi.fn(),
    hasTokens: vi.fn().mockReturnValue(true),
    getAccessToken: vi.fn(),
  },
}));

import { authApi } from '../authApi';
import { baseApi } from '../baseApi';

const mockFetchWithAuth = vi.mocked(baseApi.fetchWithAuth);
const mockSetTokens = vi.mocked(baseApi.setTokens);
const mockClearTokens = vi.mocked(baseApi.clearTokens);
const mockHasTokens = vi.mocked(baseApi.hasTokens);

const makeOkResponse = (data: unknown) => ({
  ok: true,
  status: 200,
  json: () => Promise.resolve(data),
});

const makeErrorResponse = (status: number, message: string) => ({
  ok: false,
  status,
  json: () => Promise.resolve({ error: 'Error', message }),
});

const mockAuthResponse = {
  user: { id: 1, username: 'testuser', displayName: 'Test', role: 'student' as const },
  tokens: { accessToken: 'access-123', refreshToken: 'refresh-456' },
};

describe('authApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
    mockHasTokens.mockReturnValue(true);
  });

  describe('registerStudent', () => {
    it('sends POST to /auth/register/student and stores tokens', async () => {
      mockFetch.mockResolvedValueOnce(makeOkResponse(mockAuthResponse));

      const result = await authApi.registerStudent('student1', 'pass123', 'Student One');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:9876/api/auth/register/student',
        expect.objectContaining({
          method: 'POST',
          credentials: 'include',
          body: JSON.stringify({
            username: 'student1',
            password: 'pass123',
            displayName: 'Student One',
            turnstileToken: undefined,
          }),
        })
      );
      expect(mockSetTokens).toHaveBeenCalledWith(mockAuthResponse.tokens);
      expect(result).toEqual(mockAuthResponse);
    });

    it('includes turnstile token when provided', async () => {
      mockFetch.mockResolvedValueOnce(makeOkResponse(mockAuthResponse));

      await authApi.registerStudent('student1', 'pass123', undefined, 'turnstile-token');

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.turnstileToken).toBe('turnstile-token');
    });

    it('throws with API error message on failure', async () => {
      mockFetch.mockResolvedValueOnce(makeErrorResponse(400, 'Username already exists'));

      await expect(authApi.registerStudent('dup', 'pass')).rejects.toThrow('Username already exists');
    });

    it('throws fallback message when error response is not JSON', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.reject(new Error('not json')),
      });

      await expect(authApi.registerStudent('user', 'pass')).rejects.toThrow('Registration failed');
    });
  });

  describe('registerParent', () => {
    it('sends POST with email to /auth/register/parent', async () => {
      mockFetch.mockResolvedValueOnce(makeOkResponse(mockAuthResponse));

      const result = await authApi.registerParent('parent1', 'pass123', 'parent@test.com', 'Parent One');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:9876/api/auth/register/parent',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            username: 'parent1',
            password: 'pass123',
            email: 'parent@test.com',
            displayName: 'Parent One',
            turnstileToken: undefined,
          }),
        })
      );
      expect(mockSetTokens).toHaveBeenCalledWith(mockAuthResponse.tokens);
      expect(result).toEqual(mockAuthResponse);
    });
  });

  describe('register (deprecated)', () => {
    it('delegates to registerStudent', async () => {
      mockFetch.mockResolvedValueOnce(makeOkResponse(mockAuthResponse));

      await authApi.register('user1', 'pass123', 'User One');

      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain('/auth/register/student');
    });
  });

  describe('login', () => {
    it('sends POST to /auth/login and stores tokens', async () => {
      mockFetch.mockResolvedValueOnce(makeOkResponse(mockAuthResponse));

      const result = await authApi.login('testuser', 'password123');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:9876/api/auth/login',
        expect.objectContaining({
          method: 'POST',
          credentials: 'include',
          body: JSON.stringify({ username: 'testuser', password: 'password123', turnstileToken: undefined }),
        })
      );
      expect(mockSetTokens).toHaveBeenCalledWith(mockAuthResponse.tokens);
      expect(result).toEqual(mockAuthResponse);
    });

    it('throws on login failure', async () => {
      mockFetch.mockResolvedValueOnce(makeErrorResponse(401, 'Invalid credentials'));

      await expect(authApi.login('bad', 'creds')).rejects.toThrow('Invalid credentials');
    });
  });

  describe('logout', () => {
    it('sends POST to /auth/logout and clears tokens', async () => {
      mockFetch.mockResolvedValueOnce(makeOkResponse({}));

      await authApi.logout();

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:9876/api/auth/logout',
        expect.objectContaining({
          method: 'POST',
          credentials: 'include',
        })
      );
      expect(mockClearTokens).toHaveBeenCalled();
    });

    it('clears tokens even if logout request fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await authApi.logout();

      expect(mockClearTokens).toHaveBeenCalled();
    });
  });

  describe('getCurrentUser', () => {
    it('calls fetchWithAuth to /auth/me and returns user', async () => {
      const userData = { user: { id: 1, username: 'testuser' } };
      mockFetchWithAuth.mockResolvedValueOnce(userData);

      const result = await authApi.getCurrentUser();

      expect(mockFetchWithAuth).toHaveBeenCalledWith('/api/auth/me');
      expect(result).toEqual(userData.user);
    });

    it('returns null when no tokens are set', async () => {
      mockHasTokens.mockReturnValueOnce(false);

      const result = await authApi.getCurrentUser();

      expect(result).toBeNull();
      expect(mockFetchWithAuth).not.toHaveBeenCalled();
    });

    it('returns null on fetchWithAuth error', async () => {
      mockFetchWithAuth.mockRejectedValueOnce(new Error('Unauthorized'));

      const result = await authApi.getCurrentUser();

      expect(result).toBeNull();
    });
  });

  describe('googleAuth', () => {
    it('sends POST to /auth/google with token and tokenType', async () => {
      const googleResponse = { ...mockAuthResponse, isNewUser: false };
      mockFetch.mockResolvedValueOnce(makeOkResponse(googleResponse));

      const result = await authApi.googleAuth('google-id-token', 'id_token');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:9876/api/auth/google',
        expect.objectContaining({
          method: 'POST',
          credentials: 'include',
          body: JSON.stringify({ token: 'google-id-token', tokenType: 'id_token', username: undefined }),
        })
      );
      expect(mockSetTokens).toHaveBeenCalledWith(googleResponse.tokens);
      expect(result).toEqual(googleResponse);
    });

    it('defaults tokenType to id_token', async () => {
      const googleResponse = { ...mockAuthResponse, isNewUser: true };
      mockFetch.mockResolvedValueOnce(makeOkResponse(googleResponse));

      await authApi.googleAuth('my-token');

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.tokenType).toBe('id_token');
    });

    it('throws on google auth failure', async () => {
      mockFetch.mockResolvedValueOnce(makeErrorResponse(400, 'Invalid Google token'));

      await expect(authApi.googleAuth('bad-token')).rejects.toThrow('Invalid Google token');
    });
  });

  describe('forgotPassword', () => {
    it('sends POST to /auth/forgot-password with email', async () => {
      mockFetch.mockResolvedValueOnce(makeOkResponse({ message: 'Reset email sent' }));

      const result = await authApi.forgotPassword('user@test.com');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:9876/api/auth/forgot-password',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ email: 'user@test.com' }),
        })
      );
      expect(result).toEqual({ message: 'Reset email sent' });
    });

    it('throws on failure', async () => {
      mockFetch.mockResolvedValueOnce(makeErrorResponse(404, 'Email not found'));

      await expect(authApi.forgotPassword('bad@test.com')).rejects.toThrow('Email not found');
    });
  });

  describe('resetPassword', () => {
    it('sends POST to /auth/reset-password with token and password', async () => {
      mockFetch.mockResolvedValueOnce(makeOkResponse({ message: 'Password reset successful' }));

      const result = await authApi.resetPassword('reset-token-123', 'newPassword');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:9876/api/auth/reset-password',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ token: 'reset-token-123', password: 'newPassword' }),
        })
      );
      expect(result).toEqual({ message: 'Password reset successful' });
    });

    it('throws on failure', async () => {
      mockFetch.mockResolvedValueOnce(makeErrorResponse(400, 'Token expired'));

      await expect(authApi.resetPassword('expired', 'pass')).rejects.toThrow('Token expired');
    });
  });

  describe('validateResetToken', () => {
    it('returns valid: true for a valid token', async () => {
      mockFetch.mockResolvedValueOnce(makeOkResponse({ valid: true }));

      const result = await authApi.validateResetToken('valid-token');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:9876/api/auth/validate-reset-token/valid-token'
      );
      expect(result).toEqual({ valid: true });
    });

    it('returns valid: false for an invalid token', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ valid: false }),
      });

      const result = await authApi.validateResetToken('invalid-token');

      expect(result).toEqual({ valid: false });
    });
  });

  describe('updateProfile', () => {
    it('sends PATCH via fetchWithAuth to /auth/profile', async () => {
      const updatedUser = { user: { id: 1, username: 'newname', displayName: 'New Name' } };
      mockFetchWithAuth.mockResolvedValueOnce(updatedUser);

      const result = await authApi.updateProfile({ username: 'newname', displayName: 'New Name' });

      expect(mockFetchWithAuth).toHaveBeenCalledWith('/api/auth/profile', {
        method: 'PATCH',
        body: JSON.stringify({ username: 'newname', displayName: 'New Name' }),
      });
      expect(result).toEqual(updatedUser);
    });
  });

  describe('createStudentForParent', () => {
    it('sends POST via fetchWithAuth to /auth/create-student', async () => {
      const response = { success: true, user: { id: 2, username: 'child1' } };
      mockFetchWithAuth.mockResolvedValueOnce(response);

      const result = await authApi.createStudentForParent('child1', 'childpass', 'Child One');

      expect(mockFetchWithAuth).toHaveBeenCalledWith('/api/auth/create-student', {
        method: 'POST',
        body: JSON.stringify({ username: 'child1', password: 'childpass', displayName: 'Child One' }),
      });
      expect(result).toEqual(response);
    });
  });

  describe('resetUserPassword', () => {
    it('sends PATCH via fetchWithAuth to /admin/users/:id/password', async () => {
      const response = { success: true, message: 'Password updated' };
      mockFetchWithAuth.mockResolvedValueOnce(response);

      const result = await authApi.resetUserPassword(42, 'newpass123');

      expect(mockFetchWithAuth).toHaveBeenCalledWith('/api/admin/users/42/password', {
        method: 'PATCH',
        body: JSON.stringify({ password: 'newpass123' }),
      });
      expect(result).toEqual(response);
    });
  });
});
