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

import { quizApi } from '../quizApi';
import { baseApi } from '../baseApi';

const mockFetchWithAuth = vi.mocked(baseApi.fetchWithAuth);

describe('quizApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  describe('saveQuizResult', () => {
    it('sends POST with quiz result data', async () => {
      const data = {
        quizType: 'quiz' as const,
        totalQuestions: 10,
        correctAnswers: 8,
        score: 80,
        timePerQuestion: 15,
        totalTimeSpent: 150,
        pointsEarned: 80,
        answers: [
          {
            questionIndex: 0,
            word: 'apple',
            promptType: 'definition',
            questionFormat: 'multiple_choice',
            correctAnswer: 'a fruit',
            selectedAnswer: 'a fruit',
            isCorrect: true,
            timeSpent: 10,
          },
        ],
      };
      const mockResponse = { success: true, resultId: 42 };
      mockFetchWithAuth.mockResolvedValueOnce(mockResponse);

      const result = await quizApi.saveQuizResult(data as any);

      expect(mockFetchWithAuth).toHaveBeenCalledWith('/quiz-results', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('saveStudySession', () => {
    it('sends POST with study session data', async () => {
      const data = {
        wordsReviewed: 20,
        startTime: '2026-03-15T10:00:00Z',
        endTime: '2026-03-15T10:30:00Z',
        words: ['apple', 'banana'],
      };
      const mockResponse = { success: true, sessionId: 7 };
      mockFetchWithAuth.mockResolvedValueOnce(mockResponse);

      const result = await quizApi.saveStudySession(data as any);

      expect(mockFetchWithAuth).toHaveBeenCalledWith('/study-stats', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('importData', () => {
    it('sends POST with settings and stats to migrate', async () => {
      const data = {
        settings: { soundEnabled: true, autoAdvance: false, language: 'en' },
        stats: { totalWordsStudied: 100, quizzesTaken: 5 },
      };
      const mockResponse = {
        message: 'Import successful',
        settings: data.settings,
        stats: data.stats,
      };
      mockFetchWithAuth.mockResolvedValueOnce(mockResponse);

      const result = await quizApi.importData(data as any);

      expect(mockFetchWithAuth).toHaveBeenCalledWith('/migrate/import', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('exportData', () => {
    it('calls fetchWithAuth with GET /migrate/export', async () => {
      const mockResponse = {
        settings: { soundEnabled: true, autoAdvance: false, language: 'en' },
        stats: { totalWordsStudied: 100, quizzesTaken: 5 },
      };
      mockFetchWithAuth.mockResolvedValueOnce(mockResponse);

      const result = await quizApi.exportData();

      expect(mockFetchWithAuth).toHaveBeenCalledWith('/migrate/export');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('healthCheck', () => {
    it('calls fetch directly (no auth) to /health', async () => {
      const mockResponse = { status: 'ok', timestamp: '2026-03-16T12:00:00Z' };
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValueOnce(mockResponse),
      });
      vi.stubGlobal('fetch', mockFetch);

      const result = await quizApi.healthCheck();

      expect(mockFetch).toHaveBeenCalledWith('http://localhost:9876/api/health');
      expect(result).toEqual(mockResponse);

      vi.unstubAllGlobals();
    });

    it('throws when health check fails', async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 503,
      });
      vi.stubGlobal('fetch', mockFetch);

      await expect(quizApi.healthCheck()).rejects.toThrow('Health check failed');

      vi.unstubAllGlobals();
    });
  });
});
