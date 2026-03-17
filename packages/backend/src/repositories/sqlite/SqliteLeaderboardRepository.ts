import type { Database } from 'better-sqlite3';
import type { LeaderboardEntryRow, LeaderboardEntryWithUser } from '../../types/index.js';
import type { ILeaderboardRepository } from '../interfaces/ILeaderboardRepository.js';

export class SqliteLeaderboardRepository implements ILeaderboardRepository {
  constructor(private readonly db: Database) {}

  getByPeriod(period: string, periodKey: string, limit = 50): LeaderboardEntryWithUser[] {
    return this.db.prepare(`
      SELECT le.*, u.username, u.display_name
      FROM leaderboard_entries le
      JOIN users u ON u.id = le.user_id
      WHERE le.period = ? AND le.period_key = ?
      ORDER BY le.score DESC
      LIMIT ?
    `).all(period, periodKey, limit) as LeaderboardEntryWithUser[];
  }

  getUserEntry(userId: number, period: string, periodKey: string): LeaderboardEntryRow | undefined {
    return this.db.prepare(`
      SELECT * FROM leaderboard_entries
      WHERE user_id = ? AND period = ? AND period_key = ?
    `).get(userId, period, periodKey) as LeaderboardEntryRow | undefined;
  }

  upsert(entry: {
    userId: number;
    period: string;
    periodKey: string;
    score: number;
    quizzesCompleted: number;
    wordsMastered: number;
    streakDays: number;
  }): void {
    this.db.prepare(`
      INSERT INTO leaderboard_entries (user_id, period, period_key, score, quizzes_completed, words_mastered, streak_days, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(user_id, period, period_key) DO UPDATE SET
        score = excluded.score,
        quizzes_completed = excluded.quizzes_completed,
        words_mastered = excluded.words_mastered,
        streak_days = excluded.streak_days,
        updated_at = CURRENT_TIMESTAMP
    `).run(
      entry.userId,
      entry.period,
      entry.periodKey,
      entry.score,
      entry.quizzesCompleted,
      entry.wordsMastered,
      entry.streakDays
    );
  }

  recalculateAll(period: string, periodKey: string): void {
    // Get date range for the period
    const { startDate, endDate } = this.getDateRange(period, periodKey);

    // Get all students with activity in the period
    const students = this.db.prepare(`
      SELECT DISTINCT u.id as user_id
      FROM users u
      WHERE u.role = 'student'
      AND (
        EXISTS (SELECT 1 FROM quiz_results qr WHERE qr.user_id = u.id AND qr.completed_at >= ? AND qr.completed_at < ?)
        OR EXISTS (SELECT 1 FROM daily_challenges dc WHERE dc.user_id = u.id AND dc.challenge_date >= ? AND dc.challenge_date < ?)
        OR EXISTS (SELECT 1 FROM study_sessions ss WHERE ss.user_id = u.id AND ss.created_at >= ? AND ss.created_at < ?)
      )
    `).all(startDate, endDate, startDate, endDate, startDate, endDate) as Array<{ user_id: number }>;

    const upsertStmt = this.db.prepare(`
      INSERT INTO leaderboard_entries (user_id, period, period_key, score, quizzes_completed, words_mastered, streak_days, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(user_id, period, period_key) DO UPDATE SET
        score = excluded.score,
        quizzes_completed = excluded.quizzes_completed,
        words_mastered = excluded.words_mastered,
        streak_days = excluded.streak_days,
        updated_at = CURRENT_TIMESTAMP
    `);

    const transaction = this.db.transaction(() => {
      for (const { user_id } of students) {
        const stats = this.computeUserStats(user_id, startDate, endDate);
        upsertStmt.run(
          user_id, period, periodKey,
          stats.score, stats.quizzesCompleted, stats.wordsMastered, stats.streakDays
        );
      }
    });

    transaction();
  }

  private computeUserStats(userId: number, startDate: string, endDate: string) {
    // Quizzes completed and average score
    const quizStats = this.db.prepare(`
      SELECT COUNT(*) as count, COALESCE(AVG(score), 0) as avg_score
      FROM quiz_results
      WHERE user_id = ? AND completed_at >= ? AND completed_at < ?
    `).get(userId, startDate, endDate) as { count: number; avg_score: number };

    // Words studied (unique words from vocab)
    const wordCount = this.db.prepare(`
      SELECT COUNT(*) as count FROM user_vocabulary
      WHERE user_id = ? AND first_seen_at >= ? AND first_seen_at < ?
    `).get(userId, startDate, endDate) as { count: number };

    // Streak: count consecutive challenge days in the period
    const challengeDays = this.db.prepare(`
      SELECT DISTINCT challenge_date FROM daily_challenges
      WHERE user_id = ? AND challenge_date >= ? AND challenge_date < ?
      ORDER BY challenge_date ASC
    `).all(userId, startDate, endDate) as Array<{ challenge_date: string }>;

    let maxStreak = 0;
    let currentStreak = 0;
    let prevDate: Date | null = null;

    for (const { challenge_date } of challengeDays) {
      const d = new Date(challenge_date);
      if (prevDate && (d.getTime() - prevDate.getTime()) === 86400000) {
        currentStreak++;
      } else {
        currentStreak = 1;
      }
      if (currentStreak > maxStreak) maxStreak = currentStreak;
      prevDate = d;
    }

    // Composite score: quizzes * avg_score * 0.5 + words * 2 + streak * 10
    const score = Math.round(
      quizStats.count * quizStats.avg_score * 0.5 +
      wordCount.count * 2 +
      maxStreak * 10
    );

    return {
      score,
      quizzesCompleted: quizStats.count,
      wordsMastered: wordCount.count,
      streakDays: maxStreak,
    };
  }

  private getDateRange(period: string, periodKey: string): { startDate: string; endDate: string } {
    if (period === 'weekly') {
      // periodKey format: "2026-W11"
      const [yearStr, weekStr] = periodKey.split('-W');
      const year = parseInt(yearStr, 10);
      const week = parseInt(weekStr, 10);
      const jan1 = new Date(year, 0, 1);
      const daysToMonday = (jan1.getDay() + 6) % 7;
      const startDate = new Date(jan1.getTime() + ((week - 1) * 7 - daysToMonday) * 86400000);
      const endDate = new Date(startDate.getTime() + 7 * 86400000);
      return {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
      };
    } else if (period === 'monthly') {
      // periodKey format: "2026-03"
      const startDate = `${periodKey}-01`;
      const [yearStr, monthStr] = periodKey.split('-');
      const nextMonth = new Date(parseInt(yearStr, 10), parseInt(monthStr, 10), 1);
      const endDate = nextMonth.toISOString().split('T')[0];
      return { startDate, endDate };
    } else {
      // alltime - use a very wide range
      return { startDate: '2000-01-01', endDate: '2100-01-01' };
    }
  }
}
