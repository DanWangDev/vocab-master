import type { Database } from 'better-sqlite3';
import type { Migration } from '../config/migrator';

export const addLastSeen: Migration = {
  name: '011_add_last_seen',
  up: (db: Database) => {
    console.log('[Migration 011] Adding last_seen_at column to users...');

    db.transaction(() => {
      db.prepare('ALTER TABLE users ADD COLUMN last_seen_at TEXT').run();

      // Seed existing users' last_seen_at from their last_study_date
      db.prepare(`
        UPDATE users SET last_seen_at = (
          SELECT last_study_date FROM user_stats WHERE user_stats.user_id = users.id
        )
        WHERE EXISTS (
          SELECT 1 FROM user_stats WHERE user_stats.user_id = users.id AND user_stats.last_study_date IS NOT NULL
        )
      `).run();
    })();

    console.log('[Migration 011] last_seen_at migration completed successfully.');
  }
};
