import type { Database } from 'better-sqlite3';
import type { Migration } from '../config/migrator';

export const cleanupLegacyAuth: Migration = {
  name: '027_cleanup_legacy_auth',
  up: (db: Database) => {
    console.log('[Migration 027] Dropping legacy auth tables...');

    db.transaction(() => {
      db.prepare('DROP TABLE IF EXISTS refresh_tokens').run();
      db.prepare('DROP TABLE IF EXISTS password_reset_tokens').run();
    })();

    // Intentionally keeping password_hash, google_id columns in users table.
    // They're harmless to leave and risky to drop (would require table rebuild in SQLite).

    console.log('[Migration 027] Legacy auth tables dropped.');
  }
};
