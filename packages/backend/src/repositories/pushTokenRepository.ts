import db from '../config/database.js';

export interface PushTokenRow {
  id: number;
  user_id: number;
  expo_push_token: string;
  platform: string;
  created_at: string;
}

export const pushTokenRepository = {
  findByUserId(userId: number): PushTokenRow[] {
    const stmt = db.prepare('SELECT * FROM push_tokens WHERE user_id = ?');
    return stmt.all(userId) as PushTokenRow[];
  },

  findByUserIds(userIds: number[]): PushTokenRow[] {
    if (userIds.length === 0) return [];
    const placeholders = userIds.map(() => '?').join(',');
    const stmt = db.prepare(`SELECT * FROM push_tokens WHERE user_id IN (${placeholders})`);
    return stmt.all(...userIds) as PushTokenRow[];
  },

  upsert(userId: number, expoPushToken: string, platform: string): PushTokenRow {
    const stmt = db.prepare(`
      INSERT INTO push_tokens (user_id, expo_push_token, platform)
      VALUES (?, ?, ?)
      ON CONFLICT(expo_push_token) DO UPDATE SET
        user_id = excluded.user_id,
        platform = excluded.platform,
        created_at = datetime('now')
    `);
    stmt.run(userId, expoPushToken, platform);

    return db.prepare('SELECT * FROM push_tokens WHERE expo_push_token = ?')
      .get(expoPushToken) as PushTokenRow;
  },

  deleteByUserId(userId: number): number {
    const result = db.prepare('DELETE FROM push_tokens WHERE user_id = ?').run(userId);
    return result.changes;
  },

  deleteByToken(expoPushToken: string): number {
    const result = db.prepare('DELETE FROM push_tokens WHERE expo_push_token = ?').run(expoPushToken);
    return result.changes;
  },
};
