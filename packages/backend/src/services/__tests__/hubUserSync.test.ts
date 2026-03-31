import { describe, it, expect } from 'vitest'
import type { HubTokenClaims } from '@danwangdev/auth-client/server'
import { syncHubUser } from '../hubUserSync'
import { getTestDb, createTestStudent, createTestParent, createTestAdmin } from '../../test/helpers'
import type { UserSettingsRow, UserStatsRow } from '../../types/index'

function makeClaims(overrides: Partial<HubTokenClaims> = {}): HubTokenClaims {
  return {
    sub: 'hub-user-001',
    email: 'hubuser@example.com',
    username: 'hubuser',
    displayName: 'Hub User',
    role: 'member',
    plan: 'free',
    features: [],
    apps: ['vocab-master'],
    expiresAt: null,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
    ...overrides
  }
}

describe('syncHubUser', () => {
  describe('match by hub_user_id (returning user)', () => {
    it('updates mutable claims on returning user', async () => {
      const student = await createTestStudent({ username: 'oldname', email: 'old@example.com', displayName: 'Old Name' })
      const db = getTestDb()
      db.prepare('UPDATE users SET hub_user_id = ?, auth_provider = ? WHERE id = ?').run('hub-123', 'hub', student.id)

      const claims = makeClaims({
        sub: 'hub-123',
        username: 'newname',
        displayName: 'New Name',
        email: 'new@example.com'
      })

      const result = syncHubUser(claims)

      expect(result.id).toBe(student.id)
      expect(result.username).toBe('newname')
      expect(result.display_name).toBe('New Name')
      expect(result.email).toBe('new@example.com')
      expect(result.email_verified).toBe(1)
    })

    it('preserves existing role when hub role is non-admin', async () => {
      const parent = await createTestParent({ username: 'parentuser' })
      const db = getTestDb()
      db.prepare('UPDATE users SET hub_user_id = ?, auth_provider = ? WHERE id = ?').run('hub-parent', 'hub', parent.id)

      const claims = makeClaims({ sub: 'hub-parent', role: 'member' })

      const result = syncHubUser(claims)

      expect(result.role).toBe('parent')
    })

    it('overrides existing role to admin when hub role is admin', async () => {
      const student = await createTestStudent({ username: 'promoted' })
      const db = getTestDb()
      db.prepare('UPDATE users SET hub_user_id = ?, auth_provider = ? WHERE id = ?').run('hub-admin', 'hub', student.id)

      const claims = makeClaims({ sub: 'hub-admin', role: 'admin' })

      const result = syncHubUser(claims)

      expect(result.role).toBe('admin')
    })
  })

  describe('match by email (migration path)', () => {
    it('links existing user by email and sets hub_user_id and auth_provider', async () => {
      const student = await createTestStudent({ username: 'localuser', email: 'migrate@example.com' })

      const claims = makeClaims({
        sub: 'hub-migrate-email',
        email: 'migrate@example.com',
        username: 'hubname',
        displayName: 'Hub Display'
      })

      const result = syncHubUser(claims)

      expect(result.id).toBe(student.id)
      expect(result.hub_user_id).toBe('hub-migrate-email')
      expect(result.auth_provider).toBe('hub')
      expect(result.username).toBe('hubname')
      expect(result.display_name).toBe('Hub Display')
      expect(result.email_verified).toBe(1)
    })

    it('preserves existing role on email match for non-admin hub user', async () => {
      const admin = await createTestAdmin({ email: 'admin@example.com' })

      const claims = makeClaims({
        sub: 'hub-email-admin',
        email: 'admin@example.com',
        role: 'member'
      })

      const result = syncHubUser(claims)

      expect(result.id).toBe(admin.id)
      expect(result.role).toBe('admin')
    })
  })

  describe('match by username (migration path)', () => {
    it('links existing user by username and sets hub_user_id and auth_provider', async () => {
      const student = await createTestStudent({ username: 'sharedname' })

      const claims = makeClaims({
        sub: 'hub-migrate-username',
        email: 'different@example.com',
        username: 'sharedname',
        displayName: 'From Hub'
      })

      const result = syncHubUser(claims)

      expect(result.id).toBe(student.id)
      expect(result.hub_user_id).toBe('hub-migrate-username')
      expect(result.auth_provider).toBe('hub')
      expect(result.display_name).toBe('From Hub')
      expect(result.email).toBe('different@example.com')
      expect(result.email_verified).toBe(1)
    })

    it('skips username match if user already has a hub_user_id and falls through to create', async () => {
      const existing = await createTestStudent({ username: 'taken' })
      const db = getTestDb()
      db.prepare('UPDATE users SET hub_user_id = ?, auth_provider = ? WHERE id = ?').run('hub-other', 'hub', existing.id)

      const claims = makeClaims({
        sub: 'hub-new-user',
        email: 'brand@example.com',
        username: 'taken'
      })

      // Username 'taken' is already in use by a hub-linked user, so the match
      // is skipped and insertion fails with a UNIQUE constraint violation.
      expect(() => syncHubUser(claims)).toThrow(/UNIQUE constraint failed/)

      // Verify the existing user was NOT modified
      const unchanged = db.prepare('SELECT hub_user_id FROM users WHERE id = ?').get(existing.id) as { hub_user_id: string }
      expect(unchanged.hub_user_id).toBe('hub-other')
    })

    it('links by username when user has no hub_user_id and skips create', async () => {
      // This is the happy path for username migration
      const existing = await createTestStudent({ username: 'migratable' })

      const claims = makeClaims({
        sub: 'hub-migrate-name',
        email: 'nomatch@example.com',
        username: 'migratable'
      })

      const result = syncHubUser(claims)

      expect(result.id).toBe(existing.id)
      expect(result.hub_user_id).toBe('hub-migrate-name')
    })
  })

  describe('email match takes priority over username match', () => {
    it('matches by email even when a different user has the same username', async () => {
      const emailUser = await createTestStudent({ username: 'emailowner', email: 'shared@example.com' })
      const usernameUser = await createTestStudent({ username: 'hubloginname' })

      const claims = makeClaims({
        sub: 'hub-priority',
        email: 'shared@example.com',
        username: 'newhubname'
      })

      const result = syncHubUser(claims)

      // Should match by email (emailUser), not by username (usernameUser)
      expect(result.id).toBe(emailUser.id)
      expect(result.id).not.toBe(usernameUser.id)
      expect(result.hub_user_id).toBe('hub-priority')
      expect(result.auth_provider).toBe('hub')
    })

    it('does not fall through to username match when email matches', async () => {
      const emailUser = await createTestStudent({ username: 'emailowner2', email: 'priority@example.com' })
      const usernameUser = await createTestStudent({ username: 'claimedname' })

      const claims = makeClaims({
        sub: 'hub-priority-2',
        email: 'priority@example.com',
        username: 'updatedname'
      })

      const result = syncHubUser(claims)

      // Email match wins; usernameUser should remain unlinked
      expect(result.id).toBe(emailUser.id)
      const db = getTestDb()
      const unlinked = db.prepare('SELECT hub_user_id FROM users WHERE id = ?').get(usernameUser.id) as { hub_user_id: string | null }
      expect(unlinked.hub_user_id).toBeNull()
    })
  })

  describe('brand new user creation', () => {
    it('creates a new user with correct defaults', () => {
      const claims = makeClaims({
        sub: 'hub-brand-new',
        username: 'freshuser',
        displayName: 'Fresh User',
        email: 'fresh@example.com',
        role: 'member'
      })

      const result = syncHubUser(claims)

      expect(result.username).toBe('freshuser')
      expect(result.display_name).toBe('Fresh User')
      expect(result.email).toBe('fresh@example.com')
      expect(result.email_verified).toBe(1)
      expect(result.auth_provider).toBe('hub')
      expect(result.hub_user_id).toBe('hub-brand-new')
      expect(result.password_hash).toBeNull()
      expect(result.role).toBe('student')
    })

    it('creates default user_settings row', () => {
      const claims = makeClaims({ sub: 'hub-settings-check' })

      const result = syncHubUser(claims)

      const db = getTestDb()
      const settings = db.prepare('SELECT * FROM user_settings WHERE user_id = ?').get(result.id) as UserSettingsRow | undefined

      expect(settings).toBeDefined()
      expect(settings!.sound_enabled).toBe(1)
      expect(settings!.auto_advance).toBe(0)
      expect(settings!.language).toBe('en')
    })

    it('creates default user_stats row', () => {
      const claims = makeClaims({ sub: 'hub-stats-check' })

      const result = syncHubUser(claims)

      const db = getTestDb()
      const stats = db.prepare('SELECT * FROM user_stats WHERE user_id = ?').get(result.id) as UserStatsRow | undefined

      expect(stats).toBeDefined()
      expect(stats!.total_words_studied).toBe(0)
      expect(stats!.quizzes_taken).toBe(0)
      expect(stats!.challenges_completed).toBe(0)
      expect(stats!.best_challenge_score).toBe(0)
      expect(stats!.last_study_date).toBeNull()
    })
  })

  describe('role mapping', () => {
    it('maps hub admin role to admin', () => {
      const claims = makeClaims({ sub: 'hub-admin-new', role: 'admin' })

      const result = syncHubUser(claims)

      expect(result.role).toBe('admin')
    })

    it('defaults non-admin hub role to student for new users', () => {
      const claims = makeClaims({ sub: 'hub-member-new', role: 'member' })

      const result = syncHubUser(claims)

      expect(result.role).toBe('student')
    })

    it('preserves existing parent role when hub role is non-admin', async () => {
      const parent = await createTestParent({ email: 'parentrole@example.com' })

      const claims = makeClaims({
        sub: 'hub-parent-role',
        email: 'parentrole@example.com',
        role: 'member'
      })

      const result = syncHubUser(claims)

      expect(result.role).toBe('parent')
    })

    it('overrides existing student role to admin when hub role is admin', async () => {
      const student = await createTestStudent({ email: 'promote@example.com' })

      const claims = makeClaims({
        sub: 'hub-promote',
        email: 'promote@example.com',
        role: 'admin'
      })

      const result = syncHubUser(claims)

      expect(result.role).toBe('admin')
    })
  })
})
