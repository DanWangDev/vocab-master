import { describe, it, expect } from 'vitest'
import { getTestDb, createTestStudent } from '../../test/helpers'
import { srsService } from '../srsService'

function seedWordMastery(userId: number, word: string, options: {
  intervalDays?: number
  easeFactor?: number
  useSqlitePastDue?: boolean
  useSqliteFutureDue?: boolean
  wordlistId?: number
} = {}): number {
  const db = getTestDb()
  const {
    intervalDays = 1.0,
    easeFactor = 2.5,
    useSqlitePastDue = true,
    useSqliteFutureDue = false,
    wordlistId = null,
  } = options

  if (useSqliteFutureDue) {
    const result = db.prepare(`
      INSERT INTO word_mastery (user_id, word, wordlist_id, correct_count, incorrect_count, mastery_level, next_review_at, srs_interval_days, srs_ease_factor)
      VALUES (?, ?, ?, 1, 0, 0, datetime('now', '+1 day'), ?, ?)
    `).run(userId, word, wordlistId, intervalDays, easeFactor)
    return result.lastInsertRowid as number
  }

  // Default: past due using SQLite datetime format
  const result = db.prepare(`
    INSERT INTO word_mastery (user_id, word, wordlist_id, correct_count, incorrect_count, mastery_level, next_review_at, srs_interval_days, srs_ease_factor)
    VALUES (?, ?, ?, 1, 0, 0, datetime('now', '-1 hour'), ?, ?)
  `).run(userId, word, wordlistId, intervalDays, easeFactor)

  return result.lastInsertRowid as number
}

describe('srsService', () => {
  describe('processReview', () => {
    it('increases interval on correct answer (quality >= 3)', async () => {
      const student = await createTestStudent()
      const masteryId = seedWordMastery(student.id, 'testword', { intervalDays: 1.0 })

      const result = srsService.processReview(student.id, masteryId, 4)

      // First correct review: interval 1 -> 6
      expect(result.newInterval).toBe(6)
      expect(result.masteryLevel).toBeGreaterThanOrEqual(1)
      expect(result.nextReviewAt).toBeTruthy()
    })

    it('resets interval to 1 on incorrect answer (quality < 3)', async () => {
      const student = await createTestStudent()
      const masteryId = seedWordMastery(student.id, 'hardword', { intervalDays: 6.0 })

      const result = srsService.processReview(student.id, masteryId, 1)

      expect(result.newInterval).toBe(1)
    })

    it('increases ease factor on high quality answer', async () => {
      const student = await createTestStudent()
      const initialEase = 2.5
      const masteryId = seedWordMastery(student.id, 'easyword', {
        intervalDays: 1.0,
        easeFactor: initialEase,
      })

      const result = srsService.processReview(student.id, masteryId, 5)

      expect(result.newEaseFactor).toBeGreaterThan(initialEase)
    })

    it('decreases ease factor on incorrect answer but not below 1.3', async () => {
      const student = await createTestStudent()
      const masteryId = seedWordMastery(student.id, 'toughword', {
        intervalDays: 6.0,
        easeFactor: 1.4,
      })

      const result = srsService.processReview(student.id, masteryId, 1)

      expect(result.newEaseFactor).toBeGreaterThanOrEqual(1.3)
    })

    it('sets mastery level based on interval', async () => {
      const student = await createTestStudent()
      const masteryId = seedWordMastery(student.id, 'masterword', {
        intervalDays: 10.0,
        easeFactor: 2.5,
      })

      const result = srsService.processReview(student.id, masteryId, 4)

      // interval 10 * ease ~2.5 = 25 => mastery level 3 (mastered)
      expect(result.masteryLevel).toBe(3)
    })

    it('throws for non-existent word mastery record', async () => {
      const student = await createTestStudent()

      expect(() => srsService.processReview(student.id, 99999, 4))
        .toThrow('Word mastery record not found')
    })

    it('interval goes from 0 to 1 on first correct review', async () => {
      const student = await createTestStudent()
      const masteryId = seedWordMastery(student.id, 'newword', { intervalDays: 0.5 })

      const result = srsService.processReview(student.id, masteryId, 3)

      expect(result.newInterval).toBe(1)
    })

    it('interval goes from 1 to 6 on second correct review', async () => {
      const student = await createTestStudent()
      const masteryId = seedWordMastery(student.id, 'secondword', { intervalDays: 1.0 })

      const result = srsService.processReview(student.id, masteryId, 3)

      expect(result.newInterval).toBe(6)
    })

    it('multiplies interval by ease factor after interval >= 6', async () => {
      const student = await createTestStudent()
      const easeFactor = 2.5
      const masteryId = seedWordMastery(student.id, 'growword', {
        intervalDays: 6.0,
        easeFactor,
      })

      const result = srsService.processReview(student.id, masteryId, 4)

      expect(result.newInterval).toBeGreaterThan(6)
    })
  })

  describe('getReviewQueue', () => {
    it('returns words due for review', async () => {
      const student = await createTestStudent()
      seedWordMastery(student.id, 'dueword')

      const queue = srsService.getReviewQueue(student.id)

      expect(queue.length).toBe(1)
      expect(queue[0].word).toBe('dueword')
    })

    it('does not return words not yet due', async () => {
      const student = await createTestStudent()
      seedWordMastery(student.id, 'futureword', { useSqliteFutureDue: true })

      const queue = srsService.getReviewQueue(student.id)

      expect(queue.length).toBe(0)
    })

    it('respects limit parameter', async () => {
      const student = await createTestStudent()

      seedWordMastery(student.id, 'word1')
      seedWordMastery(student.id, 'word2')
      seedWordMastery(student.id, 'word3')

      const queue = srsService.getReviewQueue(student.id, 2)

      expect(queue.length).toBe(2)
    })
  })

  describe('getReviewCount', () => {
    it('returns the count of words due for review', async () => {
      const student = await createTestStudent()

      seedWordMastery(student.id, 'count1')
      seedWordMastery(student.id, 'count2')

      const count = srsService.getReviewCount(student.id)

      expect(count).toBe(2)
    })

    it('returns 0 when no words are due', async () => {
      const student = await createTestStudent()

      const count = srsService.getReviewCount(student.id)

      expect(count).toBe(0)
    })
  })

  describe('initializeWord', () => {
    it('creates a new word mastery record', async () => {
      const student = await createTestStudent()

      const record = srsService.initializeWord(student.id, 'brandnew')

      expect(record.word).toBe('brandnew')
      expect(record.user_id).toBe(student.id)
      expect(record.srs_ease_factor).toBe(2.5)
    })

    it('returns existing record if word already tracked', async () => {
      const student = await createTestStudent()
      seedWordMastery(student.id, 'existing')

      const record = srsService.initializeWord(student.id, 'existing')

      expect(record.word).toBe('existing')
    })
  })
})
