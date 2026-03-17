import type { Database } from 'better-sqlite3';
import type { Migration } from '../config/migrator';

export const updateUsersSchema: Migration = {
  name: '004_update_users_schema',
  up: (db: Database) => {
    console.log('[Migration 004] Checking if users table needs update...');

    // Check if parent_id column exists
    const tableInfo = db.pragma('table_info(users)') as { name: string }[];
    const hasParentId = tableInfo.some(col => col.name === 'parent_id');

    // We run the migration anyway to ensure schema correctness (constraints etc)
    // even if parent_id essentially exists, checking for full correctness is harder,
    // so we proceed with the robust recreation strategy.

    console.log('[Migration 004] Starting schema update for users table...');

    db.transaction(() => {
      // Disable foreign keys to allow table replacement
      db.pragma('foreign_keys = OFF');

      try {
        // 1. Create new table with updated schema as 'users_new'
        // This prevents FKs from being updated to point to a temporary name
        db.prepare(`
          CREATE TABLE users_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            display_name TEXT,
            role TEXT CHECK(role IN ('student', 'parent', 'admin')) DEFAULT 'student',
            parent_id INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (parent_id) REFERENCES users_new(id) ON DELETE SET NULL
          )
        `).run();

        // 2. Copy data from old table (users) to new table (users_new)
        // Inspect columns of users to dynamically build the SELECT statement
        const oldTableInfo = db.pragma('table_info(users)') as { name: string }[];
        const oldColumns = new Set(oldTableInfo.map(col => col.name));

        console.log('[Migration 004] Old table columns:', Array.from(oldColumns).join(', '));

        // Define how to source existing columns
        const sourceId = oldColumns.has('id') ? 'id' : 'NULL';
        const sourceUsername = oldColumns.has('username') ? 'username' : "''";
        const sourcePasswordHash = oldColumns.has('password_hash') ? 'password_hash' : "''";

        // Handle potentially missing columns
        const sourceDisplayName = oldColumns.has('display_name') ? 'display_name' : 'NULL';
        const sourceRole = oldColumns.has('role') ? 'role' : "'student'";
        const sourceCreatedAt = oldColumns.has('created_at') ? 'created_at' : "CURRENT_TIMESTAMP";

        const insertSql = `
                  INSERT INTO users_new (id, username, password_hash, display_name, role, created_at, parent_id)
                  SELECT 
                    ${sourceId}, 
                    ${sourceUsername}, 
                    ${sourcePasswordHash}, 
                    ${sourceDisplayName}, 
                    ${sourceRole}, 
                    ${sourceCreatedAt},
                    NULL
                  FROM users
                `;

        console.log('[Migration 004] Executing data copy SQL:', insertSql);
        db.prepare(insertSql).run();

        // 3. Drop old table
        db.prepare('DROP TABLE users').run();

        // 4. Rename new table to users
        db.prepare('ALTER TABLE users_new RENAME TO users').run();

        // 5. Verify integrity
        const count = db.prepare('SELECT COUNT(*) as c FROM users').get() as { c: number };
        console.log(`[Migration 004] Successfully migrated ${count.c} users.`);

      } catch (error) {
        console.error('[Migration 004] Failed. Rolling back...', error);

        // Attempt to restore if we failed *after* renaming but *before* dropping
        // (Transaction rollback handles data changes, but DDL behavior in SQLite with transactions
        // is generally generally safe but 'users' table might not exist if creation failed)
        // However, db.transaction() in better-sqlite3 wraps everything.
        throw error;
      } finally {
        // Re-enable foreign keys
        db.pragma('foreign_keys = ON');
      }
    })();

    console.log('[Migration 004] Users table schema updated successfully.');
  }
};
