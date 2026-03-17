import { Router, Response } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { validate, completeChallengeSchema } from '../middleware/validate.js';
import { challengeRepository } from '../repositories/challengeRepository.js';
import { checkAndAwardAchievements } from '../services/achievementService.js';
import type { AuthRequest, DailyChallenge, CompleteChallengeRequest } from '../types/index.js';

const router = Router();

// All challenges routes require authentication
router.use(authMiddleware);

// GET /api/challenges/today
router.get('/today', (req: AuthRequest, res: Response) => {
  try {
    const challenge = challengeRepository.getTodayChallenge(req.user!.userId);
    const streak = challengeRepository.calculateStreak(req.user!.userId);

    res.json({
      completed: challenge !== undefined,
      challenge: challenge ? {
        id: challenge.id,
        userId: challenge.user_id,
        challengeDate: challenge.challenge_date,
        score: challenge.score,
        createdAt: challenge.created_at
      } as DailyChallenge : null,
      streak
    });
  } catch (error) {
    res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Failed to get today\'s challenge'
    });
  }
});

// POST /api/challenges/complete
router.post('/complete', validate(completeChallengeSchema), (req: AuthRequest, res: Response) => {
  try {
    const { score } = req.body as CompleteChallengeRequest;
    const userId = req.user!.userId;
    const today = new Date().toISOString().split('T')[0];

    // Check if already completed today
    const existing = challengeRepository.getTodayChallenge(userId);
    if (existing) {
      res.status(409).json({
        error: 'Conflict',
        message: 'Today\'s challenge has already been completed'
      });
      return;
    }

    // Create challenge record
    const challenge = challengeRepository.create(userId, today, score);

    // Stats are now computed from raw tables; no need to update cached counters.

    // Calculate new streak
    const streak = challengeRepository.calculateStreak(userId);

    // Check achievements after challenge completion
    const newlyEarned = checkAndAwardAchievements(userId, {
      challengeScore: score,
      streakDays: streak,
    });

    res.status(201).json({
      challenge: {
        id: challenge.id,
        userId: challenge.user_id,
        challengeDate: challenge.challenge_date,
        score: challenge.score,
        createdAt: challenge.created_at
      } as DailyChallenge,
      streak,
      newAchievements: newlyEarned.length > 0 ? newlyEarned : undefined,
    });
  } catch (error) {
    res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Failed to complete challenge'
    });
  }
});

// GET /api/challenges/history
router.get('/history', (req: AuthRequest, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 30, 100);
    const challenges = challengeRepository.getRecentChallenges(req.user!.userId, limit);

    res.json({
      challenges: challenges.map(c => ({
        id: c.id,
        userId: c.user_id,
        challengeDate: c.challenge_date,
        score: c.score,
        createdAt: c.created_at
      } as DailyChallenge))
    });
  } catch (error) {
    res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Failed to get challenge history'
    });
  }
});

// GET /api/challenges/streak
router.get('/streak', (req: AuthRequest, res: Response) => {
  try {
    const streak = challengeRepository.calculateStreak(req.user!.userId);
    const bestScore = challengeRepository.getBestScore(req.user!.userId);

    res.json({
      streak,
      bestScore
    });
  } catch (error) {
    res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Failed to get streak'
    });
  }
});

export default router;
