import type { Database } from 'better-sqlite3';
import type { PasswordResetTokenRow } from '../../types/index.js';
import type { IPasswordResetRepository } from '../interfaces/index.js';

export class SqlitePasswordResetRepository implements IPasswordResetRepository {
  constructor(private readonly db: Database) {}

  create(userId: number, tokenHash: string, expiresAt: Date): PasswordResetTokenRow {
    const stmt = this.db.prepare(`
      INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
      VALUES (?, ?, ?)
    `);

    const result = stmt.run(userId, tokenHash, expiresAt.toISOString());
    const id = result.lastInsertRowid as number;

    return this.findById(id)!;
  }

  findById(id: number): PasswordResetTokenRow | undefined {
    const stmt = this.db.prepare('SELECT * FROM password_reset_tokens WHERE id = ?');
    return stmt.get(id) as PasswordResetTokenRow | undefined;
  }

  findBySelector(selector: string): PasswordResetTokenRow | undefined {
    const stmt = this.db.prepare(`
      SELECT * FROM password_reset_tokens
      WHERE token_hash LIKE ? || ':%'
        AND used_at IS NULL
        AND expires_at > datetime('now')
    `);
    return stmt.get(selector) as PasswordResetTokenRow | undefined;
  }

  markUsed(id: number): void {
    const stmt = this.db.prepare(`
      UPDATE password_reset_tokens
      SET used_at = datetime('now')
      WHERE id = ?
    `);
    stmt.run(id);
  }

  deleteExpired(): number {
    const stmt = this.db.prepare(`
      DELETE FROM password_reset_tokens
      WHERE expires_at < datetime('now')
    `);
    const result = stmt.run();
    return result.changes;
  }

  deleteAllForUser(userId: number): number {
    const stmt = this.db.prepare('DELETE FROM password_reset_tokens WHERE user_id = ?');
    const result = stmt.run(userId);
    return result.changes;
  }

  countRecentByUserId(userId: number, withinMinutes: number): number {
    const stmt = this.db.prepare(`
      SELECT COUNT(*) as count
      FROM password_reset_tokens
      WHERE user_id = ?
        AND created_at > datetime('now', '-' || ? || ' minutes')
    `);
    const result = stmt.get(userId, withinMinutes) as { count: number };
    return result.count;
  }
}
