import { describe, it, expect } from 'vitest'
import { getTestDb, createTestStudent } from '../../test/helpers'
import { rewardService } from '../rewardService'

describe('rewardService', () => {
  describe('checkAndAwardStreakRewards', () => {
    it('awards eligible rewards based on streak', async () => {
      const student = await createTestStudent()
      const newlyEarned = rewardService.checkAndAwardStreakRewards(student.id, 7)

      // Should earn rewards for streak_days <= 7 (3-day and 7-day)
      expect(newlyEarned.length).toBeGreaterThanOrEqual(2)
      expect(newlyEarned.every(r => r.earned)).toBe(true)
      expect(newlyEarned.every(r => r.streak_days <= 7)).toBe(true)
    })

    it('does not duplicate already earned rewards', async () => {
      const student = await createTestStudent()
      rewardService.checkAndAwardStreakRewards(student.id, 7)
      const second = rewardService.checkAndAwardStreakRewards(student.id, 7)

      expect(second).toHaveLength(0)
    })

    it('awards new rewards when streak increases', async () => {
      const student = await createTestStudent()
      const first = rewardService.checkAndAwardStreakRewards(student.id, 3)
      const second = rewardService.checkAndAwardStreakRewards(student.id, 7)

      expect(first.length).toBeGreaterThan(0)
      expect(second.length).toBeGreaterThan(0)
      // Second batch should only contain 7-day rewards not already earned
      expect(second.every(r => r.streak_days > 3)).toBe(true)
    })

    it('returns empty array for 0 streak', async () => {
      const student = await createTestStudent()
      const result = rewardService.checkAndAwardStreakRewards(student.id, 0)
      expect(result).toHaveLength(0)
    })
  })

  describe('getUserRewards', () => {
    it('returns all rewards with earned/locked status', async () => {
      const student = await createTestStudent()
      const rewards = rewardService.getUserRewards(student.id, 5)

      // Should return all 6 seeded rewards
      expect(rewards.length).toBe(6)
      expect(rewards.every(r => !r.earned)).toBe(true)
    })

    it('marks earned rewards correctly', async () => {
      const student = await createTestStudent()
      rewardService.checkAndAwardStreakRewards(student.id, 7)

      const rewards = rewardService.getUserRewards(student.id, 7)
      const earned = rewards.filter(r => r.earned)
      expect(earned.length).toBeGreaterThanOrEqual(2)
    })

    it('locks earned rewards when streak drops below threshold', async () => {
      const student = await createTestStudent()
      rewardService.checkAndAwardStreakRewards(student.id, 7)

      // Check rewards with streak dropped to 2
      const rewards = rewardService.getUserRewards(student.id, 2)
      const locked = rewards.filter(r => r.earned && r.locked)
      expect(locked.length).toBeGreaterThan(0)
      expect(locked.every(r => r.streak_days > 2)).toBe(true)
    })

    it('does not lock rewards when streak meets threshold', async () => {
      const student = await createTestStudent()
      rewardService.checkAndAwardStreakRewards(student.id, 7)

      const rewards = rewardService.getUserRewards(student.id, 7)
      const earned = rewards.filter(r => r.earned)
      expect(earned.every(r => !r.locked)).toBe(true)
    })
  })

  describe('setActiveReward', () => {
    it('sets active avatar frame for earned reward', async () => {
      const student = await createTestStudent()
      rewardService.checkAndAwardStreakRewards(student.id, 3)

      const result = rewardService.setActiveReward(student.id, 'bronze_ring', 'avatar_frame')
      expect(result).toBe(true)

      const rewards = rewardService.getUserRewards(student.id, 3)
      const active = rewards.find(r => r.reward_slug === 'bronze_ring')
      expect(active?.active).toBe(true)
    })

    it('rejects setting unearned reward', async () => {
      const student = await createTestStudent()
      const result = rewardService.setActiveReward(student.id, 'golden_shield', 'avatar_frame')
      expect(result).toBe(false)
    })

    it('clears active reward when slug is null', async () => {
      const student = await createTestStudent()
      rewardService.checkAndAwardStreakRewards(student.id, 3)
      rewardService.setActiveReward(student.id, 'bronze_ring', 'avatar_frame')

      const result = rewardService.setActiveReward(student.id, null, 'avatar_frame')
      expect(result).toBe(true)

      const db = getTestDb()
      const settings = db.prepare('SELECT active_avatar_frame FROM user_settings WHERE user_id = ?').get(student.id) as { active_avatar_frame: string | null }
      expect(settings.active_avatar_frame).toBeNull()
    })

    it('rejects wrong reward type', async () => {
      const student = await createTestStudent()
      rewardService.checkAndAwardStreakRewards(student.id, 3)

      // bronze_ring is avatar_frame, not dashboard_theme
      const result = rewardService.setActiveReward(student.id, 'bronze_ring', 'dashboard_theme')
      expect(result).toBe(false)
    })
  })
})
