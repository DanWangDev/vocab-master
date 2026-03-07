import { Router, Response } from 'express';
import multer from 'multer';
import { parse as csvParse } from 'csv-parse/sync';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { validate, createWordlistSchema, updateWordlistSchema, setActiveWordlistSchema, addWordsSchema, updateWordSchema } from '../middleware/validate.js';
import { wordlistRepository } from '../repositories/wordlistRepository.js';
import { logger } from '../services/logger.js';

const router = Router();

function serializeWordlistWord(row: any) {
  return {
    id: row.id,
    wordlistId: row.wordlist_id,
    targetWord: row.target_word,
    definitions: JSON.parse(row.definitions),
    synonyms: JSON.parse(row.synonyms),
    exampleSentences: JSON.parse(row.example_sentences),
    sortOrder: row.sort_order,
  };
}

function serializeWordlist(row: any) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    isSystem: row.is_system === 1,
    createdBy: row.created_by,
    visibility: row.visibility,
    wordCount: row.word_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }
});

// GET /template - CSV template download (no auth required)
router.get('/template', (_req, res) => {
  const template = 'word,definition,synonyms,example\nExample Word,First definition;Second definition,synonym1;synonym2,Example sentence one;Example sentence two\n';
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="wordlist-template.csv"');
  res.send(template);
});

// GET / - List wordlists
router.get('/', authMiddleware, (req: any, res: Response) => {
  try {
    const wordlists = wordlistRepository.findAll(req.user.userId, req.user.role);
    res.json({ wordlists: wordlists.map(serializeWordlist) });
  } catch (error) {
    logger.error('List wordlists error', { error: String(error) });
    res.status(500).json({ error: 'ServerError', message: 'Failed to fetch wordlists' });
  }
});

// GET /active - Get active wordlist + words
router.get('/active', authMiddleware, (req: any, res: Response) => {
  try {
    const wordlist = wordlistRepository.getActiveWordlist(req.user.userId);
    if (!wordlist) {
      res.status(404).json({ error: 'NotFound', message: 'No active wordlist found' });
      return;
    }
    const words = wordlistRepository.getWords(wordlist.id);
    res.json({ wordlist: serializeWordlist(wordlist), words: words.map(serializeWordlistWord) });
  } catch (error) {
    logger.error('Get active wordlist error', { error: String(error) });
    res.status(500).json({ error: 'ServerError', message: 'Failed to fetch active wordlist' });
  }
});

// PUT /active - Set active wordlist
router.put('/active', authMiddleware, validate(setActiveWordlistSchema), (req: any, res: Response) => {
  try {
    const { wordlistId } = req.body;

    const wordlist = wordlistRepository.findById(wordlistId);
    if (!wordlist) {
      res.status(404).json({ error: 'NotFound', message: 'Wordlist not found' });
      return;
    }

    wordlistRepository.setActiveWordlist(req.user.userId, wordlistId);
    res.json({ success: true, message: 'Active wordlist updated' });
  } catch (error) {
    logger.error('Set active wordlist error', { error: String(error) });
    res.status(500).json({ error: 'ServerError', message: 'Failed to set active wordlist' });
  }
});

// GET /:id - Get wordlist metadata
router.get('/:id', authMiddleware, (req: any, res: Response) => {
  try {
    const wordlist = wordlistRepository.findById(Number(req.params.id));
    if (!wordlist) {
      res.status(404).json({ error: 'NotFound', message: 'Wordlist not found' });
      return;
    }

    // Access check: private wordlists only visible to owner or admin
    if (wordlist.visibility === 'private' && wordlist.created_by !== req.user.userId && req.user.role !== 'admin') {
      res.status(403).json({ error: 'Forbidden', message: 'Access denied' });
      return;
    }

    res.json(serializeWordlist(wordlist));
  } catch (error) {
    logger.error('Get wordlist error', { error: String(error) });
    res.status(500).json({ error: 'ServerError', message: 'Failed to fetch wordlist' });
  }
});

// GET /:id/words - Get wordlist words
router.get('/:id/words', authMiddleware, (req: any, res: Response) => {
  try {
    const wordlist = wordlistRepository.findById(Number(req.params.id));
    if (!wordlist) {
      res.status(404).json({ error: 'NotFound', message: 'Wordlist not found' });
      return;
    }

    // Access check: private wordlists only visible to owner or admin
    if (wordlist.visibility === 'private' && wordlist.created_by !== req.user.userId && req.user.role !== 'admin') {
      res.status(403).json({ error: 'Forbidden', message: 'Access denied' });
      return;
    }

    const words = wordlistRepository.getWords(wordlist.id);
    res.json({ words: words.map(serializeWordlistWord) });
  } catch (error) {
    logger.error('Get wordlist words error', { error: String(error) });
    res.status(500).json({ error: 'ServerError', message: 'Failed to fetch wordlist words' });
  }
});

// POST / - Create wordlist from JSON body
router.post('/', authMiddleware, requireRole(['admin', 'parent']), validate(createWordlistSchema), (req: any, res: Response) => {
  try {
    const { name, description, visibility, words } = req.body;

    const wordlistId = wordlistRepository.create({
      name,
      description: description || '',
      visibility: visibility || 'private',
      createdBy: req.user.userId,
      words
    });

    res.status(201).json({ success: true, wordlistId, message: 'Wordlist created' });
  } catch (error) {
    logger.error('Create wordlist error', { error: String(error) });
    res.status(500).json({ error: 'ServerError', message: 'Failed to create wordlist' });
  }
});

// POST /import - CSV/JSON file upload
router.post('/import', authMiddleware, requireRole(['admin', 'parent']), upload.single('file'), (req: any, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'ValidationError', message: 'No file uploaded' });
      return;
    }

    const allowedMimes = ['text/csv', 'application/json', 'text/plain'];
    const allowedExtensions = /\.(csv|json|txt)$/i;
    if (!allowedMimes.includes(req.file.mimetype) && !allowedExtensions.test(req.file.originalname || '')) {
      res.status(400).json({ error: 'ValidationError', message: 'Only CSV and JSON files are supported' });
      return;
    }

    const listName = req.body.name || 'Imported Wordlist';
    const listDescription = req.body.description || '';
    const listVisibility = req.body.visibility || 'private';

    let rawContent = req.file.buffer.toString('utf-8');
    // BOM detection
    if (rawContent.charCodeAt(0) === 0xFEFF) {
      rawContent = rawContent.slice(1);
    }

    const errors: string[] = [];
    const wordsMap = new Map<string, {
      targetWord: string;
      definitions: string[];
      synonyms: string[];
      exampleSentences: string[];
    }>();

    const mimeType = req.file.mimetype;
    const fileName = req.file.originalname || '';

    if (mimeType === 'application/json' || fileName.endsWith('.json')) {
      // Parse JSON
      try {
        const jsonData = JSON.parse(rawContent);
        const items = Array.isArray(jsonData) ? jsonData : [jsonData];

        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          const word = (item.word || item.targetWord || '').trim();
          if (!word) {
            errors.push(`Row ${i + 1}: missing word`);
            continue;
          }

          const definitions = item.definitions || item.definition;
          const defArray = Array.isArray(definitions)
            ? definitions.map((d: string) => d.trim()).filter(Boolean)
            : typeof definitions === 'string'
              ? definitions.split(';').map((d: string) => d.trim()).filter(Boolean)
              : [];

          if (defArray.length === 0) {
            errors.push(`Row ${i + 1}: missing definition for "${word}"`);
            continue;
          }

          const synonyms = item.synonyms || [];
          const synArray = Array.isArray(synonyms)
            ? synonyms.map((s: string) => s.trim()).filter(Boolean)
            : typeof synonyms === 'string'
              ? synonyms.split(';').map((s: string) => s.trim()).filter(Boolean)
              : [];

          const examples = item.exampleSentences || item.exampleSentence || item.example || [];
          const exArray = Array.isArray(examples)
            ? examples.map((e: string) => e.trim()).filter(Boolean)
            : typeof examples === 'string'
              ? examples.split(';').map((e: string) => e.trim()).filter(Boolean)
              : [];

          // Deduplicate: last wins
          wordsMap.set(word.toLowerCase(), {
            targetWord: word,
            definitions: defArray,
            synonyms: synArray,
            exampleSentences: exArray
          });
        }
      } catch {
        res.status(400).json({ error: 'ParseError', message: 'Invalid JSON file' });
        return;
      }
    } else {
      // Parse CSV
      try {
        const records = csvParse(rawContent, {
          columns: true,
          skip_empty_lines: true,
          trim: true,
          relax_column_count: true
        }) as Array<Record<string, string>>;

        for (let i = 0; i < records.length; i++) {
          const row = records[i];
          const word = (row['word'] || row['Word'] || row['target_word'] || '').trim();
          if (!word) {
            errors.push(`Row ${i + 2}: missing word`);
            continue;
          }

          const defStr = (row['definition'] || row['Definition'] || row['definitions'] || '').trim();
          const defArray = defStr.split(';').map(d => d.trim()).filter(Boolean);
          if (defArray.length === 0) {
            errors.push(`Row ${i + 2}: missing definition for "${word}"`);
            continue;
          }

          const synStr = (row['synonyms'] || row['Synonyms'] || '').trim();
          const synArray = synStr ? synStr.split(';').map(s => s.trim()).filter(Boolean) : [];

          const exStr = (row['example'] || row['Example'] || row['example_sentences'] || '').trim();
          const exArray = exStr ? exStr.split(';').map(e => e.trim()).filter(Boolean) : [];

          // Deduplicate: last wins
          wordsMap.set(word.toLowerCase(), {
            targetWord: word,
            definitions: defArray,
            synonyms: synArray,
            exampleSentences: exArray
          });
        }
      } catch {
        res.status(400).json({ error: 'ParseError', message: 'Invalid CSV file' });
        return;
      }
    }

    const words = Array.from(wordsMap.values());

    if (words.length === 0) {
      res.status(400).json({ error: 'ValidationError', message: 'No valid words found in file', errors });
      return;
    }

    const wordlistId = wordlistRepository.create({
      name: listName,
      description: listDescription,
      visibility: listVisibility,
      createdBy: req.user.userId,
      words
    });

    res.status(201).json({
      success: true,
      wordlistId,
      wordsImported: words.length,
      errors
    });
  } catch (error) {
    logger.error('Import wordlist error', { error: String(error) });
    res.status(500).json({ error: 'ServerError', message: 'Failed to import wordlist' });
  }
});

// PUT /:id - Update metadata
router.put('/:id', authMiddleware, validate(updateWordlistSchema), (req: any, res: Response) => {
  try {
    const wordlistId = Number(req.params.id);
    const wordlist = wordlistRepository.findById(wordlistId);

    if (!wordlist) {
      res.status(404).json({ error: 'NotFound', message: 'Wordlist not found' });
      return;
    }

    if (wordlist.is_system) {
      res.status(403).json({ error: 'Forbidden', message: 'Cannot modify system wordlist' });
      return;
    }

    if (wordlist.created_by !== req.user.userId && req.user.role !== 'admin') {
      res.status(403).json({ error: 'Forbidden', message: 'You can only edit your own wordlists' });
      return;
    }

    wordlistRepository.update(wordlistId, req.body);
    res.json({ success: true, message: 'Wordlist updated' });
  } catch (error) {
    logger.error('Update wordlist error', { error: String(error) });
    res.status(500).json({ error: 'ServerError', message: 'Failed to update wordlist' });
  }
});

// DELETE /:id - Delete wordlist
router.delete('/:id', authMiddleware, (req: any, res: Response) => {
  try {
    const wordlistId = Number(req.params.id);
    const wordlist = wordlistRepository.findById(wordlistId);

    if (!wordlist) {
      res.status(404).json({ error: 'NotFound', message: 'Wordlist not found' });
      return;
    }

    if (wordlist.is_system) {
      res.status(403).json({ error: 'Forbidden', message: 'Cannot delete system wordlist' });
      return;
    }

    if (wordlist.created_by !== req.user.userId && req.user.role !== 'admin') {
      res.status(403).json({ error: 'Forbidden', message: 'You can only delete your own wordlists' });
      return;
    }

    wordlistRepository.deleteWordlist(wordlistId);
    res.json({ success: true, message: 'Wordlist deleted' });
  } catch (error) {
    logger.error('Delete wordlist error', { error: String(error) });
    res.status(500).json({ error: 'ServerError', message: 'Failed to delete wordlist' });
  }
});

// POST /:id/words - Add words
router.post('/:id/words', authMiddleware, validate(addWordsSchema), (req: any, res: Response) => {
  try {
    const wordlistId = Number(req.params.id);
    const wordlist = wordlistRepository.findById(wordlistId);

    if (!wordlist) {
      res.status(404).json({ error: 'NotFound', message: 'Wordlist not found' });
      return;
    }

    if (wordlist.is_system && req.user.role !== 'admin') {
      res.status(403).json({ error: 'Forbidden', message: 'Cannot modify system wordlist' });
      return;
    }

    if (!wordlist.is_system && wordlist.created_by !== req.user.userId && req.user.role !== 'admin') {
      res.status(403).json({ error: 'Forbidden', message: 'You can only modify your own wordlists' });
      return;
    }

    wordlistRepository.addWords(wordlistId, req.body.words);
    res.status(201).json({ success: true, message: 'Words added' });
  } catch (error) {
    logger.error('Add words error', { error: String(error) });
    res.status(500).json({ error: 'ServerError', message: 'Failed to add words' });
  }
});

// PUT /:id/words/:wordId - Edit word
router.put('/:id/words/:wordId', authMiddleware, validate(updateWordSchema), (req: any, res: Response) => {
  try {
    const wordlistId = Number(req.params.id);
    const wordId = Number(req.params.wordId);
    const wordlist = wordlistRepository.findById(wordlistId);

    if (!wordlist) {
      res.status(404).json({ error: 'NotFound', message: 'Wordlist not found' });
      return;
    }

    if (wordlist.is_system && req.user.role !== 'admin') {
      res.status(403).json({ error: 'Forbidden', message: 'Cannot modify system wordlist' });
      return;
    }

    if (!wordlist.is_system && wordlist.created_by !== req.user.userId && req.user.role !== 'admin') {
      res.status(403).json({ error: 'Forbidden', message: 'You can only modify your own wordlists' });
      return;
    }

    const word = wordlistRepository.getWordByIdAndList(wordId, wordlistId);
    if (!word) {
      res.status(404).json({ error: 'NotFound', message: 'Word not found in this wordlist' });
      return;
    }

    wordlistRepository.updateWord(wordId, req.body);
    res.json({ success: true, message: 'Word updated' });
  } catch (error) {
    logger.error('Update word error', { error: String(error) });
    res.status(500).json({ error: 'ServerError', message: 'Failed to update word' });
  }
});

// DELETE /:id/words/:wordId - Remove word
router.delete('/:id/words/:wordId', authMiddleware, (req: any, res: Response) => {
  try {
    const wordlistId = Number(req.params.id);
    const wordId = Number(req.params.wordId);
    const wordlist = wordlistRepository.findById(wordlistId);

    if (!wordlist) {
      res.status(404).json({ error: 'NotFound', message: 'Wordlist not found' });
      return;
    }

    if (wordlist.is_system && req.user.role !== 'admin') {
      res.status(403).json({ error: 'Forbidden', message: 'Cannot modify system wordlist' });
      return;
    }

    if (!wordlist.is_system && wordlist.created_by !== req.user.userId && req.user.role !== 'admin') {
      res.status(403).json({ error: 'Forbidden', message: 'You can only modify your own wordlists' });
      return;
    }

    const word = wordlistRepository.getWordByIdAndList(wordId, wordlistId);
    if (!word) {
      res.status(404).json({ error: 'NotFound', message: 'Word not found in this wordlist' });
      return;
    }

    wordlistRepository.deleteWord(wordId, wordlistId);
    res.json({ success: true, message: 'Word deleted' });
  } catch (error) {
    logger.error('Delete word error', { error: String(error) });
    res.status(500).json({ error: 'ServerError', message: 'Failed to delete word' });
  }
});

export default router;
