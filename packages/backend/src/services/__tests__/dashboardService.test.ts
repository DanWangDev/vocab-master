import { describe, it, expect } from 'vitest'
import { getUserDashboardStats, getUserDetailStats } from '../dashboardService'
import {
  createTestStudent,
  seedQuizResults,
  seedQuizAnswers,
  seedStudySessions,
  seedDailyChallenges,
  seedUserVocabulary
} from '../../test/helpers'

describe('dashboardService', () => {
  describe('getUserDashboardStats', () => {
    it('returns zero stats for a user with no activity', async () => {
      const student = await createTestStudent()

      const stats = getUserDashboardStats(student.id)

      expect(stats.current_streak).toBe(0)
      expect(stats.avg_accuracy).toBeNull()
      expect(stats.days_active_this_week).toBe(0)
      expect(stats.sessions_this_week).toBe(0)
      expect(stats.total_time_this_week_minutes).toBe(0)
      expect(stats.activity_status).toBe('inactive')
      expect(stats.quizzes_taken).toBe(0)
      expect(stats.total_words_studied).toBe(0)
    })

    it('returns correct quiz count and accuracy', async () => {
      const student = await createTestStudent()

      seedQuizResults(student.id, [
        { totalQuestions: 10, correctAnswers: 8, completedAt: new Date().toISOString() },
        { totalQuestions: 10, correctAnswers: 6, completedAt: new Date().toISOString() }
      ])

      const stats = getUserDashboardStats(student.id)

      expect(stats.quizzes_taken).toBe(2)
      // Average accuracy: (80 + 60) / 2 = 70
      expect(stats.avg_accuracy).toBe(70)
    })

    it('returns correct total words studied from study sessions', async () => {
      const student = await createTestStudent()

      seedStudySessions(student.id, [
        { wordsReviewed: 15 },
        { wordsReviewed: 25 }
      ])

      const stats = getUserDashboardStats(student.id)

      expect(stats.total_words_studied).toBe(40)
    })

    it('returns active status when user had recent activity', async () => {
      const student = await createTestStudent()

      // Activity within last 48 hours => 'active'
      seedQuizResults(student.id, [
        { totalQuestions: 5, correctAnswers: 5, completedAt: new Date().toISOString() }
      ])

      const stats = getUserDashboardStats(student.id)

      expect(stats.activity_status).toBe('active')
    })

    it('returns inactive status when user has no activity', async () => {
      const student = await createTestStudent()

      const stats = getUserDashboardStats(student.id)

      expect(stats.activity_status).toBe('inactive')
    })

    it('counts sessions this week including both quiz and study sessions', async () => {
      const student = await createTestStudent()
      const now = new Date()

      seedQuizResults(student.id, [
        { totalQuestions: 10, correctAnswers: 8, completedAt: now.toISOString() }
      ])

      seedStudySessions(student.id, [
        { wordsReviewed: 10, startTime: now.toISOString(), endTime: new Date(now.getTime() + 600000).toISOString() }
      ])

      const stats = getUserDashboardStats(student.id)

      // sessions_this_week = quizzes + study sessions
      expect(stats.sessions_this_week).toBeGreaterThanOrEqual(2)
    })

    it('calculates streak correctly for consecutive days', async () => {
      const student = await createTestStudent()

      const today = new Date()
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)
      const twoDaysAgo = new Date(today)
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)

      seedQuizResults(student.id, [
        { totalQuestions: 5, correctAnswers: 5, completedAt: today.toISOString() },
        { totalQuestions: 5, correctAnswers: 5, completedAt: yesterday.toISOString() },
        { totalQuestions: 5, correctAnswers: 5, completedAt: twoDaysAgo.toISOString() }
      ])

      const stats = getUserDashboardStats(student.id)

      expect(stats.current_streak).toBeGreaterThanOrEqual(3)
    })

    it('breaks streak when there is a gap', async () => {
      const student = await createTestStudent()

      const today = new Date()
      const threeDaysAgo = new Date(today)
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)

      seedQuizResults(student.id, [
        { totalQuestions: 5, correctAnswers: 5, completedAt: today.toISOString() },
        { totalQuestions: 5, correctAnswers: 5, completedAt: threeDaysAgo.toISOString() }
      ])

      const stats = getUserDashboardStats(student.id)

      // Gap of more than 1 day => streak should be 1 (only today)
      expect(stats.current_streak).toBe(1)
    })
  })

  describe('getUserDetailStats', () => {
    it('returns empty arrays for user with no activity', async () => {
      const student = await createTestStudent()

      const details = getUserDetailStats(student.id)

      expect(details.quizHistory).toEqual([])
      expect(details.studyHistory).toEqual([])
      expect(details.weakWords).toEqual([])
      expect(details.summary.days_active_this_week).toBe(0)
      expect(details.summary.avg_accuracy).toBeNull()
    })

    it('returns quiz history in descending order', async () => {
      const student = await createTestStudent()

      const earlier = new Date(Date.now() - 3600000).toISOString()
      const later = new Date().toISOString()

      seedQuizResults(student.id, [
        { totalQuestions: 10, correctAnswers: 7, completedAt: earlier },
        { totalQuestions: 10, correctAnswers: 9, completedAt: later }
      ])

      const details = getUserDetailStats(student.id)

      expect(details.quizHistory).toHaveLength(2)
      // Most recent first
      expect(new Date(details.quizHistory[0].completed_at).getTime())
        .toBeGreaterThanOrEqual(new Date(details.quizHistory[1].completed_at).getTime())
    })

    it('identifies weak words based on incorrect answer ratio', async () => {
      const student = await createTestStudent()

      // Create quiz results first
      const quizIds = seedQuizResults(student.id, [
        { totalQuestions: 5, correctAnswers: 3, completedAt: new Date().toISOString() },
        { totalQuestions: 5, correctAnswers: 3, completedAt: new Date().toISOString() }
      ])

      // Seed answers: "hard_word" is wrong most of the time (>40% error rate, 2+ attempts)
      seedQuizAnswers(quizIds[0], [
        { word: 'easy_word', isCorrect: true },
        { word: 'hard_word', isCorrect: false },
        { word: 'medium_word', isCorrect: true }
      ])

      seedQuizAnswers(quizIds[1], [
        { word: 'easy_word', isCorrect: true },
        { word: 'hard_word', isCorrect: false },
        { word: 'medium_word', isCorrect: false }
      ])

      const details = getUserDetailStats(student.id)

      // "hard_word" has 2 attempts, 2 incorrect => 100% error => should be a weak word
      const hardWord = details.weakWords.find(w => w.word === 'hard_word')
      expect(hardWord).toBeDefined()
      expect(hardWord!.incorrect_count).toBe(2)
      expect(hardWord!.total_attempts).toBe(2)
    })

    it('does not flag words with less than 2 attempts as weak', async () => {
      const student = await createTestStudent()

      const quizIds = seedQuizResults(student.id, [
        { totalQuestions: 1, correctAnswers: 0, completedAt: new Date().toISOString() }
      ])

      seedQuizAnswers(quizIds[0], [
        { word: 'one_attempt_word', isCorrect: false }
      ])

      const details = getUserDetailStats(student.id)

      // Only 1 attempt => should NOT be flagged as weak
      const found = details.weakWords.find(w => w.word === 'one_attempt_word')
      expect(found).toBeUndefined()
    })

    it('returns study history in descending order', async () => {
      const student = await createTestStudent()

      const earlier = new Date(Date.now() - 3600000).toISOString()
      const later = new Date().toISOString()

      seedStudySessions(student.id, [
        {
          wordsReviewed: 10,
          startTime: earlier,
          endTime: new Date(new Date(earlier).getTime() + 600000).toISOString()
        },
        {
          wordsReviewed: 20,
          startTime: later,
          endTime: new Date(new Date(later).getTime() + 600000).toISOString()
        }
      ])

      const details = getUserDetailStats(student.id)

      expect(details.studyHistory).toHaveLength(2)
      // Most recent first
      expect(new Date(details.studyHistory[0].start_time).getTime())
        .toBeGreaterThanOrEqual(new Date(details.studyHistory[1].start_time).getTime())
    })

    it('returns weekly comparison data', async () => {
      const student = await createTestStudent()

      seedQuizResults(student.id, [
        { totalQuestions: 10, correctAnswers: 8, completedAt: new Date().toISOString() }
      ])

      const details = getUserDetailStats(student.id)

      expect(details.weeklyComparison).toBeDefined()
      expect(details.weeklyComparison.this_week).toBeDefined()
      expect(details.weeklyComparison.last_week).toBeDefined()
      expect(details.weeklyComparison.this_week.quizzes).toBeGreaterThanOrEqual(1)
    })
  })
})
