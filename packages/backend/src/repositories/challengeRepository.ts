import db from '../config/database.js';
import type { DailyChallengeRow } from '../types/index.js';

export const challengeRepository = {
  findByUserAndDate(userId: number, date: string): DailyChallengeRow | undefined {
    const stmt = db.prepare(`
      SELECT * FROM daily_challenges
      WHERE user_id = ? AND challenge_date = ?
    `);
    return stmt.get(userId, date) as DailyChallengeRow | undefined;
  },

  getTodayChallenge(userId: number): DailyChallengeRow | undefined {
    const today = new Date().toISOString().split('T')[0];
    return this.findByUserAndDate(userId, today);
  },

  create(userId: number, date: string, score: number): DailyChallengeRow {
    const stmt = db.prepare(`
      INSERT INTO daily_challenges (user_id, challenge_date, score)
      VALUES (?, ?, ?)
    `);

    const result = stmt.run(userId, date, score);
    return this.findById(result.lastInsertRowid as number)!;
  },

  findById(id: number): DailyChallengeRow | undefined {
    const stmt = db.prepare('SELECT * FROM daily_challenges WHERE id = ?');
    return stmt.get(id) as DailyChallengeRow | undefined;
  },

  getRecentChallenges(userId: number, limit: number = 30): DailyChallengeRow[] {
    const stmt = db.prepare(`
      SELECT * FROM daily_challenges
      WHERE user_id = ?
      ORDER BY challenge_date DESC
      LIMIT ?
    `);
    return stmt.all(userId, limit) as DailyChallengeRow[];
  },

  calculateStreak(userId: number): number {
    const challenges = this.getRecentChallenges(userId, 365);

    if (challenges.length === 0) {
      return 0;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let streak = 0;
    let currentDate = today;

    // Check if today's challenge is completed
    const todayStr = currentDate.toISOString().split('T')[0];
    const todayChallenge = challenges.find(c => c.challenge_date === todayStr);

    if (!todayChallenge) {
      // Check yesterday to see if streak is still active
      const yesterday = new Date(currentDate);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      if (!challenges.find(c => c.challenge_date === yesterdayStr)) {
        return 0; // No streak
      }
      currentDate = yesterday;
    }

    // Count consecutive days
    for (const challenge of challenges) {
      const challengeDate = new Date(challenge.challenge_date);
      challengeDate.setHours(0, 0, 0, 0);

      const expectedDate = new Date(currentDate);
      expectedDate.setDate(expectedDate.getDate() - streak);
      expectedDate.setHours(0, 0, 0, 0);

      if (challengeDate.getTime() === expectedDate.getTime()) {
        streak++;
      } else if (challengeDate.getTime() < expectedDate.getTime()) {
        break;
      }
    }

    return streak;
  },

  getBestScore(userId: number): number {
    const stmt = db.prepare(`
      SELECT MAX(score) as best_score FROM daily_challenges
      WHERE user_id = ?
    `);
    const result = stmt.get(userId) as { best_score: number | null };
    return result.best_score || 0;
  }
};
