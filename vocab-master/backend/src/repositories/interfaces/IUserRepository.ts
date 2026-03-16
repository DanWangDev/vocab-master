import type { UserRow, UserSettingsRow, UserStatsRow } from '../../types/index.js';

export interface IUserRepository {
  create(username: string, passwordHash: string, displayName?: string): UserRow;
  findById(id: number): UserRow | undefined;
  findByUsername(username: string): UserRow | undefined;
  findByEmail(email: string): UserRow | undefined;
  createStudent(username: string, passwordHash: string, displayName?: string): UserRow;
  createParent(username: string, passwordHash: string, email: string, displayName?: string): UserRow;
  createStudentForParent(username: string, passwordHash: string, parentId: number, displayName?: string): UserRow;
  findByGoogleId(googleId: string): UserRow | undefined;
  createGoogleParent(username: string, email: string, googleId: string, displayName?: string): UserRow;
  linkGoogleAccount(userId: number, googleId: string): void;
  updatePassword(userId: number, passwordHash: string): void;
  setEmailVerified(userId: number, verified: boolean): void;
  updateDisplayName(userId: number, displayName: string): void;
  updateUsername(userId: number, username: string): void;
  delete(userId: number): void;
  addLearnedWords(userId: number, words: string[]): number;
}

export interface ISettingsRepository {
  get(userId: number): UserSettingsRow | undefined;
  createDefault(userId: number): UserSettingsRow;
  update(userId: number, soundEnabled?: boolean, autoAdvance?: boolean, language?: string): UserSettingsRow;
}

export interface IStatsRepository {
  get(userId: number): UserStatsRow | undefined;
  createDefault(userId: number): UserStatsRow;
  update(userId: number, updates: {
    totalWordsStudied?: number;
    quizzesTaken?: number;
    challengesCompleted?: number;
    bestChallengeScore?: number;
    lastStudyDate?: string | null;
  }): UserStatsRow;
  incrementStats(userId: number, increments: {
    totalWordsStudied?: number;
    quizzesTaken?: number;
    challengesCompleted?: number;
  }): UserStatsRow;
}
