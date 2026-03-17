import db from '../config/database.js';
import type { WordlistRow, WordlistWordRow } from '../types/index.js';

export const wordlistRepository = {
  findAll(userId: number, role: string): WordlistRow[] {
    if (role === 'admin') {
      return db.prepare(`
        SELECT * FROM wordlists
        ORDER BY is_system DESC, updated_at DESC
      `).all() as WordlistRow[];
    }

    // For parents: system + own lists
    if (role === 'parent') {
      return db.prepare(`
        SELECT * FROM wordlists
        WHERE visibility = 'system'
           OR created_by = ?
        ORDER BY is_system DESC, updated_at DESC
      `).all(userId) as WordlistRow[];
    }

    // For students: system + lists assigned to them (via parent) + shared lists from their parent
    return db.prepare(`
      SELECT DISTINCT w.* FROM wordlists w
      WHERE w.visibility = 'system'
         OR w.created_by = ?
         OR (w.visibility = 'shared' AND w.created_by IN (
           SELECT parent_id FROM users WHERE id = ? AND parent_id IS NOT NULL
         ))
      ORDER BY w.is_system DESC, w.updated_at DESC
    `).all(userId, userId) as WordlistRow[];
  },

  findById(id: number): WordlistRow | undefined {
    return db.prepare('SELECT * FROM wordlists WHERE id = ?').get(id) as WordlistRow | undefined;
  },

  getWords(wordlistId: number): WordlistWordRow[] {
    return db.prepare(
      'SELECT * FROM wordlist_words WHERE wordlist_id = ? ORDER BY sort_order ASC'
    ).all(wordlistId) as WordlistWordRow[];
  },

  getActiveWordlist(userId: number): WordlistRow {
    const row = db.prepare(`
      SELECT w.* FROM user_active_wordlist uaw
      JOIN wordlists w ON w.id = uaw.wordlist_id
      WHERE uaw.user_id = ?
    `).get(userId) as WordlistRow | undefined;

    if (row) return row;

    // Fallback to system list
    return db.prepare('SELECT * FROM wordlists WHERE id = 1').get() as WordlistRow;
  },

  setActiveWordlist(userId: number, wordlistId: number): void {
    db.prepare(
      'INSERT OR REPLACE INTO user_active_wordlist (user_id, wordlist_id) VALUES (?, ?)'
    ).run(userId, wordlistId);
  },

  create(params: {
    name: string;
    description: string;
    visibility: string;
    createdBy: number;
    words: Array<{
      targetWord: string;
      definitions: string[];
      synonyms: string[];
      exampleSentences: string[];
    }>;
  }): number {
    const result = db.transaction(() => {
      const insertList = db.prepare(`
        INSERT INTO wordlists (name, description, visibility, created_by, word_count)
        VALUES (?, ?, ?, ?, ?)
      `);
      const info = insertList.run(
        params.name,
        params.description,
        params.visibility,
        params.createdBy,
        params.words.length
      );
      const wordlistId = info.lastInsertRowid as number;

      const insertWord = db.prepare(`
        INSERT INTO wordlist_words (wordlist_id, target_word, definitions, synonyms, example_sentences, sort_order)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      for (let i = 0; i < params.words.length; i++) {
        const word = params.words[i];
        insertWord.run(
          wordlistId,
          word.targetWord,
          JSON.stringify(word.definitions),
          JSON.stringify(word.synonyms),
          JSON.stringify(word.exampleSentences),
          i
        );
      }

      return wordlistId;
    })();

    return result;
  },

  update(id: number, params: { name?: string; description?: string }): void {
    const current = this.findById(id);
    if (!current) throw new Error('Wordlist not found');

    const name = params.name !== undefined ? params.name : current.name;
    const description = params.description !== undefined ? params.description : current.description;

    db.prepare(`
      UPDATE wordlists SET name = ?, description = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(name, description, id);
  },

  deleteWordlist(id: number): void {
    const wordlist = this.findById(id);
    if (!wordlist) throw new Error('Wordlist not found');
    if (wordlist.is_system) throw new Error('Cannot delete system wordlist');

    db.transaction(() => {
      // Switch users who had this as active to system list
      db.prepare(
        'UPDATE user_active_wordlist SET wordlist_id = 1 WHERE wordlist_id = ?'
      ).run(id);

      db.prepare('DELETE FROM wordlists WHERE id = ?').run(id);
    })();
  },

  addWords(wordlistId: number, words: Array<{
    targetWord: string;
    definitions: string[];
    synonyms: string[];
    exampleSentences: string[];
  }>): void {
    db.transaction(() => {
      // Get current max sort_order
      const maxRow = db.prepare(
        'SELECT COALESCE(MAX(sort_order), -1) as max_order FROM wordlist_words WHERE wordlist_id = ?'
      ).get(wordlistId) as { max_order: number };
      let order = maxRow.max_order + 1;

      const insertWord = db.prepare(`
        INSERT INTO wordlist_words (wordlist_id, target_word, definitions, synonyms, example_sentences, sort_order)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      for (const word of words) {
        insertWord.run(
          wordlistId,
          word.targetWord,
          JSON.stringify(word.definitions),
          JSON.stringify(word.synonyms),
          JSON.stringify(word.exampleSentences),
          order++
        );
      }

      db.prepare(
        "UPDATE wordlists SET word_count = (SELECT COUNT(*) FROM wordlist_words WHERE wordlist_id = ?), updated_at = datetime('now') WHERE id = ?"
      ).run(wordlistId, wordlistId);
    })();
  },

  updateWord(wordId: number, data: {
    targetWord?: string;
    definitions?: string[];
    synonyms?: string[];
    exampleSentences?: string[];
  }): void {
    const current = db.prepare('SELECT * FROM wordlist_words WHERE id = ?').get(wordId) as WordlistWordRow | undefined;
    if (!current) throw new Error('Word not found');

    const targetWord = data.targetWord !== undefined ? data.targetWord : current.target_word;
    const definitions = data.definitions !== undefined ? JSON.stringify(data.definitions) : current.definitions;
    const synonyms = data.synonyms !== undefined ? JSON.stringify(data.synonyms) : current.synonyms;
    const exampleSentences = data.exampleSentences !== undefined ? JSON.stringify(data.exampleSentences) : current.example_sentences;

    db.prepare(`
      UPDATE wordlist_words SET target_word = ?, definitions = ?, synonyms = ?, example_sentences = ?
      WHERE id = ?
    `).run(targetWord, definitions, synonyms, exampleSentences, wordId);

    db.prepare("UPDATE wordlists SET updated_at = datetime('now') WHERE id = ?").run(current.wordlist_id);
  },

  deleteWord(wordId: number, wordlistId: number): void {
    db.transaction(() => {
      db.prepare('DELETE FROM wordlist_words WHERE id = ? AND wordlist_id = ?').run(wordId, wordlistId);

      db.prepare(
        "UPDATE wordlists SET word_count = (SELECT COUNT(*) FROM wordlist_words WHERE wordlist_id = ?), updated_at = datetime('now') WHERE id = ?"
      ).run(wordlistId, wordlistId);
    })();
  },

  importWords(wordlistId: number, words: Array<{
    targetWord: string;
    definitions: string[];
    synonyms: string[];
    exampleSentences: string[];
  }>): void {
    this.addWords(wordlistId, words);
  },

  getWordByIdAndList(wordId: number, wordlistId: number): WordlistWordRow | undefined {
    return db.prepare(
      'SELECT * FROM wordlist_words WHERE id = ? AND wordlist_id = ?'
    ).get(wordId, wordlistId) as WordlistWordRow | undefined;
  }
};
