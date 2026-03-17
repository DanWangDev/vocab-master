import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { getTestDb } from './setup'
export { getTestDb } from './setup'
import type { JWTPayload } from '../types'

const JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key-for-testing-only-not-production'
const FAST_HASH_ROUNDS = 4 // Low rounds for fast tests

export interface TestUser {
  id: number
  username: string
  role: 'student' | 'parent' | 'admin'
  displayName: string | null
  email: string | null
  passwordHash: string
}

/**
 * Creates a test user with the given role and returns their info.
 * Uses low bcrypt rounds for speed.
 */
export async function createTestUser(options: {
  username?: string
  password?: string
  role?: 'student' | 'parent' | 'admin'
  displayName?: string
  email?: string
  parentId?: number
}): Promise<TestUser> {
  const db = getTestDb()
  const {
    username = `testuser_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    password = 'testpassword123',
    role = 'student',
    displayName = null,
    email = null,
    parentId = null
  } = options

  const passwordHash = await bcrypt.hash(password, FAST_HASH_ROUNDS)

  const result = db.prepare(`
    INSERT INTO users (username, password_hash, display_name, role, email, email_verified, auth_provider, parent_id)
    VALUES (?, ?, ?, ?, ?, 0, 'local', ?)
  `).run(username, passwordHash, displayName, role, email, parentId)

  const userId = result.lastInsertRowid as number

  // Create default settings and stats
  db.prepare(`
    INSERT INTO user_settings (user_id, sound_enabled, auto_advance, language)
    VALUES (?, 1, 0, 'en')
  `).run(userId)

  db.prepare(`
    INSERT INTO user_stats (user_id, total_words_studied, quizzes_taken, challenges_completed, best_challenge_score, last_study_date)
    VALUES (?, 0, 0, 0, 0, NULL)
  `).run(userId)

  return {
    id: userId,
    username,
    role,
    displayName: displayName || null,
    email: email || null,
    passwordHash
  }
}

/**
 * Creates a student test user.
 */
export async function createTestStudent(
  overrides?: Partial<Parameters<typeof createTestUser>[0]>
): Promise<TestUser> {
  return createTestUser({
    role: 'student',
    username: `student_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    ...overrides
  })
}

/**
 * Creates a parent test user.
 */
export async function createTestParent(
  overrides?: Partial<Parameters<typeof createTestUser>[0]>
): Promise<TestUser> {
  return createTestUser({
    role: 'parent',
    username: `parent_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    email: `parent_${Date.now()}@test.com`,
    ...overrides
  })
}

/**
 * Creates an admin test user.
 */
export async function createTestAdmin(
  overrides?: Partial<Parameters<typeof createTestUser>[0]>
): Promise<TestUser> {
  return createTestUser({
    role: 'admin',
    username: `admin_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    email: `admin_${Date.now()}@test.com`,
    ...overrides
  })
}

/**
 * Generates a valid JWT access token for the given user.
 */
export function generateTestToken(user: {
  id: number
  username: string
  role: 'student' | 'parent' | 'admin'
}): string {
  const payload: JWTPayload = {
    userId: user.id,
    username: user.username,
    role: user.role
  }
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' })
}

/**
 * Generates an expired JWT token for testing token expiry.
 */
export function generateExpiredToken(user: {
  id: number
  username: string
  role: 'student' | 'parent' | 'admin'
}): string {
  const payload: JWTPayload = {
    userId: user.id,
    username: user.username,
    role: user.role
  }
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '-1s' })
}

/**
 * Seeds quiz results for a user.
 */
export function seedQuizResults(
  userId: number,
  quizzes: Array<{
    totalQuestions: number
    correctAnswers: number
    score?: number
    totalTimeSpent?: number
    quizType?: 'quiz' | 'challenge'
    completedAt?: string
  }>
): number[] {
  const db = getTestDb()
  const ids: number[] = []

  for (const quiz of quizzes) {
    const result = db.prepare(`
      INSERT INTO quiz_results (user_id, quiz_type, total_questions, correct_answers, score, total_time_spent, completed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      userId,
      quiz.quizType || 'quiz',
      quiz.totalQuestions,
      quiz.correctAnswers,
      quiz.score ?? quiz.correctAnswers * 10,
      quiz.totalTimeSpent ?? 60,
      quiz.completedAt ?? new Date().toISOString()
    )
    ids.push(result.lastInsertRowid as number)
  }

  return ids
}

/**
 * Seeds quiz answers for a quiz result.
 */
export function seedQuizAnswers(
  quizResultId: number,
  answers: Array<{
    word: string
    isCorrect: boolean
    questionIndex?: number
  }>
): void {
  const db = getTestDb()

  for (let i = 0; i < answers.length; i++) {
    const answer = answers[i]
    db.prepare(`
      INSERT INTO quiz_answers (quiz_result_id, question_index, word, prompt_type, question_format, correct_answer, selected_answer, is_correct, time_spent)
      VALUES (?, ?, ?, 'definition', 'multiple_choice', 'correct', ?, ?, 5)
    `).run(
      quizResultId,
      answer.questionIndex ?? i,
      answer.word,
      answer.isCorrect ? 'correct' : 'wrong',
      answer.isCorrect ? 1 : 0
    )
  }
}

/**
 * Seeds study sessions for a user.
 */
export function seedStudySessions(
  userId: number,
  sessions: Array<{
    wordsReviewed: number
    startTime?: string
    endTime?: string
  }>
): void {
  const db = getTestDb()

  for (const session of sessions) {
    const startTime = session.startTime ?? new Date().toISOString()
    const endTime = session.endTime ?? new Date(Date.now() + 30 * 60 * 1000).toISOString()

    db.prepare(`
      INSERT INTO study_sessions (user_id, words_reviewed, start_time, end_time)
      VALUES (?, ?, ?, ?)
    `).run(userId, session.wordsReviewed, startTime, endTime)
  }
}

/**
 * Seeds daily challenges for a user.
 */
export function seedDailyChallenges(
  userId: number,
  challenges: Array<{
    score: number
    challengeDate?: string
    createdAt?: string
  }>
): void {
  const db = getTestDb()

  for (const challenge of challenges) {
    const challengeDate = challenge.challengeDate ?? new Date().toISOString().split('T')[0]
    const createdAt = challenge.createdAt ?? new Date().toISOString()

    db.prepare(`
      INSERT INTO daily_challenges (user_id, challenge_date, score, created_at)
      VALUES (?, ?, ?, ?)
    `).run(userId, challengeDate, challenge.score, createdAt)
  }
}

/**
 * Seeds user vocabulary entries.
 */
export function seedUserVocabulary(
  userId: number,
  words: string[]
): void {
  const db = getTestDb()

  for (const word of words) {
    db.prepare(`
      INSERT OR IGNORE INTO user_vocabulary (user_id, word)
      VALUES (?, ?)
    `).run(userId, word)
  }
}
