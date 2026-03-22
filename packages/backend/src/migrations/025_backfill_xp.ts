import type { Database } from 'better-sqlite3';
import type { Migration } from '../config/migrator';

/**
 * Backfill user_xp from historical quiz_results and exercise_results.
 *
 * XP was introduced in migration 024 but only awards going forward.
 * This retroactively creates XP entries so the leaderboard (which now
 * uses SUM(user_xp.amount)) reflects all historical activity.
 *
 * XP formulas match what the route handlers award:
 *   Quiz:     correct*10 + incorrect*2 + (perfect ? total*5 : 0)
 *   Exercise: correct*10 + (perfect ? total*5 : 0)
 */
export const backfillXp: Migration = {
  name: '025_backfill_xp',
  up: (db: Database) => {
    // Skip if backfill already ran (idempotent check)
    const existing = db.prepare(
      "SELECT COUNT(*) as count FROM user_xp WHERE source = 'quiz_backfill'"
    ).get() as { count: number };
    if (existing.count > 0) return;

    // Backfill from quiz_results
    const quizRows = db.prepare(`
      SELECT id, user_id, total_questions, correct_answers, score, completed_at
      FROM quiz_results
      ORDER BY completed_at ASC
    `).all() as Array<{
      id: number;
      user_id: number;
      total_questions: number;
      correct_answers: number;
      score: number;
      completed_at: string;
    }>;

    const insertXp = db.prepare(`
      INSERT INTO user_xp (user_id, amount, source, source_id, earned_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    const transaction = db.transaction(() => {
      for (const row of quizRows) {
        const correctXp = row.correct_answers * 10;
        const incorrectXp = (row.total_questions - row.correct_answers) * 2;
        const perfectBonus = row.score === 100 ? row.total_questions * 5 : 0;
        const totalXp = correctXp + incorrectXp + perfectBonus;

        if (totalXp > 0) {
          insertXp.run(row.user_id, totalXp, 'quiz_backfill', row.id, row.completed_at);
        }
      }

      // Backfill from exercise_results
      const exerciseRows = db.prepare(`
        SELECT id, user_id, total_questions, correct_answers, score, completed_at
        FROM exercise_results
        ORDER BY completed_at ASC
      `).all() as Array<{
        id: number;
        user_id: number;
        total_questions: number;
        correct_answers: number;
        score: number;
        completed_at: string;
      }>;

      for (const row of exerciseRows) {
        const correctXp = row.correct_answers * 10;
        const perfectBonus = row.score === 100 ? row.total_questions * 5 : 0;
        const totalXp = correctXp + perfectBonus;

        if (totalXp > 0) {
          insertXp.run(row.user_id, totalXp, 'exercise_backfill', row.id, row.completed_at);
        }
      }

      // Update user_stats.total_xp to reflect backfilled amounts
      db.prepare(`
        UPDATE user_stats SET total_xp = (
          SELECT COALESCE(SUM(amount), 0) FROM user_xp WHERE user_xp.user_id = user_stats.user_id
        )
      `).run();

      // Insert user_stats rows for users who have XP but no stats row yet
      db.prepare(`
        INSERT OR IGNORE INTO user_stats (user_id, total_xp, level)
        SELECT user_id, SUM(amount), 1
        FROM user_xp
        WHERE user_id NOT IN (SELECT user_id FROM user_stats)
        GROUP BY user_id
      `).run();
    });

    transaction();

    const backfilled = db.prepare(
      "SELECT COUNT(*) as count FROM user_xp WHERE source IN ('quiz_backfill', 'exercise_backfill')"
    ).get() as { count: number };
    console.log(`[Migration 025] Backfilled ${backfilled.count} XP entries from historical data.`);
  }
};
