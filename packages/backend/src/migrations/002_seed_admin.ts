import type { Database } from 'better-sqlite3';
import type { Migration } from '../config/migrator';
import bcrypt from 'bcryptjs';

export const seedAdmin: Migration = {
    name: '002_seed_admin',
    up: (db: Database) => {
        const adminUser = process.env.INITIAL_ADMIN_USERNAME;
        const adminPass = process.env.INITIAL_ADMIN_PASSWORD;

        if (adminUser && adminPass) {
            try {
                const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(adminUser);
                if (!existing) {
                    console.log(`[Migration 002] Seeding admin user: ${adminUser}`);
                    const hash = bcrypt.hashSync(adminPass, 12);
                    db.prepare(`
            INSERT INTO users (username, password_hash, display_name, role)
            VALUES (?, ?, 'System Admin', 'admin')
          `).run(adminUser, hash);
                } else {
                    console.log(`[Migration 002] Admin user ${adminUser} already exists. Skipping seed.`);
                }
            } catch (err) {
                console.error('[Migration 002] Failed to seed admin user:', err);
                throw err;
            }
        } else {
            console.log('[Migration 002] No INITIAL_ADMIN_USERNAME/PASSWORD provided. Skipping seed.');
        }
    }
};
