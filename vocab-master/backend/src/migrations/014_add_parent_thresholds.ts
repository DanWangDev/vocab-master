import type { Database } from 'better-sqlite3';
import type { Migration } from '../config/migrator';

export const addParentThresholds: Migration = {
  name: '014_add_parent_thresholds',
  up: (db: Database) => {
    db.prepare(`
      CREATE TABLE IF NOT EXISTS parent_thresholds (
        parent_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        days_per_week INTEGER NOT NULL DEFAULT 5,
        minutes_per_day INTEGER NOT NULL DEFAULT 20,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run();
  }
};
