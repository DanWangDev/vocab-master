import type { Database } from 'better-sqlite3';
import type { WordMasteryRow, MasteryBreakdown, WordMasterySummary } from '../../types/index.js';
import type { IWordMasteryRepository } from '../interfaces/index.js';

function computeMasteryLevel(correct: number, incorrect: number): number {
  const total = correct + incorrect;
  if (total === 0) return 0;
  const accuracy = correct / total;
  if (accuracy >= 0.9 && total >= 5) return 3; // mastered
  if (accuracy >= 0.7 && total >= 3) return 2; // familiar
  if (total >= 1) return 1; // learning
  return 0; // new
}

export class SqliteWordMasteryRepository implements IWordMasteryRepository {
  constructor(private readonly db: Database) {}

  upsertFromAnswer(userId: number, word: string, isCorrect: boolean, wordlistId?: number): void {
    const existing = this.db.prepare(
      'SELECT * FROM word_mastery WHERE user_id = ? AND word = ?'
    ).get(userId, word) as WordMasteryRow | undefined;

    const now = new Date().toISOString();

    if (existing) {
      const newCorrect = existing.correct_count + (isCorrect ? 1 : 0);
      const newIncorrect = existing.incorrect_count + (isCorrect ? 0 : 1);
      const masteryLevel = computeMasteryLevel(newCorrect, newIncorrect);

      this.db.prepare(`
        UPDATE word_mastery SET
          correct_count = ?,
          incorrect_count = ?,
          last_correct_at = CASE WHEN ? THEN ? ELSE last_correct_at END,
          last_incorrect_at = CASE WHEN ? THEN ? ELSE last_incorrect_at END,
          mastery_level = ?,
          updated_at = ?
        WHERE id = ?
      `).run(
        newCorrect,
        newIncorrect,
        isCorrect ? 1 : 0, now,
        isCorrect ? 0 : 1, now,
        masteryLevel,
        now,
        existing.id
      );
    } else {
      const masteryLevel = computeMasteryLevel(isCorrect ? 1 : 0, isCorrect ? 0 : 1);
      this.db.prepare(`
        INSERT INTO word_mastery (
          user_id, word, wordlist_id, correct_count, incorrect_count,
          last_correct_at, last_incorrect_at, mastery_level, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        userId,
        word,
        wordlistId ?? null,
        isCorrect ? 1 : 0,
        isCorrect ? 0 : 1,
        isCorrect ? now : null,
        isCorrect ? null : now,
        masteryLevel,
        now,
        now
      );
    }
  }

  getByUserId(userId: number): WordMasteryRow[] {
    return this.db.prepare(
      'SELECT * FROM word_mastery WHERE user_id = ? ORDER BY updated_at DESC'
    ).all(userId) as WordMasteryRow[];
  }

  getBreakdown(userId: number): MasteryBreakdown {
    const rows = this.db.prepare(`
      SELECT
        mastery_level,
        COUNT(*) as count
      FROM word_mastery
      WHERE user_id = ?
      GROUP BY mastery_level
    `).all(userId) as Array<{ mastery_level: number; count: number }>;

    const breakdown: MasteryBreakdown = { new: 0, learning: 0, familiar: 0, mastered: 0, total: 0 };
    for (const row of rows) {
      switch (row.mastery_level) {
        case 0: breakdown.new = row.count; break;
        case 1: breakdown.learning = row.count; break;
        case 2: breakdown.familiar = row.count; break;
        case 3: breakdown.mastered = row.count; break;
      }
      breakdown.total += row.count;
    }
    return breakdown;
  }

  getWeakWords(userId: number, limit = 20): WordMasterySummary[] {
    const rows = this.db.prepare(`
      SELECT word, correct_count, incorrect_count, mastery_level,
        COALESCE(last_correct_at, last_incorrect_at) as last_practiced
      FROM word_mastery
      WHERE user_id = ? AND (correct_count + incorrect_count) > 0
      ORDER BY
        CAST(incorrect_count AS REAL) / MAX(correct_count + incorrect_count, 1) DESC,
        incorrect_count DESC
      LIMIT ?
    `).all(userId, limit) as Array<{
      word: string;
      correct_count: number;
      incorrect_count: number;
      mastery_level: number;
      last_practiced: string | null;
    }>;

    return rows.map(r => ({
      word: r.word,
      correctCount: r.correct_count,
      incorrectCount: r.incorrect_count,
      masteryLevel: r.mastery_level,
      accuracy: r.correct_count + r.incorrect_count > 0
        ? Math.round((r.correct_count / (r.correct_count + r.incorrect_count)) * 100)
        : 0,
      lastPracticed: r.last_practiced,
    }));
  }

  getStrongWords(userId: number, limit = 20): WordMasterySummary[] {
    const rows = this.db.prepare(`
      SELECT word, correct_count, incorrect_count, mastery_level,
        COALESCE(last_correct_at, last_incorrect_at) as last_practiced
      FROM word_mastery
      WHERE user_id = ? AND mastery_level >= 2
      ORDER BY mastery_level DESC, correct_count DESC
      LIMIT ?
    `).all(userId, limit) as Array<{
      word: string;
      correct_count: number;
      incorrect_count: number;
      mastery_level: number;
      last_practiced: string | null;
    }>;

    return rows.map(r => ({
      word: r.word,
      correctCount: r.correct_count,
      incorrectCount: r.incorrect_count,
      masteryLevel: r.mastery_level,
      accuracy: r.correct_count + r.incorrect_count > 0
        ? Math.round((r.correct_count / (r.correct_count + r.incorrect_count)) * 100)
        : 0,
      lastPracticed: r.last_practiced,
    }));
  }

  getLearningTrend(userId: number, days = 30): Array<{
    date: string;
    quizzes: number;
    accuracy: number;
    wordsStudied: number;
  }> {
    const rows = this.db.prepare(`
      WITH RECURSIVE dates(date) AS (
        SELECT date('now', '-' || ? || ' days')
        UNION ALL
        SELECT date(date, '+1 day') FROM dates WHERE date < date('now')
      )
      SELECT
        d.date,
        COALESCE(q.quiz_count, 0) as quizzes,
        COALESCE(q.avg_accuracy, 0) as accuracy,
        COALESCE(s.words_count, 0) as words_studied
      FROM dates d
      LEFT JOIN (
        SELECT
          date(completed_at) as quiz_date,
          COUNT(*) as quiz_count,
          ROUND(AVG(correct_answers * 100.0 / NULLIF(total_questions, 0)), 0) as avg_accuracy
        FROM quiz_results
        WHERE user_id = ?
        GROUP BY date(completed_at)
      ) q ON d.date = q.quiz_date
      LEFT JOIN (
        SELECT
          date(start_time) as study_date,
          SUM(words_reviewed) as words_count
        FROM study_sessions
        WHERE user_id = ?
        GROUP BY date(start_time)
      ) s ON d.date = s.study_date
      ORDER BY d.date ASC
    `).all(days - 1, userId, userId) as Array<{
      date: string;
      quizzes: number;
      accuracy: number;
      words_studied: number;
    }>;

    return rows.map(r => ({
      date: r.date,
      quizzes: r.quizzes,
      accuracy: r.accuracy,
      wordsStudied: r.words_studied,
    }));
  }
}
