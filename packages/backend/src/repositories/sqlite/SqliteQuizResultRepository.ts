import type { Database } from 'better-sqlite3';
import type { QuizResultRow, QuizAnswerRow, StudySessionRow, CreateQuizResultParams, CreateStudySessionParams } from '../../types/index.js';
import type { IQuizResultRepository } from '../interfaces/index.js';
import type { IUserRepository } from '../interfaces/IUserRepository.js';
import { logger } from '../../services/logger.js';

export class SqliteQuizResultRepository implements IQuizResultRepository {
  constructor(
    private readonly db: Database,
    private readonly userRepo: IUserRepository
  ) {}

  create(params: CreateQuizResultParams): number {
    const {
      userId,
      quizType,
      totalQuestions,
      correctAnswers,
      score,
      timePerQuestion,
      totalTimeSpent,
      pointsEarned,
      answers
    } = params;

    const insertResult = this.db.prepare(`
      INSERT INTO quiz_results (
        user_id, quiz_type, total_questions, correct_answers,
        score, time_per_question, total_time_spent, points_earned
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertAnswer = this.db.prepare(`
      INSERT INTO quiz_answers (
        quiz_result_id, question_index, word, prompt_type,
        question_format, correct_answer, selected_answer,
        is_correct, time_spent
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const transaction = this.db.transaction(() => {
      const result = insertResult.run(
        userId,
        quizType,
        totalQuestions,
        correctAnswers,
        score,
        timePerQuestion,
        totalTimeSpent,
        pointsEarned
      );
      const resultId = result.lastInsertRowid as number;

      for (const answer of answers) {
        insertAnswer.run(
          resultId,
          answer.questionIndex,
          answer.word,
          answer.promptType,
          answer.questionFormat,
          answer.correctAnswer,
          answer.selectedAnswer,
          answer.isCorrect ? 1 : 0,
          answer.timeSpent
        );
      }
      return resultId;
    });

    return transaction();
  }

  getByUserId(userId: number): QuizResultRow[] {
    return this.db.prepare(`
      SELECT * FROM quiz_results
      WHERE user_id = ?
      ORDER BY completed_at DESC
    `).all(userId) as QuizResultRow[];
  }

  getAnswersByResultId(resultId: number): QuizAnswerRow[] {
    return this.db.prepare(`
      SELECT * FROM quiz_answers
      WHERE quiz_result_id = ?
      ORDER BY question_index ASC
    `).all(resultId) as QuizAnswerRow[];
  }

  createStudySession(params: CreateStudySessionParams): number {
    const { userId, wordsReviewed, startTime, endTime, words } = params;

    const stmt = this.db.prepare(`
      INSERT INTO study_sessions (user_id, words_reviewed, start_time, end_time)
      VALUES (?, ?, ?, ?)
    `);

    const result = stmt.run(
      userId,
      wordsReviewed,
      startTime.toISOString(),
      endTime.toISOString()
    );

    try {
      if (words && words.length > 0) {
        this.userRepo.addLearnedWords(userId, words);
      }
    } catch (err) {
      logger.error('Failed to track learned words after study session', { error: String(err) });
    }

    return result.lastInsertRowid as number;
  }

  getStudySessionsByUserId(userId: number): StudySessionRow[] {
    return this.db.prepare(`
      SELECT * FROM study_sessions
      WHERE user_id = ?
      ORDER BY created_at DESC
    `).all(userId) as StudySessionRow[];
  }
}
