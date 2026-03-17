import { describe, it, expect } from 'vitest'
import { createTestStudent } from '../../test/helpers'
import { pushTokenRepository } from '../index.js'

describe('SqlitePushTokenRepository', () => {
  describe('upsert', () => {
    it('creates new token', async () => {
      const student = await createTestStudent()

      const row = pushTokenRepository.upsert(student.id, 'ExponentPushToken[abc123]', 'ios')

      expect(row).toBeDefined()
      expect(row.id).toBeGreaterThan(0)
      expect(row.user_id).toBe(student.id)
      expect(row.expo_push_token).toBe('ExponentPushToken[abc123]')
      expect(row.platform).toBe('ios')
      expect(row.created_at).toBeDefined()
    })

    it('updates on conflict (same expo_push_token)', async () => {
      const student1 = await createTestStudent()
      const student2 = await createTestStudent()

      pushTokenRepository.upsert(student1.id, 'ExponentPushToken[shared]', 'ios')
      const updated = pushTokenRepository.upsert(student2.id, 'ExponentPushToken[shared]', 'android')

      expect(updated.user_id).toBe(student2.id)
      expect(updated.platform).toBe('android')

      // student1 should no longer have this token
      const student1Tokens = pushTokenRepository.findByUserId(student1.id)
      const hasShared = student1Tokens.some(t => t.expo_push_token === 'ExponentPushToken[shared]')
      expect(hasShared).toBe(false)
    })
  })

  describe('findByUserId', () => {
    it('returns tokens for user', async () => {
      const student = await createTestStudent()
      pushTokenRepository.upsert(student.id, 'ExponentPushToken[a]', 'ios')
      pushTokenRepository.upsert(student.id, 'ExponentPushToken[b]', 'android')

      const tokens = pushTokenRepository.findByUserId(student.id)
      expect(tokens).toHaveLength(2)
    })

    it('returns empty array for user with no tokens', async () => {
      const student = await createTestStudent()

      const tokens = pushTokenRepository.findByUserId(student.id)
      expect(tokens).toEqual([])
    })
  })

  describe('findByUserIds', () => {
    it('returns tokens for multiple users', async () => {
      const student1 = await createTestStudent()
      const student2 = await createTestStudent()
      pushTokenRepository.upsert(student1.id, 'ExponentPushToken[s1]', 'ios')
      pushTokenRepository.upsert(student2.id, 'ExponentPushToken[s2]', 'android')

      const tokens = pushTokenRepository.findByUserIds([student1.id, student2.id])
      expect(tokens).toHaveLength(2)
    })

    it('returns empty array for empty input', () => {
      const tokens = pushTokenRepository.findByUserIds([])
      expect(tokens).toEqual([])
    })
  })

  describe('deleteByUserId', () => {
    it('deletes all tokens for user', async () => {
      const student = await createTestStudent()
      pushTokenRepository.upsert(student.id, 'ExponentPushToken[del1]', 'ios')
      pushTokenRepository.upsert(student.id, 'ExponentPushToken[del2]', 'android')

      const deleted = pushTokenRepository.deleteByUserId(student.id)
      expect(deleted).toBe(2)

      const remaining = pushTokenRepository.findByUserId(student.id)
      expect(remaining).toEqual([])
    })

    it('returns 0 when no tokens exist', async () => {
      const student = await createTestStudent()

      const deleted = pushTokenRepository.deleteByUserId(student.id)
      expect(deleted).toBe(0)
    })
  })

  describe('deleteByToken', () => {
    it('deletes specific token', async () => {
      const student = await createTestStudent()
      pushTokenRepository.upsert(student.id, 'ExponentPushToken[keep]', 'ios')
      pushTokenRepository.upsert(student.id, 'ExponentPushToken[remove]', 'android')

      const deleted = pushTokenRepository.deleteByToken('ExponentPushToken[remove]')
      expect(deleted).toBe(1)

      const remaining = pushTokenRepository.findByUserId(student.id)
      expect(remaining).toHaveLength(1)
      expect(remaining[0].expo_push_token).toBe('ExponentPushToken[keep]')
    })

    it('returns 0 for non-existent token', () => {
      const deleted = pushTokenRepository.deleteByToken('ExponentPushToken[nonexistent]')
      expect(deleted).toBe(0)
    })
  })
})
