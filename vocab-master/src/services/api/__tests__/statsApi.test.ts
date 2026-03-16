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

import { statsApi } from '../statsApi';
import { baseApi } from '../baseApi';

const mockFetchWithAuth = vi.mocked(baseApi.fetchWithAuth);

describe('statsApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getStats', () => {
    it('calls fetchWithAuth with GET /stats', async () => {
      const mockStats = { totalWordsStudied: 100, quizzesTaken: 5 };
      mockFetchWithAuth.mockResolvedValueOnce(mockStats);

      const result = await statsApi.getStats();

      expect(mockFetchWithAuth).toHaveBeenCalledWith('/stats');
      expect(result).toEqual(mockStats);
    });
  });

  describe('updateStats', () => {
    it('sends PATCH with stats body', async () => {
      const partialStats = { totalWordsStudied: 150 };
      const updatedStats = { totalWordsStudied: 150, quizzesTaken: 5 };
      mockFetchWithAuth.mockResolvedValueOnce(updatedStats);

      const result = await statsApi.updateStats(partialStats);

      expect(mockFetchWithAuth).toHaveBeenCalledWith('/stats', {
        method: 'PATCH',
        body: JSON.stringify(partialStats),
      });
      expect(result).toEqual(updatedStats);
    });
  });

  describe('incrementStats', () => {
    it('sends POST with increments body', async () => {
      const increments = { totalWordsStudied: 10, quizzesTaken: 1 };
      const updatedStats = { totalWordsStudied: 110, quizzesTaken: 6 };
      mockFetchWithAuth.mockResolvedValueOnce(updatedStats);

      const result = await statsApi.incrementStats(increments);

      expect(mockFetchWithAuth).toHaveBeenCalledWith('/stats/increment', {
        method: 'POST',
        body: JSON.stringify(increments),
      });
      expect(result).toEqual(updatedStats);
    });
  });

  describe('getWeakWords', () => {
    it('calls fetchWithAuth with GET /stats/weak-words', async () => {
      const mockWeakWords = {
        weakWords: [{ word: 'ephemeral', incorrectCount: 3, correctCount: 1, totalAttempts: 4, accuracy: 25 }],
      };
      mockFetchWithAuth.mockResolvedValueOnce(mockWeakWords);

      const result = await statsApi.getWeakWords();

      expect(mockFetchWithAuth).toHaveBeenCalledWith('/stats/weak-words');
      expect(result).toEqual(mockWeakWords);
    });
  });

  describe('getActivityStats', () => {
    it('calls fetchWithAuth with GET /stats/activity', async () => {
      const mockActivity = {
        quizCount: 10,
        avgAccuracy: 85,
        bestScore: 100,
        studySessions: 20,
        wordsReviewed: 500,
        currentStreak: 3,
      };
      mockFetchWithAuth.mockResolvedValueOnce(mockActivity);

      const result = await statsApi.getActivityStats();

      expect(mockFetchWithAuth).toHaveBeenCalledWith('/stats/activity');
      expect(result).toEqual(mockActivity);
    });
  });
});
