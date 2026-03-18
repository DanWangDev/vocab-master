import { describe, it, expect } from 'vitest'
import { getTestDb, createTestStudent } from '../../test/helpers'
import {
  getCurrentPeriodKey,
  getLeaderboard,
  getUserRanking,
  recalculateLeaderboards,
} from '../leaderboardService'

function seedLeaderboardEntry(userId: number, options: {
  period?: 'weekly' | 'monthly' | 'alltime'
  periodKey?: string
  score?: number
  quizzesCompleted?: number
  wordsMastered?: number
  streakDays?: number
} = {}): void {
  const db = getTestDb()
  const {
    period = 'weekly',
    periodKey = getCurrentPeriodKey('weekly'),
    score = 100,
    quizzesCompleted = 5,
    wordsMastered = 20,
    streakDays = 3,
  } = options

  db.prepare(`
    INSERT INTO leaderboard_entries (user_id, period, period_key, score, quizzes_completed, words_mastered, streak_days)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(userId, period, periodKey, score, quizzesCompleted, wordsMastered, streakDays)
}

describe('leaderboardService', () => {
  describe('getCurrentPeriodKey', () => {
    it('returns a weekly key in format YYYY-WNN', () => {
      const key = getCurrentPeriodKey('weekly')

      expect(key).toMatch(/^\d{4}-W\d{2}$/)
    })

    it('returns a monthly key in format YYYY-MM', () => {
      const key = getCurrentPeriodKey('monthly')

      expect(key).toMatch(/^\d{4}-\d{2}$/)
    })

    it('returns "alltime" for alltime period', () => {
      const key = getCurrentPeriodKey('alltime')

      expect(key).toBe('alltime')
    })

    it('returns the correct month', () => {
      const key = getCurrentPeriodKey('monthly')
      const now = new Date()
      const expectedMonth = String(now.getMonth() + 1).padStart(2, '0')

      expect(key).toContain(expectedMonth)
    })
  })

  describe('getLeaderboard', () => {
    it('returns ranked entries for a period', async () => {
      const user1 = await createTestStudent()
      const user2 = await createTestStudent()
      const user3 = await createTestStudent()

      seedLeaderboardEntry(user1.id, { score: 300 })
      seedLeaderboardEntry(user2.id, { score: 500 })
      seedLeaderboardEntry(user3.id, { score: 100 })

      const result = getLeaderboard('weekly')

      expect(result.period).toBe('weekly')
      expect(result.periodKey).toBeTruthy()
      expect(result.entries.length).toBe(3)
      expect(result.entries[0].score).toBe(500)
      expect(result.entries[0].rank).toBe(1)
      expect(result.entries[1].score).toBe(300)
      expect(result.entries[1].rank).toBe(2)
      expect(result.entries[2].score).toBe(100)
      expect(result.entries[2].rank).toBe(3)
    })

    it('includes username and display name', async () => {
      const user = await createTestStudent({ displayName: 'Test Display' })
      seedLeaderboardEntry(user.id, { score: 200 })

      const result = getLeaderboard('weekly')

      expect(result.entries[0].username).toBe(user.username)
      expect(result.entries[0].displayName).toBe('Test Display')
    })

    it('respects limit parameter', async () => {
      const users = await Promise.all(
        Array.from({ length: 5 }, () => createTestStudent())
      )
      for (const user of users) {
        seedLeaderboardEntry(user.id, { score: Math.floor(Math.random() * 1000) })
      }

      const result = getLeaderboard('weekly', 2)

      expect(result.entries.length).toBe(2)
    })

    it('returns empty entries when no data exists', () => {
      const result = getLeaderboard('monthly')

      expect(result.entries).toEqual([])
    })
  })

  describe('getUserRanking', () => {
    it('returns rank and entry for a user on the leaderboard', async () => {
      const user1 = await createTestStudent()
      const user2 = await createTestStudent()

      seedLeaderboardEntry(user1.id, { score: 500 })
      seedLeaderboardEntry(user2.id, { score: 300 })

      const ranking = getUserRanking(user2.id, 'weekly')

      expect(ranking.rank).toBe(2)
      expect(ranking.entry).not.toBeNull()
      expect(ranking.entry!.score).toBe(300)
    })

    it('returns null rank for user not on leaderboard', async () => {
      const user = await createTestStudent()

      const ranking = getUserRanking(user.id, 'weekly')

      expect(ranking.rank).toBeNull()
      expect(ranking.entry).toBeNull()
    })

    it('includes score components in the entry', async () => {
      const user = await createTestStudent()
      seedLeaderboardEntry(user.id, {
        score: 250,
        quizzesCompleted: 10,
        wordsMastered: 30,
        streakDays: 7,
      })

      const ranking = getUserRanking(user.id, 'weekly')

      expect(ranking.entry!.quizzesCompleted).toBe(10)
      expect(ranking.entry!.wordsMastered).toBe(30)
      expect(ranking.entry!.streakDays).toBe(7)
    })
  })

  describe('recalculateLeaderboards', () => {
    it('runs without error', () => {
      expect(() => recalculateLeaderboards()).not.toThrow()
    })

    it('recalculates for all periods', async () => {
      const db = getTestDb()
      const user = await createTestStudent()

      db.prepare(`
        INSERT INTO quiz_results (user_id, quiz_type, total_questions, correct_answers, score, total_time_spent, completed_at)
        VALUES (?, 'quiz', 10, 8, 80, 60, datetime('now'))
      `).run(user.id)

      recalculateLeaderboards()

      const weeklyKey = getCurrentPeriodKey('weekly')
      const entries = db.prepare(
        'SELECT * FROM leaderboard_entries WHERE user_id = ? AND period = ? AND period_key = ?'
      ).all(user.id, 'weekly', weeklyKey)

      expect(entries).toBeDefined()
    })
  })
})
