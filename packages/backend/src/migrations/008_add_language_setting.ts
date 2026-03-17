import type { Database } from 'better-sqlite3';
import type { Migration } from '../config/migrator';

export const addLanguageSetting: Migration = {
  name: '008_add_language_setting',
  up: (db: Database) => {
    console.log('[Migration 008] Adding language column to user_settings...');

    db.transaction(() => {
      db.prepare(`
        ALTER TABLE user_settings ADD COLUMN language TEXT DEFAULT 'en'
      `).run();
    })();

    console.log('[Migration 008] Language setting migration completed successfully.');
  }
};
