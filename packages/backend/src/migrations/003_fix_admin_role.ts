import type { Database } from 'better-sqlite3';
import type { Migration } from '../config/migrator';

export const fixAdminRole: Migration = {
    name: '003_fix_admin_role',
    up: (db: Database) => {
        const adminUser = process.env.INITIAL_ADMIN_USERNAME;

        if (adminUser) {
            try {
                console.log(`[Migration 003] Ensuring user '${adminUser}' has admin role...`);

                const result = db.prepare(`
          UPDATE users 
          SET role = 'admin', display_name = COALESCE(display_name, 'System Admin')
          WHERE username = ? AND role != 'admin'
        `).run(adminUser);

                if (result.changes > 0) {
                    console.log(`[Migration 003] Updated role for '${adminUser}' to 'admin'.`);
                } else {
                    // Check if user exists at all
                    const user = db.prepare('SELECT id, role FROM users WHERE username = ?').get(adminUser) as { id: number, role: string } | undefined;
                    if (user) {
                        console.log(`[Migration 003] User '${adminUser}' already has role '${user.role}'. No changes needed.`);
                    } else {
                        console.log(`[Migration 003] User '${adminUser}' not found. Skipping fix.`);
                    }
                }
            } catch (err) {
                console.error('[Migration 003] Failed to fix admin role:', err);
                throw err;
            }
        }
    }
};
