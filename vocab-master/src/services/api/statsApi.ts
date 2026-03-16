// Stats API endpoints

import { baseApi } from './baseApi';
import type { UserStats } from './types';

export const statsApi = {
  async getStats(): Promise<UserStats> {
    return baseApi.fetchWithAuth<UserStats>('/stats');
  },

  async updateStats(stats: Partial<UserStats>): Promise<UserStats> {
    return baseApi.fetchWithAuth<UserStats>('/stats', {
      method: 'PATCH',
      body: JSON.stringify(stats),
    });
  },

  async incrementStats(increments: {
    totalWordsStudied?: number;
    quizzesTaken?: number;
    challengesCompleted?: number;
  }): Promise<UserStats> {
    return baseApi.fetchWithAuth<UserStats>('/stats/increment', {
      method: 'POST',
      body: JSON.stringify(increments),
    });
  },

  async getWeakWords(): Promise<{
    weakWords: Array<{
      word: string;
      incorrectCount: number;
      correctCount: number;
      totalAttempts: number;
      accuracy: number;
    }>;
  }> {
    return baseApi.fetchWithAuth('/stats/weak-words');
  },

  async getActivityStats(): Promise<{
    quizCount: number;
    avgAccuracy: number;
    bestScore: number;
    studySessions: number;
    wordsReviewed: number;
    currentStreak: number;
  }> {
    return baseApi.fetchWithAuth('/stats/activity');
  },
};
