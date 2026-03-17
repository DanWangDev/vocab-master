import type { Database } from 'better-sqlite3';
import type { Migration } from '../config/migrator';

export const addWordMastery: Migration = {
  name: '019_add_word_mastery',
  up: (db: Database) => {
    db.prepare(`
      CREATE TABLE IF NOT EXISTS word_mastery (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        word TEXT NOT NULL,
        wordlist_id INTEGER REFERENCES wordlists(id) ON DELETE SET NULL,
        correct_count INTEGER NOT NULL DEFAULT 0,
        incorrect_count INTEGER NOT NULL DEFAULT 0,
        last_correct_at DATETIME,
        last_incorrect_at DATETIME,
        mastery_level INTEGER NOT NULL DEFAULT 0 CHECK(mastery_level BETWEEN 0 AND 3),
        next_review_at DATETIME,
        srs_interval_days REAL NOT NULL DEFAULT 1.0,
        srs_ease_factor REAL NOT NULL DEFAULT 2.5,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, word)
      )
    `).run();

    db.prepare(`
      CREATE INDEX IF NOT EXISTS idx_word_mastery_user_id ON word_mastery(user_id)
    `).run();

    db.prepare(`
      CREATE INDEX IF NOT EXISTS idx_word_mastery_user_mastery ON word_mastery(user_id, mastery_level)
    `).run();

    db.prepare(`
      CREATE INDEX IF NOT EXISTS idx_word_mastery_next_review ON word_mastery(user_id, next_review_at)
    `).run();

    db.prepare(`
      CREATE TABLE IF NOT EXISTS email_digest_preferences (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        frequency TEXT NOT NULL DEFAULT 'weekly' CHECK(frequency IN ('daily', 'weekly', 'never')),
        last_sent_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run();
  }
};
