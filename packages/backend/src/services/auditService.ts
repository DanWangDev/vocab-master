import { db } from '../config/database.js';
import { logger } from './logger.js';

export type AuditAction =
  | 'user.role_change'
  | 'user.create'
  | 'user.delete'
  | 'user.password_reset'
  | 'user.parent_link'
  | 'user.email_change'
  | 'auth.login'
  | 'auth.login_failed'
  | 'auth.google_link';

interface AuditEntry {
  action: AuditAction;
  actorId: number;
  targetId?: number;
  details?: Record<string, unknown>;
  ip?: string;
}

export const auditService = {
  log(entry: AuditEntry): void {
    try {
      db.prepare(`
        INSERT INTO audit_log (action, actor_id, target_id, details, ip, created_at)
        VALUES (?, ?, ?, ?, ?, datetime('now'))
      `).run(
        entry.action,
        entry.actorId,
        entry.targetId ?? null,
        entry.details ? JSON.stringify(entry.details) : null,
        entry.ip ?? null
      );
    } catch (err) {
      // Never let audit logging break the main flow
      logger.error('Failed to write audit log', { error: String(err), entry });
    }

    logger.audit(entry.action, {
      actorId: entry.actorId,
      targetId: entry.targetId,
      ...entry.details
    });
  }
};
