import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { getLeaderboard, getUserRanking } from '../services/leaderboardService.js';
import type { AuthRequest } from '../types/index.js';
import type { LeaderboardPeriod } from '../services/leaderboardService.js';

const router = Router();

router.use(authMiddleware);

const VALID_PERIODS = new Set(['weekly', 'monthly', 'alltime']);

/**
 * GET /api/leaderboards?period=weekly
 * Returns leaderboard rankings for a given period.
 */
router.get('/', (req, res) => {
  const period = (req.query.period as string) || 'weekly';

  if (!VALID_PERIODS.has(period)) {
    res.status(400).json({ error: 'Invalid period. Must be weekly, monthly, or alltime.' });
    return;
  }

  const limit = Math.min(parseInt(req.query.limit as string, 10) || 50, 100);
  const result = getLeaderboard(period as LeaderboardPeriod, limit);
  res.json(result);
});

/**
 * GET /api/leaderboards/me?period=weekly
 * Returns the current user's ranking in a given period.
 */
router.get('/me', (req, res) => {
  const { userId } = (req as AuthRequest).user!;
  const period = (req.query.period as string) || 'weekly';

  if (!VALID_PERIODS.has(period)) {
    res.status(400).json({ error: 'Invalid period. Must be weekly, monthly, or alltime.' });
    return;
  }

  const result = getUserRanking(userId, period as LeaderboardPeriod);
  res.json(result);
});

export default router;
