import { baseApi } from './baseApi';

export interface SrsReviewItem {
  id: number;
  word: string;
  wordlistId: number | null;
  definitions: string[];
  synonyms: string[];
  exampleSentences: string[];
  masteryLevel: number;
  srsIntervalDays: number;
  correctCount: number;
  incorrectCount: number;
}

export interface SrsReviewResult {
  success: boolean;
  nextReviewAt: string;
  newInterval: number;
  newEaseFactor: number;
  masteryLevel: number;
}

export const srsApi = {
  async getReviewQueue(limit = 20): Promise<{ items: SrsReviewItem[] }> {
    return baseApi.fetchWithAuth(`/srs/review-queue?limit=${limit}`);
  },

  async submitReview(wordMasteryId: number, quality: number): Promise<SrsReviewResult> {
    return baseApi.fetchWithAuth('/srs/review', {
      method: 'POST',
      body: JSON.stringify({ wordMasteryId, quality }),
    });
  },

  async getReviewCount(): Promise<{ count: number }> {
    return baseApi.fetchWithAuth('/srs/count');
  },
};
