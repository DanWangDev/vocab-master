import { describe, it, expect } from 'vitest'
import { getTestDb, createTestStudent } from '../../test/helpers'
import { leaderboardRepository } from '../index.js'

describe('SqliteLeaderboardRepository', () => {
  describe('upsert', () => {
    it('inserts a new entry', async () => {
      const student = await createTestStudent()

      leaderboardRepository.upsert({
        userId: student.id,
        period: 'weekly',
        periodKey: '2026-W11',
        score: 100,
        quizzesCompleted: 5,
        wordsMastered: 20,
        streakDays: 3,
      })

      const entry = leaderboardRepository.getUserEntry(student.id, 'weekly', '2026-W11')
      expect(entry).toBeDefined()
      expect(entry!.score).toBe(100)
      expect(entry!.quizzes_completed).toBe(5)
      expect(entry!.words_mastered).toBe(20)
      expect(entry!.streak_days).toBe(3)
    })

    it('updates existing entry on conflict', async () => {
      const student = await createTestStudent()

      leaderboardRepository.upsert({
        userId: student.id,
        period: 'weekly',
        periodKey: '2026-W11',
        score: 100,
        quizzesCompleted: 5,
        wordsMastered: 20,
        streakDays: 3,
      })

      leaderboardRepository.upsert({
        userId: student.id,
        period: 'weekly',
        periodKey: '2026-W11',
        score: 200,
        quizzesCompleted: 10,
        wordsMastered: 40,
        streakDays: 7,
      })

      const entry = leaderboardRepository.getUserEntry(student.id, 'weekly', '2026-W11')
      expect(entry!.score).toBe(200)
      expect(entry!.quizzes_completed).toBe(10)
    })
  })

  describe('getUserEntry', () => {
    it('returns undefined for non-existent entry', async () => {
      const student = await createTestStudent()
      const entry = leaderboardRepository.getUserEntry(student.id, 'weekly', '2026-W11')
      expect(entry).toBeUndefined()
    })
  })

  describe('getByPeriod', () => {
    it('returns entries sorted by score DESC with user info', async () => {
      const s1 = await createTestStudent({ username: 'leader1' })
      const s2 = await createTestStudent({ username: 'leader2' })
      const s3 = await createTestStudent({ username: 'leader3' })

      leaderboardRepository.upsert({
        userId: s1.id, period: 'weekly', periodKey: '2026-W11',
        score: 50, quizzesCompleted: 2, wordsMastered: 10, streakDays: 1,
      })
      leaderboardRepository.upsert({
        userId: s2.id, period: 'weekly', periodKey: '2026-W11',
        score: 150, quizzesCompleted: 8, wordsMastered: 30, streakDays: 5,
      })
      leaderboardRepository.upsert({
        userId: s3.id, period: 'weekly', periodKey: '2026-W11',
        score: 100, quizzesCompleted: 5, wordsMastered: 20, streakDays: 3,
      })

      const entries = leaderboardRepository.getByPeriod('weekly', '2026-W11')
      expect(entries).toHaveLength(3)
      expect(entries[0].username).toBe('leader2')
      expect(entries[0].score).toBe(150)
      expect(entries[1].username).toBe('leader3')
      expect(entries[2].username).toBe('leader1')
    })

    it('respects limit parameter', async () => {
      const s1 = await createTestStudent()
      const s2 = await createTestStudent()
      const s3 = await createTestStudent()

      for (const s of [s1, s2, s3]) {
        leaderboardRepository.upsert({
          userId: s.id, period: 'monthly', periodKey: '2026-03',
          score: 100, quizzesCompleted: 5, wordsMastered: 20, streakDays: 3,
        })
      }

      const entries = leaderboardRepository.getByPeriod('monthly', '2026-03', 2)
      expect(entries).toHaveLength(2)
    })

    it('returns empty array for period with no entries', () => {
      const entries = leaderboardRepository.getByPeriod('weekly', '2099-W01')
      expect(entries).toEqual([])
    })

    it('separates entries by period key', async () => {
      const student = await createTestStudent()

      leaderboardRepository.upsert({
        userId: student.id, period: 'weekly', periodKey: '2026-W10',
        score: 50, quizzesCompleted: 2, wordsMastered: 10, streakDays: 1,
      })
      leaderboardRepository.upsert({
        userId: student.id, period: 'weekly', periodKey: '2026-W11',
        score: 100, quizzesCompleted: 5, wordsMastered: 20, streakDays: 3,
      })

      const w10 = leaderboardRepository.getByPeriod('weekly', '2026-W10')
      const w11 = leaderboardRepository.getByPeriod('weekly', '2026-W11')
      expect(w10).toHaveLength(1)
      expect(w10[0].score).toBe(50)
      expect(w11).toHaveLength(1)
      expect(w11[0].score).toBe(100)
    })
  })

  describe('recalculateAll', () => {
    it('computes scores from XP data', async () => {
      const student = await createTestStudent()
      const db = getTestDb()

      // Seed quiz results in March 2026 (for cosmetic stats)
      db.prepare(`
        INSERT INTO quiz_results (user_id, quiz_type, total_questions, correct_answers, score, total_time_spent, completed_at)
        VALUES (?, 'quiz', 10, 8, 80, 60, '2026-03-10 10:00:00')
      `).run(student.id)
      db.prepare(`
        INSERT INTO quiz_results (user_id, quiz_type, total_questions, correct_answers, score, total_time_spent, completed_at)
        VALUES (?, 'quiz', 10, 10, 100, 45, '2026-03-12 10:00:00')
      `).run(student.id)

      // Seed XP entries (score is now driven by XP)
      db.prepare(`
        INSERT INTO user_xp (user_id, amount, source, earned_at)
        VALUES (?, 84, 'quiz', '2026-03-10 10:00:00')
      `).run(student.id)
      db.prepare(`
        INSERT INTO user_xp (user_id, amount, source, earned_at)
        VALUES (?, 150, 'quiz', '2026-03-12 10:00:00')
      `).run(student.id)

      leaderboardRepository.recalculateAll('monthly', '2026-03')

      const entry = leaderboardRepository.getUserEntry(student.id, 'monthly', '2026-03')
      expect(entry).toBeDefined()
      expect(entry!.quizzes_completed).toBe(2)
      expect(entry!.score).toBe(234) // 84 + 150 XP
    })

    it('does not create entries for users with no activity', async () => {
      const student = await createTestStudent()

      leaderboardRepository.recalculateAll('monthly', '2026-03')

      const entry = leaderboardRepository.getUserEntry(student.id, 'monthly', '2026-03')
      expect(entry).toBeUndefined()
    })
  })
})
