import { Router, Response } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { pushTokenRepository } from '../repositories/index.js';
import type { AuthRequest } from '../types/index.js';

const router = Router();

router.use(authMiddleware);

// POST /api/push-tokens - Register a push token
router.post('/', (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { expoPushToken, platform } = req.body as {
      expoPushToken: string;
      platform: string;
    };

    if (!expoPushToken || typeof expoPushToken !== 'string') {
      res.status(400).json({
        error: 'Bad Request',
        message: 'expoPushToken is required',
      });
      return;
    }

    if (!platform || !['ios', 'android'].includes(platform)) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'platform must be "ios" or "android"',
      });
      return;
    }

    pushTokenRepository.upsert(userId, expoPushToken, platform);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Failed to register push token',
    });
  }
});

// DELETE /api/push-tokens - Unregister all push tokens for current user
router.delete('/', (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    pushTokenRepository.deleteByUserId(userId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Failed to unregister push token',
    });
  }
});

export default router;
