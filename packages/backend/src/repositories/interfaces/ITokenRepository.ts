import type { RefreshTokenRow } from '../../types/index.js';

export interface ITokenRepository {
  create(userId: number, token: string, expiresAt: Date): RefreshTokenRow;
  findById(id: number): RefreshTokenRow | undefined;
  findByToken(rawToken: string): RefreshTokenRow | undefined;
  deleteByToken(rawToken: string): void;
  deleteAllForUser(userId: number): void;
  deleteExpired(): void;
  isValid(rawToken: string): boolean;
}
