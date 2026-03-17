import { Router, Response } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { exerciseService } from '../services/exerciseService.js';
import type { AuthRequest } from '../types/index.js';

const router = Router();

router.use(authMiddleware);

// GET /api/exercises/sentence-build?wordlistId=X&limit=10
router.get('/sentence-build', (req: AuthRequest, res: Response) => {
  try {
    const wordlistId = parseInt(req.query.wordlistId as string, 10);
    if (isNaN(wordlistId)) {
      res.status(400).json({ error: 'Bad Request', message: 'wordlistId is required' });
      return;
    }

    const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 10, 1), 30);
    const exercises = exerciseService.getSentenceBuildExercises(wordlistId, limit);
    res.json({ exercises });
  } catch (error) {
    res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Failed to get exercises',
    });
  }
});

export default router;
