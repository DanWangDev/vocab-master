import type { Database } from 'better-sqlite3';
import type { Migration } from '../config/migrator';
import * as fs from 'fs';
import * as path from 'path';

export const addWordlists: Migration = {
  name: '009_add_wordlists',
  up: (db: Database) => {
    console.log('[Migration 009] Adding wordlists tables...');

    db.transaction(() => {
      db.prepare(`
        CREATE TABLE wordlists (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          description TEXT DEFAULT '',
          is_system INTEGER NOT NULL DEFAULT 0,
          created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
          visibility TEXT NOT NULL DEFAULT 'private',
          word_count INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
      `).run();

      db.prepare(`
        CREATE TABLE wordlist_words (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          wordlist_id INTEGER NOT NULL REFERENCES wordlists(id) ON DELETE CASCADE,
          target_word TEXT NOT NULL,
          definitions TEXT NOT NULL,
          synonyms TEXT NOT NULL DEFAULT '[]',
          example_sentences TEXT NOT NULL DEFAULT '[]',
          sort_order INTEGER NOT NULL DEFAULT 0,
          UNIQUE(wordlist_id, target_word)
        )
      `).run();

      db.prepare(`
        CREATE TABLE user_active_wordlist (
          user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
          wordlist_id INTEGER NOT NULL REFERENCES wordlists(id) ON DELETE CASCADE
        )
      `).run();

      db.prepare('CREATE INDEX idx_wordlist_words_list ON wordlist_words(wordlist_id)').run();
      db.prepare('CREATE INDEX idx_wordlists_visibility ON wordlists(visibility)').run();
      db.prepare('CREATE INDEX idx_wordlists_created_by ON wordlists(created_by)').run();

      // Seed system wordlist from seed-words.json (bundled with backend)
      const wordsJsonPath = path.join(__dirname, '../data/seed-words.json');
      const wordsData = JSON.parse(fs.readFileSync(wordsJsonPath, 'utf-8')) as Array<{
        targetWord: string;
        definition: string[];
        synonyms: string[];
        exampleSentence: string[];
      }>;

      // Create system wordlist
      const insertWordlist = db.prepare(`
        INSERT INTO wordlists (name, description, is_system, visibility, word_count)
        VALUES (?, ?, 1, 'system', ?)
      `);
      insertWordlist.run('11+ Vocabulary', 'Default system vocabulary list for 11+ preparation', wordsData.length);

      // Insert all words
      const insertWord = db.prepare(`
        INSERT INTO wordlist_words (wordlist_id, target_word, definitions, synonyms, example_sentences, sort_order)
        VALUES (1, ?, ?, ?, ?, ?)
      `);

      for (let i = 0; i < wordsData.length; i++) {
        const word = wordsData[i];
        insertWord.run(
          word.targetWord,
          JSON.stringify(word.definition),
          JSON.stringify(word.synonyms),
          JSON.stringify(word.exampleSentence),
          i
        );
      }

      // Set active wordlist for all existing users
      const users = db.prepare('SELECT id FROM users').all() as Array<{ id: number }>;
      const insertActive = db.prepare('INSERT INTO user_active_wordlist (user_id, wordlist_id) VALUES (?, 1)');
      for (const user of users) {
        insertActive.run(user.id);
      }
    })();

    console.log('[Migration 009] Wordlists migration completed successfully.');
  }
};
