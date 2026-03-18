import {
  wordMasteryRepository,
  wordlistRepository,
} from '../repositories/index.js';
import type { WordMasteryRow } from '../types/index.js';

function computeSrsMasteryLevel(intervalDays: number): number {
  if (intervalDays >= 21) return 3; // mastered
  if (intervalDays >= 7) return 2;  // familiar
  if (intervalDays >= 1) return 1;  // learning
  return 0; // new
}

export interface SrsReviewResult {
  nextReviewAt: string;
  newInterval: number;
  newEaseFactor: number;
  masteryLevel: number;
}

export const srsService = {
  getReviewQueue(userId: number, limit = 20): WordMasteryRow[] {
    const queue = wordMasteryRepository.getReviewQueue(userId, limit);
    if (queue.length > 0) {
      return queue;
    }

    return this.getNewCardsFromActiveWordlist(userId, limit);
  },

  getNewCardsFromActiveWordlist(
    userId: number,
    limit: number,
  ): WordMasteryRow[] {
    const activeWordlist = wordlistRepository.getActiveWordlist(userId);
    if (!activeWordlist) {
      return [];
    }

    const allWords = wordlistRepository.getWords(activeWordlist.id);
    const existingMastery = wordMasteryRepository.getByUserId(userId);
    const masteredWords = new Set(existingMastery.map((m) => m.word));

    const now = new Date().toISOString();

    return allWords
      .filter((w) => !masteredWords.has(w.target_word))
      .slice(0, limit)
      .map((w, index) => ({
        id: -(index + 1),
        user_id: userId,
        word: w.target_word,
        wordlist_id: activeWordlist.id,
        correct_count: 0,
        incorrect_count: 0,
        last_correct_at: null,
        last_incorrect_at: null,
        mastery_level: 0,
        next_review_at: null,
        srs_interval_days: 0,
        srs_ease_factor: 2.5,
        created_at: now,
        updated_at: now,
      }));
  },

  getReviewCount(userId: number): number {
    return wordMasteryRepository.getReviewQueueCount(userId);
  },

  /**
   * Process a review using SM-2 algorithm variant.
   * quality: 0-5 (0-2 = incorrect, 3-5 = correct)
   */
  processReview(
    userId: number,
    wordMasteryId: number,
    quality: number,
  ): SrsReviewResult {
    const existing = wordMasteryRepository
      .getByUserId(userId)
      .find((r) => r.id === wordMasteryId);

    if (!existing) {
      throw new Error('Word mastery record not found');
    }

    const isCorrect = quality >= 3;
    const oldInterval = existing.srs_interval_days;
    const oldEase = existing.srs_ease_factor;

    let newInterval: number;
    let newEase: number;

    if (isCorrect) {
      // SM-2: increase interval
      if (oldInterval < 1) {
        newInterval = 1;
      } else if (oldInterval < 6) {
        newInterval = 6;
      } else {
        newInterval = Math.round(oldInterval * oldEase * 10) / 10;
      }
      // Adjust ease factor
      newEase = Math.max(
        1.3,
        oldEase + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02),
      );
    } else {
      // Reset interval on failure
      newInterval = 1;
      newEase = Math.max(1.3, oldEase - 0.2);
    }

    const masteryLevel = computeSrsMasteryLevel(newInterval);

    // Compute next review date
    const now = new Date();
    const nextReview = new Date(
      now.getTime() + newInterval * 24 * 60 * 60 * 1000,
    );
    const nextReviewAt = nextReview.toISOString();

    // Update SRS schedule
    wordMasteryRepository.updateSrsSchedule(wordMasteryId, {
      nextReviewAt,
      srsIntervalDays: newInterval,
      srsEaseFactor: Math.round(newEase * 100) / 100,
      masteryLevel,
    });

    // Also update correct/incorrect counts
    wordMasteryRepository.upsertFromAnswer(
      userId,
      existing.word,
      isCorrect,
      existing.wordlist_id ?? undefined,
    );

    return {
      nextReviewAt,
      newInterval,
      newEaseFactor: Math.round(newEase * 100) / 100,
      masteryLevel,
    };
  },

  /**
   * Initialize SRS tracking for a word (used when flashcard encounters untracked word)
   */
  initializeWord(
    userId: number,
    word: string,
    wordlistId?: number,
  ): WordMasteryRow {
    const existing = wordMasteryRepository.findByUserAndWord(userId, word);
    if (existing) return existing;

    // Create a new record via upsert with a neutral answer
    wordMasteryRepository.upsertFromAnswer(userId, word, true, wordlistId);

    const created = wordMasteryRepository.findByUserAndWord(userId, word);
    if (!created) throw new Error('Failed to initialize word mastery');
    return created;
  },
};
