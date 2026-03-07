import type { Database } from 'better-sqlite3';
import type { Migration } from '../config/migrator';

export const addAuditLog: Migration = {
  name: '013_add_audit_log',
  up: (db: Database) => {
    db.prepare(`
      CREATE TABLE IF NOT EXISTS audit_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        action TEXT NOT NULL,
        actor_id INTEGER NOT NULL,
        target_id INTEGER,
        details TEXT,
        ip TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run();

    db.prepare(`
      CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action)
    `).run();

    db.prepare(`
      CREATE INDEX IF NOT EXISTS idx_audit_log_actor ON audit_log(actor_id)
    `).run();

    db.prepare(`
      CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at)
    `).run();
  }
};
