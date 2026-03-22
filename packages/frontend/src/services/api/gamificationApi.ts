import { baseApi } from './baseApi';

export interface LevelInfo {
  level: number;
  title: string;
  totalXp: number;
  currentLevelXp: number;
  nextLevelXp: number;
  xpInLevel: number;
  xpNeeded: number;
}

export interface XpHistoryEntry {
  id: number;
  amount: number;
  source: string;
  source_id: number | null;
  earned_at: string;
}

export interface HeatmapDay {
  date: string;
  activityCount: number;
  types: string[];
}

export interface StreakDetails {
  currentStreak: number;
  longestStreak: number;
  streakStartDate: string | null;
  isActiveToday: boolean;
}

export interface RewardItem {
  id: number;
  streak_days: number;
  reward_type: string;
  reward_slug: string;
  name: string;
  description: string;
  earned: boolean;
  earned_at: string | null;
  active: boolean;
  locked: boolean;
}

export interface XpResult {
  earned: number;
  total: number;
  level: number;
  leveledUp: boolean;
  newLevel?: number;
  newTitle?: string;
}

export const gamificationApi = {
  async getLevelInfo(): Promise<LevelInfo> {
    return baseApi.fetchWithAuth<LevelInfo>('/api/xp/level-info');
  },

  async getXpHistory(limit: number = 50): Promise<{ history: XpHistoryEntry[] }> {
    return baseApi.fetchWithAuth<{ history: XpHistoryEntry[] }>(`/api/xp/history?limit=${limit}`);
  },

  async getActivityHeatmap(days: number = 90): Promise<{ days: HeatmapDay[] }> {
    return baseApi.fetchWithAuth<{ days: HeatmapDay[] }>(`/api/stats/activity-heatmap?days=${days}`);
  },

  async getStreakDetails(): Promise<StreakDetails> {
    return baseApi.fetchWithAuth<StreakDetails>('/api/stats/streak-details');
  },

  async getRewards(): Promise<{ rewards: RewardItem[]; currentStreak: number }> {
    return baseApi.fetchWithAuth<{ rewards: RewardItem[]; currentStreak: number }>('/api/rewards');
  },

  async setActiveReward(rewardSlug: string | null, rewardType: 'avatar_frame' | 'dashboard_theme'): Promise<{ success: boolean }> {
    return baseApi.fetchWithAuth<{ success: boolean }>('/api/rewards/active', {
      method: 'PATCH',
      body: JSON.stringify({ rewardSlug, rewardType }),
    });
  },
};
