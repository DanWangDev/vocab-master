import type { WordMasteryRow, MasteryBreakdown, WordMasterySummary } from '../../types/index.js';

export interface SrsScheduleUpdate {
  nextReviewAt: string;
  srsIntervalDays: number;
  srsEaseFactor: number;
  masteryLevel: number;
}

export interface IWordMasteryRepository {
  upsertFromAnswer(userId: number, word: string, isCorrect: boolean, wordlistId?: number): void;
  getByUserId(userId: number): WordMasteryRow[];
  getBreakdown(userId: number): MasteryBreakdown;
  getWeakWords(userId: number, limit?: number): WordMasterySummary[];
  getStrongWords(userId: number, limit?: number): WordMasterySummary[];
  getLearningTrend(userId: number, days?: number): Array<{
    date: string;
    quizzes: number;
    accuracy: number;
    wordsStudied: number;
  }>;
  getReviewQueue(userId: number, limit: number): WordMasteryRow[];
  getReviewQueueCount(userId: number): number;
  updateSrsSchedule(id: number, data: SrsScheduleUpdate): void;
  findByUserAndWord(userId: number, word: string): WordMasteryRow | undefined;
}
