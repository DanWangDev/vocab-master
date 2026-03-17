import { describe, it, expect } from 'vitest'
import { getTestDb, createTestStudent } from '../../test/helpers'
import { quizResultRepository } from '../index.js'
import type { CreateQuizResultParams } from '../../types/index.js'

function makeQuizParams(userId: number, overrides?: Partial<CreateQuizResultParams>): CreateQuizResultParams {
  return {
    userId,
    quizType: 'quiz',
    totalQuestions: 5,
    correctAnswers: 4,
    score: 80,
    timePerQuestion: 10,
    totalTimeSpent: 50,
    pointsEarned: 40,
    answers: [
      {
        questionIndex: 0,
        word: 'apple',
        promptType: 'definition',
        questionFormat: 'multiple_choice',
        correctAnswer: 'a fruit',
        selectedAnswer: 'a fruit',
        isCorrect: true,
        timeSpent: 8
      },
      {
        questionIndex: 1,
        word: 'banana',
        promptType: 'synonym',
        questionFormat: 'multiple_choice',
        correctAnswer: 'plantain',
        selectedAnswer: 'orange',
        isCorrect: false,
        timeSpent: 12
      }
    ],
    ...overrides
  }
}

describe('SqliteQuizResultRepository', () => {
  describe('create', () => {
    it('creates quiz result with answers in transaction', async () => {
      const student = await createTestStudent()

      const resultId = quizResultRepository.create(makeQuizParams(student.id))

      expect(resultId).toBeGreaterThan(0)

      const db = getTestDb()
      const result = db.prepare('SELECT * FROM quiz_results WHERE id = ?').get(resultId) as Record<string, unknown>
      expect(result.user_id).toBe(student.id)
      expect(result.quiz_type).toBe('quiz')
      expect(result.total_questions).toBe(5)
      expect(result.correct_answers).toBe(4)
      expect(result.score).toBe(80)
      expect(result.points_earned).toBe(40)

      const answers = db.prepare('SELECT * FROM quiz_answers WHERE quiz_result_id = ? ORDER BY question_index ASC')
        .all(resultId) as Array<Record<string, unknown>>
      expect(answers).toHaveLength(2)
      expect(answers[0].word).toBe('apple')
      expect(answers[0].is_correct).toBe(1)
      expect(answers[1].word).toBe('banana')
      expect(answers[1].is_correct).toBe(0)
    })
  })

  describe('getByUserId', () => {
    it('returns results in DESC order', async () => {
      const student = await createTestStudent()
      const db = getTestDb()

      const id1 = quizResultRepository.create(makeQuizParams(student.id, { score: 60 }))
      db.prepare("UPDATE quiz_results SET completed_at = datetime('now', '-1 hour') WHERE id = ?").run(id1)

      const id2 = quizResultRepository.create(makeQuizParams(student.id, { score: 90 }))

      const results = quizResultRepository.getByUserId(student.id)
      expect(results).toHaveLength(2)
      expect(results[0].id).toBe(id2)
      expect(results[1].id).toBe(id1)
    })

    it('returns empty array for user with no results', async () => {
      const student = await createTestStudent()

      const results = quizResultRepository.getByUserId(student.id)
      expect(results).toEqual([])
    })
  })

  describe('getAnswersByResultId', () => {
    it('returns answers in ASC order', async () => {
      const student = await createTestStudent()
      const resultId = quizResultRepository.create(makeQuizParams(student.id))

      const answers = quizResultRepository.getAnswersByResultId(resultId)
      expect(answers).toHaveLength(2)
      expect(answers[0].question_index).toBe(0)
      expect(answers[1].question_index).toBe(1)
      expect(answers[0].word).toBe('apple')
      expect(answers[1].word).toBe('banana')
    })

    it('returns empty array for non-existent result', () => {
      const answers = quizResultRepository.getAnswersByResultId(99999)
      expect(answers).toEqual([])
    })
  })

  describe('createStudySession', () => {
    it('creates session and tracks learned words via userRepo', async () => {
      const student = await createTestStudent()
      const startTime = new Date('2026-03-15T10:00:00Z')
      const endTime = new Date('2026-03-15T10:30:00Z')

      const sessionId = quizResultRepository.createStudySession({
        userId: student.id,
        wordsReviewed: 10,
        startTime,
        endTime,
        words: ['apple', 'banana', 'cherry']
      })

      expect(sessionId).toBeGreaterThan(0)

      const db = getTestDb()
      const session = db.prepare('SELECT * FROM study_sessions WHERE id = ?').get(sessionId) as Record<string, unknown>
      expect(session.user_id).toBe(student.id)
      expect(session.words_reviewed).toBe(10)

      // Verify learned words were tracked
      const vocab = db.prepare('SELECT * FROM user_vocabulary WHERE user_id = ?').all(student.id)
      expect(vocab).toHaveLength(3)
    })

    it('creates session without words', async () => {
      const student = await createTestStudent()

      const sessionId = quizResultRepository.createStudySession({
        userId: student.id,
        wordsReviewed: 5,
        startTime: new Date(),
        endTime: new Date()
      })

      expect(sessionId).toBeGreaterThan(0)

      const db = getTestDb()
      const vocab = db.prepare('SELECT * FROM user_vocabulary WHERE user_id = ?').all(student.id)
      expect(vocab).toHaveLength(0)
    })
  })

  describe('getStudySessionsByUserId', () => {
    it('returns sessions in DESC order', async () => {
      const student = await createTestStudent()
      const db = getTestDb()

      const id1 = quizResultRepository.createStudySession({
        userId: student.id,
        wordsReviewed: 5,
        startTime: new Date('2026-03-14T10:00:00Z'),
        endTime: new Date('2026-03-14T10:30:00Z')
      })
      db.prepare("UPDATE study_sessions SET created_at = datetime('now', '-1 hour') WHERE id = ?").run(id1)

      const id2 = quizResultRepository.createStudySession({
        userId: student.id,
        wordsReviewed: 10,
        startTime: new Date('2026-03-15T10:00:00Z'),
        endTime: new Date('2026-03-15T10:30:00Z')
      })

      const sessions = quizResultRepository.getStudySessionsByUserId(student.id)
      expect(sessions).toHaveLength(2)
      // DESC by created_at - later one should come first
      expect(sessions[0].id).toBe(id2)
      expect(sessions[1].id).toBe(id1)
    })

    it('returns empty array for user with no sessions', async () => {
      const student = await createTestStudent()

      const sessions = quizResultRepository.getStudySessionsByUserId(student.id)
      expect(sessions).toEqual([])
    })
  })
})
