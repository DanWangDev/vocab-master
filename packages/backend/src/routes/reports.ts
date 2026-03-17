import { Router, Response } from 'express';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { wordMasteryService } from '../services/wordMasteryService.js';
import { reportService } from '../services/reportService.js';
import type { AuthRequest } from '../types/index.js';

const router = Router();

router.use(authMiddleware);

// GET /api/reports/mastery - Get current user's mastery breakdown
router.get('/mastery', (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const breakdown = wordMasteryService.getBreakdown(userId);
    const weakWords = wordMasteryService.getWeakWords(userId, 20);
    const strongWords = wordMasteryService.getStrongWords(userId, 20);

    res.json({ breakdown, weakWords, strongWords });
  } catch (error) {
    res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Failed to get mastery data',
    });
  }
});

// GET /api/reports/trend - Get learning trend data
router.get('/trend', (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const days = Math.min(Math.max(parseInt(req.query.days as string) || 30, 7), 90);
    const trend = wordMasteryService.getLearningTrend(userId, days);

    res.json({ trend });
  } catch (error) {
    res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Failed to get trend data',
    });
  }
});

// GET /api/reports/student/:id/summary - Get full student report (parent/admin only)
router.get('/student/:id/summary', requireRole(['parent', 'admin']), (req: AuthRequest, res: Response) => {
  try {
    const studentId = parseInt(req.params.id as string, 10);
    if (isNaN(studentId)) {
      res.status(400).json({ error: 'Bad Request', message: 'Invalid student ID' });
      return;
    }

    const summary = reportService.getStudentSummary(studentId);
    res.json(summary);
  } catch (error) {
    res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Failed to get student summary',
    });
  }
});

// GET /api/reports/student/:id/export - Export student mastery as CSV (parent/admin only)
router.get('/student/:id/export', requireRole(['parent', 'admin']), (req: AuthRequest, res: Response) => {
  try {
    const studentId = parseInt(req.params.id as string, 10);
    if (isNaN(studentId)) {
      res.status(400).json({ error: 'Bad Request', message: 'Invalid student ID' });
      return;
    }

    const csv = reportService.generateCsvExport(studentId);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="mastery-report-${studentId}.csv"`);
    res.send(csv);
  } catch (error) {
    res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Failed to export report',
    });
  }
});

// GET /api/reports/my/export - Export current user's mastery as CSV
router.get('/my/export', (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const csv = reportService.generateCsvExport(userId);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="my-mastery-report.csv"`);
    res.send(csv);
  } catch (error) {
    res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Failed to export report',
    });
  }
});

export default router;
