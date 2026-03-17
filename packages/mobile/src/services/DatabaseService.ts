import * as SQLite from 'expo-sqlite';
import type { WordlistWord, Wordlist } from '@vocab-master/shared';

const DB_NAME = 'vocab_master.db';
const SCHEMA_VERSION = 1;

export interface SyncQueueItem {
  id: number;
  action: string;
  endpoint: string;
  method: string;
  body: string;
  createdAt: string;
  retryCount: number;
}

class DatabaseServiceClass {
  private db: SQLite.SQLiteDatabase | null = null;

  async init(): Promise<void> {
    if (this.db) return;

    this.db = await SQLite.openDatabaseAsync(DB_NAME);
    await this.migrate();
  }

  private async getDb(): Promise<SQLite.SQLiteDatabase> {
    if (!this.db) {
      await this.init();
    }
    return this.db!;
  }

  private async migrate(): Promise<void> {
    const db = await this.getDb();

    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS schema_version (
        version INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS cached_wordlists (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        word_count INTEGER DEFAULT 0,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS cached_words (
        id INTEGER PRIMARY KEY,
        wordlist_id INTEGER NOT NULL,
        target_word TEXT NOT NULL,
        definitions TEXT NOT NULL,
        synonyms TEXT NOT NULL,
        example_sentences TEXT NOT NULL,
        sort_order INTEGER DEFAULT 0,
        FOREIGN KEY (wordlist_id) REFERENCES cached_wordlists(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS sync_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        action TEXT NOT NULL,
        endpoint TEXT NOT NULL,
        method TEXT NOT NULL DEFAULT 'POST',
        body TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        retry_count INTEGER DEFAULT 0
      );

      CREATE INDEX IF NOT EXISTS idx_cached_words_wordlist ON cached_words(wordlist_id);
      CREATE INDEX IF NOT EXISTS idx_sync_queue_created ON sync_queue(created_at);
    `);
  }

  // --- Wordlist caching ---

  async cacheWordlist(wordlist: Wordlist, words: WordlistWord[]): Promise<void> {
    const db = await this.getDb();

    await db.runAsync(
      `INSERT OR REPLACE INTO cached_wordlists (id, name, description, word_count, updated_at)
       VALUES (?, ?, ?, ?, ?)`,
      wordlist.id,
      wordlist.name,
      wordlist.description ?? null,
      words.length,
      new Date().toISOString()
    );

    await db.runAsync('DELETE FROM cached_words WHERE wordlist_id = ?', wordlist.id);

    for (let i = 0; i < words.length; i++) {
      const w = words[i];
      await db.runAsync(
        `INSERT INTO cached_words (id, wordlist_id, target_word, definitions, synonyms, example_sentences, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        w.id,
        wordlist.id,
        w.targetWord,
        JSON.stringify(w.definitions),
        JSON.stringify(w.synonyms),
        JSON.stringify(w.exampleSentences),
        w.sortOrder ?? i
      );
    }
  }

  async getCachedWordlist(wordlistId: number): Promise<{
    wordlist: Wordlist;
    words: WordlistWord[];
  } | null> {
    const db = await this.getDb();

    const wl = await db.getFirstAsync<{
      id: number;
      name: string;
      description: string | null;
      word_count: number;
      updated_at: string;
    }>('SELECT * FROM cached_wordlists WHERE id = ?', wordlistId);

    if (!wl) return null;

    const rows = await db.getAllAsync<{
      id: number;
      wordlist_id: number;
      target_word: string;
      definitions: string;
      synonyms: string;
      example_sentences: string;
      sort_order: number;
    }>('SELECT * FROM cached_words WHERE wordlist_id = ? ORDER BY sort_order', wordlistId);

    const wordlist: Wordlist = {
      id: wl.id,
      name: wl.name,
      description: wl.description ?? '',
      isSystem: false,
      createdBy: null,
      visibility: 'private',
      wordCount: wl.word_count,
      createdAt: wl.updated_at,
      updatedAt: wl.updated_at,
    };

    const words: WordlistWord[] = rows.map(r => ({
      id: r.id,
      wordlistId: r.wordlist_id,
      targetWord: r.target_word,
      definitions: JSON.parse(r.definitions),
      synonyms: JSON.parse(r.synonyms),
      exampleSentences: JSON.parse(r.example_sentences),
      sortOrder: r.sort_order,
    }));

    return { wordlist, words };
  }

  async getAnyCachedWordlist(): Promise<{
    wordlist: Wordlist;
    words: WordlistWord[];
  } | null> {
    const db = await this.getDb();

    const wl = await db.getFirstAsync<{
      id: number;
      name: string;
      description: string | null;
      word_count: number;
      updated_at: string;
    }>('SELECT * FROM cached_wordlists ORDER BY updated_at DESC LIMIT 1');

    if (!wl) return null;
    return this.getCachedWordlist(wl.id);
  }

  // --- Sync queue ---

  async addToSyncQueue(
    action: string,
    endpoint: string,
    method: string,
    body: unknown
  ): Promise<void> {
    const db = await this.getDb();
    await db.runAsync(
      'INSERT INTO sync_queue (action, endpoint, method, body) VALUES (?, ?, ?, ?)',
      action,
      endpoint,
      method,
      JSON.stringify(body)
    );
  }

  async getSyncQueue(): Promise<SyncQueueItem[]> {
    const db = await this.getDb();
    return db.getAllAsync<SyncQueueItem>(
      'SELECT * FROM sync_queue ORDER BY created_at ASC'
    );
  }

  async getSyncQueueCount(): Promise<number> {
    const db = await this.getDb();
    const result = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM sync_queue'
    );
    return result?.count ?? 0;
  }

  async removeSyncQueueItem(id: number): Promise<void> {
    const db = await this.getDb();
    await db.runAsync('DELETE FROM sync_queue WHERE id = ?', id);
  }

  async incrementRetryCount(id: number): Promise<void> {
    const db = await this.getDb();
    await db.runAsync(
      'UPDATE sync_queue SET retry_count = retry_count + 1 WHERE id = ?',
      id
    );
  }

  async removeFailedItems(maxRetries: number): Promise<number> {
    const db = await this.getDb();
    const result = await db.runAsync(
      'DELETE FROM sync_queue WHERE retry_count >= ?',
      maxRetries
    );
    return result.changes;
  }

  async clearSyncQueue(): Promise<void> {
    const db = await this.getDb();
    await db.runAsync('DELETE FROM sync_queue');
  }

  async clearAllCache(): Promise<void> {
    const db = await this.getDb();
    await db.execAsync(`
      DELETE FROM cached_words;
      DELETE FROM cached_wordlists;
      DELETE FROM sync_queue;
    `);
  }
}

export const DatabaseService = new DatabaseServiceClass();
