import type { Database } from 'better-sqlite3';
import type { Migration } from '../config/migrator';

export const addGoogleOauth: Migration = {
  name: '012_add_google_oauth',
  up: (db: Database) => {
    console.log('[Migration 012] Adding Google OAuth columns to users table...');

    db.transaction(() => {
      db.pragma('foreign_keys = OFF');

      try {
        // Get current table structure
        const tableInfo = db.pragma('table_info(users)') as { name: string }[];
        const oldColumns = new Set(tableInfo.map(col => col.name));

        console.log('[Migration 012] Current columns:', Array.from(oldColumns).join(', '));

        // Skip if already migrated
        if (oldColumns.has('google_id') && oldColumns.has('auth_provider')) {
          console.log('[Migration 012] Google OAuth columns already exist, skipping.');
          return;
        }

        // Create new table with google_id, auth_provider, and nullable password_hash
        db.prepare(`
          CREATE TABLE users_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT,
            display_name TEXT,
            role TEXT CHECK(role IN ('student', 'parent', 'admin')) DEFAULT 'student',
            parent_id INTEGER,
            email TEXT,
            email_verified INTEGER DEFAULT 0,
            google_id TEXT UNIQUE,
            auth_provider TEXT DEFAULT 'local',
            last_seen_at DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (parent_id) REFERENCES users_new(id) ON DELETE SET NULL
          )
        `).run();

        // Build dynamic column mapping
        const sourceColumns = [
          'id', 'username', 'password_hash', 'display_name', 'role',
          'parent_id', 'email', 'email_verified', 'last_seen_at', 'created_at'
        ].filter(col => oldColumns.has(col));

        const selectList = sourceColumns.join(', ');
        const insertCols = sourceColumns.join(', ');

        const insertSql = `
          INSERT INTO users_new (${insertCols}, auth_provider)
          SELECT ${selectList}, 'local'
          FROM users
        `;

        console.log('[Migration 012] Copying data...');
        db.prepare(insertSql).run();

        db.prepare('DROP TABLE users').run();
        db.prepare('ALTER TABLE users_new RENAME TO users').run();

        const count = db.prepare('SELECT COUNT(*) as c FROM users').get() as { c: number };
        console.log(`[Migration 012] Successfully migrated ${count.c} users with Google OAuth columns.`);
      } catch (error) {
        console.error('[Migration 012] Failed:', error);
        throw error;
      } finally {
        db.pragma('foreign_keys = ON');
      }
    })();

    console.log('[Migration 012] Google OAuth migration complete.');
  }
};
