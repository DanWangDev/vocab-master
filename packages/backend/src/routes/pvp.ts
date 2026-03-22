import { Router, Response } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { pvpService } from '../services/pvpService.js';
import { xpService } from '../services/xpService.js';
import type { AuthRequest } from '../types/index.js';

const router = Router();

router.use(authMiddleware);

const createChallengeSchema = z.object({
  opponentId: z.number().int().positive(),
  wordlistId: z.number().int().positive(),
  questionCount: z.number().int().min(5).max(20).optional().default(10),
});

// GET /api/pvp/opponents?q= - Search for opponents
router.get('/opponents', (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const query = (req.query.q as string || '').trim();
    if (query.length < 2) {
      res.json({ opponents: [] });
      return;
    }
    const opponents = pvpService.searchOpponents(userId, query);
    res.json({ opponents });
  } catch (error) {
    res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Failed to search opponents',
    });
  }
});

// POST /api/pvp/challenge - Create a new PvP challenge
router.post('/challenge', validate(createChallengeSchema), (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { opponentId, wordlistId, questionCount } = req.body;

    const challenge = pvpService.createChallenge(userId, opponentId, wordlistId, questionCount);
    res.status(201).json({ challenge });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create challenge';
    const status = message.includes('Cannot challenge yourself') || message.includes('needs at least') ? 400 : 500;
    res.status(status).json({ error: status === 400 ? 'Bad Request' : 'Internal Server Error', message });
  }
});

// GET /api/pvp/pending - Get pending challenges for current user
router.get('/pending', (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const pending = pvpService.getPending(userId);
    res.json({ challenges: pending });
  } catch (error) {
    res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Failed to get pending challenges',
    });
  }
});

// GET /api/pvp/active - Get active challenges for current user
router.get('/active', (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const active = pvpService.getActive(userId);
    res.json({ challenges: active });
  } catch (error) {
    res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Failed to get active challenges',
    });
  }
});

// GET /api/pvp/history - Get challenge history
router.get('/history', (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 20, 1), 50);
    const history = pvpService.getHistory(userId, limit);
    res.json({ challenges: history });
  } catch (error) {
    res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Failed to get challenge history',
    });
  }
});

// GET /api/pvp/:id - Get challenge details
router.get('/:id', (req: AuthRequest, res: Response) => {
  try {
    const challengeId = parseInt(req.params.id as string, 10);
    if (isNaN(challengeId)) {
      res.status(400).json({ error: 'Bad Request', message: 'Invalid challenge ID' });
      return;
    }

    const challenge = pvpService.getChallenge(challengeId);
    if (!challenge) {
      res.status(404).json({ error: 'Not Found', message: 'Challenge not found' });
      return;
    }

    res.json({ challenge });
  } catch (error) {
    res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Failed to get challenge',
    });
  }
});

// GET /api/pvp/:id/questions - Get questions for a challenge
router.get('/:id/questions', (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const challengeId = parseInt(req.params.id as string, 10);
    if (isNaN(challengeId)) {
      res.status(400).json({ error: 'Bad Request', message: 'Invalid challenge ID' });
      return;
    }

    const questions = pvpService.getQuestions(challengeId, userId);
    res.json({ questions });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get questions';
    const status = message.includes('not found') ? 404 : message.includes('Not your') || message.includes('not active') || message.includes('Already submitted') ? 400 : 500;
    res.status(status).json({ error: status === 400 ? 'Bad Request' : status === 404 ? 'Not Found' : 'Internal Server Error', message });
  }
});

// POST /api/pvp/:id/accept - Accept a challenge
router.post('/:id/accept', (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const challengeId = parseInt(req.params.id as string, 10);
    if (isNaN(challengeId)) {
      res.status(400).json({ error: 'Bad Request', message: 'Invalid challenge ID' });
      return;
    }

    const challenge = pvpService.acceptChallenge(challengeId, userId);
    res.json({ challenge });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to accept challenge';
    res.status(400).json({ error: 'Bad Request', message });
  }
});

// POST /api/pvp/:id/decline - Decline a challenge
router.post('/:id/decline', (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const challengeId = parseInt(req.params.id as string, 10);
    if (isNaN(challengeId)) {
      res.status(400).json({ error: 'Bad Request', message: 'Invalid challenge ID' });
      return;
    }

    pvpService.declineChallenge(challengeId, userId);
    res.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to decline challenge';
    res.status(400).json({ error: 'Bad Request', message });
  }
});

const submitAnswersSchema = z.object({
  answers: z.array(z.object({
    questionIndex: z.number().int().min(0),
    word: z.string(),
    correctAnswer: z.string(),
    selectedAnswer: z.string().nullable(),
    isCorrect: z.boolean(),
    timeSpent: z.number().int().min(0),
  })).min(1),
});

// POST /api/pvp/:id/submit - Submit answers for a challenge
router.post('/:id/submit', validate(submitAnswersSchema), (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const challengeId = parseInt(req.params.id as string, 10);
    if (isNaN(challengeId)) {
      res.status(400).json({ error: 'Bad Request', message: 'Invalid challenge ID' });
      return;
    }

    const result = pvpService.submitAnswers(challengeId, userId, req.body.answers);

    // Award XP for PvP
    let xpResult = null;
    try {
      const correctCount = req.body.answers.filter((a: { isCorrect: boolean }) => a.isCorrect).length;
      const totalCount = req.body.answers.length;
      const score = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;
      const isWin = result.waiting === false && result.challenge?.winner_id === userId;
      const baseXp = isWin ? 30 : 10;
      const bonus = isWin && score > 90 ? 15 : 0;
      xpResult = xpService.awardXp(userId, baseXp + bonus, 'pvp', challengeId);
    } catch { /* non-fatal */ }

    res.json({ ...result, xp: xpResult ? { earned: xpResult.xpEarned, total: xpResult.totalXp, level: xpResult.level, leveledUp: xpResult.leveledUp } : undefined });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to submit answers';
    const status = message.includes('Already submitted') ? 409 : 400;
    res.status(status).json({ error: status === 409 ? 'Conflict' : 'Bad Request', message });
  }
});

// POST /api/pvp/:id/rematch - Create a rematch challenge
router.post('/:id/rematch', (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const challengeId = parseInt(req.params.id as string, 10);
    if (isNaN(challengeId)) {
      res.status(400).json({ error: 'Bad Request', message: 'Invalid challenge ID' });
      return;
    }

    const challenge = pvpService.createRematch(challengeId, userId);
    res.status(201).json({ challenge });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create rematch';
    res.status(400).json({ error: 'Bad Request', message });
  }
});

// GET /api/pvp/:id/comparison - Get per-question comparison for completed challenge
router.get('/:id/comparison', (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const challengeId = parseInt(req.params.id as string, 10);
    if (isNaN(challengeId)) {
      res.status(400).json({ error: 'Bad Request', message: 'Invalid challenge ID' });
      return;
    }

    const comparison = pvpService.getQuestionComparison(challengeId, userId);
    res.json(comparison);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get comparison';
    const status = message.includes('not found') ? 404 : 400;
    res.status(status).json({ error: status === 404 ? 'Not Found' : 'Bad Request', message });
  }
});

export default router;
