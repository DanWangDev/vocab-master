import db from '../config/database.js';
import type { LinkRequestRow, StudentSearchResult, UserRow } from '../types/index.js';
import { notificationRepository } from './notificationRepository.js';

interface LinkRequestWithUsers extends LinkRequestRow {
  parent_username: string;
  parent_display_name: string | null;
  student_username: string;
  student_display_name: string | null;
}

// Escape LIKE special characters to prevent pattern injection
function escapeLikePattern(value: string): string {
  return value.replace(/[%_\\]/g, '\\$&');
}

export const linkRequestRepository = {
  findById(id: number): LinkRequestRow | undefined {
    const stmt = db.prepare('SELECT * FROM link_requests WHERE id = ?');
    return stmt.get(id) as LinkRequestRow | undefined;
  },

  findByIdWithUsers(id: number): LinkRequestWithUsers | undefined {
    const stmt = db.prepare(`
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
  },

  searchStudents(query: string, parentId: number): StudentSearchResult[] {
    // Escape LIKE special characters to prevent pattern injection
    const escapedQuery = escapeLikePattern(query);

    // Search for students by username (partial match)
    // Only show unlinked students
    // Include status: available, pending (has pending request from this parent)
    const stmt = db.prepare(`
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
  },

  hasPendingRequest(parentId: number, studentId: number): boolean {
    const stmt = db.prepare(`
      SELECT 1 FROM link_requests
      WHERE parent_id = ? AND student_id = ? AND status = 'pending'
    `);
    return stmt.get(parentId, studentId) !== undefined;
  },

  create(parentId: number, studentId: number, message?: string): LinkRequestRow {
    // Get parent info for notification
    const parent = db.prepare('SELECT username, display_name FROM users WHERE id = ?')
      .get(parentId) as { username: string; display_name: string | null } | undefined;

    if (!parent) {
      throw new Error('Parent not found');
    }

    const parentName = parent.display_name || parent.username;

    // Create link request first to get the ID
    const stmt = db.prepare(`
      INSERT INTO link_requests (parent_id, student_id, message)
      VALUES (?, ?, ?)
    `);
    const result = stmt.run(parentId, studentId, message || null);
    const linkRequestId = result.lastInsertRowid as number;

    // Create notification for the student with the link request ID
    const notification = notificationRepository.create(
      studentId,
      'link_request',
      'New Link Request',
      `${parentName} wants to link their account with yours`,
      { parentId, parentName, message, linkRequestId }
    );

    // Update link request with notification ID
    db.prepare('UPDATE link_requests SET notification_id = ? WHERE id = ?')
      .run(notification.id, linkRequestId);

    return this.findById(linkRequestId)!;
  },

  findByParent(parentId: number): LinkRequestWithUsers[] {
    const stmt = db.prepare(`
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
  },

  findPendingByParent(parentId: number): LinkRequestWithUsers[] {
    const stmt = db.prepare(`
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
  },

  findByStudent(studentId: number): LinkRequestWithUsers[] {
    const stmt = db.prepare(`
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
  },

  findPendingByStudent(studentId: number): LinkRequestWithUsers[] {
    const stmt = db.prepare(`
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
  },

  accept(requestId: number, studentId: number): boolean {
    const transaction = db.transaction(() => {
      // Check request within transaction to prevent race conditions
      const request = db.prepare(`
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

      // Update link request status
      db.prepare(`
        UPDATE link_requests
        SET status = 'accepted', responded_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(requestId);

      // Link student to parent
      db.prepare(`
        UPDATE users
        SET parent_id = ?
        WHERE id = ? AND parent_id IS NULL
      `).run(request.parent_id, studentId);

      // Mark notification as acted
      if (request.notification_id) {
        notificationRepository.markAsActed(request.notification_id, studentId);
      }

      // Cancel any other pending requests for this student
      db.prepare(`
        UPDATE link_requests
        SET status = 'cancelled', responded_at = CURRENT_TIMESTAMP
        WHERE student_id = ? AND id != ? AND status = 'pending'
      `).run(studentId, requestId);

      // Create notification for parent
      const studentName = request.student_display_name || request.student_username;
      notificationRepository.create(
        request.parent_id,
        'link_accepted',
        'Link Request Accepted',
        `${studentName} has accepted your link request`,
        { studentId, studentName }
      );

      return true;
    });

    return transaction();
  },

  reject(requestId: number, studentId: number): boolean {
    const transaction = db.transaction(() => {
      // Check request within transaction to prevent race conditions
      const request = db.prepare(`
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

      // Update link request status
      db.prepare(`
        UPDATE link_requests
        SET status = 'rejected', responded_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(requestId);

      // Mark notification as acted
      if (request.notification_id) {
        notificationRepository.markAsActed(request.notification_id, studentId);
      }

      // Create notification for parent
      const studentName = request.student_display_name || request.student_username;
      notificationRepository.create(
        request.parent_id,
        'link_rejected',
        'Link Request Declined',
        `${studentName} has declined your link request`,
        { studentId, studentName }
      );

      return true;
    });

    return transaction();
  },

  cancel(requestId: number, parentId: number): boolean {
    const request = this.findById(requestId);
    if (!request || request.parent_id !== parentId || request.status !== 'pending') {
      return false;
    }

    const transaction = db.transaction(() => {
      // Update link request status
      db.prepare(`
        UPDATE link_requests
        SET status = 'cancelled', responded_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(requestId);

      // Delete the notification for the student
      if (request.notification_id) {
        db.prepare('DELETE FROM notifications WHERE id = ?').run(request.notification_id);
      }
    });

    transaction();
    return true;
  }
};
