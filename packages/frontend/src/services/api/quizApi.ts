// Quiz, study session, migration, and health check API endpoints

import { baseApi } from './baseApi';
import type {
  SaveQuizResultRequest,
  SaveStudySessionRequest,
  UserSettings,
  UserStats,
} from './types';
import type { NewlyEarnedAchievement } from './achievementApi';

export const quizApi = {
  async saveQuizResult(data: SaveQuizResultRequest): Promise<{ success: boolean; resultId: number; newAchievements?: NewlyEarnedAchievement[] }> {
    return baseApi.fetchWithAuth<{ success: boolean; resultId: number; newAchievements?: NewlyEarnedAchievement[] }>('/api/quiz-results', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async saveStudySession(data: SaveStudySessionRequest): Promise<{ success: boolean; sessionId: number }> {
    return baseApi.fetchWithAuth<{ success: boolean; sessionId: number }>('/api/study-stats', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async importData(data: { settings?: UserSettings; stats?: UserStats }): Promise<{
    message: string;
    settings: UserSettings | null;
    stats: UserStats | null;
  }> {
    return baseApi.fetchWithAuth('/api/migrate/import', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async exportData(): Promise<{ settings: UserSettings; stats: UserStats }> {
    return baseApi.fetchWithAuth('/api/migrate/export');
  },

  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    const response = await fetch(`${baseApi.getBaseUrl()}/api/health`);
    if (!response.ok) {
      throw new Error('Health check failed');
    }
    return response.json();
  },
};
