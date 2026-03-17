import type { Database } from 'better-sqlite3';
import type { Migration } from '../config/migrator';

export const addAchievements: Migration = {
  name: '015_add_achievements',
  up: (db: Database) => {
    db.prepare(`
      CREATE TABLE IF NOT EXISTS achievements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        slug TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        icon TEXT NOT NULL DEFAULT 'star',
        category TEXT NOT NULL CHECK(category IN ('quiz', 'streak', 'words', 'challenge', 'special')),
        threshold INTEGER NOT NULL DEFAULT 1,
        sort_order INTEGER NOT NULL DEFAULT 0
      )
    `).run();

    db.prepare(`
      CREATE TABLE IF NOT EXISTS user_achievements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        achievement_id INTEGER NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
        earned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, achievement_id)
      )
    `).run();

    db.prepare(`
      CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON user_achievements(user_id)
    `).run();

    // Seed achievements
    const insert = db.prepare(`
      INSERT INTO achievements (slug, name, description, icon, category, threshold, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const achievements = [
      // Quiz achievements
      ['first_quiz', 'First Steps', 'Complete your first quiz', 'rocket', 'quiz', 1, 1],
      ['quizzes_10', 'Quiz Enthusiast', 'Complete 10 quizzes', 'fire', 'quiz', 10, 2],
      ['quizzes_50', 'Quiz Master', 'Complete 50 quizzes', 'trophy', 'quiz', 50, 3],
      ['perfect_quiz', 'Perfectionist', 'Score 100% on a quiz', 'sparkles', 'quiz', 100, 4],
      ['speed_demon', 'Speed Demon', 'Complete a quiz in under 30 seconds', 'zap', 'quiz', 30, 5],

      // Streak achievements
      ['streak_3', 'Getting Started', 'Reach a 3-day streak', 'flame', 'streak', 3, 10],
      ['streak_7', 'Week Warrior', 'Reach a 7-day streak', 'flame', 'streak', 7, 11],
      ['streak_14', 'Fortnight Fighter', 'Reach a 14-day streak', 'flame', 'streak', 14, 12],
      ['streak_30', 'Monthly Master', 'Reach a 30-day streak', 'flame', 'streak', 30, 13],

      // Words achievements
      ['words_10', 'Word Explorer', 'Study 10 words', 'book', 'words', 10, 20],
      ['words_50', 'Vocabulary Builder', 'Study 50 words', 'book', 'words', 50, 21],
      ['words_100', 'Word Collector', 'Study 100 words', 'book', 'words', 100, 22],
      ['words_500', 'Lexicon Legend', 'Study 500 words', 'book', 'words', 500, 23],

      // Challenge achievements
      ['first_challenge', 'Challenger', 'Complete your first daily challenge', 'sword', 'challenge', 1, 30],
      ['challenge_score_90', 'Challenge Champion', 'Score 90%+ on a daily challenge', 'medal', 'challenge', 90, 31],
    ];

    for (const a of achievements) {
      insert.run(...a);
    }
  }
};
