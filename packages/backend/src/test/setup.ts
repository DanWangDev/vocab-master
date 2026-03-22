import Database from 'better-sqlite3'
import type { Database as DatabaseType } from 'better-sqlite3'
import { vi, beforeEach, afterAll } from 'vitest'
import { Migrator } from '../config/migrator'
import { migrations } from '../migrations'

// Create in-memory database for tests
let testDb: DatabaseType = new Database(':memory:')
testDb.pragma('foreign_keys = ON')

// Run all migrations against the in-memory database
const migrator = new Migrator(testDb, migrations)
migrator.migrate()

// Mock the database module so all imports get our test DB
vi.mock('../config/database', () => ({
  db: testDb,
  default: testDb,
  initializeDatabase: vi.fn(),
  closeDatabase: vi.fn()
}))

// Mock the logger to suppress output during tests
vi.mock('../services/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    audit: vi.fn()
  }
}))

// Set JWT_SECRET for auth tests
process.env.JWT_SECRET = 'test-secret-key-for-testing-only-not-production'

/**
 * Returns the current test database instance.
 */
export function getTestDb(): DatabaseType {
  return testDb
}

/**
 * List of tables to truncate between tests, ordered to respect FK constraints.
 */
const TABLES_TO_TRUNCATE = [
  'quiz_answers',
  'quiz_results',
  'study_sessions',
  'daily_challenges',
  'user_vocabulary',
  'user_active_wordlist',
  'wordlist_words',
  'wordlists',
  'refresh_tokens',
  'password_reset_tokens',
  'push_tokens',
  'notifications',
  'link_requests',
  'audit_log',
  'user_achievements',
  'leaderboard_entries',
  'group_wordlists',
  'group_members',
  'groups',
  'user_xp',
  'user_rewards',
  'user_settings',
  'user_stats',
  'users'
]

/**
 * Truncates all data tables, preserving schema.
 * Called between tests for isolation.
 */
export function cleanDatabase(): void {
  testDb.pragma('foreign_keys = OFF')
  for (const table of TABLES_TO_TRUNCATE) {
    try {
      testDb.prepare(`DELETE FROM ${table}`).run()
    } catch {
      // Table may not exist if migration was skipped in test env
    }
  }
  testDb.pragma('foreign_keys = ON')
}

// Clean database between each test
beforeEach(() => {
  cleanDatabase()
})

// Close database after all tests complete
afterAll(() => {
  testDb.close()
})
