import { Router, Response } from 'express';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import {
  validate,
  createStudentByParentSchema,
  updateProfileSchema
} from '../middleware/validate.js';
import { userRepository } from '../repositories/userRepository.js';
import { authService } from '../services/authService.js';
import type {
  AuthRequest,
  CreateStudentByParentRequest,
  UpdateProfileRequest
} from '../types/index.js';

const router = Router();

// POST /api/auth/create-student - Parent creates a student account (auto-linked)
router.post('/create-student', authMiddleware, requireRole(['parent']), validate(createStudentByParentSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { username, password, displayName } = req.body as CreateStudentByParentRequest;
    const result = await authService.createStudentForParent(req.user!.userId, username, password, displayName);

    res.status(201).json({
      success: true,
      user: result.user
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create student';

    if (message === 'Username already taken') {
      res.status(409).json({ error: 'Conflict', message });
    } else if (message === 'Only parents can create student accounts') {
      res.status(403).json({ error: 'Forbidden', message });
    } else {
      res.status(400).json({ error: 'Bad Request', message });
    }
  }
});

// POST /api/auth/logout
router.post('/logout', (_req: AuthRequest, res: Response) => {
  res.json({ message: 'Logged out successfully' });
});

// PATCH /api/auth/profile - Self-service profile update
router.patch('/profile', authMiddleware, validate(updateProfileSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { username, displayName } = req.body as UpdateProfileRequest;
    const user = authService.updateProfile(req.user!.userId, { username, displayName });

    res.json({ user });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Profile update failed';

    if (message === 'Username already taken') {
      res.status(409).json({ error: 'Conflict', message });
    } else if (message === 'User not found') {
      res.status(404).json({ error: 'Not Found', message });
    } else {
      res.status(400).json({ error: 'Bad Request', message });
    }
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const userRow = userRepository.findById(req.user!.userId);

    if (!userRow) {
      res.status(404).json({
        error: 'Not Found',
        message: 'User not found'
      });
      return;
    }

    res.json({
      user: {
        id: userRow.id,
        username: userRow.username,
        displayName: userRow.display_name,
        role: userRow.role,
        email: userRow.email,
        emailVerified: userRow.email_verified === 1,
        authProvider: userRow.auth_provider || 'local',
        createdAt: userRow.created_at
      }
    });
  } catch (error) {
    res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Failed to get user'
    });
  }
});

export default router;
