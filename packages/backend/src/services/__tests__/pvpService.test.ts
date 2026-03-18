import { describe, it, expect, vi } from 'vitest'
import { getTestDb, createTestStudent } from '../../test/helpers'

// Mock the achievementService to prevent side effects
vi.mock('../achievementService', () => ({
  checkAndAwardAchievements: vi.fn()
}))

import { pvpService } from '../pvpService'

function seedWordlist(wordCount = 10): number {
  const db = getTestDb()
  const result = db.prepare(`
    INSERT INTO wordlists (name, description, is_system, visibility, word_count)
    VALUES ('PvP Test List', 'Test', 0, 'public', ?)
  `).run(wordCount)

  const wordlistId = result.lastInsertRowid as number

  for (let i = 0; i < wordCount; i++) {
    db.prepare(`
      INSERT INTO wordlist_words (wordlist_id, target_word, definitions, synonyms, example_sentences, sort_order)
      VALUES (?, ?, ?, '[]', '[]', ?)
    `).run(wordlistId, `word${i}`, JSON.stringify([`definition of word${i}`]), i)
  }

  return wordlistId
}

describe('pvpService', () => {
  describe('createChallenge', () => {
    it('creates a challenge between two users', async () => {
      const challenger = await createTestStudent()
      const opponent = await createTestStudent()
      const wordlistId = seedWordlist(10)

      const challenge = pvpService.createChallenge(challenger.id, opponent.id, wordlistId, 10)

      expect(challenge.challenger_id).toBe(challenger.id)
      expect(challenge.opponent_id).toBe(opponent.id)
      expect(challenge.wordlist_id).toBe(wordlistId)
      expect(challenge.status).toBe('pending')
      expect(challenge.question_count).toBe(10)
    })

    it('throws when challenging yourself', async () => {
      const user = await createTestStudent()
      const wordlistId = seedWordlist(10)

      expect(() => pvpService.createChallenge(user.id, user.id, wordlistId, 10))
        .toThrow('Cannot challenge yourself')
    })

    it('throws when wordlist has insufficient words', async () => {
      const challenger = await createTestStudent()
      const opponent = await createTestStudent()
      const wordlistId = seedWordlist(3)

      expect(() => pvpService.createChallenge(challenger.id, opponent.id, wordlistId, 10))
        .toThrow('Wordlist needs at least 10 words')
    })

    it('creates a notification for the opponent', async () => {
      const db = getTestDb()
      const challenger = await createTestStudent()
      const opponent = await createTestStudent()
      const wordlistId = seedWordlist(10)

      pvpService.createChallenge(challenger.id, opponent.id, wordlistId, 10)

      const notifications = db.prepare(
        'SELECT * FROM notifications WHERE user_id = ?'
      ).all(opponent.id) as Array<{ user_id: number; title: string }>

      expect(notifications.length).toBeGreaterThanOrEqual(1)
      expect(notifications[0].title).toBe('New PvP Challenge!')
    })
  })

  describe('acceptChallenge', () => {
    it('sets challenge status to active', async () => {
      const challenger = await createTestStudent()
      const opponent = await createTestStudent()
      const wordlistId = seedWordlist(10)

      const challenge = pvpService.createChallenge(challenger.id, opponent.id, wordlistId, 10)
      const accepted = pvpService.acceptChallenge(challenge.id, opponent.id)

      expect(accepted.status).toBe('active')
    })

    it('throws if user is not the opponent', async () => {
      const challenger = await createTestStudent()
      const opponent = await createTestStudent()
      const wordlistId = seedWordlist(10)

      const challenge = pvpService.createChallenge(challenger.id, opponent.id, wordlistId, 10)

      expect(() => pvpService.acceptChallenge(challenge.id, challenger.id))
        .toThrow('Not your challenge')
    })

    it('throws if challenge is not pending', async () => {
      const challenger = await createTestStudent()
      const opponent = await createTestStudent()
      const wordlistId = seedWordlist(10)

      const challenge = pvpService.createChallenge(challenger.id, opponent.id, wordlistId, 10)
      pvpService.acceptChallenge(challenge.id, opponent.id)

      expect(() => pvpService.acceptChallenge(challenge.id, opponent.id))
        .toThrow('Challenge is not pending')
    })

    it('throws for non-existent challenge', async () => {
      const opponent = await createTestStudent()

      expect(() => pvpService.acceptChallenge(99999, opponent.id))
        .toThrow('Challenge not found')
    })
  })

  describe('declineChallenge', () => {
    it('sets challenge status to declined', async () => {
      const db = getTestDb()
      const challenger = await createTestStudent()
      const opponent = await createTestStudent()
      const wordlistId = seedWordlist(10)

      const challenge = pvpService.createChallenge(challenger.id, opponent.id, wordlistId, 10)
      pvpService.declineChallenge(challenge.id, opponent.id)

      const updated = db.prepare('SELECT status FROM pvp_challenges WHERE id = ?')
        .get(challenge.id) as { status: string }

      expect(updated.status).toBe('declined')
    })

    it('notifies the challenger on decline', async () => {
      const db = getTestDb()
      const challenger = await createTestStudent()
      const opponent = await createTestStudent()
      const wordlistId = seedWordlist(10)

      const challenge = pvpService.createChallenge(challenger.id, opponent.id, wordlistId, 10)
      pvpService.declineChallenge(challenge.id, opponent.id)

      const notifications = db.prepare(
        'SELECT * FROM notifications WHERE user_id = ? AND title = ?'
      ).all(challenger.id, 'Challenge Declined') as Array<{ user_id: number }>

      expect(notifications.length).toBe(1)
    })

    it('throws if not the opponent', async () => {
      const challenger = await createTestStudent()
      const opponent = await createTestStudent()
      const wordlistId = seedWordlist(10)

      const challenge = pvpService.createChallenge(challenger.id, opponent.id, wordlistId, 10)

      expect(() => pvpService.declineChallenge(challenge.id, challenger.id))
        .toThrow('Not your challenge')
    })
  })

  describe('submitAnswers', () => {
    it('calculates score from correct answers', async () => {
      const challenger = await createTestStudent()
      const opponent = await createTestStudent()
      const wordlistId = seedWordlist(10)

      const challenge = pvpService.createChallenge(challenger.id, opponent.id, wordlistId, 5)
      pvpService.acceptChallenge(challenge.id, opponent.id)

      const answers = [
        { questionIndex: 0, word: 'word0', correctAnswer: 'def0', selectedAnswer: 'def0', isCorrect: true, timeSpent: 5 },
        { questionIndex: 1, word: 'word1', correctAnswer: 'def1', selectedAnswer: 'def1', isCorrect: true, timeSpent: 5 },
        { questionIndex: 2, word: 'word2', correctAnswer: 'def2', selectedAnswer: 'wrong', isCorrect: false, timeSpent: 5 },
        { questionIndex: 3, word: 'word3', correctAnswer: 'def3', selectedAnswer: 'def3', isCorrect: true, timeSpent: 5 },
        { questionIndex: 4, word: 'word4', correctAnswer: 'def4', selectedAnswer: 'wrong', isCorrect: false, timeSpent: 5 },
      ]

      const result = pvpService.submitAnswers(challenge.id, challenger.id, answers)

      // 3 out of 5 correct => 60%
      expect(result.score).toBe(60)
      expect(result.waiting).toBe(true)
    })

    it('throws if user already submitted answers', async () => {
      const challenger = await createTestStudent()
      const opponent = await createTestStudent()
      const wordlistId = seedWordlist(10)

      const challenge = pvpService.createChallenge(challenger.id, opponent.id, wordlistId, 2)
      pvpService.acceptChallenge(challenge.id, opponent.id)

      const answers = [
        { questionIndex: 0, word: 'word0', correctAnswer: 'def0', selectedAnswer: 'def0', isCorrect: true, timeSpent: 5 },
        { questionIndex: 1, word: 'word1', correctAnswer: 'def1', selectedAnswer: 'def1', isCorrect: true, timeSpent: 5 },
      ]

      pvpService.submitAnswers(challenge.id, challenger.id, answers)

      expect(() => pvpService.submitAnswers(challenge.id, challenger.id, answers))
        .toThrow('Already submitted answers')
    })

    it('throws if challenge is not active', async () => {
      const challenger = await createTestStudent()
      const opponent = await createTestStudent()
      const wordlistId = seedWordlist(10)

      const challenge = pvpService.createChallenge(challenger.id, opponent.id, wordlistId, 2)

      const answers = [
        { questionIndex: 0, word: 'word0', correctAnswer: 'def0', selectedAnswer: 'def0', isCorrect: true, timeSpent: 5 },
      ]

      expect(() => pvpService.submitAnswers(challenge.id, challenger.id, answers))
        .toThrow('Challenge is not active')
    })

    it('resolves the challenge when both players submit', async () => {
      const challenger = await createTestStudent()
      const opponent = await createTestStudent()
      const wordlistId = seedWordlist(10)

      const challenge = pvpService.createChallenge(challenger.id, opponent.id, wordlistId, 2)
      pvpService.acceptChallenge(challenge.id, opponent.id)

      const challengerAnswers = [
        { questionIndex: 0, word: 'word0', correctAnswer: 'def0', selectedAnswer: 'def0', isCorrect: true, timeSpent: 5 },
        { questionIndex: 1, word: 'word1', correctAnswer: 'def1', selectedAnswer: 'def1', isCorrect: true, timeSpent: 5 },
      ]

      const opponentAnswers = [
        { questionIndex: 0, word: 'word0', correctAnswer: 'def0', selectedAnswer: 'wrong', isCorrect: false, timeSpent: 5 },
        { questionIndex: 1, word: 'word1', correctAnswer: 'def1', selectedAnswer: 'def1', isCorrect: true, timeSpent: 5 },
      ]

      pvpService.submitAnswers(challenge.id, challenger.id, challengerAnswers)
      const result = pvpService.submitAnswers(challenge.id, opponent.id, opponentAnswers)

      expect(result.waiting).toBe(false)

      const resolved = pvpService.getChallenge(challenge.id)
      expect(resolved?.winner_id).toBe(challenger.id)
    })
  })

  describe('getQuestions', () => {
    it('returns questions for an active challenge participant', async () => {
      const challenger = await createTestStudent()
      const opponent = await createTestStudent()
      const wordlistId = seedWordlist(10)

      const challenge = pvpService.createChallenge(challenger.id, opponent.id, wordlistId, 5)
      pvpService.acceptChallenge(challenge.id, opponent.id)

      const questions = pvpService.getQuestions(challenge.id, challenger.id)

      expect(questions).toHaveLength(5)
      expect(questions[0]).toHaveProperty('word')
      expect(questions[0]).toHaveProperty('correctAnswer')
      expect(questions[0]).toHaveProperty('options')
      expect(questions[0].options).toHaveLength(4)
    })

    it('throws for non-participant', async () => {
      const challenger = await createTestStudent()
      const opponent = await createTestStudent()
      const outsider = await createTestStudent()
      const wordlistId = seedWordlist(10)

      const challenge = pvpService.createChallenge(challenger.id, opponent.id, wordlistId, 5)
      pvpService.acceptChallenge(challenge.id, opponent.id)

      expect(() => pvpService.getQuestions(challenge.id, outsider.id))
        .toThrow('Not your challenge')
    })

    it('throws for non-active challenge', async () => {
      const challenger = await createTestStudent()
      const opponent = await createTestStudent()
      const wordlistId = seedWordlist(10)

      const challenge = pvpService.createChallenge(challenger.id, opponent.id, wordlistId, 5)

      expect(() => pvpService.getQuestions(challenge.id, challenger.id))
        .toThrow('Challenge is not active')
    })
  })

  describe('expireChallenges', () => {
    it('expires challenges past their expiry date', async () => {
      const db = getTestDb()
      const challenger = await createTestStudent()
      const opponent = await createTestStudent()
      const wordlistId = seedWordlist(10)

      db.prepare(`
        INSERT INTO pvp_challenges (challenger_id, opponent_id, wordlist_id, status, question_count, expires_at)
        VALUES (?, ?, ?, 'pending', 10, datetime('now', '-1 hour'))
      `).run(challenger.id, opponent.id, wordlistId)

      const expiredCount = pvpService.expireChallenges()

      expect(expiredCount).toBe(1)
    })

    it('returns 0 when no challenges are expired', async () => {
      const expiredCount = pvpService.expireChallenges()
      expect(expiredCount).toBe(0)
    })
  })

  describe('resolveChallenge', () => {
    it('sets winner to null on a draw', async () => {
      const challenger = await createTestStudent()
      const opponent = await createTestStudent()
      const wordlistId = seedWordlist(10)

      const challenge = pvpService.createChallenge(challenger.id, opponent.id, wordlistId, 2)
      pvpService.acceptChallenge(challenge.id, opponent.id)

      const answers = [
        { questionIndex: 0, word: 'word0', correctAnswer: 'def0', selectedAnswer: 'def0', isCorrect: true, timeSpent: 5 },
        { questionIndex: 1, word: 'word1', correctAnswer: 'def1', selectedAnswer: 'def1', isCorrect: true, timeSpent: 5 },
      ]

      pvpService.submitAnswers(challenge.id, challenger.id, answers)
      pvpService.submitAnswers(challenge.id, opponent.id, answers)

      const resolved = pvpService.getChallenge(challenge.id)
      expect(resolved?.winner_id).toBeNull()
    })
  })

  describe('getPending', () => {
    it('returns pending challenges for a user', async () => {
      const challenger = await createTestStudent()
      const opponent = await createTestStudent()
      const wordlistId = seedWordlist(10)

      pvpService.createChallenge(challenger.id, opponent.id, wordlistId, 5)

      const pending = pvpService.getPending(opponent.id)

      expect(pending.length).toBeGreaterThanOrEqual(1)
      expect(pending[0].status).toBe('pending')
    })
  })

  describe('getHistory', () => {
    it('returns completed challenges', async () => {
      const challenger = await createTestStudent()
      const opponent = await createTestStudent()
      const wordlistId = seedWordlist(10)

      const challenge = pvpService.createChallenge(challenger.id, opponent.id, wordlistId, 2)
      pvpService.acceptChallenge(challenge.id, opponent.id)

      const answers = [
        { questionIndex: 0, word: 'word0', correctAnswer: 'def0', selectedAnswer: 'def0', isCorrect: true, timeSpent: 5 },
        { questionIndex: 1, word: 'word1', correctAnswer: 'def1', selectedAnswer: 'def1', isCorrect: true, timeSpent: 5 },
      ]

      pvpService.submitAnswers(challenge.id, challenger.id, answers)
      pvpService.submitAnswers(challenge.id, opponent.id, answers)

      const history = pvpService.getHistory(challenger.id)

      expect(history.length).toBeGreaterThanOrEqual(1)
    })
  })
})
