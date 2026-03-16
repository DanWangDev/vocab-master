import { describe, it, expect } from 'vitest'
import { getTestDb, createTestStudent, createTestParent, createTestAdmin } from '../../test/helpers'
import {
  userRepository,
  settingsRepository,
  statsRepository
} from '../index.js'

describe('SqliteUserRepository', () => {
  describe('create', () => {
    it('creates a user with settings and stats, returns UserRow', () => {
      const user = userRepository.create('newuser', 'hashedpw123', 'New User')

      expect(user).toBeDefined()
      expect(user.id).toBeGreaterThan(0)
      expect(user.username).toBe('newuser')
      expect(user.password_hash).toBe('hashedpw123')
      expect(user.display_name).toBe('New User')
      expect(user.role).toBe('student') // default role
      expect(user.created_at).toBeDefined()

      const settings = settingsRepository.get(user.id)
      expect(settings).toBeDefined()
      expect(settings!.sound_enabled).toBe(1)
      expect(settings!.auto_advance).toBe(0)
      expect(settings!.language).toBe('en')

      const stats = statsRepository.get(user.id)
      expect(stats).toBeDefined()
      expect(stats!.total_words_studied).toBe(0)
      expect(stats!.quizzes_taken).toBe(0)
      expect(stats!.challenges_completed).toBe(0)
      expect(stats!.best_challenge_score).toBe(0)
      expect(stats!.last_study_date).toBeNull()
    })

    it('creates a user without display name', () => {
      const user = userRepository.create('nodisplay', 'hash')

      expect(user.display_name).toBeNull()
    })
  })

  describe('findById', () => {
    it('returns the user for a valid id', async () => {
      const student = await createTestStudent({ username: 'findme' })

      const found = userRepository.findById(student.id)
      expect(found).toBeDefined()
      expect(found!.username).toBe('findme')
    })

    it('returns undefined for non-existent id', () => {
      const found = userRepository.findById(99999)
      expect(found).toBeUndefined()
    })
  })

  describe('findByUsername', () => {
    it('performs case-sensitive lookup', async () => {
      await createTestStudent({ username: 'CaseSensitive' })

      const found = userRepository.findByUsername('CaseSensitive')
      expect(found).toBeDefined()
      expect(found!.username).toBe('CaseSensitive')

      const notFound = userRepository.findByUsername('casesensitive')
      expect(notFound).toBeUndefined()
    })
  })

  describe('findByEmail', () => {
    it('performs case-insensitive lookup', async () => {
      await createTestParent({ email: 'Test@Example.COM' })

      const found = userRepository.findByEmail('test@example.com')
      expect(found).toBeDefined()

      const foundUpper = userRepository.findByEmail('TEST@EXAMPLE.COM')
      expect(foundUpper).toBeDefined()
    })
  })

  describe('createStudent', () => {
    it('creates user with student role', () => {
      const user = userRepository.createStudent('studentuser', 'hash', 'Student')

      expect(user.role).toBe('student')
      expect(user.username).toBe('studentuser')
      expect(user.display_name).toBe('Student')
    })
  })

  describe('createParent', () => {
    it('creates user with parent role and lowercases email', () => {
      const user = userRepository.createParent('parentuser', 'hash', 'Parent@TEST.com', 'Parent')

      expect(user.role).toBe('parent')
      expect(user.email).toBe('parent@test.com')
      expect(user.email_verified).toBe(0)
    })
  })

  describe('createStudentForParent', () => {
    it('links student to parent via parent_id', async () => {
      const parent = await createTestParent()
      const student = userRepository.createStudentForParent('childuser', 'hash', parent.id, 'Child')

      expect(student.role).toBe('student')
      expect(student.parent_id).toBe(parent.id)
      expect(student.display_name).toBe('Child')
    })
  })

  describe('findByGoogleId', () => {
    it('finds Google-linked user', () => {
      const user = userRepository.createGoogleParent('guser', 'g@test.com', 'google-id-123', 'G User')

      const found = userRepository.findByGoogleId('google-id-123')
      expect(found).toBeDefined()
      expect(found!.id).toBe(user.id)
    })

    it('returns undefined for non-existent google id', () => {
      const found = userRepository.findByGoogleId('nonexistent')
      expect(found).toBeUndefined()
    })
  })

  describe('createGoogleParent', () => {
    it('creates parent with null password_hash, google auth_provider, email_verified=1', () => {
      const user = userRepository.createGoogleParent('gparent', 'gparent@test.com', 'gid-456', 'Google Parent')

      expect(user.password_hash).toBeNull()
      expect(user.auth_provider).toBe('google')
      expect(user.email_verified).toBe(1)
      expect(user.role).toBe('parent')
      expect(user.google_id).toBe('gid-456')
      expect(user.email).toBe('gparent@test.com')
    })
  })

  describe('linkGoogleAccount', () => {
    it('updates google_id and auth_provider', async () => {
      const parent = await createTestParent()

      userRepository.linkGoogleAccount(parent.id, 'new-google-id')

      const updated = userRepository.findById(parent.id)
      expect(updated!.google_id).toBe('new-google-id')
      expect(updated!.auth_provider).toBe('google')
    })
  })

  describe('updatePassword', () => {
    it('updates password_hash', async () => {
      const student = await createTestStudent()

      userRepository.updatePassword(student.id, 'newhash')

      const updated = userRepository.findById(student.id)
      expect(updated!.password_hash).toBe('newhash')
    })
  })

  describe('setEmailVerified', () => {
    it('toggles email_verified', async () => {
      const parent = await createTestParent()

      userRepository.setEmailVerified(parent.id, true)
      let updated = userRepository.findById(parent.id)
      expect(updated!.email_verified).toBe(1)

      userRepository.setEmailVerified(parent.id, false)
      updated = userRepository.findById(parent.id)
      expect(updated!.email_verified).toBe(0)
    })
  })

  describe('updateDisplayName', () => {
    it('updates display_name', async () => {
      const student = await createTestStudent()

      userRepository.updateDisplayName(student.id, 'New Name')

      const updated = userRepository.findById(student.id)
      expect(updated!.display_name).toBe('New Name')
    })
  })

  describe('updateUsername', () => {
    it('updates username', async () => {
      const student = await createTestStudent()

      userRepository.updateUsername(student.id, 'updatedname')

      const updated = userRepository.findById(student.id)
      expect(updated!.username).toBe('updatedname')
    })
  })

  describe('delete', () => {
    it('removes user', async () => {
      const student = await createTestStudent()

      userRepository.delete(student.id)

      const found = userRepository.findById(student.id)
      expect(found).toBeUndefined()
    })
  })

  describe('addLearnedWords', () => {
    it('inserts new words and returns count', async () => {
      const student = await createTestStudent()

      const count = userRepository.addLearnedWords(student.id, ['apple', 'banana', 'cherry'])
      expect(count).toBe(3)

      const db = getTestDb()
      const rows = db.prepare('SELECT * FROM user_vocabulary WHERE user_id = ?').all(student.id)
      expect(rows).toHaveLength(3)
    })

    it('updates last_seen for existing words and only counts new ones', async () => {
      const student = await createTestStudent()

      userRepository.addLearnedWords(student.id, ['apple', 'banana'])

      // Set initial last_seen_at to the past so we can verify the update
      const db = getTestDb()
      db.prepare(
        "UPDATE user_vocabulary SET last_seen_at = datetime('now', '-1 day') WHERE user_id = ? AND word = ?"
      ).run(student.id, 'apple')

      const before = db.prepare(
        'SELECT last_seen_at FROM user_vocabulary WHERE user_id = ? AND word = ?'
      ).get(student.id, 'apple') as { last_seen_at: string }

      const count = userRepository.addLearnedWords(student.id, ['apple', 'cherry'])
      expect(count).toBe(1) // only cherry is new

      const after = db.prepare(
        'SELECT last_seen_at FROM user_vocabulary WHERE user_id = ? AND word = ?'
      ).get(student.id, 'apple') as { last_seen_at: string }
      expect(after.last_seen_at).not.toBe(before.last_seen_at)
    })

    it('handles empty array', async () => {
      const student = await createTestStudent()

      const count = userRepository.addLearnedWords(student.id, [])
      expect(count).toBe(0)
    })
  })
})

describe('SqliteSettingsRepository', () => {
  describe('get', () => {
    it('returns settings for user', async () => {
      const student = await createTestStudent()

      const settings = settingsRepository.get(student.id)
      expect(settings).toBeDefined()
      expect(settings!.user_id).toBe(student.id)
      expect(settings!.sound_enabled).toBe(1)
      expect(settings!.auto_advance).toBe(0)
      expect(settings!.language).toBe('en')
    })

    it('returns undefined for non-existent user', () => {
      const settings = settingsRepository.get(99999)
      expect(settings).toBeUndefined()
    })
  })

  describe('createDefault', () => {
    it('creates default settings (sound on, auto-advance off, language en)', () => {
      const db = getTestDb()
      // Insert a bare user without settings
      const result = db.prepare(
        "INSERT INTO users (username, password_hash, role) VALUES ('bare', 'hash', 'student')"
      ).run()
      const userId = result.lastInsertRowid as number

      const settings = settingsRepository.createDefault(userId)

      expect(settings.user_id).toBe(userId)
      expect(settings.sound_enabled).toBe(1)
      expect(settings.auto_advance).toBe(0)
      expect(settings.language).toBe('en')
    })
  })

  describe('update', () => {
    it('updates partial fields', async () => {
      const student = await createTestStudent()

      const updated = settingsRepository.update(student.id, true, undefined, 'fr')

      expect(updated.sound_enabled).toBe(1)
      expect(updated.auto_advance).toBe(0) // preserved
      expect(updated.language).toBe('fr')
    })

    it('preserves unchanged fields', async () => {
      const student = await createTestStudent()

      settingsRepository.update(student.id, false, true, 'de')
      const updated = settingsRepository.update(student.id, undefined, undefined, undefined)

      expect(updated.sound_enabled).toBe(0)
      expect(updated.auto_advance).toBe(1)
      expect(updated.language).toBe('de')
    })

    it('throws for non-existent user', () => {
      expect(() => settingsRepository.update(99999, true)).toThrow('Settings not found for user')
    })
  })
})

describe('SqliteStatsRepository', () => {
  describe('get', () => {
    it('returns stats for user', async () => {
      const student = await createTestStudent()

      const stats = statsRepository.get(student.id)
      expect(stats).toBeDefined()
      expect(stats!.user_id).toBe(student.id)
      expect(stats!.total_words_studied).toBe(0)
    })

    it('returns undefined for non-existent user', () => {
      const stats = statsRepository.get(99999)
      expect(stats).toBeUndefined()
    })
  })

  describe('createDefault', () => {
    it('creates zero stats', () => {
      const db = getTestDb()
      const result = db.prepare(
        "INSERT INTO users (username, password_hash, role) VALUES ('bare2', 'hash', 'student')"
      ).run()
      const userId = result.lastInsertRowid as number

      const stats = statsRepository.createDefault(userId)

      expect(stats.user_id).toBe(userId)
      expect(stats.total_words_studied).toBe(0)
      expect(stats.quizzes_taken).toBe(0)
      expect(stats.challenges_completed).toBe(0)
      expect(stats.best_challenge_score).toBe(0)
      expect(stats.last_study_date).toBeNull()
    })
  })

  describe('update', () => {
    it('updates partial fields', async () => {
      const student = await createTestStudent()

      const updated = statsRepository.update(student.id, {
        totalWordsStudied: 50,
        quizzesTaken: 5
      })

      expect(updated.total_words_studied).toBe(50)
      expect(updated.quizzes_taken).toBe(5)
      expect(updated.challenges_completed).toBe(0) // preserved
      expect(updated.best_challenge_score).toBe(0)
    })

    it('preserves unchanged fields', async () => {
      const student = await createTestStudent()

      statsRepository.update(student.id, {
        totalWordsStudied: 100,
        bestChallengeScore: 95
      })

      const updated = statsRepository.update(student.id, {
        quizzesTaken: 10
      })

      expect(updated.total_words_studied).toBe(100)
      expect(updated.best_challenge_score).toBe(95)
      expect(updated.quizzes_taken).toBe(10)
    })

    it('throws for non-existent user', () => {
      expect(() => statsRepository.update(99999, { totalWordsStudied: 1 })).toThrow('Stats not found for user')
    })
  })

  describe('incrementStats', () => {
    it('increments specific fields additively', async () => {
      const student = await createTestStudent()

      statsRepository.update(student.id, {
        totalWordsStudied: 10,
        quizzesTaken: 2,
        challengesCompleted: 1
      })

      const incremented = statsRepository.incrementStats(student.id, {
        totalWordsStudied: 5,
        quizzesTaken: 3
      })

      expect(incremented.total_words_studied).toBe(15)
      expect(incremented.quizzes_taken).toBe(5)
      expect(incremented.challenges_completed).toBe(1) // unchanged
    })

    it('throws for non-existent user', () => {
      expect(() => statsRepository.incrementStats(99999, { totalWordsStudied: 1 })).toThrow('Stats not found for user')
    })
  })
})
