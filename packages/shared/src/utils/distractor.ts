import type { VocabularyWord } from '../types';
import { shuffleArray } from './shuffle';

interface DistractorConfig {
  targetWord: string;
  allWords: VocabularyWord[];
  count: number;  // Number of distractors needed (3 for MCQ)
}

/**
 * Smart distractor algorithm for generating MCQ wrong options
 * Priority 1: Words starting with the same letter
 * Priority 2: Words with similar length (+/- 2 chars)
 * Fallback: Random selection
 */
export function generateDistractors(config: DistractorConfig): string[] {
  const { targetWord, allWords, count } = config;

  // Filter out the target word
  const candidates = allWords.filter(w => w.targetWord !== targetWord);

  if (candidates.length < count) {
    return candidates.map(w => w.targetWord);
  }

  const targetLength = targetWord.length;
  const targetFirstChar = targetWord[0].toLowerCase();

  const distractors: Set<string> = new Set();

  // Priority 1: Same first letter
  const sameLetterCandidates = shuffleArray(
    candidates.filter(w => w.targetWord[0].toLowerCase() === targetFirstChar)
  );

  for (const word of sameLetterCandidates) {
    if (distractors.size >= count) break;
    distractors.add(word.targetWord);
  }

  // Priority 2: Similar length (+/- 2 characters)
  if (distractors.size < count) {
    const similarLengthCandidates = shuffleArray(
      candidates.filter(w =>
        Math.abs(w.targetWord.length - targetLength) <= 2 &&
        !distractors.has(w.targetWord)
      )
    );

    for (const word of similarLengthCandidates) {
      if (distractors.size >= count) break;
      distractors.add(word.targetWord);
    }
  }

  // Fallback: Random selection
  if (distractors.size < count) {
    const remainingCandidates = shuffleArray(
      candidates.filter(w => !distractors.has(w.targetWord))
    );

    for (const word of remainingCandidates) {
      if (distractors.size >= count) break;
      distractors.add(word.targetWord);
    }
  }

  return Array.from(distractors).slice(0, count);
}
