import { describe, it, expect } from 'vitest'
import { getComputedStats } from '../computedStatsService'
import {
  createTestStudent,
  seedQuizResults,
  seedStudySessions,
  seedDailyChallenges,
  seedUserVocabulary
} from '../../test/helpers'

describe('computedStatsService', () => {
  describe('getComputedStats', () => {
    it('returns zero stats for a user with no activity', async () => {
      const student = await createTestStudent()

      const stats = getComputedStats(student.id)

      expect(stats.totalWordsStudied).toBe(0)
      expect(stats.quizzesTaken).toBe(0)
      expect(stats.challengesCompleted).toBe(0)
      expect(stats.bestChallengeScore).toBe(0)
      expect(stats.lastStudyDate).toBeNull()
    })

    it('counts only quiz-type results for quizzesTaken', async () => {
      const student = await createTestStudent()

      seedQuizResults(student.id, [
        { totalQuestions: 10, correctAnswers: 8, quizType: 'quiz' },
        { totalQuestions: 10, correctAnswers: 7, quizType: 'quiz' },
        { totalQuestions: 10, correctAnswers: 9, quizType: 'challenge' }
      ])

      const stats = getComputedStats(student.id)

      // Only 'quiz' type, not 'challenge'
      expect(stats.quizzesTaken).toBe(2)
    })

    it('counts distinct words from user_vocabulary', async () => {
      const student = await createTestStudent()

      seedUserVocabulary(student.id, ['apple', 'banana', 'cherry', 'apple'])

      const stats = getComputedStats(student.id)

      // 'apple' is duplicated but should only count once (INSERT OR IGNORE)
      expect(stats.totalWordsStudied).toBe(3)
    })

    it('counts daily challenges completed', async () => {
      const student = await createTestStudent()

      seedDailyChallenges(student.id, [
        { score: 80, challengeDate: '2026-03-01' },
        { score: 95, challengeDate: '2026-03-02' },
        { score: 70, challengeDate: '2026-03-03' }
      ])

      const stats = getComputedStats(student.id)

      expect(stats.challengesCompleted).toBe(3)
      expect(stats.bestChallengeScore).toBe(95)
    })

    it('returns the best challenge score', async () => {
      const student = await createTestStudent()

      seedDailyChallenges(student.id, [
        { score: 50, challengeDate: '2026-03-01' },
        { score: 100, challengeDate: '2026-03-02' },
        { score: 75, challengeDate: '2026-03-03' }
      ])

      const stats = getComputedStats(student.id)

      expect(stats.bestChallengeScore).toBe(100)
    })

    it('returns the most recent activity date as lastStudyDate', async () => {
      const student = await createTestStudent()

      const olderDate = '2026-03-01T10:00:00.000Z'
      const newerDate = '2026-03-08T14:00:00.000Z'

      seedStudySessions(student.id, [
        { wordsReviewed: 5, startTime: olderDate, endTime: '2026-03-01T10:30:00.000Z' }
      ])

      seedQuizResults(student.id, [
        { totalQuestions: 10, correctAnswers: 8, completedAt: newerDate }
      ])

      const stats = getComputedStats(student.id)

      expect(stats.lastStudyDate).not.toBeNull()
      // The most recent date should be from the quiz result
      expect(new Date(stats.lastStudyDate!).getTime())
        .toBeGreaterThanOrEqual(new Date(olderDate).getTime())
    })

    it('computes stats for a user with mixed activity', async () => {
      const student = await createTestStudent()

      seedUserVocabulary(student.id, ['word1', 'word2', 'word3', 'word4', 'word5'])

      seedQuizResults(student.id, [
        { totalQuestions: 10, correctAnswers: 8, quizType: 'quiz' },
        { totalQuestions: 10, correctAnswers: 9, quizType: 'quiz' },
        { totalQuestions: 5, correctAnswers: 5, quizType: 'challenge' }
      ])

      seedDailyChallenges(student.id, [
        { score: 85, challengeDate: '2026-03-05' },
        { score: 92, challengeDate: '2026-03-06' }
      ])

      seedStudySessions(student.id, [
        { wordsReviewed: 20 }
      ])

      const stats = getComputedStats(student.id)

      expect(stats.totalWordsStudied).toBe(5)
      expect(stats.quizzesTaken).toBe(2) // Only 'quiz' type
      expect(stats.challengesCompleted).toBe(2)
      expect(stats.bestChallengeScore).toBe(92)
      expect(stats.lastStudyDate).not.toBeNull()
    })

    it('returns zero best challenge score with no challenges', async () => {
      const student = await createTestStudent()

      const stats = getComputedStats(student.id)

      expect(stats.bestChallengeScore).toBe(0)
    })

    it('handles user with only study sessions', async () => {
      const student = await createTestStudent()

      seedStudySessions(student.id, [
        { wordsReviewed: 10, startTime: '2026-03-09T10:00:00.000Z', endTime: '2026-03-09T10:30:00.000Z' }
      ])

      const stats = getComputedStats(student.id)

      expect(stats.quizzesTaken).toBe(0)
      expect(stats.challengesCompleted).toBe(0)
      expect(stats.lastStudyDate).not.toBeNull()
    })
  })
})
