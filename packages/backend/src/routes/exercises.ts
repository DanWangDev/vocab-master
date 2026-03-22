import { Router, Response } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { exerciseService } from '../services/exerciseService.js';
import { logger } from '../services/logger.js';
import { xpService } from '../services/xpService.js';
import { rewardService } from '../services/rewardService.js';
import { calculateStreak } from '../services/dashboardService.js';
import type { AuthRequest } from '../types/index.js';

const router = Router();

router.use(authMiddleware);

// GET /api/exercises/sentence-build?wordlistId=X&limit=10
router.get('/sentence-build', (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    let wordlistId = parseInt(req.query.wordlistId as string, 10);

    // Fallback to user's active wordlist if not provided
    if (isNaN(wordlistId) || wordlistId <= 0) {
      try {
        wordlistId = exerciseService.resolveWordlistId(undefined, userId);
      } catch {
        res.status(400).json({ error: 'Bad Request', message: 'No wordlist available' });
        return;
      }
    }

    const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 10, 1), 30);
    const exercises = exerciseService.getSentenceBuildExercises(wordlistId, limit);
    res.json({ exercises, wordlistId });
  } catch (error) {
    res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Failed to get exercises',
    });
  }
});

// GET /api/exercises/spelling?wordlistId=X&mode=definition|fill_blank&limit=10
router.get('/spelling', (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    let wordlistId = parseInt(req.query.wordlistId as string, 10);

    if (isNaN(wordlistId) || wordlistId <= 0) {
      try {
        wordlistId = exerciseService.resolveWordlistId(undefined, userId);
      } catch {
        res.status(400).json({ error: 'Bad Request', message: 'No wordlist available' });
        return;
      }
    }

    const mode = req.query.mode === 'fill_blank' ? 'fill_blank' : 'definition';
    const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 10, 1), 30);

    const exercises = exerciseService.getSpellingExercises(wordlistId, mode, limit);
    res.json({ exercises, wordlistId });
  } catch (error) {
    res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Failed to get spelling exercises',
    });
  }
});

// POST /api/exercises/results
const exerciseResultSchema = z.object({
  exerciseType: z.enum(['sentence_build', 'spelling']),
  wordlistId: z.number().int().nullable(),
  totalQuestions: z.number().int().min(1).max(100),
  correctAnswers: z.number().int().min(0),
  score: z.number().min(0).max(100),
  totalTimeSpent: z.number().nullable(),
  answers: z.array(z.object({
    questionIndex: z.number().int().min(0),
    word: z.string().min(1),
    correctAnswer: z.string(),
    userAnswer: z.string().nullable(),
    isCorrect: z.boolean(),
    timeSpent: z.number().nullable(),
  })),
}).refine(data => data.correctAnswers <= data.totalQuestions, {
  message: 'correctAnswers cannot exceed totalQuestions',
});

router.post('/results', (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;

    const parseResult = exerciseResultSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        error: 'ValidationError',
        message: parseResult.error.errors[0].message,
      });
      return;
    }

    const { resultId, newlyEarned } = exerciseService.submitResult(userId, parseResult.data);

    // Award XP
    let xpResult = null;
    try {
      const { correctAnswers, totalQuestions, score } = parseResult.data;
      const correctXp = correctAnswers * 10;
      const perfectBonus = score === 100 ? totalQuestions * 5 : 0;
      xpResult = xpService.awardXp(userId, correctXp + perfectBonus, 'exercise', resultId);

      const streak = calculateStreak(userId);
      if (streak > 0) {
        xpService.awardStreakBonus(userId, streak);
        rewardService.checkAndAwardStreakRewards(userId, streak);
      }
    } catch { /* non-fatal */ }

    res.status(201).json({
      success: true,
      resultId,
      message: 'Exercise result saved successfully',
      newAchievements: newlyEarned.length > 0 ? newlyEarned : undefined,
      xp: xpResult ? { earned: xpResult.xpEarned, total: xpResult.totalXp, level: xpResult.level, leveledUp: xpResult.leveledUp } : undefined,
    });
  } catch (error) {
    logger.error('Error saving exercise result', { error: String(error) });
    res.status(500).json({ error: 'Failed to save exercise result' });
  }
});

export default router;
