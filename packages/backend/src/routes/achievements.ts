import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { checkAndAwardAchievements, getAchievementsForUser } from '../services/achievementService.js';
import type { AuthRequest } from '../types/index.js';

const router = Router();

// All achievement routes require authentication
router.use(authMiddleware);

/**
 * GET /api/achievements
 * Returns all achievements with the current user's earned status.
 */
router.get('/', (req, res) => {
  const { userId } = (req as AuthRequest).user!;
  const result = getAchievementsForUser(userId);
  res.json(result);
});

/**
 * GET /api/achievements/mine
 * Returns only the achievements the current user has earned.
 */
router.get('/mine', (req, res) => {
  const { userId } = (req as AuthRequest).user!;
  const { achievements, totalEarned, totalAvailable } = getAchievementsForUser(userId);
  const earned = achievements.filter(a => a.earned);
  res.json({ achievements: earned, totalEarned, totalAvailable });
});

/**
 * POST /api/achievements/check
 * Manually trigger achievement check for the current user.
 * Returns any newly earned achievements.
 */
router.post('/check', (req, res) => {
  const { userId } = (req as AuthRequest).user!;
  const newlyEarned = checkAndAwardAchievements(userId, {});
  const { totalEarned, totalAvailable } = getAchievementsForUser(userId);
  res.json({ newlyEarned, totalEarned, totalAvailable });
});

export default router;
