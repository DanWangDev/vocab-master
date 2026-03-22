import { Router, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { xpService } from '../services/xpService';
import type { AuthRequest } from '../types';

const router = Router();

router.use(authMiddleware);

// GET /api/xp/level-info
router.get('/level-info', (req: AuthRequest, res: Response) => {
  try {
    const info = xpService.getLevelInfo(req.user!.userId);
    res.json(info);
  } catch (error) {
    res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Failed to get level info'
    });
  }
});

// GET /api/xp/history?limit=50
router.get('/history', (req: AuthRequest, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const history = xpService.getXpHistory(req.user!.userId, limit);
    res.json({ history });
  } catch (error) {
    res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Failed to get XP history'
    });
  }
});

export default router;
