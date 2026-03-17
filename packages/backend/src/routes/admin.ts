import { Router, Response } from 'express';
import { db } from '../config/database';
import bcrypt from 'bcryptjs';
import { authMiddleware, requireRole } from '../middleware/auth';
import { validate, resetUserPasswordSchema, adminCreateUserSchema, adminUpdateRoleSchema, adminLinkParentSchema, parentThresholdsSchema } from '../middleware/validate';
import { authService } from '../services/authService';
import { auditService } from '../services/auditService';
import { logger } from '../services/logger';
import { dashboardService } from '../services/dashboardService';
import type { AuthRequest } from '../types/index';

interface UserListRow {
    id: number;
    username: string;
    display_name: string | null;
    role: string;
    parent_id: number | null;
    email: string | null;
    created_at: string;
    last_study_date: string | null;
    last_seen_at: string | null;
}

interface ParentThresholdRow {
    parent_id: number;
    days_per_week: number;
    minutes_per_day: number;
}

const router = Router();

// Middleware: All admin routes require authentication
router.use(authMiddleware);

// GET users with stats
router.get('/users', requireRole(['admin', 'parent']), (req: AuthRequest, res: Response) => {
    try {
        const user = req.user!;
        let query = `
      SELECT
        u.id, u.username, u.display_name, u.role, u.parent_id, u.email, u.created_at,
        us.last_study_date,
        COALESCE(u.last_seen_at, us.last_study_date) as last_seen_at
      FROM users u
      LEFT JOIN user_stats us ON u.id = us.user_id
    `;

        const params: (string | number)[] = [];

        // If parent, only show their children
        if (user.role === 'parent') {
            query += ' WHERE u.parent_id = ?';
            params.push(user.userId);
        }

        query += ' ORDER BY u.created_at DESC';

        const users = db.prepare(query).all(...params) as UserListRow[];

        // Add dashboard stats for each user
        const usersWithStats = users.map(u => {
            const stats = dashboardService.getUserDashboardStats(u.id);
            return {
                ...u,
                ...stats,
            };
        });

        res.json(usersWithStats);
    } catch (error) {
        logger.error('Fetch users error', { error: String(error) });
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// Get detailed user stats
router.get('/users/:id/details', requireRole(['admin', 'parent']), (req: AuthRequest, res: Response) => {
    try {
        const userId = Number(req.params.id);
        const requestUser = req.user!;

        // If parent, verify they are requesting their own child
        if (requestUser.role === 'parent') {
            const targetUser = db.prepare('SELECT parent_id FROM users WHERE id = ?').get(userId) as { parent_id: number } | undefined;

            if (!targetUser || targetUser.parent_id !== requestUser.userId) {
                res.status(403).json({ error: 'Forbidden', message: 'You can only view your own students' });
                return;
            }
        }

        const details = dashboardService.getUserDetailStats(userId);
        res.json(details);
    } catch (error) {
        logger.error('Fetch user details error', { error: String(error) });
        res.status(500).json({ error: 'Failed to fetch user details' });
    }
});

// Update User Role
router.patch('/users/:id/role', requireRole(['admin']), validate(adminUpdateRoleSchema), (req: AuthRequest, res: Response) => {
    try {
        const { role } = req.body;
        const userId = req.params.id;

        const oldUser = db.prepare('SELECT role FROM users WHERE id = ?').get(userId) as { role: string } | undefined;
        const stmt = db.prepare('UPDATE users SET role = ? WHERE id = ?');
        const result = stmt.run(role, userId);

        if (result.changes === 0) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        auditService.log({
            action: 'user.role_change',
            actorId: req.user!.userId,
            targetId: Number(userId),
            details: { oldRole: oldUser?.role, newRole: role },
            ip: req.ip
        });

        res.json({ success: true, message: 'Role updated' });
    } catch (error) {
        logger.error('Update role error', { error: String(error) });
        res.status(500).json({ error: 'Failed to update role' });
    }
});

// Link Student to Parent
router.patch('/users/:id/parent', requireRole(['admin']), (req: AuthRequest, res: Response) => {
    try {
        const { parentId } = req.body; // Can be null to unlink
        const userId = req.params.id;

        // Verify parent exists and is actually a parent (optional, but good for integrity)
        if (parentId) {
            const parent = db.prepare('SELECT role FROM users WHERE id = ?').get(parentId) as { role: string } | undefined;
            if (!parent || parent.role !== 'parent') {
                res.status(400).json({ error: 'Invalid parent ID provided' });
                return;
            }
        }

        const stmt = db.prepare('UPDATE users SET parent_id = ? WHERE id = ?');
        const result = stmt.run(parentId, userId);

        if (result.changes === 0) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        auditService.log({
            action: 'user.parent_link',
            actorId: req.user!.userId,
            targetId: Number(userId),
            details: { parentId: parentId ?? null },
            ip: req.ip
        });

        res.json({ success: true, message: 'Parent link updated' });
    } catch (error) {
        logger.error('Update parent link error', { error: String(error) });
        res.status(500).json({ error: 'Failed to update parent link' });
    }
});

// Create New User
router.post('/users', requireRole(['admin']), async (req: AuthRequest, res: Response) => {
    try {
        const { username, password, role, parentId, email } = req.body;

        if (!username || !password || !role) {
            res.status(400).json({ error: 'Missing required fields' });
            return;
        }

        if (!['student', 'parent', 'admin'].includes(role)) {
            res.status(400).json({ error: 'Invalid role' });
            return;
        }

        // Validate email format if provided
        if (email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                res.status(400).json({ error: 'Invalid email format' });
                return;
            }

            // Check if email is already in use
            const existingEmail = db.prepare('SELECT id FROM users WHERE email = ? COLLATE NOCASE').get(email);
            if (existingEmail) {
                res.status(409).json({ error: 'Email already in use' });
                return;
            }
        }

        // Check availability
        const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
        if (existing) {
            res.status(409).json({ error: 'Username already taken' });
            return;
        }

        const hash = bcrypt.hashSync(password, 12);

        const result = db.transaction(() => {
            // Insert user
            const insert = db.prepare(`
                INSERT INTO users (username, password_hash, display_name, role, parent_id, email)
                VALUES (?, ?, ?, ?, ?, ?)
            `);
            const info = insert.run(username, hash, username, role, parentId || null, email || null);
            const newId = info.lastInsertRowid;

            // Initialize stats
            db.prepare('INSERT INTO user_stats (user_id) VALUES (?)').run(newId);

            // Initialize settings
            db.prepare('INSERT INTO user_settings (user_id) VALUES (?)').run(newId);

            return newId;
        })();

        auditService.log({
            action: 'user.create',
            actorId: req.user!.userId,
            targetId: Number(result),
            details: { username, role, parentId: parentId ?? null },
            ip: req.ip
        });

        res.status(201).json({ success: true, userId: result, message: 'User created' });

    } catch (error) {
        logger.error('Create user error', { error: String(error) });
        res.status(500).json({ error: 'Failed to create user' });
    }
});

// Update User Email
router.patch('/users/:id/email', requireRole(['admin']), (req: AuthRequest, res: Response) => {
    try {
        const userId = Number(req.params.id);
        const { email } = req.body;

        // Validate email format if provided
        if (email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                res.status(400).json({ error: 'Invalid email format' });
                return;
            }

            // Check if email is already in use by another user
            const existingEmail = db.prepare('SELECT id FROM users WHERE email = ? COLLATE NOCASE AND id != ?').get(email, userId);
            if (existingEmail) {
                res.status(409).json({ error: 'Email already in use' });
                return;
            }
        }

        const stmt = db.prepare('UPDATE users SET email = ? WHERE id = ?');
        const result = stmt.run(email || null, userId);

        if (result.changes === 0) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        auditService.log({
            action: 'user.email_change',
            actorId: req.user!.userId,
            targetId: userId,
            ip: req.ip
        });

        res.json({ success: true, message: 'Email updated' });
    } catch (error) {
        logger.error('Update email error', { error: String(error) });
        res.status(500).json({ error: 'Failed to update email' });
    }
});

// Reset User Password (Admin or Parent for their children)
router.patch('/users/:id/password', requireRole(['admin', 'parent']), validate(resetUserPasswordSchema), async (req: AuthRequest, res: Response) => {
    try {
        const userId = Number(req.params.id);
        const requestUser = req.user!;
        const { password } = req.body;

        await authService.resetUserPassword(
            requestUser.userId,
            requestUser.role,
            userId,
            password
        );

        auditService.log({
            action: 'user.password_reset',
            actorId: requestUser.userId,
            targetId: userId,
            ip: req.ip
        });

        res.json({ success: true, message: 'Password reset successfully' });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to reset password';

        if (message.includes('Unauthorized') || message.includes('only reset')) {
            res.status(403).json({ error: 'Forbidden', message });
        } else if (message === 'User not found') {
            res.status(404).json({ error: 'Not Found', message });
        } else {
            res.status(400).json({ error: 'Bad Request', message });
        }
    }
});

// Delete User
router.delete('/users/:id', requireRole(['admin']), (req: AuthRequest, res: Response) => {
    try {
        const userId = Number(req.params.id);
        const requestingUser = req.user!;

        // Prevent self-deletion
        if (userId === requestingUser.userId) {
            res.status(400).json({ error: 'Cannot delete your own account' });
            return;
        }

        // Check if user exists
        const targetUser = db.prepare('SELECT id, username, role FROM users WHERE id = ?').get(userId) as { id: number; username: string; role: string } | undefined;
        if (!targetUser) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        // Delete user and all related data in a transaction
        db.transaction(() => {
            // Delete quiz answers (depends on quiz_results)
            db.prepare(`
                DELETE FROM quiz_answers
                WHERE quiz_result_id IN (SELECT id FROM quiz_results WHERE user_id = ?)
            `).run(userId);

            // Delete quiz results
            db.prepare('DELETE FROM quiz_results WHERE user_id = ?').run(userId);

            // Delete study sessions
            db.prepare('DELETE FROM study_sessions WHERE user_id = ?').run(userId);

            // Delete daily challenges
            db.prepare('DELETE FROM daily_challenges WHERE user_id = ?').run(userId);

            // Delete user stats
            db.prepare('DELETE FROM user_stats WHERE user_id = ?').run(userId);

            // Delete user settings
            db.prepare('DELETE FROM user_settings WHERE user_id = ?').run(userId);

            // Delete refresh tokens
            db.prepare('DELETE FROM refresh_tokens WHERE user_id = ?').run(userId);

            // Unlink any children (set their parent_id to null)
            db.prepare('UPDATE users SET parent_id = NULL WHERE parent_id = ?').run(userId);

            // Finally delete the user
            db.prepare('DELETE FROM users WHERE id = ?').run(userId);
        })();

        auditService.log({
            action: 'user.delete',
            actorId: requestingUser.userId,
            targetId: userId,
            details: { username: targetUser.username, role: targetUser.role },
            ip: req.ip
        });

        res.json({ success: true, message: `User ${targetUser.username} deleted successfully` });
    } catch (error) {
        logger.error('Delete user error', { error: String(error) });
        res.status(500).json({ error: 'Failed to delete user' });
    }
});

// GET parent thresholds
router.get('/thresholds', requireRole(['parent']), (req: AuthRequest, res: Response) => {
    try {
        const parentId = req.user!.userId;
        const row = db.prepare('SELECT * FROM parent_thresholds WHERE parent_id = ?').get(parentId) as ParentThresholdRow | undefined;

        res.json({
            days_per_week: row?.days_per_week ?? 5,
            minutes_per_day: row?.minutes_per_day ?? 20,
        });
    } catch (error) {
        logger.error('Fetch thresholds error', { error: String(error) });
        res.status(500).json({ error: 'Failed to fetch thresholds' });
    }
});

// PUT parent thresholds
router.put('/thresholds', requireRole(['parent']), (req: AuthRequest, res: Response) => {
    try {
        const parentId = req.user!.userId;
        const { days_per_week, minutes_per_day } = req.body;

        const daysVal = Math.max(1, Math.min(7, Number(days_per_week) || 5));
        const minutesVal = Math.max(5, Math.min(120, Number(minutes_per_day) || 20));

        db.prepare(`
            INSERT INTO parent_thresholds (parent_id, days_per_week, minutes_per_day, updated_at)
            VALUES (?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(parent_id) DO UPDATE SET
                days_per_week = excluded.days_per_week,
                minutes_per_day = excluded.minutes_per_day,
                updated_at = CURRENT_TIMESTAMP
        `).run(parentId, daysVal, minutesVal);

        res.json({
            days_per_week: daysVal,
            minutes_per_day: minutesVal,
        });
    } catch (error) {
        logger.error('Update thresholds error', { error: String(error) });
        res.status(500).json({ error: 'Failed to update thresholds' });
    }
});

export default router;
