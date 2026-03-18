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

  async submitReview(
    wordMasteryId: number,
    quality: number,
    options?: { word?: string; wordlistId?: number | null },
  ): Promise<SrsReviewResult> {
    const body: Record<string, unknown> = { wordMasteryId, quality };
    if (wordMasteryId < 0 && options?.word) {
      body.word = options.word;
      if (options.wordlistId != null) {
        body.wordlistId = options.wordlistId;
      }
    }
    return baseApi.fetchWithAuth('/srs/review', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  async getReviewCount(): Promise<{ count: number }> {
    return baseApi.fetchWithAuth('/srs/count');
  },
};
