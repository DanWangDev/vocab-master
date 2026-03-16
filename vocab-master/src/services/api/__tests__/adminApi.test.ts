import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../baseApi', () => ({
  baseApi: {
    fetchWithAuth: vi.fn(),
    getBaseUrl: vi.fn().mockReturnValue('http://localhost:9876/api'),
    setTokens: vi.fn(),
    clearTokens: vi.fn(),
    hasTokens: vi.fn(),
    getAccessToken: vi.fn(),
  },
}));

import { adminApi } from '../adminApi';
import { baseApi } from '../baseApi';

const mockFetchWithAuth = vi.mocked(baseApi.fetchWithAuth);

describe('adminApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAdminUsers', () => {
    it('calls fetchWithAuth with GET /admin/users', async () => {
      const mockUsers = [
        { id: 1, username: 'student1', role: 'student' },
        { id: 2, username: 'parent1', role: 'parent' },
      ];
      mockFetchWithAuth.mockResolvedValueOnce(mockUsers);

      const result = await adminApi.getAdminUsers();

      expect(mockFetchWithAuth).toHaveBeenCalledWith('/admin/users');
      expect(result).toEqual(mockUsers);
    });
  });

  describe('getAdminUserDetails', () => {
    it('calls fetchWithAuth with GET /admin/users/:id/details', async () => {
      const mockDetails = { id: 5, username: 'student5', stats: { quizzesTaken: 10 } };
      mockFetchWithAuth.mockResolvedValueOnce(mockDetails);

      const result = await adminApi.getAdminUserDetails(5);

      expect(mockFetchWithAuth).toHaveBeenCalledWith('/admin/users/5/details');
      expect(result).toEqual(mockDetails);
    });
  });

  describe('updateUserRole', () => {
    it('sends PATCH with role body', async () => {
      mockFetchWithAuth.mockResolvedValueOnce(undefined);

      await adminApi.updateUserRole(3, 'parent');

      expect(mockFetchWithAuth).toHaveBeenCalledWith('/admin/users/3/role', {
        method: 'PATCH',
        body: JSON.stringify({ role: 'parent' }),
      });
    });
  });

  describe('updateUserParent', () => {
    it('sends PATCH with parentId', async () => {
      mockFetchWithAuth.mockResolvedValueOnce(undefined);

      await adminApi.updateUserParent(4, 2);

      expect(mockFetchWithAuth).toHaveBeenCalledWith('/admin/users/4/parent', {
        method: 'PATCH',
        body: JSON.stringify({ parentId: 2 }),
      });
    });

    it('sends PATCH with null parentId to unlink', async () => {
      mockFetchWithAuth.mockResolvedValueOnce(undefined);

      await adminApi.updateUserParent(4, null);

      expect(mockFetchWithAuth).toHaveBeenCalledWith('/admin/users/4/parent', {
        method: 'PATCH',
        body: JSON.stringify({ parentId: null }),
      });
    });
  });

  describe('createUser', () => {
    it('sends POST with user data', async () => {
      mockFetchWithAuth.mockResolvedValueOnce(undefined);
      const data = {
        username: 'newstudent',
        password: 'pass123',
        role: 'student',
        parentId: 2,
        email: undefined,
      };

      await adminApi.createUser(data);

      expect(mockFetchWithAuth).toHaveBeenCalledWith('/admin/users', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    });

    it('sends POST with email for parent', async () => {
      mockFetchWithAuth.mockResolvedValueOnce(undefined);
      const data = {
        username: 'newparent',
        password: 'pass123',
        role: 'parent',
        parentId: null,
        email: 'parent@test.com',
      };

      await adminApi.createUser(data);

      expect(mockFetchWithAuth).toHaveBeenCalledWith('/admin/users', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    });
  });

  describe('updateUserEmail', () => {
    it('sends PATCH with email', async () => {
      mockFetchWithAuth.mockResolvedValueOnce(undefined);

      await adminApi.updateUserEmail(3, 'new@email.com');

      expect(mockFetchWithAuth).toHaveBeenCalledWith('/admin/users/3/email', {
        method: 'PATCH',
        body: JSON.stringify({ email: 'new@email.com' }),
      });
    });

    it('sends PATCH with null to remove email', async () => {
      mockFetchWithAuth.mockResolvedValueOnce(undefined);

      await adminApi.updateUserEmail(3, null);

      expect(mockFetchWithAuth).toHaveBeenCalledWith('/admin/users/3/email', {
        method: 'PATCH',
        body: JSON.stringify({ email: null }),
      });
    });
  });

  describe('deleteUser', () => {
    it('sends DELETE and returns result', async () => {
      const mockResponse = { success: true, message: 'User deleted' };
      mockFetchWithAuth.mockResolvedValueOnce(mockResponse);

      const result = await adminApi.deleteUser(7);

      expect(mockFetchWithAuth).toHaveBeenCalledWith('/admin/users/7', {
        method: 'DELETE',
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getThresholds', () => {
    it('calls fetchWithAuth with GET /admin/thresholds', async () => {
      const mockThresholds = { maxStudents: 5, maxWordlists: 10 };
      mockFetchWithAuth.mockResolvedValueOnce(mockThresholds);

      const result = await adminApi.getThresholds();

      expect(mockFetchWithAuth).toHaveBeenCalledWith('/admin/thresholds');
      expect(result).toEqual(mockThresholds);
    });
  });

  describe('updateThresholds', () => {
    it('sends PUT with thresholds body', async () => {
      const thresholds = { maxStudents: 10, maxWordlists: 20 };
      mockFetchWithAuth.mockResolvedValueOnce(thresholds);

      const result = await adminApi.updateThresholds(thresholds as any);

      expect(mockFetchWithAuth).toHaveBeenCalledWith('/admin/thresholds', {
        method: 'PUT',
        body: JSON.stringify(thresholds),
      });
      expect(result).toEqual(thresholds);
    });
  });
});
