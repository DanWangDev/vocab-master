import { describe, it, expect, beforeEach } from 'vitest';
import { getTestDb } from '../../test/setup';
import { SqliteWordMasteryRepository } from '../sqlite/SqliteWordMasteryRepository';
import type { Database } from 'better-sqlite3';

describe('SqliteWordMasteryRepository', () => {
  let db: Database;
  let repo: SqliteWordMasteryRepository;
  let userId: number;

  beforeEach(() => {
    db = getTestDb();
    repo = new SqliteWordMasteryRepository(db);

    db.prepare(`INSERT INTO users (username, password_hash, role) VALUES ('student1', 'hash', 'student')`).run();
    userId = (db.prepare(`SELECT id FROM users WHERE username = 'student1'`).get() as { id: number }).id;
  });

  describe('upsertFromAnswer', () => {
    it('creates a new mastery record on first answer', () => {
      repo.upsertFromAnswer(userId, 'apple', true);

      const rows = repo.getByUserId(userId);
      expect(rows).toHaveLength(1);
      expect(rows[0].word).toBe('apple');
      expect(rows[0].correct_count).toBe(1);
      expect(rows[0].incorrect_count).toBe(0);
    });

    it('updates existing record on subsequent answers', () => {
      repo.upsertFromAnswer(userId, 'apple', true);
      repo.upsertFromAnswer(userId, 'apple', false);
      repo.upsertFromAnswer(userId, 'apple', true);

      const rows = repo.getByUserId(userId);
      expect(rows).toHaveLength(1);
      expect(rows[0].correct_count).toBe(2);
      expect(rows[0].incorrect_count).toBe(1);
    });

    it('tracks multiple words separately', () => {
      repo.upsertFromAnswer(userId, 'apple', true);
      repo.upsertFromAnswer(userId, 'banana', false);

      const rows = repo.getByUserId(userId);
      expect(rows).toHaveLength(2);
    });

    it('computes mastery level correctly', () => {
      // Answer correctly 5+ times with >90% accuracy → mastered (3)
      for (let i = 0; i < 6; i++) {
        repo.upsertFromAnswer(userId, 'expert', true);
      }
      const rows = repo.getByUserId(userId);
      const expert = rows.find(r => r.word === 'expert');
      expect(expert?.mastery_level).toBe(3);
    });
  });

  describe('getBreakdown', () => {
    it('returns zero counts for user with no data', () => {
      const breakdown = repo.getBreakdown(userId);
      expect(breakdown.total).toBe(0);
      expect(breakdown.new).toBe(0);
    });

    it('categorizes words by mastery level', () => {
      // One learning word
      repo.upsertFromAnswer(userId, 'apple', true);
      // One mastered word
      for (let i = 0; i < 6; i++) {
        repo.upsertFromAnswer(userId, 'banana', true);
      }

      const breakdown = repo.getBreakdown(userId);
      expect(breakdown.total).toBe(2);
      expect(breakdown.mastered).toBe(1);
    });
  });

  describe('getWeakWords', () => {
    it('returns words with high error rates first', () => {
      repo.upsertFromAnswer(userId, 'easy', true);
      repo.upsertFromAnswer(userId, 'hard', false);
      repo.upsertFromAnswer(userId, 'hard', false);

      const weak = repo.getWeakWords(userId);
      expect(weak[0].word).toBe('hard');
      expect(weak[0].incorrectCount).toBe(2);
    });
  });

  describe('getStrongWords', () => {
    it('returns mastered words', () => {
      for (let i = 0; i < 6; i++) {
        repo.upsertFromAnswer(userId, 'known', true);
      }
      repo.upsertFromAnswer(userId, 'unknown', false);

      const strong = repo.getStrongWords(userId);
      expect(strong).toHaveLength(1);
      expect(strong[0].word).toBe('known');
    });
  });

  describe('getLearningTrend', () => {
    it('returns trend data with dates', () => {
      const trend = repo.getLearningTrend(userId, 7);
      expect(trend.length).toBeGreaterThan(0);
      expect(trend[0]).toHaveProperty('date');
      expect(trend[0]).toHaveProperty('quizzes');
      expect(trend[0]).toHaveProperty('accuracy');
      expect(trend[0]).toHaveProperty('wordsStudied');
    });
  });
});
