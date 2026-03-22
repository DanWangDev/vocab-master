import { Router, Response } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { srsService } from '../services/srsService.js';
import { db } from '../config/database.js';
import { xpService } from '../services/xpService.js';
import type { AuthRequest } from '../types/index.js';
import type { WordlistWordRow } from '../types/index.js';

const router = Router();

router.use(authMiddleware);

// GET /api/srs/review-queue?limit=20
router.get('/review-queue', (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 20, 1), 50);

    const queue = srsService.getReviewQueue(userId, limit);

    // Enrich with word details from wordlist_words
    const items = queue.map(item => {
      let definitions: string[] = [];
      let synonyms: string[] = [];
      let exampleSentences: string[] = [];

      if (item.wordlist_id) {
        const wordRow = db.prepare(
          'SELECT definitions, synonyms, example_sentences FROM wordlist_words WHERE wordlist_id = ? AND target_word = ? LIMIT 1'
        ).get(item.wordlist_id, item.word) as Pick<WordlistWordRow, 'definitions' | 'synonyms' | 'example_sentences'> | undefined;

        if (wordRow) {
          try { definitions = JSON.parse(wordRow.definitions); } catch { /* empty */ }
          try { synonyms = JSON.parse(wordRow.synonyms); } catch { /* empty */ }
          try { exampleSentences = JSON.parse(wordRow.example_sentences); } catch { /* empty */ }
        }
      }

      // Fallback: search across all wordlists if no wordlist_id or not found
      if (definitions.length === 0) {
        const fallback = db.prepare(
          'SELECT definitions, synonyms, example_sentences FROM wordlist_words WHERE target_word = ? LIMIT 1'
        ).get(item.word) as Pick<WordlistWordRow, 'definitions' | 'synonyms' | 'example_sentences'> | undefined;

        if (fallback) {
          try { definitions = JSON.parse(fallback.definitions); } catch { /* empty */ }
          try { synonyms = JSON.parse(fallback.synonyms); } catch { /* empty */ }
          try { exampleSentences = JSON.parse(fallback.example_sentences); } catch { /* empty */ }
        }
      }

      return {
        id: item.id,
        word: item.word,
        wordlistId: item.wordlist_id,
        definitions,
        synonyms,
        exampleSentences,
        masteryLevel: item.mastery_level,
        srsIntervalDays: item.srs_interval_days,
        correctCount: item.correct_count,
        incorrectCount: item.incorrect_count,
      };
    });

    res.json({ items });
  } catch (error) {
    res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Failed to get review queue',
    });
  }
});

const reviewSchema = z.object({
  wordMasteryId: z.number().int(),
  quality: z.number().int().min(0).max(5),
  word: z.string().optional(),
  wordlistId: z.number().int().positive().optional(),
});

// POST /api/srs/review
router.post('/review', validate(reviewSchema), (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { wordMasteryId, quality, word, wordlistId } = req.body;

    // New card (negative ID from fallback): initialize mastery record first
    let resolvedId = wordMasteryId;
    if (wordMasteryId < 0 && word) {
      const initialized = srsService.initializeWord(
        userId,
        word,
        wordlistId ?? undefined,
      );
      resolvedId = initialized.id;
    }

    const result = srsService.processReview(userId, resolvedId, quality);

    // Award XP for SRS review
    let xpResult = null;
    try {
      const baseXp = 5;
      const qualityBonus = quality >= 4 ? 3 : 0;
      xpResult = xpService.awardXp(userId, baseXp + qualityBonus, 'study', resolvedId);
    } catch { /* non-fatal */ }

    res.json({ success: true, ...result, xp: xpResult ? { earned: xpResult.xpEarned, total: xpResult.totalXp, level: xpResult.level, leveledUp: xpResult.leveledUp } : undefined });
  } catch (error) {
    res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Failed to process review',
    });
  }
});

// GET /api/srs/count
router.get('/count', (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const count = srsService.getReviewCount(userId);
    res.json({ count });
  } catch (error) {
    res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Failed to get review count',
    });
  }
});

export default router;
