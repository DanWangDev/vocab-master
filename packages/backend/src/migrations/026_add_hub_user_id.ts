import type { Database } from 'better-sqlite3';
import type { Migration } from '../config/migrator';

export const addHubUserId: Migration = {
  name: '026_add_hub_user_id',
  up: (db: Database) => {
    console.log('[Migration 026] Adding hub_user_id column to users table...');

    const tableInfo = db.pragma('table_info(users)') as { name: string }[];
    const columns = new Set(tableInfo.map(col => col.name));

    if (columns.has('hub_user_id')) {
      console.log('[Migration 026] hub_user_id column already exists, skipping.');
      return;
    }

    db.transaction(() => {
      db.prepare('ALTER TABLE users ADD COLUMN hub_user_id TEXT').run();
      db.prepare('CREATE UNIQUE INDEX idx_users_hub_user_id ON users(hub_user_id) WHERE hub_user_id IS NOT NULL').run();
    })();

    console.log('[Migration 026] hub_user_id column added successfully.');
  }
};
