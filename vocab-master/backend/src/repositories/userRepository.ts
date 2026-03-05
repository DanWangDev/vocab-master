import db from '../config/database.js';
import type { UserRow, UserSettingsRow, UserStatsRow } from '../types/index.js';

export const userRepository = {
  create(username: string, passwordHash: string, displayName?: string): UserRow {
    const stmt = db.prepare(`
      INSERT INTO users (username, password_hash, display_name)
      VALUES (?, ?, ?)
    `);

    const result = stmt.run(username, passwordHash, displayName || null);
    const userId = result.lastInsertRowid as number;

    // Create default settings and stats for the user
    db.prepare(`
      INSERT INTO user_settings (user_id, sound_enabled, auto_advance, language)
      VALUES (?, 1, 0, 'en')
    `).run(userId);

    db.prepare(`
      INSERT INTO user_stats (user_id, total_words_studied, quizzes_taken, challenges_completed, best_challenge_score, last_study_date)
      VALUES (?, 0, 0, 0, 0, NULL)
    `).run(userId);

    return this.findById(userId)!;
  },

  findById(id: number): UserRow | undefined {
    const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
    return stmt.get(id) as UserRow | undefined;
  },

  findByUsername(username: string): UserRow | undefined {
    const stmt = db.prepare('SELECT * FROM users WHERE username = ?');
    return stmt.get(username) as UserRow | undefined;
  },

  findByEmail(email: string): UserRow | undefined {
    const stmt = db.prepare('SELECT * FROM users WHERE email = ? COLLATE NOCASE');
    return stmt.get(email) as UserRow | undefined;
  },

  /**
   * Create a student account (no email required)
   */
  createStudent(username: string, passwordHash: string, displayName?: string): UserRow {
    const stmt = db.prepare(`
      INSERT INTO users (username, password_hash, display_name, role)
      VALUES (?, ?, ?, 'student')
    `);

    const result = stmt.run(username, passwordHash, displayName || null);
    const userId = result.lastInsertRowid as number;

    // Create default settings and stats
    db.prepare(`
      INSERT INTO user_settings (user_id, sound_enabled, auto_advance, language)
      VALUES (?, 1, 0, 'en')
    `).run(userId);

    db.prepare(`
      INSERT INTO user_stats (user_id, total_words_studied, quizzes_taken, challenges_completed, best_challenge_score, last_study_date)
      VALUES (?, 0, 0, 0, 0, NULL)
    `).run(userId);

    return this.findById(userId)!;
  },

  /**
   * Create a parent account (email required)
   */
  createParent(username: string, passwordHash: string, email: string, displayName?: string): UserRow {
    const stmt = db.prepare(`
      INSERT INTO users (username, password_hash, display_name, role, email, email_verified)
      VALUES (?, ?, ?, 'parent', ?, 0)
    `);

    const result = stmt.run(username, passwordHash, displayName || null, email.toLowerCase());
    const userId = result.lastInsertRowid as number;

    // Create default settings and stats
    db.prepare(`
      INSERT INTO user_settings (user_id, sound_enabled, auto_advance, language)
      VALUES (?, 1, 0, 'en')
    `).run(userId);

    db.prepare(`
      INSERT INTO user_stats (user_id, total_words_studied, quizzes_taken, challenges_completed, best_challenge_score, last_study_date)
      VALUES (?, 0, 0, 0, 0, NULL)
    `).run(userId);

    return this.findById(userId)!;
  },

  /**
   * Create a student account linked to a parent
   */
  createStudentForParent(username: string, passwordHash: string, parentId: number, displayName?: string): UserRow {
    const stmt = db.prepare(`
      INSERT INTO users (username, password_hash, display_name, role, parent_id)
      VALUES (?, ?, ?, 'student', ?)
    `);

    const result = stmt.run(username, passwordHash, displayName || null, parentId);
    const userId = result.lastInsertRowid as number;

    db.prepare(`
      INSERT INTO user_settings (user_id, sound_enabled, auto_advance, language)
      VALUES (?, 1, 0, 'en')
    `).run(userId);

    db.prepare(`
      INSERT INTO user_stats (user_id, total_words_studied, quizzes_taken, challenges_completed, best_challenge_score, last_study_date)
      VALUES (?, 0, 0, 0, 0, NULL)
    `).run(userId);

    return this.findById(userId)!;
  },

  /**
   * Find a user by Google ID
   */
  findByGoogleId(googleId: string): UserRow | undefined {
    const stmt = db.prepare('SELECT * FROM users WHERE google_id = ?');
    return stmt.get(googleId) as UserRow | undefined;
  },

  /**
   * Create a parent account via Google OAuth (no password)
   */
  createGoogleParent(username: string, email: string, googleId: string, displayName?: string): UserRow {
    const stmt = db.prepare(`
      INSERT INTO users (username, password_hash, display_name, role, email, email_verified, google_id, auth_provider)
      VALUES (?, NULL, ?, 'parent', ?, 1, ?, 'google')
    `);

    const result = stmt.run(username, displayName || null, email.toLowerCase(), googleId);
    const userId = result.lastInsertRowid as number;

    db.prepare(`
      INSERT INTO user_settings (user_id, sound_enabled, auto_advance, language)
      VALUES (?, 1, 0, 'en')
    `).run(userId);

    db.prepare(`
      INSERT INTO user_stats (user_id, total_words_studied, quizzes_taken, challenges_completed, best_challenge_score, last_study_date)
      VALUES (?, 0, 0, 0, 0, NULL)
    `).run(userId);

    return this.findById(userId)!;
  },

  /**
   * Link a Google account to an existing user
   */
  linkGoogleAccount(userId: number, googleId: string): void {
    const stmt = db.prepare('UPDATE users SET google_id = ?, auth_provider = ? WHERE id = ?');
    stmt.run(googleId, 'google', userId);
  },

  /**
   * Update a user's password
   */
  updatePassword(userId: number, passwordHash: string): void {
    const stmt = db.prepare('UPDATE users SET password_hash = ? WHERE id = ?');
    stmt.run(passwordHash, userId);
  },

  /**
   * Set email verified status
   */
  setEmailVerified(userId: number, verified: boolean): void {
    const stmt = db.prepare('UPDATE users SET email_verified = ? WHERE id = ?');
    stmt.run(verified ? 1 : 0, userId);
  },

  updateDisplayName(userId: number, displayName: string): void {
    const stmt = db.prepare('UPDATE users SET display_name = ? WHERE id = ?');
    stmt.run(displayName, userId);
  },

  delete(userId: number): void {
    const stmt = db.prepare('DELETE FROM users WHERE id = ?');
    stmt.run(userId);
  },

  addLearnedWords(userId: number, words: string[]): number {
    if (words.length === 0) return 0;

    const insert = db.prepare(`
      INSERT OR IGNORE INTO user_vocabulary (user_id, word)
      VALUES (?, ?)
    `);

    const updateLastSeen = db.prepare(`
      UPDATE user_vocabulary 
      SET last_seen_at = CURRENT_TIMESTAMP 
      WHERE user_id = ? AND word = ?
    `);

    let newWordsCount = 0;

    const transaction = db.transaction(() => {
      for (const word of words) {
        const result = insert.run(userId, word);
        if (result.changes > 0) {
          newWordsCount++;
        } else {
          // If word exists, update last_seen_at
          updateLastSeen.run(userId, word);
        }
      }
    });

    transaction();
    return newWordsCount;
  }
};

export const settingsRepository = {
  get(userId: number): UserSettingsRow | undefined {
    const stmt = db.prepare('SELECT * FROM user_settings WHERE user_id = ?');
    return stmt.get(userId) as UserSettingsRow | undefined;
  },

  createDefault(userId: number): UserSettingsRow {
    const stmt = db.prepare(`
      INSERT INTO user_settings (user_id, sound_enabled, auto_advance, language)
      VALUES (?, 1, 0, 'en')
    `);
    stmt.run(userId);
    return this.get(userId)!;
  },

  update(userId: number, soundEnabled?: boolean, autoAdvance?: boolean, language?: string): UserSettingsRow {
    const current = this.get(userId);
    if (!current) {
      throw new Error('Settings not found for user');
    }

    const newSoundEnabled = soundEnabled !== undefined ? (soundEnabled ? 1 : 0) : current.sound_enabled;
    const newAutoAdvance = autoAdvance !== undefined ? (autoAdvance ? 1 : 0) : current.auto_advance;
    const newLanguage = language !== undefined ? language : current.language;

    const stmt = db.prepare(`
      UPDATE user_settings
      SET sound_enabled = ?, auto_advance = ?, language = ?
      WHERE user_id = ?
    `);
    stmt.run(newSoundEnabled, newAutoAdvance, newLanguage, userId);

    return this.get(userId)!;
  }
};

export const statsRepository = {
  get(userId: number): UserStatsRow | undefined {
    const stmt = db.prepare('SELECT * FROM user_stats WHERE user_id = ?');
    return stmt.get(userId) as UserStatsRow | undefined;
  },

  createDefault(userId: number): UserStatsRow {
    const stmt = db.prepare(`
      INSERT INTO user_stats (user_id, total_words_studied, quizzes_taken, challenges_completed, best_challenge_score, last_study_date)
      VALUES (?, 0, 0, 0, 0, NULL)
    `);
    stmt.run(userId);
    return this.get(userId)!;
  },

  update(userId: number, updates: {
    totalWordsStudied?: number;
    quizzesTaken?: number;
    challengesCompleted?: number;
    bestChallengeScore?: number;
    lastStudyDate?: string | null;
  }): UserStatsRow {
    const current = this.get(userId);
    if (!current) {
      throw new Error('Stats not found for user');
    }

    const newStats = {
      total_words_studied: updates.totalWordsStudied ?? current.total_words_studied,
      quizzes_taken: updates.quizzesTaken ?? current.quizzes_taken,
      challenges_completed: updates.challengesCompleted ?? current.challenges_completed,
      best_challenge_score: updates.bestChallengeScore ?? current.best_challenge_score,
      last_study_date: updates.lastStudyDate !== undefined ? updates.lastStudyDate : current.last_study_date
    };

    const stmt = db.prepare(`
      UPDATE user_stats
      SET total_words_studied = ?, quizzes_taken = ?, challenges_completed = ?, best_challenge_score = ?, last_study_date = ?
      WHERE user_id = ?
    `);
    stmt.run(
      newStats.total_words_studied,
      newStats.quizzes_taken,
      newStats.challenges_completed,
      newStats.best_challenge_score,
      newStats.last_study_date,
      userId
    );

    return this.get(userId)!;
  },

  incrementStats(userId: number, increments: {
    totalWordsStudied?: number;
    quizzesTaken?: number;
    challengesCompleted?: number;
  }): UserStatsRow {
    const current = this.get(userId);
    if (!current) {
      throw new Error('Stats not found for user');
    }

    return this.update(userId, {
      totalWordsStudied: current.total_words_studied + (increments.totalWordsStudied || 0),
      quizzesTaken: current.quizzes_taken + (increments.quizzesTaken || 0),
      challengesCompleted: current.challenges_completed + (increments.challengesCompleted || 0),
    });
  }
};
