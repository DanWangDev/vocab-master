import { describe, it, expect } from 'vitest'
import { getTestDb, createTestStudent, createTestParent, createTestAdmin } from '../../test/helpers'
import { wordlistRepository } from '../index.js'

function createSystemWordlist(): void {
  const db = getTestDb()
  db.prepare(`
    INSERT INTO wordlists (id, name, description, is_system, visibility, word_count)
    VALUES (1, 'System List', 'Default system list', 1, 'system', 2)
  `).run()
  db.prepare(`
    INSERT INTO wordlist_words (wordlist_id, target_word, definitions, synonyms, example_sentences, sort_order)
    VALUES (1, 'apple', '["a fruit"]', '["fruit"]', '["I ate an apple"]', 0)
  `).run()
  db.prepare(`
    INSERT INTO wordlist_words (wordlist_id, target_word, definitions, synonyms, example_sentences, sort_order)
    VALUES (1, 'banana', '["a yellow fruit"]', '["fruit"]', '["I ate a banana"]', 1)
  `).run()
}

describe('SqliteWordlistRepository', () => {
  describe('create', () => {
    it('creates wordlist with words, sets word_count', async () => {
      const parent = await createTestParent()

      const id = wordlistRepository.create({
        name: 'My List',
        description: 'A custom list',
        visibility: 'private',
        createdBy: parent.id,
        words: [
          { targetWord: 'hello', definitions: ['greeting'], synonyms: ['hi'], exampleSentences: ['Hello world'] },
          { targetWord: 'world', definitions: ['earth'], synonyms: ['globe'], exampleSentences: ['Hello world'] }
        ]
      })

      expect(id).toBeGreaterThan(0)

      const wordlist = wordlistRepository.findById(id)
      expect(wordlist).toBeDefined()
      expect(wordlist!.name).toBe('My List')
      expect(wordlist!.word_count).toBe(2)
      expect(wordlist!.visibility).toBe('private')
      expect(wordlist!.created_by).toBe(parent.id)

      const words = wordlistRepository.getWords(id)
      expect(words).toHaveLength(2)
      expect(words[0].target_word).toBe('hello')
      expect(words[0].sort_order).toBe(0)
      expect(words[1].target_word).toBe('world')
      expect(words[1].sort_order).toBe(1)
    })
  })

  describe('findById', () => {
    it('returns wordlist', async () => {
      const parent = await createTestParent()
      const id = wordlistRepository.create({
        name: 'Find Me',
        description: '',
        visibility: 'private',
        createdBy: parent.id,
        words: []
      })

      const found = wordlistRepository.findById(id)
      expect(found).toBeDefined()
      expect(found!.name).toBe('Find Me')
    })

    it('returns undefined for non-existent', () => {
      const found = wordlistRepository.findById(99999)
      expect(found).toBeUndefined()
    })
  })

  describe('findAll', () => {
    it('admin: returns all wordlists', async () => {
      createSystemWordlist()
      const admin = await createTestAdmin()
      const parent = await createTestParent()

      wordlistRepository.create({
        name: 'Parent List',
        description: '',
        visibility: 'private',
        createdBy: parent.id,
        words: []
      })

      const all = wordlistRepository.findAll(admin.id, 'admin')
      expect(all.length).toBeGreaterThanOrEqual(2)
    })

    it('parent: returns system + own lists', async () => {
      createSystemWordlist()
      const parent1 = await createTestParent()
      const parent2 = await createTestParent()

      wordlistRepository.create({
        name: 'Parent1 List',
        description: '',
        visibility: 'private',
        createdBy: parent1.id,
        words: []
      })
      wordlistRepository.create({
        name: 'Parent2 List',
        description: '',
        visibility: 'private',
        createdBy: parent2.id,
        words: []
      })

      const lists = wordlistRepository.findAll(parent1.id, 'parent')
      const names = lists.map(l => l.name)
      expect(names).toContain('System List')
      expect(names).toContain('Parent1 List')
      expect(names).not.toContain('Parent2 List')
    })

    it('student: returns system + own + shared from parent', async () => {
      createSystemWordlist()
      const parent = await createTestParent()
      const student = await createTestStudent({ parentId: parent.id })

      wordlistRepository.create({
        name: 'Student Own',
        description: '',
        visibility: 'private',
        createdBy: student.id,
        words: []
      })
      wordlistRepository.create({
        name: 'Parent Shared',
        description: '',
        visibility: 'shared',
        createdBy: parent.id,
        words: []
      })
      wordlistRepository.create({
        name: 'Parent Private',
        description: '',
        visibility: 'private',
        createdBy: parent.id,
        words: []
      })

      const lists = wordlistRepository.findAll(student.id, 'student')
      const names = lists.map(l => l.name)
      expect(names).toContain('System List')
      expect(names).toContain('Student Own')
      expect(names).toContain('Parent Shared')
      expect(names).not.toContain('Parent Private')
    })
  })

  describe('getWords', () => {
    it('returns words in sort_order', async () => {
      const parent = await createTestParent()
      const id = wordlistRepository.create({
        name: 'Ordered',
        description: '',
        visibility: 'private',
        createdBy: parent.id,
        words: [
          { targetWord: 'zebra', definitions: ['animal'], synonyms: [], exampleSentences: [] },
          { targetWord: 'apple', definitions: ['fruit'], synonyms: [], exampleSentences: [] },
          { targetWord: 'mango', definitions: ['fruit'], synonyms: [], exampleSentences: [] }
        ]
      })

      const words = wordlistRepository.getWords(id)
      expect(words[0].target_word).toBe('zebra')
      expect(words[0].sort_order).toBe(0)
      expect(words[1].target_word).toBe('apple')
      expect(words[1].sort_order).toBe(1)
      expect(words[2].target_word).toBe('mango')
      expect(words[2].sort_order).toBe(2)
    })
  })

  describe('getActiveWordlist', () => {
    it('returns active wordlist', async () => {
      createSystemWordlist()
      const parent = await createTestParent()
      const student = await createTestStudent()

      const customId = wordlistRepository.create({
        name: 'Custom Active',
        description: '',
        visibility: 'private',
        createdBy: parent.id,
        words: []
      })

      wordlistRepository.setActiveWordlist(student.id, customId)

      const active = wordlistRepository.getActiveWordlist(student.id)
      expect(active.name).toBe('Custom Active')
    })

    it('falls back to system list (id=1) when no active set', async () => {
      createSystemWordlist()
      const student = await createTestStudent()

      const active = wordlistRepository.getActiveWordlist(student.id)
      expect(active.id).toBe(1)
      expect(active.is_system).toBe(1)
    })
  })

  describe('setActiveWordlist', () => {
    it('sets/replaces active wordlist', async () => {
      createSystemWordlist()
      const parent = await createTestParent()
      const student = await createTestStudent()

      const id1 = wordlistRepository.create({
        name: 'List A',
        description: '',
        visibility: 'private',
        createdBy: parent.id,
        words: []
      })
      const id2 = wordlistRepository.create({
        name: 'List B',
        description: '',
        visibility: 'private',
        createdBy: parent.id,
        words: []
      })

      wordlistRepository.setActiveWordlist(student.id, id1)
      expect(wordlistRepository.getActiveWordlist(student.id).name).toBe('List A')

      wordlistRepository.setActiveWordlist(student.id, id2)
      expect(wordlistRepository.getActiveWordlist(student.id).name).toBe('List B')
    })
  })

  describe('update', () => {
    it('updates name/description', async () => {
      const parent = await createTestParent()
      const id = wordlistRepository.create({
        name: 'Original',
        description: 'Old desc',
        visibility: 'private',
        createdBy: parent.id,
        words: []
      })

      wordlistRepository.update(id, { name: 'Updated', description: 'New desc' })

      const updated = wordlistRepository.findById(id)
      expect(updated!.name).toBe('Updated')
      expect(updated!.description).toBe('New desc')
    })

    it('preserves fields when not provided', async () => {
      const parent = await createTestParent()
      const id = wordlistRepository.create({
        name: 'Keep Name',
        description: 'Keep Desc',
        visibility: 'private',
        createdBy: parent.id,
        words: []
      })

      wordlistRepository.update(id, { name: 'Changed' })

      const updated = wordlistRepository.findById(id)
      expect(updated!.name).toBe('Changed')
      expect(updated!.description).toBe('Keep Desc')
    })
  })

  describe('addWords', () => {
    it('appends words with correct sort_order, updates word_count', async () => {
      const parent = await createTestParent()
      const id = wordlistRepository.create({
        name: 'Growing List',
        description: '',
        visibility: 'private',
        createdBy: parent.id,
        words: [
          { targetWord: 'first', definitions: ['1st'], synonyms: [], exampleSentences: [] }
        ]
      })

      wordlistRepository.addWords(id, [
        { targetWord: 'second', definitions: ['2nd'], synonyms: [], exampleSentences: [] },
        { targetWord: 'third', definitions: ['3rd'], synonyms: [], exampleSentences: [] }
      ])

      const words = wordlistRepository.getWords(id)
      expect(words).toHaveLength(3)
      expect(words[0].sort_order).toBe(0)
      expect(words[1].sort_order).toBe(1)
      expect(words[2].sort_order).toBe(2)
      expect(words[1].target_word).toBe('second')
      expect(words[2].target_word).toBe('third')

      const list = wordlistRepository.findById(id)
      expect(list!.word_count).toBe(3)
    })
  })

  describe('updateWord', () => {
    it('updates partial word fields', async () => {
      const parent = await createTestParent()
      const id = wordlistRepository.create({
        name: 'Word Update',
        description: '',
        visibility: 'private',
        createdBy: parent.id,
        words: [
          { targetWord: 'old', definitions: ['old def'], synonyms: ['syn'], exampleSentences: ['ex'] }
        ]
      })

      const words = wordlistRepository.getWords(id)
      const wordId = words[0].id

      wordlistRepository.updateWord(wordId, { targetWord: 'new' })

      const updated = wordlistRepository.getWordByIdAndList(wordId, id)
      expect(updated!.target_word).toBe('new')
      // Preserved
      expect(JSON.parse(updated!.definitions)).toEqual(['old def'])
    })
  })

  describe('deleteWord', () => {
    it('removes word, updates word_count', async () => {
      const parent = await createTestParent()
      const id = wordlistRepository.create({
        name: 'Delete Word',
        description: '',
        visibility: 'private',
        createdBy: parent.id,
        words: [
          { targetWord: 'keep', definitions: ['def'], synonyms: [], exampleSentences: [] },
          { targetWord: 'remove', definitions: ['def'], synonyms: [], exampleSentences: [] }
        ]
      })

      const words = wordlistRepository.getWords(id)
      const removeId = words.find(w => w.target_word === 'remove')!.id

      wordlistRepository.deleteWord(removeId, id)

      const remaining = wordlistRepository.getWords(id)
      expect(remaining).toHaveLength(1)
      expect(remaining[0].target_word).toBe('keep')

      const list = wordlistRepository.findById(id)
      expect(list!.word_count).toBe(1)
    })
  })

  describe('deleteWordlist', () => {
    it('removes non-system list', async () => {
      const parent = await createTestParent()
      const id = wordlistRepository.create({
        name: 'Deletable',
        description: '',
        visibility: 'private',
        createdBy: parent.id,
        words: []
      })

      wordlistRepository.deleteWordlist(id)

      const found = wordlistRepository.findById(id)
      expect(found).toBeUndefined()
    })

    it('switches active users to system list when deleted', async () => {
      createSystemWordlist()
      const parent = await createTestParent()
      const student = await createTestStudent()

      const id = wordlistRepository.create({
        name: 'Will Be Deleted',
        description: '',
        visibility: 'private',
        createdBy: parent.id,
        words: []
      })

      wordlistRepository.setActiveWordlist(student.id, id)
      wordlistRepository.deleteWordlist(id)

      const db = getTestDb()
      const active = db.prepare('SELECT wordlist_id FROM user_active_wordlist WHERE user_id = ?')
        .get(student.id) as { wordlist_id: number } | undefined
      expect(active!.wordlist_id).toBe(1)
    })

    it('throws for system list', () => {
      createSystemWordlist()

      expect(() => wordlistRepository.deleteWordlist(1)).toThrow('Cannot delete system wordlist')
    })
  })

  describe('importWords', () => {
    it('delegates to addWords', async () => {
      const parent = await createTestParent()
      const id = wordlistRepository.create({
        name: 'Import Target',
        description: '',
        visibility: 'private',
        createdBy: parent.id,
        words: []
      })

      wordlistRepository.importWords(id, [
        { targetWord: 'imported', definitions: ['def'], synonyms: [], exampleSentences: [] }
      ])

      const words = wordlistRepository.getWords(id)
      expect(words).toHaveLength(1)
      expect(words[0].target_word).toBe('imported')
    })
  })

  describe('getWordByIdAndList', () => {
    it('returns word for matching id+list combo', async () => {
      const parent = await createTestParent()
      const id = wordlistRepository.create({
        name: 'Combo Test',
        description: '',
        visibility: 'private',
        createdBy: parent.id,
        words: [
          { targetWord: 'match', definitions: ['def'], synonyms: [], exampleSentences: [] }
        ]
      })

      const words = wordlistRepository.getWords(id)
      const wordId = words[0].id

      const found = wordlistRepository.getWordByIdAndList(wordId, id)
      expect(found).toBeDefined()
      expect(found!.target_word).toBe('match')

      // Wrong list id
      const notFound = wordlistRepository.getWordByIdAndList(wordId, 99999)
      expect(notFound).toBeUndefined()
    })
  })
})
