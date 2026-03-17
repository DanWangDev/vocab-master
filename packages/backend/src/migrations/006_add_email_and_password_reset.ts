import type { Database } from 'better-sqlite3';
import type { Migration } from '../config/migrator';

export const addEmailAndPasswordReset: Migration = {
  name: '006_add_email_and_password_reset',
  up: (db: Database) => {
    console.log('[Migration 006] Adding email and password reset functionality...');

    db.transaction(() => {
      // Check if email column already exists
      const tableInfo = db.pragma('table_info(users)') as { name: string }[];
      const hasEmail = tableInfo.some(col => col.name === 'email');
      const hasEmailVerified = tableInfo.some(col => col.name === 'email_verified');

      // Add email column if not exists
      if (!hasEmail) {
        console.log('[Migration 006] Adding email column to users table...');
        db.prepare('ALTER TABLE users ADD COLUMN email TEXT').run();
        console.log('[Migration 006] Creating unique index on email column...');
        db.prepare('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email)').run();
      }

      // Add email_verified column if not exists
      if (!hasEmailVerified) {
        console.log('[Migration 006] Adding email_verified column to users table...');
        db.prepare('ALTER TABLE users ADD COLUMN email_verified INTEGER DEFAULT 0').run();
      }

      // Create password_reset_tokens table if not exists
      console.log('[Migration 006] Creating password_reset_tokens table...');
      db.prepare(`
        CREATE TABLE IF NOT EXISTS password_reset_tokens (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          token_hash TEXT NOT NULL,
          expires_at DATETIME NOT NULL,
          used_at DATETIME DEFAULT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `).run();

      // Create index for user_id lookup
      db.prepare(`
        CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id
        ON password_reset_tokens(user_id)
      `).run();

      // Create index for token_hash lookup
      db.prepare(`
        CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token_hash
        ON password_reset_tokens(token_hash)
      `).run();

    })();

    console.log('[Migration 006] Email and password reset migration completed successfully.');
  }
};
