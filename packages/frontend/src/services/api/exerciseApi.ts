import { baseApi } from './baseApi';

export interface SentenceBuildExercise {
  word: string;
  sentence: string;
  tokens: string[];
}

export const exerciseApi = {
  async getSentenceBuild(wordlistId: number, limit = 10): Promise<{ exercises: SentenceBuildExercise[] }> {
    return baseApi.fetchWithAuth(`/exercises/sentence-build?wordlistId=${wordlistId}&limit=${limit}`);
  },
};
