import type { PushTokenRow } from '../../types/index.js';

export interface IPushTokenRepository {
  findByUserId(userId: number): PushTokenRow[];
  findByUserIds(userIds: number[]): PushTokenRow[];
  upsert(userId: number, expoPushToken: string, platform: string): PushTokenRow;
  deleteByUserId(userId: number): number;
  deleteByToken(expoPushToken: string): number;
}
