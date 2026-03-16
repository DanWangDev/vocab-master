import crypto from 'crypto';
import type { Database } from 'better-sqlite3';
import type { RefreshTokenRow } from '../../types/index.js';
import type { ITokenRepository } from '../interfaces/index.js';

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export class SqliteTokenRepository implements ITokenRepository {
  constructor(private readonly db: Database) {}

  create(userId: number, token: string, expiresAt: Date): RefreshTokenRow {
    const tokenHash = hashToken(token);
    const stmt = this.db.prepare(`
      INSERT INTO refresh_tokens (user_id, token, expires_at)
      VALUES (?, ?, ?)
    `);

    const result = stmt.run(userId, tokenHash, expiresAt.toISOString());
    return this.findById(result.lastInsertRowid as number)!;
  }

  findById(id: number): RefreshTokenRow | undefined {
    const stmt = this.db.prepare('SELECT * FROM refresh_tokens WHERE id = ?');
    return stmt.get(id) as RefreshTokenRow | undefined;
  }

  findByToken(rawToken: string): RefreshTokenRow | undefined {
    const tokenHash = hashToken(rawToken);
    const stmt = this.db.prepare('SELECT * FROM refresh_tokens WHERE token = ?');
    return stmt.get(tokenHash) as RefreshTokenRow | undefined;
  }

  deleteByToken(rawToken: string): void {
    const tokenHash = hashToken(rawToken);
    const stmt = this.db.prepare('DELETE FROM refresh_tokens WHERE token = ?');
    stmt.run(tokenHash);
  }

  deleteAllForUser(userId: number): void {
    const stmt = this.db.prepare('DELETE FROM refresh_tokens WHERE user_id = ?');
    stmt.run(userId);
  }

  deleteExpired(): void {
    const stmt = this.db.prepare('DELETE FROM refresh_tokens WHERE expires_at < ?');
    stmt.run(new Date().toISOString());
  }

  isValid(rawToken: string): boolean {
    const record = this.findByToken(rawToken);
    if (!record) {
      return false;
    }

    const expiresAt = new Date(record.expires_at);
    return expiresAt > new Date();
  }
}
