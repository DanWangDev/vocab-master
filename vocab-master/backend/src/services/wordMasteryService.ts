import { wordMasteryRepository } from '../repositories/index.js';
import type { MasteryBreakdown, WordMasterySummary } from '../types/index.js';

export const wordMasteryService = {
  /**
   * Update mastery data for a word based on quiz/challenge answer
   */
  recordAnswer(userId: number, word: string, isCorrect: boolean, wordlistId?: number): void {
    wordMasteryRepository.upsertFromAnswer(userId, word, isCorrect, wordlistId);
  },

  /**
   * Batch record answers from a quiz result
   */
  recordQuizAnswers(userId: number, answers: Array<{ word: string; isCorrect: boolean }>, wordlistId?: number): void {
    for (const answer of answers) {
      wordMasteryRepository.upsertFromAnswer(userId, answer.word, answer.isCorrect, wordlistId);
    }
  },

  /**
   * Get mastery breakdown for a user
   */
  getBreakdown(userId: number): MasteryBreakdown {
    return wordMasteryRepository.getBreakdown(userId);
  },

  /**
   * Get words the user struggles with
   */
  getWeakWords(userId: number, limit?: number): WordMasterySummary[] {
    return wordMasteryRepository.getWeakWords(userId, limit);
  },

  /**
   * Get words the user has mastered
   */
  getStrongWords(userId: number, limit?: number): WordMasterySummary[] {
    return wordMasteryRepository.getStrongWords(userId, limit);
  },

  /**
   * Get learning trend data for charts
   */
  getLearningTrend(userId: number, days?: number) {
    return wordMasteryRepository.getLearningTrend(userId, days);
  },
};
