import type { Database } from 'better-sqlite3';
import type { Migration } from '../config/migrator';

export const addGroupWordlists: Migration = {
  name: '018_add_group_wordlists',
  up: (db: Database) => {
    db.prepare(`
      CREATE TABLE IF NOT EXISTS group_wordlists (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
        wordlist_id INTEGER NOT NULL REFERENCES wordlists(id) ON DELETE CASCADE,
        assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(group_id, wordlist_id)
      )
    `).run();

    db.prepare(`
      CREATE INDEX IF NOT EXISTS idx_group_wordlists_group_id ON group_wordlists(group_id)
    `).run();

    db.prepare(`
      CREATE INDEX IF NOT EXISTS idx_group_wordlists_wordlist_id ON group_wordlists(wordlist_id)
    `).run();
  }
};
