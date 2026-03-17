import type { Database } from 'better-sqlite3';
import type { Migration } from '../config/migrator';

export const repairFks: Migration = {
    name: '005_repair_fks',
    up: (db: Database) => {
        console.log('[Migration 005] Repairing foreign keys...');

        // The issue: FKs are pointing to 'users_old' because of the previous migration strategy.
        // 'users_old' does not exist, and 'users' exists but nothing points to it.

        // Strategy: 
        // 1. Rename 'users' to 'users_old'. This makes the table match the current FK references.
        // 2. Rename 'users_old' to 'users'. This updates the FK references to point back to 'users'.

        db.transaction(() => {
            try {
                // Check if 'users_old' accidentally exists and drop it to be safe
                db.prepare('DROP TABLE IF EXISTS users_old').run();

                console.log('[Migration 005] Renaming users -> users_old');
                db.prepare('ALTER TABLE users RENAME TO users_old').run();

                console.log('[Migration 005] Renaming users_old -> users');
                db.prepare('ALTER TABLE users_old RENAME TO users').run();

            } catch (error) {
                console.error('[Migration 005] Failed to repair FKs:', error);
                throw error;
            }
        })();

        console.log('[Migration 005] Foreign keys repaired successfully.');
    }
};
