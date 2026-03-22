import { describe, it, expect } from 'vitest'
import { getTestDb, createTestStudent } from '../../test/helpers'
import { xpService } from '../xpService'

describe('xpService', () => {
  describe('awardXp', () => {
    it('awards XP and creates user_stats row if missing', async () => {
      const student = await createTestStudent()
      const result = xpService.awardXp(student.id, 50, 'quiz', 1)

      expect(result).not.toBeNull()
      expect(result!.xpEarned).toBe(50)
      expect(result!.totalXp).toBe(50)
      expect(result!.level).toBe(1)
      expect(result!.leveledUp).toBe(false)
    })

    it('accumulates XP across multiple awards', async () => {
      const student = await createTestStudent()
      xpService.awardXp(student.id, 60, 'quiz', 1)
      const result = xpService.awardXp(student.id, 50, 'quiz', 2)

      expect(result!.totalXp).toBe(110)
      expect(result!.level).toBe(2)
    })

    it('detects level up', async () => {
      const student = await createTestStudent()
      // Level 2 starts at 100 XP
      xpService.awardXp(student.id, 90, 'quiz', 1)
      const result = xpService.awardXp(student.id, 20, 'quiz', 2)

      expect(result!.leveledUp).toBe(true)
      expect(result!.newLevel).toBe(2)
      expect(result!.newTitle).toBe('Novice')
    })

    it('does not flag level up when staying same level', async () => {
      const student = await createTestStudent()
      const result = xpService.awardXp(student.id, 50, 'quiz', 1)

      expect(result!.leveledUp).toBe(false)
      expect(result!.newLevel).toBeUndefined()
      expect(result!.newTitle).toBeUndefined()
    })

    it('records XP in user_xp table', async () => {
      const student = await createTestStudent()
      xpService.awardXp(student.id, 25, 'challenge', 5)

      const db = getTestDb()
      const rows = db.prepare('SELECT * FROM user_xp WHERE user_id = ?').all(student.id) as Array<{ amount: number; source: string; source_id: number }>
      expect(rows).toHaveLength(1)
      expect(rows[0].amount).toBe(25)
      expect(rows[0].source).toBe('challenge')
      expect(rows[0].source_id).toBe(5)
    })
  })

  describe('awardStreakBonus', () => {
    it('awards streak bonus based on streak days', async () => {
      const student = await createTestStudent()
      const result = xpService.awardStreakBonus(student.id, 5)

      expect(result).not.toBeNull()
      expect(result!.xpEarned).toBe(10) // 5 * 2
    })

    it('deduplicates streak bonus per day', async () => {
      const student = await createTestStudent()
      xpService.awardStreakBonus(student.id, 5)
      const result = xpService.awardStreakBonus(student.id, 5)

      expect(result).toBeNull()
    })
  })

  describe('getLevelInfo', () => {
    it('returns level 1 for new user', async () => {
      const student = await createTestStudent()
      const info = xpService.getLevelInfo(student.id)

      expect(info.level).toBe(1)
      expect(info.title).toBe('Beginner')
      expect(info.totalXp).toBe(0)
      expect(info.xpInLevel).toBe(0)
    })

    it('returns correct level info after XP awards', async () => {
      const student = await createTestStudent()
      xpService.awardXp(student.id, 350, 'quiz', 1)
      const info = xpService.getLevelInfo(student.id)

      expect(info.level).toBe(3)
      expect(info.title).toBe('Apprentice')
      expect(info.totalXp).toBe(350)
      expect(info.xpInLevel).toBe(50) // 350 - 300
    })

    it('handles levels above 10 with roman numerals', async () => {
      const student = await createTestStudent()
      xpService.awardXp(student.id, 7500, 'quiz', 1) // 5500 + 2000 = level 11
      const info = xpService.getLevelInfo(student.id)

      expect(info.level).toBe(11)
      expect(info.title).toBe('Grand Master I')
    })
  })

  describe('getXpHistory', () => {
    it('returns empty array for new user', async () => {
      const student = await createTestStudent()
      const history = xpService.getXpHistory(student.id)
      expect(history).toEqual([])
    })

    it('returns XP events', async () => {
      const student = await createTestStudent()
      xpService.awardXp(student.id, 10, 'quiz', 1)
      xpService.awardXp(student.id, 20, 'challenge', 2)

      const history = xpService.getXpHistory(student.id)
      expect(history).toHaveLength(2)
      const amounts = history.map(h => h.amount).sort()
      expect(amounts).toEqual([10, 20])
    })

    it('respects limit parameter', async () => {
      const student = await createTestStudent()
      for (let i = 0; i < 5; i++) {
        xpService.awardXp(student.id, 10, 'quiz', i)
      }

      const history = xpService.getXpHistory(student.id, 3)
      expect(history).toHaveLength(3)
    })
  })

  describe('getLevelForXp', () => {
    it('returns Beginner for 0 XP', () => {
      const result = xpService.getLevelForXp(0)
      expect(result).toEqual({ level: 1, title: 'Beginner' })
    })

    it('returns Grand Master for 5500 XP', () => {
      const result = xpService.getLevelForXp(5500)
      expect(result).toEqual({ level: 10, title: 'Grand Master' })
    })

    it('returns Grand Master II for 9500 XP', () => {
      const result = xpService.getLevelForXp(9500)
      expect(result).toEqual({ level: 12, title: 'Grand Master II' })
    })
  })
})
