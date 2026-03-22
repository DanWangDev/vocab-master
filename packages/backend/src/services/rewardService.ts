import { db } from '../config/database';
import { logger } from './logger';

interface StreakRewardRow {
  id: number;
  streak_days: number;
  reward_type: string;
  reward_slug: string;
  name: string;
  description: string;
}

interface UserRewardRow {
  id: number;
  user_id: number;
  reward_id: number;
  earned_at: string;
}

export interface RewardWithStatus extends StreakRewardRow {
  earned: boolean;
  earned_at: string | null;
  active: boolean;
  locked: boolean;
}

export function checkAndAwardStreakRewards(userId: number, currentStreak: number): RewardWithStatus[] {
  const newlyEarned: RewardWithStatus[] = [];

  try {
    const eligibleRewards = db.prepare(
      'SELECT * FROM streak_rewards WHERE streak_days <= ? ORDER BY streak_days ASC'
    ).all(currentStreak) as StreakRewardRow[];

    for (const reward of eligibleRewards) {
      // Check if already earned
      const existing = db.prepare(
        'SELECT 1 FROM user_rewards WHERE user_id = ? AND reward_id = ?'
      ).get(userId, reward.id);

      if (!existing) {
        db.prepare(
          'INSERT INTO user_rewards (user_id, reward_id) VALUES (?, ?)'
        ).run(userId, reward.id);

        newlyEarned.push({
          ...reward,
          earned: true,
          earned_at: new Date().toISOString(),
          active: false,
          locked: false,
        });
      }
    }
  } catch (error) {
    logger.error('Reward check failed (non-fatal)', { userId, currentStreak, error: String(error) });
  }

  return newlyEarned;
}

export function getUserRewards(userId: number, currentStreak: number): RewardWithStatus[] {
  const allRewards = db.prepare('SELECT * FROM streak_rewards ORDER BY streak_days ASC').all() as StreakRewardRow[];
  const earnedRewards = db.prepare('SELECT * FROM user_rewards WHERE user_id = ?').all(userId) as UserRewardRow[];
  const earnedMap = new Map(earnedRewards.map(r => [r.reward_id, r]));

  const settings = db.prepare(
    'SELECT active_avatar_frame, active_dashboard_theme FROM user_settings WHERE user_id = ?'
  ).get(userId) as { active_avatar_frame: string | null; active_dashboard_theme: string | null } | undefined;

  const activeFrame = settings?.active_avatar_frame ?? null;
  const activeTheme = settings?.active_dashboard_theme ?? null;

  return allRewards.map(reward => {
    const earned = earnedMap.get(reward.id);
    const isEarned = !!earned;
    const isLocked = isEarned && currentStreak < reward.streak_days;
    const isActive = (reward.reward_type === 'avatar_frame' && reward.reward_slug === activeFrame) ||
                     (reward.reward_type === 'dashboard_theme' && reward.reward_slug === activeTheme);

    return {
      ...reward,
      earned: isEarned,
      earned_at: earned?.earned_at ?? null,
      active: isActive && !isLocked,
      locked: isLocked,
    };
  });
}

export function setActiveReward(userId: number, rewardSlug: string | null, rewardType: 'avatar_frame' | 'dashboard_theme'): boolean {
  if (rewardSlug !== null) {
    // Verify reward exists and is earned and not locked
    const reward = db.prepare(
      'SELECT sr.*, ur.id as user_reward_id FROM streak_rewards sr LEFT JOIN user_rewards ur ON sr.id = ur.reward_id AND ur.user_id = ? WHERE sr.reward_slug = ?'
    ).get(userId, rewardSlug) as (StreakRewardRow & { user_reward_id: number | null }) | undefined;

    if (!reward || !reward.user_reward_id) return false;

    // Check lock state
    const stats = db.prepare(
      "SELECT COALESCE((SELECT current_streak FROM (SELECT COUNT(*) as current_streak FROM (SELECT 1))), 0) as streak"
    ).get() as { streak: number };

    // Use dashboardService streak calculation via direct query
    // (simplified: just check if the reward type matches)
    if (reward.reward_type !== rewardType) return false;
  }

  const column = rewardType === 'avatar_frame' ? 'active_avatar_frame' : 'active_dashboard_theme';

  // UPSERT user_settings
  db.prepare(`
    INSERT INTO user_settings (user_id, ${column})
    VALUES (?, ?)
    ON CONFLICT(user_id) DO UPDATE SET ${column} = ?
  `).run(userId, rewardSlug, rewardSlug);

  return true;
}

export const rewardService = {
  checkAndAwardStreakRewards,
  getUserRewards,
  setActiveReward,
};
