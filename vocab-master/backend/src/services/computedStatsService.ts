import { db } from '../config/database';
import type { UserStats } from '../types';

/**
 * Computes user stats from raw activity tables instead of the cached user_stats table.
 * This replaces statsRepository.get() with live queries.
 */
export function getComputedStats(userId: number): UserStats {
  const wordsStudied = db.prepare(`
    SELECT COUNT(DISTINCT word) as count
    FROM user_vocabulary WHERE user_id = ?
  `).get(userId) as { count: number } | undefined;

  const quizzesTaken = db.prepare(`
    SELECT COUNT(*) as count FROM quiz_results
    WHERE user_id = ? AND quiz_type = 'quiz'
  `).get(userId) as { count: number };

  const challengesCompleted = db.prepare(`
    SELECT COUNT(*) as count FROM daily_challenges
    WHERE user_id = ?
  `).get(userId) as { count: number };

  const bestChallengeScore = db.prepare(`
    SELECT COALESCE(MAX(score), 0) as score FROM daily_challenges
    WHERE user_id = ?
  `).get(userId) as { score: number };

  const lastStudyDate = db.prepare(`
    SELECT MAX(latest) as last_date FROM (
      SELECT MAX(start_time) as latest FROM study_sessions WHERE user_id = ?
      UNION ALL
      SELECT MAX(completed_at) as latest FROM quiz_results WHERE user_id = ?
      UNION ALL
      SELECT MAX(created_at) as latest FROM daily_challenges WHERE user_id = ?
    )
  `).get(userId, userId, userId) as { last_date: string | null };

  return {
    totalWordsStudied: wordsStudied?.count ?? 0,
    quizzesTaken: quizzesTaken.count,
    challengesCompleted: challengesCompleted.count,
    bestChallengeScore: bestChallengeScore.score,
    lastStudyDate: lastStudyDate.last_date,
  };
}

export const computedStatsService = {
  getComputedStats,
};
