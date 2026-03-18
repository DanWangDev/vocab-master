import { describe, it, expect } from 'vitest'
import { getTestDb } from '../../test/helpers'
import { exerciseService } from '../exerciseService'

function seedWordlistWithSentences(words: Array<{
  word: string
  sentences: string[]
}>): number {
  const db = getTestDb()
  const result = db.prepare(`
    INSERT INTO wordlists (name, description, is_system, visibility, word_count)
    VALUES ('Exercise Test List', 'Test', 0, 'public', ?)
  `).run(words.length)

  const wordlistId = result.lastInsertRowid as number

  for (let i = 0; i < words.length; i++) {
    db.prepare(`
      INSERT INTO wordlist_words (wordlist_id, target_word, definitions, synonyms, example_sentences, sort_order)
      VALUES (?, ?, '["test definition"]', '[]', ?, ?)
    `).run(wordlistId, words[i].word, JSON.stringify(words[i].sentences), i)
  }

  return wordlistId
}

describe('exerciseService', () => {
  describe('getSentenceBuildExercises', () => {
    it('returns exercises from words with example sentences', () => {
      const wordlistId = seedWordlistWithSentences([
        { word: 'happy', sentences: ['I am very happy today'] },
        { word: 'brave', sentences: ['The brave knight fought the dragon'] },
        { word: 'clever', sentences: ['She is a clever student in class'] },
      ])

      const exercises = exerciseService.getSentenceBuildExercises(wordlistId, 3)

      expect(exercises.length).toBeGreaterThanOrEqual(1)
      for (const exercise of exercises) {
        expect(exercise.word).toBeTruthy()
        expect(exercise.sentence).toBeTruthy()
        expect(exercise.tokens.length).toBeGreaterThanOrEqual(3)
      }
    })

    it('skips words with empty example sentences', () => {
      const wordlistId = seedWordlistWithSentences([
        { word: 'empty', sentences: [] },
        { word: 'filled', sentences: ['This word has a long example sentence here'] },
      ])

      const exercises = exerciseService.getSentenceBuildExercises(wordlistId, 10)

      expect(exercises.length).toBe(1)
      expect(exercises[0].word).toBe('filled')
    })

    it('returns shuffled tokens', () => {
      const wordlistId = seedWordlistWithSentences([
        { word: 'test', sentences: ['The quick brown fox jumps over the lazy dog'] },
      ])

      const exercises = exerciseService.getSentenceBuildExercises(wordlistId, 1)

      expect(exercises.length).toBe(1)
      expect(exercises[0].tokens.length).toBe(9)
    })

    it('respects limit parameter', () => {
      const words = Array.from({ length: 10 }, (_, i) => ({
        word: `word${i}`,
        sentences: [`This is a valid example sentence number ${i}`],
      }))
      const wordlistId = seedWordlistWithSentences(words)

      const exercises = exerciseService.getSentenceBuildExercises(wordlistId, 3)

      expect(exercises.length).toBeLessThanOrEqual(3)
    })

    it('returns empty array for wordlist with no sentences', () => {
      const db = getTestDb()
      const result = db.prepare(`
        INSERT INTO wordlists (name, description, is_system, visibility, word_count)
        VALUES ('Empty List', 'No sentences', 0, 'public', 2)
      `).run()
      const wordlistId = result.lastInsertRowid as number

      db.prepare(`
        INSERT INTO wordlist_words (wordlist_id, target_word, definitions, synonyms, example_sentences, sort_order)
        VALUES (?, 'nosentence', '["def"]', '[]', '[]', 0)
      `).run(wordlistId)

      const exercises = exerciseService.getSentenceBuildExercises(wordlistId, 5)

      expect(exercises).toEqual([])
    })

    it('skips sentences with fewer than 3 tokens', () => {
      const wordlistId = seedWordlistWithSentences([
        { word: 'short', sentences: ['Hi there'] },
        { word: 'long', sentences: ['This sentence has enough words to qualify'] },
      ])

      const exercises = exerciseService.getSentenceBuildExercises(wordlistId, 10)

      const words = exercises.map(e => e.word)
      expect(words).not.toContain('short')
    })
  })
})
