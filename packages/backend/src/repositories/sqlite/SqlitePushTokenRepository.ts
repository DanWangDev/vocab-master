import type { Database } from 'better-sqlite3';
import type { PushTokenRow } from '../../types/index.js';
import type { IPushTokenRepository } from '../interfaces/index.js';

export class SqlitePushTokenRepository implements IPushTokenRepository {
  constructor(private readonly db: Database) {}

  findByUserId(userId: number): PushTokenRow[] {
    const stmt = this.db.prepare('SELECT * FROM push_tokens WHERE user_id = ?');
    return stmt.all(userId) as PushTokenRow[];
  }

  findByUserIds(userIds: number[]): PushTokenRow[] {
    if (userIds.length === 0) return [];
    const placeholders = userIds.map(() => '?').join(',');
    const stmt = this.db.prepare(`SELECT * FROM push_tokens WHERE user_id IN (${placeholders})`);
    return stmt.all(...userIds) as PushTokenRow[];
  }

  upsert(userId: number, expoPushToken: string, platform: string): PushTokenRow {
    const stmt = this.db.prepare(`
      INSERT INTO push_tokens (user_id, expo_push_token, platform)
      VALUES (?, ?, ?)
      ON CONFLICT(expo_push_token) DO UPDATE SET
        user_id = excluded.user_id,
        platform = excluded.platform,
        created_at = datetime('now')
    `);
    stmt.run(userId, expoPushToken, platform);

    return this.db.prepare('SELECT * FROM push_tokens WHERE expo_push_token = ?')
      .get(expoPushToken) as PushTokenRow;
  }

  deleteByUserId(userId: number): number {
    const result = this.db.prepare('DELETE FROM push_tokens WHERE user_id = ?').run(userId);
    return result.changes;
  }

  deleteByToken(expoPushToken: string): number {
    const result = this.db.prepare('DELETE FROM push_tokens WHERE expo_push_token = ?').run(expoPushToken);
    return result.changes;
  }
}
