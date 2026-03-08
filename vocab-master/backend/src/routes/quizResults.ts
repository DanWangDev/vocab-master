import { Router, Response } from 'express';
import { z } from 'zod';
import { quizResultRepository } from '../repositories/quizResultRepository';
import { authMiddleware } from '../middleware/auth';
import { logger } from '../services/logger.js';
import type { AuthRequest } from '../types';

const router = Router();

const quizResultSchema = z.object({
  quizType: z.enum(['quiz', 'challenge']),
  totalQuestions: z.number().int().min(1).max(200),
  correctAnswers: z.number().int().min(0),
  score: z.number().min(0).max(100),
  timePerQuestion: z.number().nullable(),
  totalTimeSpent: z.number().min(0),
  pointsEarned: z.number().min(0),
  answers: z.array(z.object({
    questionIndex: z.number().int().min(0),
    word: z.string().min(1),
    promptType: z.string(),
    questionFormat: z.string(),
    correctAnswer: z.string(),
    selectedAnswer: z.string().nullable(),
    isCorrect: z.boolean(),
    timeSpent: z.number().min(0)
  }))
}).refine(data => data.correctAnswers <= data.totalQuestions, {
  message: 'correctAnswers cannot exceed totalQuestions'
});

// Save quiz result
router.post('/', authMiddleware, (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.userId;

        const parseResult = quizResultSchema.safeParse(req.body);
        if (!parseResult.success) {
            res.status(400).json({ error: 'ValidationError', message: parseResult.error.errors[0].message });
            return;
        }

        const {
            quizType,
            totalQuestions,
            correctAnswers,
            score,
            timePerQuestion,
            totalTimeSpent,
            pointsEarned,
            answers
        } = parseResult.data;

        const resultId = quizResultRepository.create({
            userId,
            quizType,
            totalQuestions,
            correctAnswers,
            score,
            timePerQuestion,
            totalTimeSpent,
            pointsEarned,
            answers
        });

        // Stats are now computed from raw tables; no need to increment cached counters.

        res.status(201).json({
            success: true,
            resultId,
            message: 'Quiz result saved successfully'
        });
    } catch (error) {
        logger.error('Error saving quiz result', { error: String(error) });
        res.status(500).json({ error: 'Failed to save quiz result' });
    }
});

// Get user's quiz history
router.get('/history', authMiddleware, (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.userId;
        const history = quizResultRepository.getByUserId(userId);
        res.json(history);
    } catch (error) {
        logger.error('Error fetching quiz history', { error: String(error) });
        res.status(500).json({ error: 'Failed to fetch quiz history' });
    }
});

export default router;
