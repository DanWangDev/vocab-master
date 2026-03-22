// Challenge API endpoints

import { baseApi } from './baseApi';
import type {
  TodayChallengeResponse,
  CompleteChallengeResponse,
  DailyChallenge,
} from './types';

export const challengeApi = {
  async getTodayChallenge(): Promise<TodayChallengeResponse> {
    return baseApi.fetchWithAuth<TodayChallengeResponse>('/api/challenges/today');
  },

  async completeChallenge(score: number): Promise<CompleteChallengeResponse> {
    return baseApi.fetchWithAuth<CompleteChallengeResponse>('/api/challenges/complete', {
      method: 'POST',
      body: JSON.stringify({ score }),
    });
  },

  async getChallengeHistory(limit?: number): Promise<{ challenges: DailyChallenge[] }> {
    const url = limit ? `/api/challenges/history?limit=${limit}` : '/api/challenges/history';
    return baseApi.fetchWithAuth<{ challenges: DailyChallenge[] }>(url);
  },

  async getStreak(): Promise<{ streak: number; bestScore: number }> {
    return baseApi.fetchWithAuth<{ streak: number; bestScore: number }>('/api/challenges/streak');
  },
};
