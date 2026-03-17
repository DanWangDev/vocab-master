export interface Wordlist {
  id: number;
  name: string;
  description: string;
  isSystem: boolean;
  createdBy: number | null;
  visibility: 'system' | 'private' | 'shared';
  wordCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface WordlistWord {
  id: number;
  wordlistId: number;
  targetWord: string;
  definitions: string[];
  synonyms: string[];
  exampleSentences: string[];
  sortOrder: number;
}

export interface ImportResult {
  wordlistId: number;
  wordsImported: number;
  errors?: Array<{ row: number; reason: string }>;
}

export interface CreateWordlistRequest {
  name: string;
  description?: string;
  visibility?: 'private' | 'shared';
  words: Array<{
    targetWord: string;
    definitions: string[];
    synonyms?: string[];
    exampleSentences?: string[];
  }>;
}
