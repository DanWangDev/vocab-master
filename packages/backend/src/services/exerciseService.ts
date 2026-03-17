import { db } from '../config/database.js';
import type { WordlistWordRow } from '../types/index.js';

export interface SentenceBuildExercise {
  word: string;
  sentence: string;
  tokens: string[];
}

function shuffleArray<T>(arr: readonly T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export const exerciseService = {
  getSentenceBuildExercises(wordlistId: number, limit = 10): SentenceBuildExercise[] {
    const rows = db.prepare(`
      SELECT * FROM wordlist_words
      WHERE wordlist_id = ? AND example_sentences != '[]' AND example_sentences != ''
      ORDER BY RANDOM()
      LIMIT ?
    `).all(wordlistId, limit * 2) as WordlistWordRow[];

    const exercises: SentenceBuildExercise[] = [];

    for (const row of rows) {
      if (exercises.length >= limit) break;

      let sentences: string[];
      try {
        sentences = JSON.parse(row.example_sentences);
      } catch {
        continue;
      }

      if (!Array.isArray(sentences) || sentences.length === 0) continue;

      const sentence = sentences[Math.floor(Math.random() * sentences.length)];
      if (!sentence || sentence.trim().length === 0) continue;

      // Tokenize: split on whitespace, preserve punctuation attached to words
      const tokens = sentence.split(/\s+/).filter(t => t.length > 0);
      if (tokens.length < 3) continue; // Too short to be interesting

      exercises.push({
        word: row.target_word,
        sentence,
        tokens: shuffleArray(tokens),
      });
    }

    return exercises;
  },
};
