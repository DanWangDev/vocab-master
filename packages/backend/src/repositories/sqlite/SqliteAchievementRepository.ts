import type { Database } from 'better-sqlite3';
import type { AchievementRow, UserAchievementRow } from '../../types/index.js';
import type { IAchievementRepository, UserAchievementWithDetails } from '../interfaces/IAchievementRepository.js';

export class SqliteAchievementRepository implements IAchievementRepository {
  constructor(private readonly db: Database) {}

  findAll(): AchievementRow[] {
    return this.db.prepare(
      'SELECT * FROM achievements ORDER BY sort_order ASC'
    ).all() as AchievementRow[];
  }

  findBySlug(slug: string): AchievementRow | undefined {
    return this.db.prepare(
      'SELECT * FROM achievements WHERE slug = ?'
    ).get(slug) as AchievementRow | undefined;
  }

  findByUserId(userId: number): UserAchievementWithDetails[] {
    return this.db.prepare(`
      SELECT ua.*, a.slug, a.name, a.description, a.icon, a.category
      FROM user_achievements ua
      JOIN achievements a ON a.id = ua.achievement_id
      WHERE ua.user_id = ?
      ORDER BY ua.earned_at DESC
    `).all(userId) as UserAchievementWithDetails[];
  }

  findEarnedSlugs(userId: number): string[] {
    const rows = this.db.prepare(`
      SELECT a.slug
      FROM user_achievements ua
      JOIN achievements a ON a.id = ua.achievement_id
      WHERE ua.user_id = ?
    `).all(userId) as Array<{ slug: string }>;
    return rows.map(r => r.slug);
  }

  award(userId: number, achievementId: number): UserAchievementRow | undefined {
    try {
      const result = this.db.prepare(
        'INSERT INTO user_achievements (user_id, achievement_id) VALUES (?, ?)'
      ).run(userId, achievementId);

      if (result.changes === 0) return undefined;

      return this.db.prepare(
        'SELECT * FROM user_achievements WHERE id = ?'
      ).get(result.lastInsertRowid) as UserAchievementRow;
    } catch {
      // UNIQUE constraint violation = already earned
      return undefined;
    }
  }

  hasAchievement(userId: number, slug: string): boolean {
    const row = this.db.prepare(`
      SELECT 1 FROM user_achievements ua
      JOIN achievements a ON a.id = ua.achievement_id
      WHERE ua.user_id = ? AND a.slug = ?
    `).get(userId, slug);
    return row !== undefined;
  }
}
