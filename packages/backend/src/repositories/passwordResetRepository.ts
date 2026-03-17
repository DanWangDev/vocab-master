import db from '../config/database.js';
import type { PasswordResetTokenRow } from '../types/index.js';

export const passwordResetRepository = {
  /**
   * Create a new password reset token with selector for O(1) lookup
   * The token_hash column stores: "selector:validatorHash" format
   * This allows lookup by selector, then comparison of validator
   */
  create(userId: number, tokenHash: string, expiresAt: Date): PasswordResetTokenRow {
    const stmt = db.prepare(`
      INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
      VALUES (?, ?, ?)
    `);

    const result = stmt.run(userId, tokenHash, expiresAt.toISOString());
    const id = result.lastInsertRowid as number;

    return this.findById(id)!;
  },

  /**
   * Find a token by its ID
   */
  findById(id: number): PasswordResetTokenRow | undefined {
    const stmt = db.prepare('SELECT * FROM password_reset_tokens WHERE id = ?');
    return stmt.get(id) as PasswordResetTokenRow | undefined;
  },

  /**
   * Find a valid (unused, not expired) token by selector prefix
   * Token hash format is "selector:validatorHash"
   */
  findBySelector(selector: string): PasswordResetTokenRow | undefined {
    const stmt = db.prepare(`
      SELECT * FROM password_reset_tokens
      WHERE token_hash LIKE ? || ':%'
        AND used_at IS NULL
        AND expires_at > datetime('now')
    `);
    return stmt.get(selector) as PasswordResetTokenRow | undefined;
  },

  /**
   * Mark a token as used
   */
  markUsed(id: number): void {
    const stmt = db.prepare(`
      UPDATE password_reset_tokens
      SET used_at = datetime('now')
      WHERE id = ?
    `);
    stmt.run(id);
  },

  /**
   * Delete all expired tokens (cleanup)
   */
  deleteExpired(): number {
    const stmt = db.prepare(`
      DELETE FROM password_reset_tokens
      WHERE expires_at < datetime('now')
    `);
    const result = stmt.run();
    return result.changes;
  },

  /**
   * Delete all tokens for a specific user (used after successful password reset)
   */
  deleteAllForUser(userId: number): number {
    const stmt = db.prepare('DELETE FROM password_reset_tokens WHERE user_id = ?');
    const result = stmt.run(userId);
    return result.changes;
  },

  /**
   * Count recent tokens created for a user (for rate limiting)
   * @param userId - The user ID
   * @param withinMinutes - Time window in minutes
   * @returns Number of tokens created within the time window
   */
  countRecentByUserId(userId: number, withinMinutes: number): number {
    const stmt = db.prepare(`
      SELECT COUNT(*) as count
      FROM password_reset_tokens
      WHERE user_id = ?
        AND created_at > datetime('now', '-' || ? || ' minutes')
    `);
    const result = stmt.get(userId, withinMinutes) as { count: number };
    return result.count;
  },
};
