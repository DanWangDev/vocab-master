import type { Database } from 'better-sqlite3';
import type { Migration } from '../config/migrator';

export const addPvpChallenges: Migration = {
  name: '020_add_pvp_challenges',
  up: (db: Database) => {
    db.prepare(`
      CREATE TABLE IF NOT EXISTS pvp_challenges (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        challenger_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        opponent_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        wordlist_id INTEGER NOT NULL REFERENCES wordlists(id) ON DELETE CASCADE,
        status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'active', 'completed', 'expired', 'declined')),
        challenger_score INTEGER,
        opponent_score INTEGER,
        winner_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        question_count INTEGER NOT NULL DEFAULT 10,
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run();

    db.prepare(`
      CREATE TABLE IF NOT EXISTS pvp_answers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        challenge_id INTEGER NOT NULL REFERENCES pvp_challenges(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        question_index INTEGER NOT NULL,
        word TEXT NOT NULL,
        correct_answer TEXT NOT NULL,
        selected_answer TEXT,
        is_correct INTEGER NOT NULL DEFAULT 0,
        time_spent INTEGER NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run();

    db.prepare('CREATE INDEX IF NOT EXISTS idx_pvp_challenges_challenger ON pvp_challenges(challenger_id)').run();
    db.prepare('CREATE INDEX IF NOT EXISTS idx_pvp_challenges_opponent ON pvp_challenges(opponent_id)').run();
    db.prepare('CREATE INDEX IF NOT EXISTS idx_pvp_challenges_status ON pvp_challenges(status)').run();
    db.prepare('CREATE INDEX IF NOT EXISTS idx_pvp_answers_challenge ON pvp_answers(challenge_id)').run();
    db.prepare('CREATE INDEX IF NOT EXISTS idx_pvp_answers_user ON pvp_answers(challenge_id, user_id)').run();
  }
};
