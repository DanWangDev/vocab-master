import { describe, it, expect } from 'vitest'
import { getTestDb, createTestParent } from '../../test/helpers'
import { passwordResetRepository } from '../index.js'

describe('SqlitePasswordResetRepository', () => {
  describe('create', () => {
    it('creates token with hash', async () => {
      const parent = await createTestParent({ email: 'reset@test.com' })
      const expiresAt = new Date(Date.now() + 3600000)

      const row = passwordResetRepository.create(parent.id, 'selector123:verifier456', expiresAt)

      expect(row).toBeDefined()
      expect(row.id).toBeGreaterThan(0)
      expect(row.user_id).toBe(parent.id)
      expect(row.token_hash).toBe('selector123:verifier456')
      expect(row.used_at).toBeNull()
      expect(row.created_at).toBeDefined()
    })
  })

  describe('findBySelector', () => {
    it('finds by selector prefix using LIKE', async () => {
      const parent = await createTestParent({ email: 'findsel@test.com' })
      const expiresAt = new Date(Date.now() + 3600000)
      passwordResetRepository.create(parent.id, 'myselector:myverifier', expiresAt)

      const found = passwordResetRepository.findBySelector('myselector')
      expect(found).toBeDefined()
      expect(found!.token_hash).toBe('myselector:myverifier')
    })

    it('returns undefined for used tokens', async () => {
      const parent = await createTestParent({ email: 'used@test.com' })
      const expiresAt = new Date(Date.now() + 3600000)
      const row = passwordResetRepository.create(parent.id, 'usedselector:verifier', expiresAt)

      passwordResetRepository.markUsed(row.id)

      const found = passwordResetRepository.findBySelector('usedselector')
      expect(found).toBeUndefined()
    })

    it('returns undefined for expired tokens', async () => {
      const parent = await createTestParent({ email: 'expired@test.com' })
      const expiresAt = new Date(Date.now() + 3600000)
      const row = passwordResetRepository.create(parent.id, 'expiredselector:verifier', expiresAt)

      // Manually set expires_at to the past using SQLite's native format
      const db = getTestDb()
      db.prepare("UPDATE password_reset_tokens SET expires_at = datetime('now', '-1 hour') WHERE id = ?")
        .run(row.id)

      const found = passwordResetRepository.findBySelector('expiredselector')
      expect(found).toBeUndefined()
    })
  })

  describe('markUsed', () => {
    it('sets used_at', async () => {
      const parent = await createTestParent({ email: 'markused@test.com' })
      const expiresAt = new Date(Date.now() + 3600000)
      const row = passwordResetRepository.create(parent.id, 'mark:used', expiresAt)

      passwordResetRepository.markUsed(row.id)

      const found = passwordResetRepository.findById(row.id)
      expect(found!.used_at).not.toBeNull()
    })
  })

  describe('deleteExpired', () => {
    it('cleans up expired tokens', async () => {
      const parent = await createTestParent({ email: 'cleanup@test.com' })
      const db = getTestDb()

      // Create both tokens with future expiry first
      const expiredRow = passwordResetRepository.create(parent.id, 'expired:token', new Date(Date.now() + 3600000))
      passwordResetRepository.create(parent.id, 'valid:token', new Date(Date.now() + 3600000))

      // Manually expire the first token using SQLite's native format
      db.prepare("UPDATE password_reset_tokens SET expires_at = datetime('now', '-1 hour') WHERE id = ?")
        .run(expiredRow.id)

      const deleted = passwordResetRepository.deleteExpired()
      expect(deleted).toBeGreaterThanOrEqual(1)

      // Valid token should still exist
      const found = passwordResetRepository.findBySelector('valid')
      expect(found).toBeDefined()
    })
  })

  describe('deleteAllForUser', () => {
    it('removes all tokens for user', async () => {
      const parent = await createTestParent({ email: 'deleteall@test.com' })
      const expiresAt = new Date(Date.now() + 3600000)

      passwordResetRepository.create(parent.id, 'token1:verifier1', expiresAt)
      passwordResetRepository.create(parent.id, 'token2:verifier2', expiresAt)

      const deleted = passwordResetRepository.deleteAllForUser(parent.id)
      expect(deleted).toBe(2)

      const db = getTestDb()
      const remaining = db.prepare('SELECT COUNT(*) as count FROM password_reset_tokens WHERE user_id = ?')
        .get(parent.id) as { count: number }
      expect(remaining.count).toBe(0)
    })
  })

  describe('countRecentByUserId', () => {
    it('counts tokens within time window', async () => {
      const parent = await createTestParent({ email: 'countrecent@test.com' })
      const expiresAt = new Date(Date.now() + 3600000)

      passwordResetRepository.create(parent.id, 'recent1:verifier', expiresAt)
      passwordResetRepository.create(parent.id, 'recent2:verifier', expiresAt)

      const count = passwordResetRepository.countRecentByUserId(parent.id, 60)
      expect(count).toBe(2)
    })

    it('returns 0 when no recent tokens', async () => {
      const parent = await createTestParent({ email: 'norecent@test.com' })

      const count = passwordResetRepository.countRecentByUserId(parent.id, 60)
      expect(count).toBe(0)
    })
  })
})
