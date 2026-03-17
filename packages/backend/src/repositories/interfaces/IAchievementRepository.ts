import type { AchievementRow, UserAchievementRow } from '../../types/index.js';

export interface UserAchievementWithDetails extends UserAchievementRow {
  slug: string;
  name: string;
  description: string;
  icon: string;
  category: string;
}

export interface IAchievementRepository {
  findAll(): AchievementRow[];
  findBySlug(slug: string): AchievementRow | undefined;
  findByUserId(userId: number): UserAchievementWithDetails[];
  findEarnedSlugs(userId: number): string[];
  award(userId: number, achievementId: number): UserAchievementRow | undefined;
  hasAchievement(userId: number, slug: string): boolean;
}
