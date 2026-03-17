import { Router, Response } from 'express';
import { quizResultRepository } from '../repositories/quizResultRepository';
import { authMiddleware } from '../middleware/auth';
import { logger } from '../services/logger.js';
import type { AuthRequest } from '../types';

const router = Router();

// Save study session
router.post('/', authMiddleware, (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.userId;
        const { wordsReviewed, startTime, endTime, words } = req.body;

        const sessionId = quizResultRepository.createStudySession({
            userId,
            wordsReviewed,
            startTime: new Date(startTime),
            endTime: new Date(endTime),
            words
        });

        res.status(201).json({
            success: true,
            sessionId,
            message: 'Study session saved successfully'
        });
    } catch (error) {
        logger.error('Error saving study session', { error: String(error) });
        res.status(500).json({ error: 'Failed to save study session' });
    }
});

// Get user's study history
router.get('/history', authMiddleware, (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.userId;
        const history = quizResultRepository.getStudySessionsByUserId(userId);
        res.json(history);
    } catch (error) {
        logger.error('Error fetching study history', { error: String(error) });
        res.status(500).json({ error: 'Failed to fetch study history' });
    }
});

export default router;
