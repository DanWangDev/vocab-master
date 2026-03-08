import { db } from '../config/database';
import type { QuizResultRow, QuizAnswerRow, StudySessionRow } from '../types';
import { logger } from '../services/logger.js';

export interface CreateQuizResultParams {
  userId: number;
  quizType: 'quiz' | 'challenge';
  totalQuestions: number;
  correctAnswers: number;
  score: number;
  timePerQuestion: number | null;
  totalTimeSpent: number;
  pointsEarned: number;
  answers: Array<{
    questionIndex: number;
    word: string;
    promptType: string;
    questionFormat: string;
    correctAnswer: string;
    selectedAnswer: string | null;
    isCorrect: boolean;
    timeSpent: number;
  }>;
}

export interface CreateStudySessionParams {
  userId: number;
  wordsReviewed: number;
  startTime: Date;
  endTime: Date;
  words?: string[]; // List of words reviewed
}

export const quizResultRepository = {
  create: (params: CreateQuizResultParams): number => {
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

    const insertResult = db.prepare(`
      INSERT INTO quiz_results (
        user_id, quiz_type, total_questions, correct_answers, 
        score, time_per_question, total_time_spent, points_earned
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertAnswer = db.prepare(`
      INSERT INTO quiz_answers (
        quiz_result_id, question_index, word, prompt_type, 
        question_format, correct_answer, selected_answer, 
        is_correct, time_spent
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const transaction = db.transaction(() => {
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
  },

  getByUserId: (userId: number): QuizResultRow[] => {
    return db.prepare(`
      SELECT * FROM quiz_results 
      WHERE user_id = ? 
      ORDER BY completed_at DESC
    `).all(userId) as QuizResultRow[];
  },

  getAnswersByResultId: (resultId: number): QuizAnswerRow[] => {
    return db.prepare(`
      SELECT * FROM quiz_answers 
      WHERE quiz_result_id = ? 
      ORDER BY question_index ASC
    `).all(resultId) as QuizAnswerRow[];
  },

  // Study Sessions
  createStudySession: (params: CreateStudySessionParams): number => {
    const { userId, wordsReviewed, startTime, endTime, words } = params;

    const stmt = db.prepare(`
      INSERT INTO study_sessions (user_id, words_reviewed, start_time, end_time)
      VALUES (?, ?, ?, ?)
    `);

    const result = stmt.run(
      userId,
      wordsReviewed,
      startTime.toISOString(),
      endTime.toISOString()
    );

    // Track unique words in user_vocabulary for computed stats
    try {
      const { userRepository } = require('./userRepository');
      if (words && words.length > 0) {
        userRepository.addLearnedWords(userId, words);
      }
    } catch (err) {
      logger.error('Failed to track learned words after study session', { error: String(err) });
    }

    return result.lastInsertRowid as number;
  },

  getStudySessionsByUserId: (userId: number): StudySessionRow[] => {
    return db.prepare(`
      SELECT * FROM study_sessions
      WHERE user_id = ?
      ORDER BY created_at DESC
    `).all(userId) as StudySessionRow[];
  }
};
