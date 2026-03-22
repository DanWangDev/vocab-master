import { db } from '../config/database';
import { logger } from './logger';

export interface XpAwardResult {
  xpEarned: number;
  totalXp: number;
  level: number;
  leveledUp: boolean;
  newLevel?: number;
  newTitle?: string;
}

interface LevelThreshold {
  level: number;
  totalXp: number;
  title: string;
}

const LEVEL_THRESHOLDS: LevelThreshold[] = [
  { level: 1, totalXp: 0, title: 'Beginner' },
  { level: 2, totalXp: 100, title: 'Novice' },
  { level: 3, totalXp: 300, title: 'Apprentice' },
  { level: 4, totalXp: 600, title: 'Scholar' },
  { level: 5, totalXp: 1000, title: 'Wordsmith' },
  { level: 6, totalXp: 1500, title: 'Linguist' },
  { level: 7, totalXp: 2200, title: 'Lexicon' },
  { level: 8, totalXp: 3000, title: 'Vocabularian' },
  { level: 9, totalXp: 4000, title: 'Word Master' },
  { level: 10, totalXp: 5500, title: 'Grand Master' },
];

function getLevelForXp(totalXp: number): { level: number; title: string } {
  // Check levels above 10
  if (totalXp >= 5500) {
    const extraLevels = Math.floor((totalXp - 5500) / 2000);
    const level = 10 + extraLevels;
    return { level, title: level === 10 ? 'Grand Master' : `Grand Master ${toRoman(extraLevels)}` };
  }

  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (totalXp >= LEVEL_THRESHOLDS[i].totalXp) {
      return { level: LEVEL_THRESHOLDS[i].level, title: LEVEL_THRESHOLDS[i].title };
    }
  }
  return { level: 1, title: 'Beginner' };
}

function toRoman(n: number): string {
  if (n <= 0) return '';
  const vals = [10, 9, 5, 4, 1];
  const syms = ['X', 'IX', 'V', 'IV', 'I'];
  let result = '';
  for (let i = 0; i < vals.length; i++) {
    while (n >= vals[i]) {
      result += syms[i];
      n -= vals[i];
    }
  }
  return result;
}

function getNextLevelXp(currentLevel: number): number {
  if (currentLevel >= 10) {
    return 5500 + (currentLevel - 10 + 1) * 2000;
  }
  const next = LEVEL_THRESHOLDS.find(t => t.level === currentLevel + 1);
  return next ? next.totalXp : 5500;
}

function getCurrentLevelXp(currentLevel: number): number {
  if (currentLevel > 10) {
    return 5500 + (currentLevel - 10) * 2000;
  }
  const current = LEVEL_THRESHOLDS.find(t => t.level === currentLevel);
  return current ? current.totalXp : 0;
}

export function awardXp(userId: number, amount: number, source: string, sourceId?: number): XpAwardResult | null {
  try {
    const result = db.transaction(() => {
      // Insert XP record
      db.prepare(
        'INSERT INTO user_xp (user_id, amount, source, source_id) VALUES (?, ?, ?, ?)'
      ).run(userId, amount, source, sourceId ?? null);

      // UPSERT user_stats: create row if missing, then update
      db.prepare(`
        INSERT INTO user_stats (user_id, total_xp, level)
        VALUES (?, ?, 1)
        ON CONFLICT(user_id) DO UPDATE SET
          total_xp = total_xp + ?,
          level = level
      `).run(userId, amount, amount);

      const stats = db.prepare(
        'SELECT total_xp, level FROM user_stats WHERE user_id = ?'
      ).get(userId) as { total_xp: number; level: number } | undefined;

      if (!stats) {
        throw new Error('user_stats row missing after UPSERT');
      }

      const { level: newLevel, title: newTitle } = getLevelForXp(stats.total_xp);
      const leveledUp = newLevel > stats.level;

      if (newLevel !== stats.level) {
        db.prepare('UPDATE user_stats SET level = ? WHERE user_id = ?').run(newLevel, userId);
      }

      return {
        xpEarned: amount,
        totalXp: stats.total_xp,
        level: newLevel,
        leveledUp,
        newLevel: leveledUp ? newLevel : undefined,
        newTitle: leveledUp ? newTitle : undefined,
      };
    })();

    return result;
  } catch (error) {
    logger.error('XP award failed (non-fatal)', { userId, amount, source, error: String(error) });
    return null;
  }
}

export function awardStreakBonus(userId: number, streakDays: number): XpAwardResult | null {
  // Deduplicate: only one streak bonus per day
  const today = new Date().toISOString().split('T')[0];
  const existing = db.prepare(
    "SELECT 1 FROM user_xp WHERE user_id = ? AND source = 'streak_bonus' AND date(earned_at) = ?"
  ).get(userId, today);

  if (existing) return null;

  const amount = streakDays * 2;
  return awardXp(userId, amount, 'streak_bonus');
}

export function getLevelInfo(userId: number) {
  const stats = db.prepare(
    'SELECT total_xp, level FROM user_stats WHERE user_id = ?'
  ).get(userId) as { total_xp: number; level: number } | undefined;

  const totalXp = stats?.total_xp ?? 0;
  const { level, title } = getLevelForXp(totalXp);
  const currentLevelXp = getCurrentLevelXp(level);
  const nextLevelXp = getNextLevelXp(level);

  return {
    level,
    title,
    totalXp,
    currentLevelXp,
    nextLevelXp,
    xpInLevel: totalXp - currentLevelXp,
    xpNeeded: nextLevelXp - currentLevelXp,
  };
}

export function getXpHistory(userId: number, limit: number = 50) {
  return db.prepare(
    'SELECT id, amount, source, source_id, earned_at FROM user_xp WHERE user_id = ? ORDER BY earned_at DESC LIMIT ?'
  ).all(userId, limit) as Array<{
    id: number;
    amount: number;
    source: string;
    source_id: number | null;
    earned_at: string;
  }>;
}

export const xpService = {
  awardXp,
  awardStreakBonus,
  getLevelInfo,
  getXpHistory,
  getLevelForXp,
  getNextLevelXp,
  LEVEL_THRESHOLDS,
};
