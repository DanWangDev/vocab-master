import { db } from '../config/database';
import { notificationRepository } from '../repositories/notificationRepository';
import { pushNotificationService } from './pushNotificationService';
import { logger } from './logger';

const INACTIVITY_THRESHOLD_DAYS = 2;

interface InactiveStudent {
  id: number;
  username: string;
  display_name: string | null;
  parent_id: number | null;
  days_inactive: number;
}

/**
 * Find students who have been inactive for more than INACTIVITY_THRESHOLD_DAYS
 * and have not already been notified (no reminder notification in the last 24h).
 */
function findInactiveStudents(): InactiveStudent[] {
  return db.prepare(`
    SELECT
      u.id,
      u.username,
      u.display_name,
      u.parent_id,
      CAST(julianday('now') - julianday(COALESCE(
        (SELECT MAX(latest) FROM (
          SELECT MAX(start_time) as latest FROM study_sessions WHERE user_id = u.id
          UNION ALL
          SELECT MAX(completed_at) as latest FROM quiz_results WHERE user_id = u.id
          UNION ALL
          SELECT MAX(created_at) as latest FROM daily_challenges WHERE user_id = u.id
        )),
        u.created_at
      )) AS INTEGER) as days_inactive
    FROM users u
    WHERE u.role = 'student'
      AND CAST(julianday('now') - julianday(COALESCE(
        (SELECT MAX(latest) FROM (
          SELECT MAX(start_time) as latest FROM study_sessions WHERE user_id = u.id
          UNION ALL
          SELECT MAX(completed_at) as latest FROM quiz_results WHERE user_id = u.id
          UNION ALL
          SELECT MAX(created_at) as latest FROM daily_challenges WHERE user_id = u.id
        )),
        u.created_at
      )) AS INTEGER) >= ?
      AND NOT EXISTS (
        SELECT 1 FROM notifications
        WHERE user_id = u.id
          AND type = 'reminder'
          AND created_at > datetime('now', '-24 hours')
      )
  `).all(INACTIVITY_THRESHOLD_DAYS) as InactiveStudent[];
}

/**
 * Check for inactive students and send notifications to them and their parents.
 */
export async function checkInactivityAndNotify(): Promise<number> {
  const inactive = findInactiveStudents();
  if (inactive.length === 0) return 0;

  let notified = 0;

  for (const student of inactive) {
    const studentName = student.display_name || student.username;

    // Notify the student
    const studentTitle = 'Time to practice!';
    const studentBody = `You haven't studied in ${student.days_inactive} days. Keep your streak going!`;

    notificationRepository.create(
      student.id,
      'reminder',
      studentTitle,
      studentBody,
      { daysInactive: student.days_inactive }
    );

    try {
      await pushNotificationService.sendToUser(
        student.id,
        studentTitle,
        studentBody,
        { type: 'inactivity_reminder', daysInactive: student.days_inactive }
      );
    } catch (error) {
      logger.error('Failed to send student inactivity push', { userId: student.id, error: String(error) });
    }

    // Notify the parent if linked
    if (student.parent_id) {
      const parentTitle = `${studentName} hasn't studied recently`;
      const parentBody = `${studentName} has been inactive for ${student.days_inactive} days.`;

      notificationRepository.create(
        student.parent_id,
        'reminder',
        parentTitle,
        parentBody,
        { studentId: student.id, studentName, daysInactive: student.days_inactive }
      );

      try {
        await pushNotificationService.sendToUser(
          student.parent_id,
          parentTitle,
          parentBody,
          { type: 'child_inactivity', studentId: student.id, daysInactive: student.days_inactive }
        );
      } catch (error) {
        logger.error('Failed to send parent inactivity push', { parentId: student.parent_id, error: String(error) });
      }
    }

    notified++;
  }

  logger.info('Inactivity check completed', { notified, total: inactive.length });
  return notified;
}

export const inactivityService = {
  checkInactivityAndNotify,
};
