import type { Database } from 'better-sqlite3';
import type { Migration } from '../config/migrator';

export const addGroups: Migration = {
  name: '017_add_groups',
  up: (db: Database) => {
    db.prepare(`
      CREATE TABLE IF NOT EXISTS groups (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        join_code TEXT NOT NULL UNIQUE,
        max_members INTEGER NOT NULL DEFAULT 50,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run();

    db.prepare(`
      CREATE TABLE IF NOT EXISTS group_members (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role TEXT NOT NULL DEFAULT 'member' CHECK(role IN ('owner', 'admin', 'member')),
        joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(group_id, user_id)
      )
    `).run();

    db.prepare(`
      CREATE INDEX IF NOT EXISTS idx_groups_created_by ON groups(created_by)
    `).run();

    db.prepare(`
      CREATE INDEX IF NOT EXISTS idx_groups_join_code ON groups(join_code)
    `).run();

    db.prepare(`
      CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON group_members(user_id)
    `).run();

    db.prepare(`
      CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON group_members(group_id)
    `).run();
  }
};
