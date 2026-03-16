import type { PasswordResetTokenRow } from '../../types/index.js';

export interface IPasswordResetRepository {
  create(userId: number, tokenHash: string, expiresAt: Date): PasswordResetTokenRow;
  findById(id: number): PasswordResetTokenRow | undefined;
  findBySelector(selector: string): PasswordResetTokenRow | undefined;
  markUsed(id: number): void;
  deleteExpired(): number;
  deleteAllForUser(userId: number): number;
  countRecentByUserId(userId: number, withinMinutes: number): number;
}
