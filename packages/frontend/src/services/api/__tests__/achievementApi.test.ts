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

import { achievementApi } from '../achievementApi';
import { baseApi } from '../baseApi';

const mockFetchWithAuth = vi.mocked(baseApi.fetchWithAuth);

describe('achievementApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAll', () => {
    it('calls fetchWithAuth with GET /achievements', async () => {
      const mockResponse = {
        achievements: [
          { id: 1, slug: 'first_quiz', name: 'First Steps', earned: true, earnedAt: '2026-03-15' },
          { id: 2, slug: 'streak_7', name: 'Week Warrior', earned: false, earnedAt: null },
        ],
        totalEarned: 1,
        totalAvailable: 15,
      };
      mockFetchWithAuth.mockResolvedValueOnce(mockResponse);

      const result = await achievementApi.getAll();

      expect(mockFetchWithAuth).toHaveBeenCalledWith('/api/achievements');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getMine', () => {
    it('calls fetchWithAuth with GET /achievements/mine', async () => {
      const mockResponse = {
        achievements: [{ id: 1, slug: 'first_quiz', name: 'First Steps', earned: true }],
        totalEarned: 1,
        totalAvailable: 15,
      };
      mockFetchWithAuth.mockResolvedValueOnce(mockResponse);

      const result = await achievementApi.getMine();

      expect(mockFetchWithAuth).toHaveBeenCalledWith('/api/achievements/mine');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('check', () => {
    it('sends POST to /achievements/check', async () => {
      const mockResponse = {
        newlyEarned: [{ slug: 'streak_3', name: 'Getting Started', icon: 'flame', earnedAt: '2026-03-16' }],
        totalEarned: 2,
        totalAvailable: 15,
      };
      mockFetchWithAuth.mockResolvedValueOnce(mockResponse);

      const result = await achievementApi.check();

      expect(mockFetchWithAuth).toHaveBeenCalledWith('/api/achievements/check', { method: 'POST' });
      expect(result).toEqual(mockResponse);
    });
  });
});
