import { leaderboardRepository } from '../repositories/index.js';
import { logger } from './logger.js';

export type LeaderboardPeriod = 'weekly' | 'monthly' | 'alltime';

/**
 * Get the current period key for a given period type.
 */
export function getCurrentPeriodKey(period: LeaderboardPeriod): string {
  const now = new Date();

  if (period === 'weekly') {
    // ISO 8601 week number: weeks start Monday, Sunday is the last day
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    // Set to nearest Thursday (ISO week-year pivot)
    d.setDate(d.getDate() + 4 - (d.getDay() || 7));
    const year = d.getFullYear();
    const yearStart = new Date(year, 0, 1);
    const weekNum = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
    return `${year}-W${String(weekNum).padStart(2, '0')}`;
  }

  if (period === 'monthly') {
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  return 'alltime';
}

/**
 * Get leaderboard rankings for a period.
 */
export function getLeaderboard(period: LeaderboardPeriod, limit = 50) {
  const periodKey = getCurrentPeriodKey(period);
  const entries = leaderboardRepository.getByPeriod(period, periodKey, limit);

  return {
    period,
    periodKey,
    entries: entries.map((entry, index) => ({
      rank: index + 1,
      userId: entry.user_id,
      username: entry.username,
      displayName: entry.display_name,
      score: entry.score,
      quizzesCompleted: entry.quizzes_completed,
      wordsMastered: entry.words_mastered,
      streakDays: entry.streak_days,
    })),
  };
}

/**
 * Get a specific user's ranking in a period.
 */
export function getUserRanking(userId: number, period: LeaderboardPeriod) {
  const periodKey = getCurrentPeriodKey(period);
  const allEntries = leaderboardRepository.getByPeriod(period, periodKey, 1000);
  const userIndex = allEntries.findIndex(e => e.user_id === userId);

  if (userIndex === -1) {
    return { rank: null, entry: null };
  }

  const entry = allEntries[userIndex];
  return {
    rank: userIndex + 1,
    entry: {
      userId: entry.user_id,
      username: entry.username,
      displayName: entry.display_name,
      score: entry.score,
      quizzesCompleted: entry.quizzes_completed,
      wordsMastered: entry.words_mastered,
      streakDays: entry.streak_days,
    },
  };
}

/**
 * Recalculate leaderboard for current periods.
 * Called by the background job queue.
 */
export function recalculateLeaderboards(): void {
  const periods: LeaderboardPeriod[] = ['weekly', 'monthly', 'alltime'];

  for (const period of periods) {
    const periodKey = getCurrentPeriodKey(period);
    try {
      leaderboardRepository.recalculateAll(period, periodKey);
    } catch (error) {
      logger.error(`Failed to recalculate ${period} leaderboard: ${error}`);
    }
  }

  logger.info('Leaderboard recalculation complete');
}
