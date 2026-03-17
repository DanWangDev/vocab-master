import type { Database } from 'better-sqlite3';
import type { Migration } from '../config/migrator';

export const initialSchema: Migration = {
    name: '001_initial_schema',
    up: (db: Database) => {
        // 1. Users table
        db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        display_name TEXT,
        role TEXT CHECK(role IN ('student', 'parent', 'admin')) DEFAULT 'student',
        parent_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (parent_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

        // 2. User settings table
        db.exec(`
      CREATE TABLE IF NOT EXISTS user_settings (
        user_id INTEGER PRIMARY KEY,
        sound_enabled INTEGER DEFAULT 1,
        auto_advance INTEGER DEFAULT 0,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

        // 3. User stats table
        db.exec(`
      CREATE TABLE IF NOT EXISTS user_stats (
        user_id INTEGER PRIMARY KEY,
        total_words_studied INTEGER DEFAULT 0,
        quizzes_taken INTEGER DEFAULT 0,
        challenges_completed INTEGER DEFAULT 0,
        best_challenge_score INTEGER DEFAULT 0,
        last_study_date TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

        // 4. Daily challenges table
        db.exec(`
      CREATE TABLE IF NOT EXISTS daily_challenges (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        challenge_date TEXT NOT NULL,
        score INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(user_id, challenge_date)
      )
    `);

        // 5. Refresh tokens table
        db.exec(`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        token TEXT UNIQUE NOT NULL,
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

        // 6. Quiz Results table
        db.exec(`
      CREATE TABLE IF NOT EXISTS quiz_results (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        quiz_type TEXT NOT NULL CHECK(quiz_type IN ('quiz', 'challenge')),
        total_questions INTEGER NOT NULL,
        correct_answers INTEGER NOT NULL,
        score INTEGER NOT NULL,
        time_per_question INTEGER,
        total_time_spent INTEGER NOT NULL,
        points_earned INTEGER DEFAULT 0,
        completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

        // 7. Quiz Answers table
        db.exec(`
      CREATE TABLE IF NOT EXISTS quiz_answers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        quiz_result_id INTEGER NOT NULL,
        question_index INTEGER NOT NULL,
        word TEXT NOT NULL,
        prompt_type TEXT NOT NULL,
        question_format TEXT NOT NULL,
        correct_answer TEXT NOT NULL,
        selected_answer TEXT,
        is_correct INTEGER NOT NULL,
        time_spent INTEGER NOT NULL,
        FOREIGN KEY (quiz_result_id) REFERENCES quiz_results(id) ON DELETE CASCADE
      )
    `);

        // 8. Study Sessions
        db.exec(`
      CREATE TABLE IF NOT EXISTS study_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        words_reviewed INTEGER NOT NULL,
        start_time DATETIME NOT NULL,
        end_time DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

        // 9. User Vocabulary
        db.exec(`
      CREATE TABLE IF NOT EXISTS user_vocabulary (
        user_id INTEGER NOT NULL,
        word TEXT NOT NULL,
        first_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, word),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

        // 10. Indexes
        db.exec(`
      CREATE INDEX IF NOT EXISTS idx_quiz_results_user_id ON quiz_results(user_id);
      CREATE INDEX IF NOT EXISTS idx_quiz_results_completed_at ON quiz_results(completed_at);
      CREATE INDEX IF NOT EXISTS idx_study_sessions_user_id ON study_sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_study_sessions_created_at ON study_sessions(created_at);
    `);

        // Drop deprecated table if exists
        db.exec(`DROP TABLE IF EXISTS admin_settings`);
    }
};
