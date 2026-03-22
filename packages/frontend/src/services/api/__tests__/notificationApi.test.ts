import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../baseApi', () => ({
  baseApi: {
    fetchWithAuth: vi.fn(),
    getBaseUrl: vi.fn().mockReturnValue('http://localhost:9876'),
    setTokens: vi.fn(),
    clearTokens: vi.fn(),
    hasTokens: vi.fn(),
    getAccessToken: vi.fn(),
  },
}));

import { notificationApi } from '../notificationApi';
import { baseApi } from '../baseApi';

const mockFetchWithAuth = vi.mocked(baseApi.fetchWithAuth);

describe('notificationApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getNotifications', () => {
    it('calls fetchWithAuth with GET /notifications', async () => {
      const mockResponse = {
        notifications: [
          { id: 1, type: 'achievement', title: 'Badge earned', message: 'Great job!', read_at: null },
          { id: 2, type: 'reminder', title: 'Study time', message: 'Review your words', read_at: '2026-03-15' },
        ],
      };
      mockFetchWithAuth.mockResolvedValueOnce(mockResponse);

      const result = await notificationApi.getNotifications();

      expect(mockFetchWithAuth).toHaveBeenCalledWith('/api/notifications');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getNotificationCount', () => {
    it('calls fetchWithAuth with GET /notifications/count', async () => {
      const mockResponse = { count: 3 };
      mockFetchWithAuth.mockResolvedValueOnce(mockResponse);

      const result = await notificationApi.getNotificationCount();

      expect(mockFetchWithAuth).toHaveBeenCalledWith('/api/notifications/count');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('markNotificationRead', () => {
    it('sends PATCH to /notifications/:id/read', async () => {
      const mockResponse = { success: true };
      mockFetchWithAuth.mockResolvedValueOnce(mockResponse);

      const result = await notificationApi.markNotificationRead(42);

      expect(mockFetchWithAuth).toHaveBeenCalledWith('/api/notifications/42/read', {
        method: 'PATCH',
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('markAllNotificationsRead', () => {
    it('sends POST to /notifications/read-all', async () => {
      const mockResponse = { success: true, markedCount: 5 };
      mockFetchWithAuth.mockResolvedValueOnce(mockResponse);

      const result = await notificationApi.markAllNotificationsRead();

      expect(mockFetchWithAuth).toHaveBeenCalledWith('/api/notifications/read-all', {
        method: 'POST',
      });
      expect(result).toEqual(mockResponse);
    });
  });
});
