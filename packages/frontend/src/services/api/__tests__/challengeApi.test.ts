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

import { challengeApi } from '../challengeApi';
import { baseApi } from '../baseApi';

const mockFetchWithAuth = vi.mocked(baseApi.fetchWithAuth);

describe('challengeApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getTodayChallenge', () => {
    it('calls fetchWithAuth GET /challenges/today', async () => {
      const mockData = { completed: false, challenge: null, streak: 3 };
      mockFetchWithAuth.mockResolvedValueOnce(mockData);

      const result = await challengeApi.getTodayChallenge();

      expect(mockFetchWithAuth).toHaveBeenCalledWith('/api/challenges/today');
      expect(result).toEqual(mockData);
    });
  });

  describe('completeChallenge', () => {
    it('calls fetchWithAuth POST /challenges/complete with score', async () => {
      const mockData = { challenge: { id: 1, score: 85 }, streak: 4 };
      mockFetchWithAuth.mockResolvedValueOnce(mockData);

      const result = await challengeApi.completeChallenge(85);

      expect(mockFetchWithAuth).toHaveBeenCalledWith('/api/challenges/complete', {
        method: 'POST',
        body: JSON.stringify({ score: 85 }),
      });
      expect(result).toEqual(mockData);
    });
  });

  describe('getChallengeHistory', () => {
    it('calls GET /challenges/history with limit query param', async () => {
      const mockData = { challenges: [{ id: 1, score: 90 }] };
      mockFetchWithAuth.mockResolvedValueOnce(mockData);

      const result = await challengeApi.getChallengeHistory(10);

      expect(mockFetchWithAuth).toHaveBeenCalledWith('/api/challenges/history?limit=10');
      expect(result).toEqual(mockData);
    });

    it('calls GET /challenges/history without query param when no limit', async () => {
      const mockData = { challenges: [] };
      mockFetchWithAuth.mockResolvedValueOnce(mockData);

      const result = await challengeApi.getChallengeHistory();

      expect(mockFetchWithAuth).toHaveBeenCalledWith('/api/challenges/history');
      expect(result).toEqual(mockData);
    });
  });

  describe('getStreak', () => {
    it('calls fetchWithAuth GET /challenges/streak', async () => {
      const mockData = { streak: 7, bestScore: 100 };
      mockFetchWithAuth.mockResolvedValueOnce(mockData);

      const result = await challengeApi.getStreak();

      expect(mockFetchWithAuth).toHaveBeenCalledWith('/api/challenges/streak');
      expect(result).toEqual(mockData);
    });
  });
});
