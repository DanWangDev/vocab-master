import { baseApi } from './baseApi';
import type { NewlyEarnedAchievement } from './achievementApi';

export interface SentenceBuildExercise {
  word: string;
  sentence: string;
  tokens: string[];
}

export interface SpellingExercise {
  word: string;
  definition: string;
  sentence?: string;
  blankedSentence?: string;
  hint?: string;
}

export interface ExerciseResultRequest {
  exerciseType: 'spelling' | 'sentence_build';
  wordlistId: number | null;
  totalQuestions: number;
  correctAnswers: number;
  score: number;
  totalTimeSpent: number | null;
  answers: ReadonlyArray<{
    questionIndex: number;
    word: string;
    correctAnswer: string;
    userAnswer: string | null;
    isCorrect: boolean;
    timeSpent: number | null;
  }>;
}

export const exerciseApi = {
  async getSentenceBuild(wordlistId?: number, limit = 10): Promise<{ exercises: SentenceBuildExercise[]; wordlistId: number }> {
    const params = new URLSearchParams({ limit: String(limit) });
    if (wordlistId) params.set('wordlistId', String(wordlistId));
    return baseApi.fetchWithAuth(`/exercises/sentence-build?${params.toString()}`);
  },

  async getSpelling(
    wordlistId: number | undefined,
    mode: 'definition' | 'fill_blank',
    limit = 10
  ): Promise<{ exercises: SpellingExercise[]; wordlistId: number }> {
    const params = new URLSearchParams({ mode, limit: String(limit) });
    if (wordlistId) {
      params.set('wordlistId', String(wordlistId));
    }
    return baseApi.fetchWithAuth(`/exercises/spelling?${params.toString()}`);
  },

  async submitResult(data: ExerciseResultRequest): Promise<{
    success: boolean;
    resultId: number;
    newAchievements?: NewlyEarnedAchievement[];
  }> {
    return baseApi.fetchWithAuth('/exercises/results', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};
