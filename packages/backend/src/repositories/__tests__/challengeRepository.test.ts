import { describe, it, expect } from 'vitest'
import { createTestStudent } from '../../test/helpers'
import { challengeRepository } from '../index.js'

describe('SqliteChallengeRepository', () => {
  describe('create', () => {
    it('creates a challenge and returns row with id', async () => {
      const student = await createTestStudent()

      const challenge = challengeRepository.create(student.id, '2026-03-15', 85)

      expect(challenge).toBeDefined()
      expect(challenge.id).toBeGreaterThan(0)
      expect(challenge.user_id).toBe(student.id)
      expect(challenge.challenge_date).toBe('2026-03-15')
      expect(challenge.score).toBe(85)
      expect(challenge.created_at).toBeDefined()
    })
  })

  describe('findById', () => {
    it('returns challenge by id', async () => {
      const student = await createTestStudent()
      const created = challengeRepository.create(student.id, '2026-03-15', 90)

      const found = challengeRepository.findById(created.id)
      expect(found).toBeDefined()
      expect(found!.id).toBe(created.id)
      expect(found!.score).toBe(90)
    })

    it('returns undefined for non-existent id', () => {
      const found = challengeRepository.findById(99999)
      expect(found).toBeUndefined()
    })
  })

  describe('findByUserAndDate', () => {
    it('finds challenge by user and date combo', async () => {
      const student = await createTestStudent()
      challengeRepository.create(student.id, '2026-03-14', 70)
      challengeRepository.create(student.id, '2026-03-15', 80)

      const found = challengeRepository.findByUserAndDate(student.id, '2026-03-15')
      expect(found).toBeDefined()
      expect(found!.score).toBe(80)
    })

    it('returns undefined when no match', async () => {
      const student = await createTestStudent()

      const found = challengeRepository.findByUserAndDate(student.id, '2026-01-01')
      expect(found).toBeUndefined()
    })
  })

  describe('getTodayChallenge', () => {
    it("returns today's challenge", async () => {
      const student = await createTestStudent()
      const today = new Date().toISOString().split('T')[0]
      challengeRepository.create(student.id, today, 75)

      const found = challengeRepository.getTodayChallenge(student.id)
      expect(found).toBeDefined()
      expect(found!.challenge_date).toBe(today)
    })

    it('returns undefined when no challenge today', async () => {
      const student = await createTestStudent()

      const found = challengeRepository.getTodayChallenge(student.id)
      expect(found).toBeUndefined()
    })
  })

  describe('getRecentChallenges', () => {
    it('returns challenges in DESC order', async () => {
      const student = await createTestStudent()
      challengeRepository.create(student.id, '2026-03-13', 60)
      challengeRepository.create(student.id, '2026-03-14', 70)
      challengeRepository.create(student.id, '2026-03-15', 80)

      const recent = challengeRepository.getRecentChallenges(student.id)

      expect(recent).toHaveLength(3)
      expect(recent[0].challenge_date).toBe('2026-03-15')
      expect(recent[1].challenge_date).toBe('2026-03-14')
      expect(recent[2].challenge_date).toBe('2026-03-13')
    })

    it('respects limit', async () => {
      const student = await createTestStudent()
      challengeRepository.create(student.id, '2026-03-13', 60)
      challengeRepository.create(student.id, '2026-03-14', 70)
      challengeRepository.create(student.id, '2026-03-15', 80)

      const recent = challengeRepository.getRecentChallenges(student.id, 2)
      expect(recent).toHaveLength(2)
      expect(recent[0].challenge_date).toBe('2026-03-15')
    })
  })

  describe('calculateStreak', () => {
    it('returns 0 for no challenges', async () => {
      const student = await createTestStudent()

      const streak = challengeRepository.calculateStreak(student.id)
      expect(streak).toBe(0)
    })

    it('counts consecutive days including today', async () => {
      const student = await createTestStudent()
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      for (let i = 2; i >= 0; i--) {
        const d = new Date(today)
        d.setDate(d.getDate() - i)
        challengeRepository.create(student.id, d.toISOString().split('T')[0], 80)
      }

      const streak = challengeRepository.calculateStreak(student.id)
      expect(streak).toBe(3)
    })

    it('counts from yesterday if today not done', async () => {
      const student = await createTestStudent()
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      for (let i = 2; i >= 1; i--) {
        const d = new Date(today)
        d.setDate(d.getDate() - i)
        challengeRepository.create(student.id, d.toISOString().split('T')[0], 80)
      }

      const streak = challengeRepository.calculateStreak(student.id)
      expect(streak).toBe(2)
    })

    it('breaks on gaps', async () => {
      const student = await createTestStudent()
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      // Today and yesterday
      challengeRepository.create(student.id, today.toISOString().split('T')[0], 80)
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)
      challengeRepository.create(student.id, yesterday.toISOString().split('T')[0], 70)

      // Gap at -2, then -3
      const threeDaysAgo = new Date(today)
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
      challengeRepository.create(student.id, threeDaysAgo.toISOString().split('T')[0], 60)

      const streak = challengeRepository.calculateStreak(student.id)
      expect(streak).toBe(2) // today + yesterday only
    })

    it('returns 0 when last challenge was more than 1 day ago', async () => {
      const student = await createTestStudent()
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const threeDaysAgo = new Date(today)
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
      challengeRepository.create(student.id, threeDaysAgo.toISOString().split('T')[0], 60)

      const streak = challengeRepository.calculateStreak(student.id)
      expect(streak).toBe(0)
    })
  })

  describe('getBestScore', () => {
    it('returns max score', async () => {
      const student = await createTestStudent()
      challengeRepository.create(student.id, '2026-03-13', 60)
      challengeRepository.create(student.id, '2026-03-14', 95)
      challengeRepository.create(student.id, '2026-03-15', 80)

      const best = challengeRepository.getBestScore(student.id)
      expect(best).toBe(95)
    })

    it('returns 0 for no challenges', async () => {
      const student = await createTestStudent()

      const best = challengeRepository.getBestScore(student.id)
      expect(best).toBe(0)
    })
  })
})
