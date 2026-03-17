import type { Database } from 'better-sqlite3';
import type { Migration } from '../config/migrator';

export const addPushTokens: Migration = {
  name: '010_add_push_tokens',
  up: (db: Database) => {
    console.log('[Migration 010] Adding push_tokens table...');

    db.transaction(() => {
      db.prepare(`
        CREATE TABLE push_tokens (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          expo_push_token TEXT NOT NULL UNIQUE,
          platform TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
      `).run();

      db.prepare('CREATE INDEX idx_push_tokens_user ON push_tokens(user_id)').run();
    })();

    console.log('[Migration 010] Push tokens migration completed successfully.');
  }
};
