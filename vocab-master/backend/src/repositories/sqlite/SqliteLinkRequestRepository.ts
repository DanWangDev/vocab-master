import type { Database } from 'better-sqlite3';
import type { LinkRequestRow, StudentSearchResult } from '../../types/index.js';
import type { ILinkRequestRepository, INotificationRepository, LinkRequestWithUsers } from '../interfaces/index.js';

function escapeLikePattern(value: string): string {
  return value.replace(/[%_\\]/g, '\\$&');
}

export class SqliteLinkRequestRepository implements ILinkRequestRepository {
  constructor(
    private readonly db: Database,
    private readonly notificationRepo: INotificationRepository
  ) {}

  findById(id: number): LinkRequestRow | undefined {
    const stmt = this.db.prepare('SELECT * FROM link_requests WHERE id = ?');
    return stmt.get(id) as LinkRequestRow | undefined;
  }

  findByIdWithUsers(id: number): LinkRequestWithUsers | undefined {
    const stmt = this.db.prepare(`
      SELECT
        lr.*,
        p.username as parent_username,
        p.display_name as parent_display_name,
        s.username as student_username,
        s.display_name as student_display_name
      FROM link_requests lr
      JOIN users p ON lr.parent_id = p.id
      JOIN users s ON lr.student_id = s.id
      WHERE lr.id = ?
    `);
    return stmt.get(id) as LinkRequestWithUsers | undefined;
  }

  searchStudents(query: string, parentId: number): StudentSearchResult[] {
    const escapedQuery = escapeLikePattern(query);

    const stmt = this.db.prepare(`
      SELECT
        u.id,
        u.username,
        u.display_name,
        CASE
          WHEN EXISTS (
            SELECT 1 FROM link_requests lr
            WHERE lr.student_id = u.id
            AND lr.parent_id = ?
            AND lr.status = 'pending'
          ) THEN 'pending'
          ELSE 'available'
        END as status
      FROM users u
      WHERE u.role = 'student'
        AND u.username LIKE ? ESCAPE '\\'
        AND u.parent_id IS NULL
      ORDER BY u.username
      LIMIT 20
    `);
    const results = stmt.all(parentId, `%${escapedQuery}%`) as Array<{
      id: number;
      username: string;
      display_name: string | null;
      status: 'available' | 'pending';
    }>;

    return results.map(r => ({
      id: r.id,
      username: r.username,
      displayName: r.display_name,
      status: r.status
    }));
  }

  hasPendingRequest(parentId: number, studentId: number): boolean {
    const stmt = this.db.prepare(`
      SELECT 1 FROM link_requests
      WHERE parent_id = ? AND student_id = ? AND status = 'pending'
    `);
    return stmt.get(parentId, studentId) !== undefined;
  }

  create(parentId: number, studentId: number, message?: string): LinkRequestRow {
    const parent = this.db.prepare('SELECT username, display_name FROM users WHERE id = ?')
      .get(parentId) as { username: string; display_name: string | null } | undefined;

    if (!parent) {
      throw new Error('Parent not found');
    }

    const parentName = parent.display_name || parent.username;

    const stmt = this.db.prepare(`
      INSERT INTO link_requests (parent_id, student_id, message)
      VALUES (?, ?, ?)
    `);
    const result = stmt.run(parentId, studentId, message || null);
    const linkRequestId = result.lastInsertRowid as number;

    const notification = this.notificationRepo.create(
      studentId,
      'link_request',
      'New Link Request',
      `${parentName} wants to link their account with yours`,
      { parentId, parentName, message, linkRequestId }
    );

    this.db.prepare('UPDATE link_requests SET notification_id = ? WHERE id = ?')
      .run(notification.id, linkRequestId);

    return this.findById(linkRequestId)!;
  }

  findByParent(parentId: number): LinkRequestWithUsers[] {
    const stmt = this.db.prepare(`
      SELECT
        lr.*,
        p.username as parent_username,
        p.display_name as parent_display_name,
        s.username as student_username,
        s.display_name as student_display_name
      FROM link_requests lr
      JOIN users p ON lr.parent_id = p.id
      JOIN users s ON lr.student_id = s.id
      WHERE lr.parent_id = ?
      ORDER BY lr.created_at DESC
    `);
    return stmt.all(parentId) as LinkRequestWithUsers[];
  }

  findPendingByParent(parentId: number): LinkRequestWithUsers[] {
    const stmt = this.db.prepare(`
      SELECT
        lr.*,
        p.username as parent_username,
        p.display_name as parent_display_name,
        s.username as student_username,
        s.display_name as student_display_name
      FROM link_requests lr
      JOIN users p ON lr.parent_id = p.id
      JOIN users s ON lr.student_id = s.id
      WHERE lr.parent_id = ? AND lr.status = 'pending'
      ORDER BY lr.created_at DESC
    `);
    return stmt.all(parentId) as LinkRequestWithUsers[];
  }

  findByStudent(studentId: number): LinkRequestWithUsers[] {
    const stmt = this.db.prepare(`
      SELECT
        lr.*,
        p.username as parent_username,
        p.display_name as parent_display_name,
        s.username as student_username,
        s.display_name as student_display_name
      FROM link_requests lr
      JOIN users p ON lr.parent_id = p.id
      JOIN users s ON lr.student_id = s.id
      WHERE lr.student_id = ?
      ORDER BY lr.created_at DESC
    `);
    return stmt.all(studentId) as LinkRequestWithUsers[];
  }

  findPendingByStudent(studentId: number): LinkRequestWithUsers[] {
    const stmt = this.db.prepare(`
      SELECT
        lr.*,
        p.username as parent_username,
        p.display_name as parent_display_name,
        s.username as student_username,
        s.display_name as student_display_name
      FROM link_requests lr
      JOIN users p ON lr.parent_id = p.id
      JOIN users s ON lr.student_id = s.id
      WHERE lr.student_id = ? AND lr.status = 'pending'
      ORDER BY lr.created_at DESC
    `);
    return stmt.all(studentId) as LinkRequestWithUsers[];
  }

  accept(requestId: number, studentId: number): boolean {
    const transaction = this.db.transaction(() => {
      const request = this.db.prepare(`
        SELECT
          lr.*,
          p.username as parent_username,
          p.display_name as parent_display_name,
          s.username as student_username,
          s.display_name as student_display_name,
          s.parent_id as student_parent_id
        FROM link_requests lr
        JOIN users p ON lr.parent_id = p.id
        JOIN users s ON lr.student_id = s.id
        WHERE lr.id = ? AND lr.student_id = ? AND lr.status = 'pending'
      `).get(requestId, studentId) as (LinkRequestWithUsers & { student_parent_id: number | null }) | undefined;

      if (!request || request.student_parent_id !== null) {
        return false;
      }

      this.db.prepare(`
        UPDATE link_requests
        SET status = 'accepted', responded_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(requestId);

      this.db.prepare(`
        UPDATE users
        SET parent_id = ?
        WHERE id = ? AND parent_id IS NULL
      `).run(request.parent_id, studentId);

      if (request.notification_id) {
        this.notificationRepo.markAsActed(request.notification_id, studentId);
      }

      this.db.prepare(`
        UPDATE link_requests
        SET status = 'cancelled', responded_at = CURRENT_TIMESTAMP
        WHERE student_id = ? AND id != ? AND status = 'pending'
      `).run(studentId, requestId);

      const studentName = request.student_display_name || request.student_username;
      this.notificationRepo.create(
        request.parent_id,
        'link_accepted',
        'Link Request Accepted',
        `${studentName} has accepted your link request`,
        { studentId, studentName }
      );

      return true;
    });

    return transaction();
  }

  reject(requestId: number, studentId: number): boolean {
    const transaction = this.db.transaction(() => {
      const request = this.db.prepare(`
        SELECT
          lr.*,
          p.username as parent_username,
          p.display_name as parent_display_name,
          s.username as student_username,
          s.display_name as student_display_name
        FROM link_requests lr
        JOIN users p ON lr.parent_id = p.id
        JOIN users s ON lr.student_id = s.id
        WHERE lr.id = ? AND lr.student_id = ? AND lr.status = 'pending'
      `).get(requestId, studentId) as LinkRequestWithUsers | undefined;

      if (!request) {
        return false;
      }

      this.db.prepare(`
        UPDATE link_requests
        SET status = 'rejected', responded_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(requestId);

      if (request.notification_id) {
        this.notificationRepo.markAsActed(request.notification_id, studentId);
      }

      const studentName = request.student_display_name || request.student_username;
      this.notificationRepo.create(
        request.parent_id,
        'link_rejected',
        'Link Request Declined',
        `${studentName} has declined your link request`,
        { studentId, studentName }
      );

      return true;
    });

    return transaction();
  }

  cancel(requestId: number, parentId: number): boolean {
    const request = this.findById(requestId);
    if (!request || request.parent_id !== parentId || request.status !== 'pending') {
      return false;
    }

    const transaction = this.db.transaction(() => {
      this.db.prepare(`
        UPDATE link_requests
        SET status = 'cancelled', responded_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(requestId);

      if (request.notification_id) {
        this.db.prepare('DELETE FROM notifications WHERE id = ?').run(request.notification_id);
      }
    });

    transaction();
    return true;
  }
}
