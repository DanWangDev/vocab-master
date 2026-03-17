import type { Database } from 'better-sqlite3';
import type { Migration } from '../config/migrator';

export const addLeaderboards: Migration = {
  name: '016_add_leaderboards',
  up: (db: Database) => {
    db.prepare(`
      CREATE TABLE IF NOT EXISTS leaderboard_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        period TEXT NOT NULL CHECK(period IN ('weekly', 'monthly', 'alltime')),
        period_key TEXT NOT NULL,
        score INTEGER NOT NULL DEFAULT 0,
        quizzes_completed INTEGER NOT NULL DEFAULT 0,
        words_mastered INTEGER NOT NULL DEFAULT 0,
        streak_days INTEGER NOT NULL DEFAULT 0,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, period, period_key)
      )
    `).run();

    db.prepare(`
      CREATE INDEX IF NOT EXISTS idx_leaderboard_period_score
      ON leaderboard_entries(period, period_key, score DESC)
    `).run();

    db.prepare(`
      CREATE INDEX IF NOT EXISTS idx_leaderboard_user_id
      ON leaderboard_entries(user_id)
    `).run();
  }
};
