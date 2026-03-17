import db from '../config/database.js';
import type { NotificationRow, NotificationType } from '../types/index.js';

export const notificationRepository = {
  findById(id: number): NotificationRow | undefined {
    const stmt = db.prepare('SELECT * FROM notifications WHERE id = ?');
    return stmt.get(id) as NotificationRow | undefined;
  },

  findByUserId(userId: number, limit = 50): NotificationRow[] {
    const stmt = db.prepare(`
      SELECT * FROM notifications
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `);
    return stmt.all(userId, limit) as NotificationRow[];
  },

  getUnreadCount(userId: number): number {
    const stmt = db.prepare(`
      SELECT COUNT(*) as count
      FROM notifications
      WHERE user_id = ? AND read_at IS NULL
    `);
    const result = stmt.get(userId) as { count: number };
    return result.count;
  },

  create(
    userId: number,
    type: NotificationType,
    title: string,
    message: string,
    data?: Record<string, unknown>
  ): NotificationRow {
    const stmt = db.prepare(`
      INSERT INTO notifications (user_id, type, title, message, data)
      VALUES (?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      userId,
      type,
      title,
      message,
      data ? JSON.stringify(data) : null
    );
    return this.findById(result.lastInsertRowid as number)!;
  },

  markAsRead(id: number, userId: number): boolean {
    const stmt = db.prepare(`
      UPDATE notifications
      SET read_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ? AND read_at IS NULL
    `);
    const result = stmt.run(id, userId);
    return result.changes > 0;
  },

  markAllAsRead(userId: number): number {
    const stmt = db.prepare(`
      UPDATE notifications
      SET read_at = CURRENT_TIMESTAMP
      WHERE user_id = ? AND read_at IS NULL
    `);
    const result = stmt.run(userId);
    return result.changes;
  },

  markAsActed(id: number, userId: number): boolean {
    const stmt = db.prepare(`
      UPDATE notifications
      SET acted_at = CURRENT_TIMESTAMP, read_at = COALESCE(read_at, CURRENT_TIMESTAMP)
      WHERE id = ? AND user_id = ? AND acted_at IS NULL
    `);
    const result = stmt.run(id, userId);
    return result.changes > 0;
  },

  delete(id: number, userId: number): boolean {
    const stmt = db.prepare('DELETE FROM notifications WHERE id = ? AND user_id = ?');
    const result = stmt.run(id, userId);
    return result.changes > 0;
  }
};
