import { db } from '../config/database.js';
import { exerciseResultRepository } from '../repositories/index.js';
import { wordMasteryService } from './wordMasteryService.js';
import { checkAndAwardAchievements } from './achievementService.js';
import type { WordlistWordRow } from '../types/index.js';

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

/**
 * Generate a partial-reveal hint for a word.
 * Always shows first and last letter; reveals ~30% of middle letters.
 * e.g., "exemplary" → "e_e__l_ry"
 */
function generateWordHint(word: string): string {
  if (word.length <= 2) return word;
  if (word.length === 3) return `${word[0]}_${word[2]}`;

  const chars = [...word];
  const middle = chars.slice(1, -1);
  const revealCount = Math.max(1, Math.floor(middle.length * 0.3));

  // Pick random indices to reveal
  const indices = Array.from({ length: middle.length }, (_, i) => i);
  const shuffled = shuffleArray(indices);
  const revealSet = new Set(shuffled.slice(0, revealCount));

  const hinted = middle.map((ch, i) =>
    revealSet.has(i) ? ch : '_'
  );

  return `${chars[0]}${hinted.join('')}${chars[chars.length - 1]}`;
}

export interface ExerciseSubmission {
  exerciseType: 'sentence_build' | 'spelling';
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

function shuffleArray<T>(arr: readonly T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function resolveWordlistId(wordlistId: number | undefined, userId: number): number {
  if (wordlistId && wordlistId > 0) return wordlistId;

  // Fallback: use user's active wordlist
  const row = db.prepare(
    'SELECT wordlist_id FROM user_active_wordlist WHERE user_id = ?'
  ).get(userId) as { wordlist_id: number } | undefined;

  if (row) return row.wordlist_id;

  // Final fallback: first system wordlist
  const system = db.prepare(
    "SELECT id FROM wordlists WHERE is_system = 1 ORDER BY id LIMIT 1"
  ).get() as { id: number } | undefined;

  if (system) return system.id;

  throw new Error('No wordlist available');
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

  resolveWordlistId,

  getSpellingExercises(wordlistId: number, mode: 'definition' | 'fill_blank', limit = 10): SpellingExercise[] {
    const filterClause = mode === 'fill_blank'
      ? "AND example_sentences != '[]' AND example_sentences != ''"
      : "AND definitions != '[]' AND definitions != ''";

    const rows = db.prepare(`
      SELECT * FROM wordlist_words
      WHERE wordlist_id = ? ${filterClause}
      ORDER BY RANDOM()
      LIMIT ?
    `).all(wordlistId, limit * 2) as WordlistWordRow[];

    const exercises: SpellingExercise[] = [];

    for (const row of rows) {
      if (exercises.length >= limit) break;

      // Parse definition
      let definition = '';
      try {
        const defs = JSON.parse(row.definitions) as string[];
        definition = defs[0] || '';
      } catch {
        definition = row.definitions || '';
      }

      if (!definition) continue;

      if (mode === 'fill_blank') {
        let sentences: string[];
        try {
          sentences = JSON.parse(row.example_sentences);
        } catch {
          continue;
        }

        if (!Array.isArray(sentences) || sentences.length === 0) continue;

        const sentence = sentences[Math.floor(Math.random() * sentences.length)];
        if (!sentence) continue;

        // Create blanked sentence by replacing the target word with underscores
        const wordRegex = new RegExp(`\\b${row.target_word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
        const blankedSentence = sentence.replace(wordRegex, '____');

        // Only use if the word was actually found in the sentence
        if (blankedSentence === sentence) continue;

        exercises.push({
          word: row.target_word,
          definition,
          sentence,
          blankedSentence,
          hint: generateWordHint(row.target_word),
        });
      } else {
        exercises.push({
          word: row.target_word,
          definition,
        });
      }
    }

    return exercises;
  },

  submitResult(userId: number, submission: ExerciseSubmission) {
    const resultId = exerciseResultRepository.create({
      userId,
      exerciseType: submission.exerciseType,
      wordlistId: submission.wordlistId,
      totalQuestions: submission.totalQuestions,
      correctAnswers: submission.correctAnswers,
      score: submission.score,
      totalTimeSpent: submission.totalTimeSpent,
      answers: submission.answers,
    });

    // Update word mastery
    wordMasteryService.recordQuizAnswers(
      userId,
      submission.answers.map(a => ({ word: a.word, isCorrect: a.isCorrect })),
      submission.wordlistId ?? undefined
    );

    // Check achievements
    const newlyEarned = checkAndAwardAchievements(userId, {
      quizScore: submission.score,
    });

    return { resultId, newlyEarned };
  },
};
