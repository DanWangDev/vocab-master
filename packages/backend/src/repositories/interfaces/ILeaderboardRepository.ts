import type { LeaderboardEntryRow, LeaderboardEntryWithUser } from '../../types/index.js';

export interface ILeaderboardRepository {
  getByPeriod(period: string, periodKey: string, limit?: number): LeaderboardEntryWithUser[];
  getUserEntry(userId: number, period: string, periodKey: string): LeaderboardEntryRow | undefined;
  upsert(entry: {
    userId: number;
    period: string;
    periodKey: string;
    score: number;
    quizzesCompleted: number;
    wordsMastered: number;
    streakDays: number;
  }): void;
  recalculateAll(period: string, periodKey: string): void;
}
