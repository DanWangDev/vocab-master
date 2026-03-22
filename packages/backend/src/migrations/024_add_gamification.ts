import type { Database } from 'better-sqlite3';
import type { Migration } from '../config/migrator';

export const addGamification: Migration = {
  name: '024_add_gamification',
  up: (db: Database) => {
    // XP transaction log
    db.prepare(`
      CREATE TABLE IF NOT EXISTS user_xp (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        amount INTEGER NOT NULL,
        source TEXT NOT NULL,
        source_id INTEGER,
        earned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `).run();
    db.prepare('CREATE INDEX IF NOT EXISTS idx_user_xp_user ON user_xp(user_id)').run();
    db.prepare('CREATE INDEX IF NOT EXISTS idx_user_xp_earned ON user_xp(earned_at)').run();
    db.prepare('CREATE INDEX IF NOT EXISTS idx_user_xp_source ON user_xp(user_id, source, earned_at)').run();

    // Add XP columns to user_stats (UPSERT-safe)
    const userStatsColumns = db.prepare("PRAGMA table_info(user_stats)").all() as { name: string }[];
    const columnNames = userStatsColumns.map(c => c.name);

    if (!columnNames.includes('total_xp')) {
      db.prepare('ALTER TABLE user_stats ADD COLUMN total_xp INTEGER NOT NULL DEFAULT 0').run();
    }
    if (!columnNames.includes('level')) {
      db.prepare('ALTER TABLE user_stats ADD COLUMN level INTEGER NOT NULL DEFAULT 1').run();
    }

    // Streak rewards catalog
    db.prepare(`
      CREATE TABLE IF NOT EXISTS streak_rewards (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        streak_days INTEGER NOT NULL UNIQUE,
        reward_type TEXT NOT NULL,
        reward_slug TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        description TEXT NOT NULL
      )
    `).run();

    // Seed reward milestones
    const insertReward = db.prepare(`
      INSERT OR IGNORE INTO streak_rewards (streak_days, reward_type, reward_slug, name, description)
      VALUES (?, ?, ?, ?, ?)
    `);
    insertReward.run(3, 'avatar_frame', 'bronze_ring', 'Bronze Ring', 'A warm bronze frame for your avatar');
    insertReward.run(7, 'dashboard_theme', 'ocean_blue', 'Ocean Blue', 'A calming ocean-inspired dashboard theme');
    insertReward.run(14, 'avatar_frame', 'silver_crown', 'Silver Crown', 'A regal silver crown frame');
    insertReward.run(30, 'dashboard_theme', 'sunset_gold', 'Sunset Gold', 'A warm sunset-inspired dashboard theme');
    insertReward.run(60, 'avatar_frame', 'golden_shield', 'Golden Shield', 'A radiant golden shield frame');
    insertReward.run(90, 'dashboard_theme', 'platinum_aurora', 'Platinum Aurora', 'A majestic aurora-inspired theme');

    // User earned rewards
    db.prepare(`
      CREATE TABLE IF NOT EXISTS user_rewards (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        reward_id INTEGER NOT NULL,
        earned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (reward_id) REFERENCES streak_rewards(id) ON DELETE CASCADE,
        UNIQUE(user_id, reward_id)
      )
    `).run();
    db.prepare('CREATE INDEX IF NOT EXISTS idx_user_rewards_user ON user_rewards(user_id)').run();

    // Active cosmetics in user_settings
    const settingsColumns = db.prepare("PRAGMA table_info(user_settings)").all() as { name: string }[];
    const settingNames = settingsColumns.map(c => c.name);

    if (!settingNames.includes('active_avatar_frame')) {
      db.prepare('ALTER TABLE user_settings ADD COLUMN active_avatar_frame TEXT DEFAULT NULL').run();
    }
    if (!settingNames.includes('active_dashboard_theme')) {
      db.prepare('ALTER TABLE user_settings ADD COLUMN active_dashboard_theme TEXT DEFAULT NULL').run();
    }
  }
};
