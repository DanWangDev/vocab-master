import type { DailyChallengeRow } from '../../types/index.js';

export interface IChallengeRepository {
  findByUserAndDate(userId: number, date: string): DailyChallengeRow | undefined;
  getTodayChallenge(userId: number): DailyChallengeRow | undefined;
  create(userId: number, date: string, score: number): DailyChallengeRow;
  findById(id: number): DailyChallengeRow | undefined;
  getRecentChallenges(userId: number, limit?: number): DailyChallengeRow[];
  calculateStreak(userId: number): number;
  getBestScore(userId: number): number;
}
