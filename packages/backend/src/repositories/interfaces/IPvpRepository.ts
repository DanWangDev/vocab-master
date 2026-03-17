import type { PvpChallengeRow, PvpChallengeWithUsers, PvpAnswerRow, PvpStatus } from '../../types/index.js';

export interface CreatePvpChallengeParams {
  challengerId: number;
  opponentId: number;
  wordlistId: number;
  questionCount: number;
  expiresAt: string;
}

export interface SubmitPvpAnswerParams {
  challengeId: number;
  userId: number;
  questionIndex: number;
  word: string;
  correctAnswer: string;
  selectedAnswer: string | null;
  isCorrect: boolean;
  timeSpent: number;
}

export interface IPvpRepository {
  create(params: CreatePvpChallengeParams): PvpChallengeRow;
  findById(id: number): PvpChallengeWithUsers | undefined;
  findPending(userId: number): PvpChallengeWithUsers[];
  findActive(userId: number): PvpChallengeWithUsers[];
  findHistory(userId: number, limit: number): PvpChallengeWithUsers[];
  updateStatus(id: number, status: PvpStatus): void;
  updateScore(id: number, field: 'challenger_score' | 'opponent_score', score: number): void;
  setWinner(id: number, winnerId: number | null): void;
  submitAnswer(params: SubmitPvpAnswerParams): PvpAnswerRow;
  getAnswers(challengeId: number, userId: number): PvpAnswerRow[];
  getAnswerCount(challengeId: number, userId: number): number;
  findExpired(): PvpChallengeRow[];
  searchOpponents(userId: number, query: string): Array<{ id: number; username: string; displayName: string | null }>;
}
