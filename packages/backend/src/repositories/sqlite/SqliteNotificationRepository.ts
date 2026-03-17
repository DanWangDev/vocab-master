import type { Database } from 'better-sqlite3';
import type { NotificationRow, NotificationType } from '../../types/index.js';
import type { INotificationRepository } from '../interfaces/index.js';

export class SqliteNotificationRepository implements INotificationRepository {
  constructor(private readonly db: Database) {}

  findById(id: number): NotificationRow | undefined {
    const stmt = this.db.prepare('SELECT * FROM notifications WHERE id = ?');
    return stmt.get(id) as NotificationRow | undefined;
  }

  findByUserId(userId: number, limit = 50): NotificationRow[] {
    const stmt = this.db.prepare(`
      SELECT * FROM notifications
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `);
    return stmt.all(userId, limit) as NotificationRow[];
  }

  getUnreadCount(userId: number): number {
    const stmt = this.db.prepare(`
      SELECT COUNT(*) as count
      FROM notifications
      WHERE user_id = ? AND read_at IS NULL
    `);
    const result = stmt.get(userId) as { count: number };
    return result.count;
  }

  create(
    userId: number,
    type: NotificationType,
    title: string,
    message: string,
    data?: Record<string, unknown>
  ): NotificationRow {
    const stmt = this.db.prepare(`
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
  }

  markAsRead(id: number, userId: number): boolean {
    const stmt = this.db.prepare(`
      UPDATE notifications
      SET read_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ? AND read_at IS NULL
    `);
    const result = stmt.run(id, userId);
    return result.changes > 0;
  }

  markAllAsRead(userId: number): number {
    const stmt = this.db.prepare(`
      UPDATE notifications
      SET read_at = CURRENT_TIMESTAMP
      WHERE user_id = ? AND read_at IS NULL
    `);
    const result = stmt.run(userId);
    return result.changes;
  }

  markAsActed(id: number, userId: number): boolean {
    const stmt = this.db.prepare(`
      UPDATE notifications
      SET acted_at = CURRENT_TIMESTAMP, read_at = COALESCE(read_at, CURRENT_TIMESTAMP)
      WHERE id = ? AND user_id = ? AND acted_at IS NULL
    `);
    const result = stmt.run(id, userId);
    return result.changes > 0;
  }

  delete(id: number, userId: number): boolean {
    const stmt = this.db.prepare('DELETE FROM notifications WHERE id = ? AND user_id = ?');
    const result = stmt.run(id, userId);
    return result.changes > 0;
  }
}
