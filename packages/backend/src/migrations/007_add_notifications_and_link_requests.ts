import type { Database } from 'better-sqlite3';
import type { Migration } from '../config/migrator';

export const addNotificationsAndLinkRequests: Migration = {
  name: '007_add_notifications_and_link_requests',
  up: (db: Database) => {
    console.log('[Migration 007] Adding notifications and link requests tables...');

    db.transaction(() => {
      // Create notifications table
      console.log('[Migration 007] Creating notifications table...');
      db.prepare(`
        CREATE TABLE IF NOT EXISTS notifications (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          type TEXT NOT NULL CHECK(type IN ('link_request', 'link_accepted', 'link_rejected', 'achievement', 'reminder')),
          title TEXT NOT NULL,
          message TEXT NOT NULL,
          data TEXT,
          read_at DATETIME DEFAULT NULL,
          acted_at DATETIME DEFAULT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `).run();

      // Create indexes for notifications
      db.prepare(`
        CREATE INDEX IF NOT EXISTS idx_notifications_user_id
        ON notifications(user_id)
      `).run();

      db.prepare(`
        CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
        ON notifications(user_id, read_at)
      `).run();

      db.prepare(`
        CREATE INDEX IF NOT EXISTS idx_notifications_created_at
        ON notifications(created_at DESC)
      `).run();

      // Create link_requests table
      console.log('[Migration 007] Creating link_requests table...');
      db.prepare(`
        CREATE TABLE IF NOT EXISTS link_requests (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          parent_id INTEGER NOT NULL,
          student_id INTEGER NOT NULL,
          status TEXT NOT NULL CHECK(status IN ('pending', 'accepted', 'rejected', 'cancelled')) DEFAULT 'pending',
          notification_id INTEGER,
          message TEXT,
          responded_at DATETIME DEFAULT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (parent_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (notification_id) REFERENCES notifications(id) ON DELETE SET NULL
        )
      `).run();

      // Create indexes for link_requests
      db.prepare(`
        CREATE INDEX IF NOT EXISTS idx_link_requests_parent_id
        ON link_requests(parent_id)
      `).run();

      db.prepare(`
        CREATE INDEX IF NOT EXISTS idx_link_requests_student_id
        ON link_requests(student_id)
      `).run();

      db.prepare(`
        CREATE INDEX IF NOT EXISTS idx_link_requests_status
        ON link_requests(status)
      `).run();

      // Unique constraint to prevent duplicate pending requests
      db.prepare(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_link_requests_unique_pending
        ON link_requests(parent_id, student_id)
        WHERE status = 'pending'
      `).run();

    })();

    console.log('[Migration 007] Notifications and link requests migration completed successfully.');
  }
};
