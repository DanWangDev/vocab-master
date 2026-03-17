import { describe, it, expect } from 'vitest'
import { getTestDb, createTestStudent } from '../../test/helpers'
import { achievementRepository } from '../index.js'

describe('SqliteAchievementRepository', () => {
  describe('findAll', () => {
    it('returns all seeded achievements sorted by sort_order', () => {
      const all = achievementRepository.findAll()
      expect(all.length).toBe(15)
      expect(all[0].slug).toBe('first_quiz')
      expect(all[0].sort_order).toBeLessThan(all[1].sort_order)
    })
  })

  describe('findBySlug', () => {
    it('returns achievement by slug', () => {
      const a = achievementRepository.findBySlug('streak_7')
      expect(a).toBeDefined()
      expect(a!.name).toBe('Week Warrior')
      expect(a!.category).toBe('streak')
      expect(a!.threshold).toBe(7)
    })

    it('returns undefined for non-existent slug', () => {
      expect(achievementRepository.findBySlug('nonexistent')).toBeUndefined()
    })
  })

  describe('award', () => {
    it('awards achievement and returns row', async () => {
      const student = await createTestStudent()
      const achievement = achievementRepository.findBySlug('first_quiz')!

      const row = achievementRepository.award(student.id, achievement.id)

      expect(row).toBeDefined()
      expect(row!.user_id).toBe(student.id)
      expect(row!.achievement_id).toBe(achievement.id)
      expect(row!.earned_at).toBeDefined()
    })

    it('returns undefined on duplicate award', async () => {
      const student = await createTestStudent()
      const achievement = achievementRepository.findBySlug('first_quiz')!

      achievementRepository.award(student.id, achievement.id)
      const duplicate = achievementRepository.award(student.id, achievement.id)

      expect(duplicate).toBeUndefined()
    })
  })

  describe('hasAchievement', () => {
    it('returns true when user has the achievement', async () => {
      const student = await createTestStudent()
      const achievement = achievementRepository.findBySlug('streak_3')!
      achievementRepository.award(student.id, achievement.id)

      expect(achievementRepository.hasAchievement(student.id, 'streak_3')).toBe(true)
    })

    it('returns false when user does not have the achievement', async () => {
      const student = await createTestStudent()
      expect(achievementRepository.hasAchievement(student.id, 'streak_30')).toBe(false)
    })
  })

  describe('findByUserId', () => {
    it('returns earned achievements with details in DESC order', async () => {
      const student = await createTestStudent()
      const db = getTestDb()
      const a1 = achievementRepository.findBySlug('first_quiz')!
      const a2 = achievementRepository.findBySlug('words_10')!

      achievementRepository.award(student.id, a1.id)
      // Push first one back in time
      db.prepare("UPDATE user_achievements SET earned_at = datetime('now', '-1 hour') WHERE achievement_id = ?").run(a1.id)
      achievementRepository.award(student.id, a2.id)

      const earned = achievementRepository.findByUserId(student.id)
      expect(earned).toHaveLength(2)
      expect(earned[0].slug).toBe('words_10') // more recent
      expect(earned[1].slug).toBe('first_quiz')
      expect(earned[0].name).toBeDefined()
      expect(earned[0].icon).toBeDefined()
    })

    it('returns empty array for user with no achievements', async () => {
      const student = await createTestStudent()
      expect(achievementRepository.findByUserId(student.id)).toEqual([])
    })
  })

  describe('findEarnedSlugs', () => {
    it('returns array of earned slugs', async () => {
      const student = await createTestStudent()
      const a1 = achievementRepository.findBySlug('first_quiz')!
      const a2 = achievementRepository.findBySlug('streak_7')!

      achievementRepository.award(student.id, a1.id)
      achievementRepository.award(student.id, a2.id)

      const slugs = achievementRepository.findEarnedSlugs(student.id)
      expect(slugs).toHaveLength(2)
      expect(slugs).toContain('first_quiz')
      expect(slugs).toContain('streak_7')
    })

    it('returns empty array for user with no achievements', async () => {
      const student = await createTestStudent()
      expect(achievementRepository.findEarnedSlugs(student.id)).toEqual([])
    })
  })
})
