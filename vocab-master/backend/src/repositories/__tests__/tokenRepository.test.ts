import crypto from 'crypto'
import { describe, it, expect } from 'vitest'
import { createTestStudent } from '../../test/helpers'
import { tokenRepository } from '../index.js'

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

describe('SqliteTokenRepository', () => {
  describe('create', () => {
    it('creates token with SHA-256 hash (stored hash != raw token)', async () => {
      const student = await createTestStudent()
      const rawToken = 'raw-refresh-token-abc123'
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

      const row = tokenRepository.create(student.id, rawToken, expiresAt)

      expect(row).toBeDefined()
      expect(row.id).toBeGreaterThan(0)
      expect(row.user_id).toBe(student.id)
      expect(row.token).not.toBe(rawToken)
      expect(row.token).toBe(hashToken(rawToken))
      expect(row.created_at).toBeDefined()
    })
  })

  describe('findById', () => {
    it('finds token by id', async () => {
      const student = await createTestStudent()
      const created = tokenRepository.create(student.id, 'token-findbyid', new Date(Date.now() + 86400000))

      const found = tokenRepository.findById(created.id)
      expect(found).toBeDefined()
      expect(found!.id).toBe(created.id)
    })

    it('returns undefined for non-existent id', () => {
      const found = tokenRepository.findById(99999)
      expect(found).toBeUndefined()
    })
  })

  describe('findByToken', () => {
    it('finds by raw token (hashes internally)', async () => {
      const student = await createTestStudent()
      const rawToken = 'find-by-raw-token-xyz'
      tokenRepository.create(student.id, rawToken, new Date(Date.now() + 86400000))

      const found = tokenRepository.findByToken(rawToken)
      expect(found).toBeDefined()
      expect(found!.user_id).toBe(student.id)
    })

    it('returns undefined for unknown token', () => {
      const found = tokenRepository.findByToken('nonexistent-token')
      expect(found).toBeUndefined()
    })
  })

  describe('deleteByToken', () => {
    it('deletes by raw token', async () => {
      const student = await createTestStudent()
      const rawToken = 'delete-me-token'
      tokenRepository.create(student.id, rawToken, new Date(Date.now() + 86400000))

      tokenRepository.deleteByToken(rawToken)

      const found = tokenRepository.findByToken(rawToken)
      expect(found).toBeUndefined()
    })
  })

  describe('deleteAllForUser', () => {
    it('deletes all tokens for user', async () => {
      const student = await createTestStudent()
      tokenRepository.create(student.id, 'token-a', new Date(Date.now() + 86400000))
      tokenRepository.create(student.id, 'token-b', new Date(Date.now() + 86400000))

      tokenRepository.deleteAllForUser(student.id)

      const foundA = tokenRepository.findByToken('token-a')
      const foundB = tokenRepository.findByToken('token-b')
      expect(foundA).toBeUndefined()
      expect(foundB).toBeUndefined()
    })
  })

  describe('deleteExpired', () => {
    it('removes expired tokens, keeps valid ones', async () => {
      const student = await createTestStudent()

      // Create an expired token
      tokenRepository.create(student.id, 'expired-token', new Date(Date.now() - 1000))
      // Create a valid token
      tokenRepository.create(student.id, 'valid-token', new Date(Date.now() + 86400000))

      tokenRepository.deleteExpired()

      const expired = tokenRepository.findByToken('expired-token')
      const valid = tokenRepository.findByToken('valid-token')
      expect(expired).toBeUndefined()
      expect(valid).toBeDefined()
    })
  })

  describe('isValid', () => {
    it('returns true for valid non-expired token', async () => {
      const student = await createTestStudent()
      tokenRepository.create(student.id, 'valid-check', new Date(Date.now() + 86400000))

      expect(tokenRepository.isValid('valid-check')).toBe(true)
    })

    it('returns false for expired token', async () => {
      const student = await createTestStudent()
      tokenRepository.create(student.id, 'expired-check', new Date(Date.now() - 1000))

      expect(tokenRepository.isValid('expired-check')).toBe(false)
    })

    it('returns false for non-existent token', () => {
      expect(tokenRepository.isValid('does-not-exist')).toBe(false)
    })
  })
})
