import type { WordlistRow, WordlistWordRow } from '../../types/index.js';

export interface IWordlistRepository {
  findAll(userId: number, role: string): WordlistRow[];
  findById(id: number): WordlistRow | undefined;
  getWords(wordlistId: number): WordlistWordRow[];
  getActiveWordlist(userId: number): WordlistRow;
  setActiveWordlist(userId: number, wordlistId: number): void;
  create(params: {
    name: string;
    description: string;
    visibility: string;
    createdBy: number;
    words: Array<{
      targetWord: string;
      definitions: string[];
      synonyms: string[];
      exampleSentences: string[];
    }>;
  }): number;
  update(id: number, params: { name?: string; description?: string }): void;
  deleteWordlist(id: number): void;
  addWords(wordlistId: number, words: Array<{
    targetWord: string;
    definitions: string[];
    synonyms: string[];
    exampleSentences: string[];
  }>): void;
  updateWord(wordId: number, data: {
    targetWord?: string;
    definitions?: string[];
    synonyms?: string[];
    exampleSentences?: string[];
  }): void;
  deleteWord(wordId: number, wordlistId: number): void;
  importWords(wordlistId: number, words: Array<{
    targetWord: string;
    definitions: string[];
    synonyms: string[];
    exampleSentences: string[];
  }>): void;
  getWordByIdAndList(wordId: number, wordlistId: number): WordlistWordRow | undefined;
}
