import { Router, Response } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { rewardService } from '../services/rewardService';
import { calculateStreak } from '../services/dashboardService';
import type { AuthRequest } from '../types';

const router = Router();

router.use(authMiddleware);

// GET /api/rewards - all rewards with status
router.get('/', (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const currentStreak = calculateStreak(userId);
    const rewards = rewardService.getUserRewards(userId, currentStreak);
    res.json({ rewards, currentStreak });
  } catch (error) {
    res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Failed to get rewards'
    });
  }
});

const setActiveSchema = z.object({
  rewardSlug: z.string().nullable(),
  rewardType: z.enum(['avatar_frame', 'dashboard_theme']),
});

// PATCH /api/rewards/active - set active avatar frame or theme
router.patch('/active', validate(setActiveSchema), (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { rewardSlug, rewardType } = req.body;

    const success = rewardService.setActiveReward(userId, rewardSlug, rewardType);
    if (!success) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Reward not found, not earned, or type mismatch'
      });
      return;
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Failed to set active reward'
    });
  }
});

export default router;
