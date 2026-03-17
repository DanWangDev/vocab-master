import { describe, it, expect, vi } from 'vitest'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { getTestDb } from '../../test/helpers'
import {
  createTestStudent,
  createTestParent,
  createTestAdmin,
  generateTestToken
} from '../../test/helpers'

// Mock the email service to prevent actual email sends
vi.mock('../emailService', () => ({
  emailService: {
    sendWelcomeEmail: vi.fn().mockResolvedValue(undefined),
    sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
    sendPasswordChangedNotification: vi.fn().mockResolvedValue(undefined)
  }
}))

// Mock the google auth service
vi.mock('../googleAuthService', () => ({
  googleAuthService: {
    verifyToken: vi.fn().mockResolvedValue({
      googleId: 'google-123',
      email: 'google@test.com',
      name: 'Google User'
    })
  }
}))

// Import after mocks are set up
import { authService } from '../authService'

const JWT_SECRET = process.env.JWT_SECRET!

describe('authService', () => {
  describe('registerStudent', () => {
    it('creates a new student with hashed password', async () => {
      const result = await authService.registerStudent('newstudent', 'password123', 'New Student')

      expect(result.user.username).toBe('newstudent')
      expect(result.user.role).toBe('student')
      expect(result.user.displayName).toBe('New Student')
      expect(result.tokens.accessToken).toBeTruthy()
      expect(result.tokens.refreshToken).toBeTruthy()
    })

    it('rejects duplicate username', async () => {
      await authService.registerStudent('duplicate', 'password123')

      await expect(authService.registerStudent('duplicate', 'password456'))
        .rejects.toThrow('Username already taken')
    })

    it('rejects short password', async () => {
      await expect(authService.registerStudent('shortpw', 'short'))
        .rejects.toThrow('Password must be at least 8 characters')
    })
  })

  describe('registerParent', () => {
    it('creates a new parent with email', async () => {
      const result = await authService.registerParent(
        'newparent', 'password123', 'parent@test.com', 'Parent User'
      )

      expect(result.user.username).toBe('newparent')
      expect(result.user.role).toBe('parent')
      expect(result.user.email).toBe('parent@test.com')
    })

    it('rejects duplicate email', async () => {
      await authService.registerParent('parent1', 'password123', 'same@test.com')

      await expect(authService.registerParent('parent2', 'password456', 'same@test.com'))
        .rejects.toThrow('Email already registered')
    })

    it('rejects invalid email format', async () => {
      await expect(authService.registerParent('badmail', 'password123', 'notanemail'))
        .rejects.toThrow('Invalid email format')
    })
  })

  describe('login', () => {
    it('returns user and tokens for valid credentials', async () => {
      await authService.registerStudent('loginuser', 'password123')

      const result = await authService.login('loginuser', 'password123')

      expect(result.user.username).toBe('loginuser')
      expect(result.tokens.accessToken).toBeTruthy()
      expect(result.tokens.refreshToken).toBeTruthy()
    })

    it('rejects invalid username', async () => {
      await expect(authService.login('nonexistent', 'password123'))
        .rejects.toThrow('Invalid username or password')
    })

    it('rejects invalid password', async () => {
      await authService.registerStudent('wrongpw', 'correctpassword')

      await expect(authService.login('wrongpw', 'wrongpassword'))
        .rejects.toThrow('Invalid username or password')
    })
  })

  describe('generateTokens', () => {
    it('generates valid access and refresh tokens', () => {
      const db = getTestDb()
      db.prepare(`
        INSERT INTO users (id, username, password_hash, role, email_verified, auth_provider)
        VALUES (1, 'testuser', 'hash', 'student', 0, 'local')
      `).run()
      const tokens = authService.generateTokens(1, 'testuser', 'student')

      expect(tokens.accessToken).toBeTruthy()
      expect(tokens.refreshToken).toBeTruthy()
      expect(typeof tokens.accessToken).toBe('string')
      expect(typeof tokens.refreshToken).toBe('string')
    })

    it('generates an access token with correct payload', () => {
      const db = getTestDb()
      db.prepare(`
        INSERT INTO users (id, username, password_hash, role, email_verified, auth_provider)
        VALUES (42, 'myuser', 'hash', 'parent', 0, 'local')
      `).run()
      const tokens = authService.generateTokens(42, 'myuser', 'parent')
      const decoded = jwt.verify(tokens.accessToken, JWT_SECRET) as { userId: number; username: string; role: string }

      expect(decoded.userId).toBe(42)
      expect(decoded.username).toBe('myuser')
      expect(decoded.role).toBe('parent')
    })

    it('stores the refresh token in the database', () => {
      const db = getTestDb()
      // Create user first since FK constraint
      db.prepare(`
        INSERT INTO users (id, username, password_hash, role, email_verified, auth_provider)
        VALUES (999, 'tokenuser', 'hash', 'student', 0, 'local')
      `).run()

      const tokens = authService.generateTokens(999, 'tokenuser', 'student')

      // Verify refresh token was stored
      const storedTokens = db.prepare(
        'SELECT * FROM refresh_tokens WHERE user_id = ?'
      ).all(999)

      expect(storedTokens.length).toBe(1)
    })
  })

  describe('verifyAccessToken', () => {
    it('returns payload for valid token', () => {
      const db = getTestDb()
      db.prepare(`
        INSERT INTO users (id, username, password_hash, role, email_verified, auth_provider)
        VALUES (1, 'testuser', 'hash', 'student', 0, 'local')
      `).run()
      const tokens = authService.generateTokens(1, 'testuser', 'student')
      const payload = authService.verifyAccessToken(tokens.accessToken)

      expect(payload.userId).toBe(1)
      expect(payload.username).toBe('testuser')
      expect(payload.role).toBe('student')
    })

    it('throws for expired token', () => {
      const expiredToken = jwt.sign(
        { userId: 1, username: 'test', role: 'student' },
        JWT_SECRET,
        { expiresIn: '-1s' }
      )

      expect(() => authService.verifyAccessToken(expiredToken))
        .toThrow('Invalid or expired access token')
    })

    it('throws for token signed with wrong secret', () => {
      const badToken = jwt.sign(
        { userId: 1, username: 'test', role: 'student' },
        'wrong-secret'
      )

      expect(() => authService.verifyAccessToken(badToken))
        .toThrow('Invalid or expired access token')
    })

    it('throws for malformed token', () => {
      expect(() => authService.verifyAccessToken('not.a.valid.token'))
        .toThrow('Invalid or expired access token')
    })
  })

  describe('refresh', () => {
    it('issues new tokens and invalidates old refresh token', async () => {
      await authService.registerStudent('refreshuser', 'password123')
      const loginResult = await authService.login('refreshuser', 'password123')
      const oldRefreshToken = loginResult.tokens.refreshToken

      const newTokens = await authService.refresh(oldRefreshToken)

      expect(newTokens.accessToken).toBeTruthy()
      expect(newTokens.refreshToken).toBeTruthy()
      expect(newTokens.refreshToken).not.toBe(oldRefreshToken)

      // Old token should no longer work
      await expect(authService.refresh(oldRefreshToken))
        .rejects.toThrow('Invalid refresh token')
    })

    it('rejects invalid refresh token', async () => {
      await expect(authService.refresh('nonexistent-token'))
        .rejects.toThrow('Invalid refresh token')
    })
  })

  describe('logout', () => {
    it('invalidates the refresh token', async () => {
      await authService.registerStudent('logoutuser', 'password123')
      const loginResult = await authService.login('logoutuser', 'password123')

      authService.logout(loginResult.tokens.refreshToken)

      await expect(authService.refresh(loginResult.tokens.refreshToken))
        .rejects.toThrow('Invalid refresh token')
    })
  })

  describe('logoutAll', () => {
    it('invalidates all refresh tokens for a user', async () => {
      const { user } = await authService.registerStudent('logoutalluser', 'password123')
      const login1 = await authService.login('logoutalluser', 'password123')
      const login2 = await authService.login('logoutalluser', 'password123')

      authService.logoutAll(user.id)

      await expect(authService.refresh(login1.tokens.refreshToken))
        .rejects.toThrow('Invalid refresh token')
      await expect(authService.refresh(login2.tokens.refreshToken))
        .rejects.toThrow('Invalid refresh token')
    })
  })

  describe('getUser', () => {
    it('returns user for valid id', async () => {
      const { user } = await authService.registerStudent('getuser', 'password123', 'Get User')

      const found = authService.getUser(user.id)

      expect(found).not.toBeNull()
      expect(found!.username).toBe('getuser')
      expect(found!.displayName).toBe('Get User')
    })

    it('returns null for non-existent user', () => {
      const found = authService.getUser(99999)

      expect(found).toBeNull()
    })
  })

  describe('updateProfile', () => {
    it('updates username', async () => {
      const { user } = await authService.registerStudent('oldname', 'password123')

      const updated = authService.updateProfile(user.id, { username: 'newname' })

      expect(updated.username).toBe('newname')
    })

    it('updates display name', async () => {
      const { user } = await authService.registerStudent('profileuser', 'password123')

      const updated = authService.updateProfile(user.id, { displayName: 'New Display Name' })

      expect(updated.displayName).toBe('New Display Name')
    })

    it('rejects duplicate username on update', async () => {
      await authService.registerStudent('taken_name', 'password123')
      const { user } = await authService.registerStudent('original', 'password123')

      expect(() => authService.updateProfile(user.id, { username: 'taken_name' }))
        .toThrow('Username already taken')
    })

    it('throws for non-existent user', () => {
      expect(() => authService.updateProfile(99999, { username: 'anything' }))
        .toThrow('User not found')
    })
  })

  describe('cleanupExpiredTokens', () => {
    it('removes expired refresh tokens', async () => {
      const db = getTestDb()

      const { user } = await authService.registerStudent('cleanupuser', 'password123')

      // Insert an expired refresh token directly
      db.prepare(`
        INSERT INTO refresh_tokens (user_id, token, expires_at)
        VALUES (?, 'expired-hash', datetime('now', '-1 day'))
      `).run(user.id)

      const beforeCount = (db.prepare(
        'SELECT COUNT(*) as c FROM refresh_tokens WHERE user_id = ?'
      ).get(user.id) as { c: number }).c

      authService.cleanupExpiredTokens()

      const afterCount = (db.prepare(
        'SELECT COUNT(*) as c FROM refresh_tokens WHERE user_id = ?'
      ).get(user.id) as { c: number }).c

      expect(afterCount).toBeLessThan(beforeCount)
    })
  })

  describe('createStudentForParent', () => {
    it('creates a student linked to the parent', async () => {
      const { user: parent } = await authService.registerParent(
        'parentcreator', 'password123', 'creator@test.com'
      )

      const result = await authService.createStudentForParent(
        parent.id, 'childuser', 'password123', 'Child User'
      )

      expect(result.user.username).toBe('childuser')
      expect(result.user.role).toBe('student')
      expect(result.user.displayName).toBe('Child User')
    })

    it('rejects when requester is not a parent', async () => {
      const { user: student } = await authService.registerStudent('noparent', 'password123')

      await expect(authService.createStudentForParent(
        student.id, 'child', 'password123'
      )).rejects.toThrow('Only parents can create student accounts')
    })

    it('rejects duplicate child username', async () => {
      const { user: parent } = await authService.registerParent(
        'parentdup', 'password123', 'dup@test.com'
      )

      await authService.createStudentForParent(parent.id, 'existingchild', 'password123')

      await expect(authService.createStudentForParent(
        parent.id, 'existingchild', 'password456'
      )).rejects.toThrow('Username already taken')
    })
  })

  describe('resetUserPassword', () => {
    it('allows admin to reset another user password', async () => {
      const { user: admin } = await authService.registerParent(
        'adminreset', 'password123', 'adminreset@test.com'
      )
      // Manually set role to admin
      const db = getTestDb()
      db.prepare('UPDATE users SET role = ? WHERE id = ?').run('admin', admin.id)

      const { user: student } = await authService.registerStudent('targetstudent', 'password123')

      await authService.resetUserPassword(admin.id, 'admin', student.id, 'newpassword123')

      // Student should be able to login with new password
      const loginResult = await authService.login('targetstudent', 'newpassword123')
      expect(loginResult.user.username).toBe('targetstudent')
    })

    it('prevents admin from resetting own password', async () => {
      const { user: admin } = await authService.registerParent(
        'selfadmin', 'password123', 'selfadmin@test.com'
      )
      const db = getTestDb()
      db.prepare('UPDATE users SET role = ? WHERE id = ?').run('admin', admin.id)

      await expect(authService.resetUserPassword(admin.id, 'admin', admin.id, 'newpassword'))
        .rejects.toThrow('Use password reset via email')
    })

    it('allows parent to reset linked student password', async () => {
      const { user: parent } = await authService.registerParent(
        'parentreset', 'password123', 'parentreset@test.com'
      )

      const { user: child } = await authService.createStudentForParent(
        parent.id, 'linkedchild', 'password123'
      )

      await authService.resetUserPassword(parent.id, 'parent', child.id, 'newchildpw1')

      const loginResult = await authService.login('linkedchild', 'newchildpw1')
      expect(loginResult.user.username).toBe('linkedchild')
    })

    it('prevents parent from resetting unlinked student password', async () => {
      const { user: parent } = await authService.registerParent(
        'nolinkparent', 'password123', 'nolink@test.com'
      )

      const { user: student } = await authService.registerStudent('unlinked', 'password123')

      await expect(authService.resetUserPassword(parent.id, 'parent', student.id, 'newpw12345'))
        .rejects.toThrow('You can only reset passwords for your linked students')
    })

    it('prevents student from resetting any password', async () => {
      const { user: student1 } = await authService.registerStudent('student1reset', 'password123')
      const { user: student2 } = await authService.registerStudent('student2reset', 'password123')

      await expect(authService.resetUserPassword(student1.id, 'student', student2.id, 'newpw12345'))
        .rejects.toThrow('Unauthorized to reset passwords')
    })

    it('rejects short new password', async () => {
      const { user: admin } = await authService.registerParent(
        'adminshort', 'password123', 'adminshort@test.com'
      )
      const db = getTestDb()
      db.prepare('UPDATE users SET role = ? WHERE id = ?').run('admin', admin.id)

      const { user: student } = await authService.registerStudent('targetshort', 'password123')

      await expect(authService.resetUserPassword(admin.id, 'admin', student.id, 'short'))
        .rejects.toThrow('Password must be at least 8 characters')
    })
  })
})
