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

import { leaderboardApi } from '../leaderboardApi';
import { baseApi } from '../baseApi';

const mockFetchWithAuth = vi.mocked(baseApi.fetchWithAuth);

describe('leaderboardApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getLeaderboard', () => {
    it('calls with default params (weekly, limit 50)', async () => {
      const mockResponse = {
        period: 'weekly',
        periodKey: '2026-W11',
        entries: [{ rank: 1, userId: 1, username: 'topuser', score: 500 }],
      };
      mockFetchWithAuth.mockResolvedValueOnce(mockResponse);

      const result = await leaderboardApi.getLeaderboard();

      expect(mockFetchWithAuth).toHaveBeenCalledWith('/api/leaderboards?period=weekly&limit=50');
      expect(result).toEqual(mockResponse);
    });

    it('calls with custom period and limit', async () => {
      mockFetchWithAuth.mockResolvedValueOnce({ period: 'monthly', periodKey: '2026-03', entries: [] });

      await leaderboardApi.getLeaderboard('monthly', 10);

      expect(mockFetchWithAuth).toHaveBeenCalledWith('/api/leaderboards?period=monthly&limit=10');
    });
  });

  describe('getMyRanking', () => {
    it('calls with default period (weekly)', async () => {
      const mockResponse = { rank: 3, entry: { userId: 5, username: 'me', score: 200 } };
      mockFetchWithAuth.mockResolvedValueOnce(mockResponse);

      const result = await leaderboardApi.getMyRanking();

      expect(mockFetchWithAuth).toHaveBeenCalledWith('/api/leaderboards/me?period=weekly');
      expect(result).toEqual(mockResponse);
    });

    it('calls with alltime period', async () => {
      mockFetchWithAuth.mockResolvedValueOnce({ rank: null, entry: null });

      await leaderboardApi.getMyRanking('alltime');

      expect(mockFetchWithAuth).toHaveBeenCalledWith('/api/leaderboards/me?period=alltime');
    });
  });
});
