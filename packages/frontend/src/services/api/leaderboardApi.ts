import { baseApi } from './baseApi';

export interface LeaderboardEntry {
  rank: number;
  userId: number;
  username: string;
  displayName: string | null;
  score: number;
  quizzesCompleted: number;
  wordsMastered: number;
  streakDays: number;
}

export interface LeaderboardResponse {
  period: string;
  periodKey: string;
  entries: LeaderboardEntry[];
}

export interface UserRankingResponse {
  rank: number | null;
  entry: Omit<LeaderboardEntry, 'rank'> | null;
}

export const leaderboardApi = {
  async getLeaderboard(period: string = 'weekly', limit: number = 50): Promise<LeaderboardResponse> {
    return baseApi.fetchWithAuth(`/leaderboards?period=${period}&limit=${limit}`);
  },

  async getMyRanking(period: string = 'weekly'): Promise<UserRankingResponse> {
    return baseApi.fetchWithAuth(`/leaderboards/me?period=${period}`);
  },
};
