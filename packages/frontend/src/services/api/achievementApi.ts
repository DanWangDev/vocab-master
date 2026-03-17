import { baseApi } from './baseApi';

export interface Achievement {
  id: number;
  slug: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  threshold: number;
  sort_order: number;
  earned: boolean;
  earnedAt: string | null;
}

export interface NewlyEarnedAchievement {
  slug: string;
  name: string;
  description: string;
  icon: string;
  earnedAt: string;
}

export const achievementApi = {
  async getAll(): Promise<{ achievements: Achievement[]; totalEarned: number; totalAvailable: number }> {
    return baseApi.fetchWithAuth('/achievements');
  },

  async getMine(): Promise<{ achievements: Achievement[]; totalEarned: number; totalAvailable: number }> {
    return baseApi.fetchWithAuth('/achievements/mine');
  },

  async check(): Promise<{ newlyEarned: NewlyEarnedAchievement[]; totalEarned: number; totalAvailable: number }> {
    return baseApi.fetchWithAuth('/achievements/check', { method: 'POST' });
  },
};
