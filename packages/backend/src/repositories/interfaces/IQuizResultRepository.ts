import type { QuizResultRow, QuizAnswerRow, StudySessionRow, CreateQuizResultParams, CreateStudySessionParams } from '../../types/index.js';

export interface IQuizResultRepository {
  create(params: CreateQuizResultParams): number;
  getByUserId(userId: number): QuizResultRow[];
  getAnswersByResultId(resultId: number): QuizAnswerRow[];
  createStudySession(params: CreateStudySessionParams): number;
  getStudySessionsByUserId(userId: number): StudySessionRow[];
}
