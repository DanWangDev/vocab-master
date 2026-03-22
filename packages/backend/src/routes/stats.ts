import { Router, Response } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { validate, updateStatsSchema } from '../middleware/validate.js';
import { computedStatsService } from '../services/computedStatsService';
import db from '../config/database.js';
import { calculateStreak } from '../services/dashboardService';
import type { AuthRequest, UserStats, UpdateStatsRequest } from '../types/index.js';

const router = Router();

// All stats routes require authentication
router.use(authMiddleware);

// GET /api/stats - computed from raw activity tables
router.get('/', (req: AuthRequest, res: Response) => {
  try {
    const stats = computedStatsService.getComputedStats(req.user!.userId);
    res.json(stats);
  } catch (error) {
    res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Failed to get stats'
    });
  }
});

// PATCH /api/stats - kept for backward compatibility, returns computed values
router.patch('/', validate(updateStatsSchema), (req: AuthRequest, res: Response) => {
  try {
    // No-op write: stats are now computed from raw tables.
    // Return current computed values for backward compatibility.
    const stats = computedStatsService.getComputedStats(req.user!.userId);
    res.json(stats);
  } catch (error) {
    res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Failed to update stats'
    });
  }
});

// POST /api/stats/increment - kept for backward compatibility, returns computed values
router.post('/increment', (req: AuthRequest, res: Response) => {
  try {
    // No-op write: stats are now computed from raw tables.
    // Return current computed values for backward compatibility.
    const stats = computedStatsService.getComputedStats(req.user!.userId);
    res.json(stats);
  } catch (error) {
    res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Failed to increment stats'
    });
  }
});

// GET /api/stats/activity - Get accurate stats from activity logs
router.get('/activity', (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;

    // Quiz stats from quiz_results table
    const quizStats = db.prepare(`
      SELECT
        COUNT(*) as quiz_count,
        COALESCE(ROUND(AVG(correct_answers * 100.0 / NULLIF(total_questions, 0)), 0), 0) as avg_accuracy,
        COALESCE(MAX(correct_answers), 0) as best_score
      FROM quiz_results
      WHERE user_id = ?
    `).get(userId) as { quiz_count: number; avg_accuracy: number; best_score: number };

    // Study stats from study_sessions table
    const studyStats = db.prepare(`
      SELECT
        COUNT(*) as session_count,
        COALESCE(SUM(words_reviewed), 0) as words_reviewed
      FROM study_sessions
      WHERE user_id = ?
    `).get(userId) as { session_count: number; words_reviewed: number };

    // Calculate streak from activity dates
    const activityDates = db.prepare(`
      SELECT DISTINCT date(start_time) as activity_date FROM study_sessions WHERE user_id = ?
      UNION
      SELECT DISTINCT date(completed_at) as activity_date FROM quiz_results WHERE user_id = ?
      ORDER BY activity_date DESC
    `).all(userId, userId) as { activity_date: string }[];

    let streak = 0;
    if (activityDates.length > 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const mostRecentDate = new Date(activityDates[0].activity_date);
      const diffFromToday = Math.floor((today.getTime() - mostRecentDate.getTime()) / (1000 * 60 * 60 * 24));

      // If activity today or yesterday, count the streak
      if (diffFromToday <= 1) {
        let expectedDate = mostRecentDate;
        for (const { activity_date } of activityDates) {
          const currentDate = new Date(activity_date);
          const diff = Math.floor((expectedDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));

          if (diff <= 1) {
            streak++;
            expectedDate = new Date(currentDate);
            expectedDate.setDate(expectedDate.getDate() - 1);
          } else {
            break;
          }
        }
      }
    }

    res.json({
      quizCount: quizStats.quiz_count,
      avgAccuracy: quizStats.avg_accuracy,
      bestScore: quizStats.best_score,
      studySessions: studyStats.session_count,
      wordsReviewed: studyStats.words_reviewed,
      currentStreak: streak
    });
  } catch (error) {
    res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Failed to get activity stats'
    });
  }
});

// GET /api/stats/activity-heatmap - 90-day activity grid
router.get('/activity-heatmap', (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const days = Math.min(parseInt(req.query.days as string) || 90, 365);

    const rows = db.prepare(`
      SELECT activity_date, COUNT(*) as activity_count, GROUP_CONCAT(DISTINCT activity_type) as types FROM (
        SELECT date(start_time) as activity_date, 'study' as activity_type FROM study_sessions WHERE user_id = ? AND date(start_time) >= date('now', '-' || ? || ' days')
        UNION ALL
        SELECT date(completed_at) as activity_date, 'quiz' as activity_type FROM quiz_results WHERE user_id = ? AND date(completed_at) >= date('now', '-' || ? || ' days')
        UNION ALL
        SELECT date(created_at) as activity_date, 'challenge' as activity_type FROM daily_challenges WHERE user_id = ? AND date(created_at) >= date('now', '-' || ? || ' days')
        UNION ALL
        SELECT date(completed_at) as activity_date, 'exercise' as activity_type FROM exercise_results WHERE user_id = ? AND date(completed_at) >= date('now', '-' || ? || ' days')
      )
      GROUP BY activity_date
      ORDER BY activity_date ASC
    `).all(userId, days, userId, days, userId, days, userId, days) as Array<{
      activity_date: string;
      activity_count: number;
      types: string;
    }>;

    res.json({
      days: rows.map(r => ({
        date: r.activity_date,
        activityCount: r.activity_count,
        types: r.types.split(','),
      }))
    });
  } catch (error) {
    res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Failed to get activity heatmap'
    });
  }
});

// GET /api/stats/streak-details - canonical streak endpoint
router.get('/streak-details', (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const currentStreak = calculateStreak(userId);

    // Find streak start date
    const activityDates = db.prepare(`
      SELECT DISTINCT activity_date FROM (
        SELECT date(start_time) as activity_date FROM study_sessions WHERE user_id = ?
        UNION
        SELECT date(completed_at) as activity_date FROM quiz_results WHERE user_id = ?
        UNION
        SELECT date(created_at) as activity_date FROM daily_challenges WHERE user_id = ?
        UNION
        SELECT date(completed_at) as activity_date FROM exercise_results WHERE user_id = ?
      )
      ORDER BY activity_date DESC
    `).all(userId, userId, userId, userId) as { activity_date: string }[];

    const today = new Date().toISOString().split('T')[0];
    const isActiveToday = activityDates.length > 0 && activityDates[0].activity_date === today;

    // Streak start date is currentStreak days back from the most recent active date
    let streakStartDate: string | null = null;
    if (currentStreak > 0 && activityDates.length > 0) {
      const start = new Date(activityDates[0].activity_date);
      start.setDate(start.getDate() - currentStreak + 1);
      streakStartDate = start.toISOString().split('T')[0];
    }

    // Longest streak (simple scan)
    let longestStreak = 0;
    if (activityDates.length > 0) {
      let tempStreak = 1;
      for (let i = 1; i < activityDates.length; i++) {
        const prev = new Date(activityDates[i - 1].activity_date);
        const curr = new Date(activityDates[i].activity_date);
        const diff = Math.floor((prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24));
        if (diff === 1) {
          tempStreak++;
        } else {
          longestStreak = Math.max(longestStreak, tempStreak);
          tempStreak = 1;
        }
      }
      longestStreak = Math.max(longestStreak, tempStreak);
    }

    res.json({
      currentStreak,
      longestStreak,
      streakStartDate,
      isActiveToday,
    });
  } catch (error) {
    res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Failed to get streak details'
    });
  }
});

// GET /api/stats/weak-words - Get words the user struggles with
router.get('/weak-words', (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;

    // Get words where user got wrong more than 50% of the time
    const weakWords = db.prepare(`
      SELECT
        word,
        SUM(CASE WHEN is_correct = 0 THEN 1 ELSE 0 END) as incorrect_count,
        SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END) as correct_count,
        COUNT(*) as total_attempts
      FROM quiz_answers qa
      JOIN quiz_results qr ON qa.quiz_result_id = qr.id
      WHERE qr.user_id = ?
      GROUP BY word
      HAVING incorrect_count > 0
      ORDER BY incorrect_count DESC, total_attempts DESC
      LIMIT 50
    `).all(userId) as Array<{
      word: string;
      incorrect_count: number;
      correct_count: number;
      total_attempts: number;
    }>;

    res.json({
      weakWords: weakWords.map(w => ({
        word: w.word,
        incorrectCount: w.incorrect_count,
        correctCount: w.correct_count,
        totalAttempts: w.total_attempts,
        accuracy: Math.round((w.correct_count / w.total_attempts) * 100)
      }))
    });
  } catch (error) {
    res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Failed to get weak words'
    });
  }
});

export default router;
