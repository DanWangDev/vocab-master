import { describe, it, expect, vi, beforeEach } from 'vitest';

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
const mockClearTokens = vi.mocked(baseApi.clearTokens);
const mockHasTokens = vi.mocked(baseApi.hasTokens);

describe('authApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHasTokens.mockReturnValue(true);
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

  describe('logout', () => {
    it('clears tokens', async () => {
      await authApi.logout();

      expect(mockClearTokens).toHaveBeenCalled();
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
