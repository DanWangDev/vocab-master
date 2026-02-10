# Custom Wordlist Support Plan

> **Status:** Planning  
> **Date:** 2026-02-10

## Context

Vocab Master currently uses a single hardcoded `public/words.json` (1,832 English vocabulary words). This limits the audience to 11+ English learners. To reach a broader audience (different grade levels, ESL learners, SAT/GRE prep, foreign language vocab, teacher-curated lists), we need to let users upload/import custom word lists while keeping the existing list as a built-in default.

- **Current word schema:** `{ targetWord, definition[], synonyms[], exampleSentence[] }`
- **Current flow:** Static JSON → AppContext cache → Study/Quiz/Challenge modes
- **Key constraint:** Quiz MCQ needs 4+ words with definitions; synonym questions need words with synonyms. Custom lists may lack these fields.

---

## Design Decisions (from team discussion)

### Decision 1: Word storage — Database, not static files

Move words into SQLite. The existing `words.json` becomes a seeded system wordlist (`id=1`). Custom lists are stored the same way. This unifies the data model.

### Decision 2: Keep `quiz_answers.word` as a string (loose coupling)

Trade-off: Adding FK to a words table would break if wordlists are deleted and adds migration complexity. Since quiz history is an audit log, keeping the word string is simpler and more durable. Weak words aggregation already works on strings.

### Decision 3: Single active wordlist per user

Users study one list at a time. Switching lists is a dashboard action. This keeps Study/Quiz/Challenge flows unchanged — they just receive a different `VocabularyWord[]`. Merging lists is a future enhancement.

### Decision 4: CSV as primary import format

Teachers and parents create word lists in spreadsheets. CSV is universal. JSON import for power users. Template CSV download provided.

### Decision 5: Minimum viable word = `targetWord` + `definition`

- Words without synonyms → synonym-based questions skipped (quiz uses definition-only MCQ)
- Words without example sentences → flashcard shows no example
- Lists with <4 words → study-only (quiz disabled with clear messaging)

### Decision 6: Role-based wordlist permissions

- **Admin:** Create system-wide wordlists visible to all users
- **Parent:** Create wordlists and assign to linked students
- **Student:** Browse available lists, select active list. Cannot create/upload (keeps UX simple for kids)

---

## Database Schema

### New tables (migration 009)

```sql
CREATE TABLE wordlists (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  is_system INTEGER NOT NULL DEFAULT 0,       -- 1 = built-in, cannot be deleted
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  visibility TEXT NOT NULL DEFAULT 'private',  -- 'system' | 'private' | 'shared'
  word_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE wordlist_words (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  wordlist_id INTEGER NOT NULL REFERENCES wordlists(id) ON DELETE CASCADE,
  target_word TEXT NOT NULL,
  definitions TEXT NOT NULL,                   -- JSON array: ["def1", "def2"]
  synonyms TEXT NOT NULL DEFAULT '[]',         -- JSON array
  example_sentences TEXT NOT NULL DEFAULT '[]', -- JSON array
  sort_order INTEGER NOT NULL DEFAULT 0,
  UNIQUE(wordlist_id, target_word)
);

CREATE TABLE user_active_wordlist (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  wordlist_id INTEGER NOT NULL REFERENCES wordlists(id) ON DELETE CASCADE
);

CREATE INDEX idx_wordlist_words_list ON wordlist_words(wordlist_id);
CREATE INDEX idx_wordlists_visibility ON wordlists(visibility);
CREATE INDEX idx_wordlists_created_by ON wordlists(created_by);
```

### Migration 009: Seed existing words

- Create wordlists row: `{ id: 1, name: "11+ Vocabulary", is_system: 1, visibility: "system", word_count: 1832 }`
- Parse `public/words.json` and INSERT all 1,832 words into `wordlist_words` with `wordlist_id=1`
- Create `user_active_wordlist` entries for all existing users pointing to wordlist 1

---

## API Endpoints

### Wordlists CRUD

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/wordlists` | Any | List available wordlists (system + own + assigned) |
| GET | `/api/wordlists/:id` | Any | Get wordlist metadata |
| GET | `/api/wordlists/:id/words` | Any | Get all words in a wordlist |
| POST | `/api/wordlists` | Admin/Parent | Create new wordlist (JSON body with words) |
| POST | `/api/wordlists/import` | Admin/Parent | Upload CSV/JSON file |
| PUT | `/api/wordlists/:id` | Owner/Admin | Update wordlist metadata |
| DELETE | `/api/wordlists/:id` | Owner/Admin | Delete wordlist (not system lists) |

### Active Wordlist

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/wordlists/active` | Any | Get user's active wordlist + its words |
| PUT | `/api/wordlists/active` | Any | Set active wordlist `{ wordlistId: number }` |

### Word Management (within a list)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/wordlists/:id/words` | Owner/Admin | Add words to a list |
| PUT | `/api/wordlists/:id/words/:wordId` | Owner/Admin | Edit a word |
| DELETE | `/api/wordlists/:id/words/:wordId` | Owner/Admin | Remove a word |

---

## CSV Import Format

### Template (downloadable)

```csv
word,definition,synonyms,example
squalor,"filthy or degraded conditions","filth;sordidness","The family was living in squalor."
eloquent,"fluent or persuasive speaking","articulate;expressive","She gave an eloquent speech."
```

### Rules

- **Required columns:** `word`, `definition`
- **Optional columns:** `synonyms`, `example`
- **Multi-value separator:** semicolon (`;`) within cells for multiple definitions/synonyms/examples
- **Encoding:** UTF-8 (with BOM detection)
- **Size limit:** 5MB (~50k words max)
- **Validation:** Skip blank rows, trim whitespace, deduplicate words (last wins), reject rows missing word or definition

### Upload flow

1. User selects CSV file
2. Backend parses with validation
3. Returns preview: `{ valid: 142, skipped: 3, errors: [{row: 5, reason: "missing definition"}] }`
4. User confirms → words inserted
5. New wordlist created with metadata

---

## Frontend Architecture

### New Types (`src/types/wordlist.ts`)

```typescript
interface Wordlist {
  id: number
  name: string
  description: string
  isSystem: boolean
  createdBy: number | null
  visibility: 'system' | 'private' | 'shared'
  wordCount: number
  createdAt: string
  updatedAt: string
}

interface WordlistWord {
  id: number
  wordlistId: number
  targetWord: string
  definitions: string[]
  synonyms: string[]
  exampleSentences: string[]
  sortOrder: number
}
```

### State Management — Extend AppContext

- Add `activeWordlist: Wordlist | null` and `activeWords: VocabularyWord[]` to state
- Replace current vocabulary loading from `/words.json` with API call to `/api/wordlists/active`
- Fallback for unauthenticated users: Fetch system wordlist (`id=1`) from `/api/wordlists/1/words`
- Cache active wordlist words in memory (same pattern as current `vocabularyCache`)

### New Components

| Component | Location | Purpose |
|-----------|----------|---------|
| WordlistSelector | `src/components/wordlists/WordlistSelector.tsx` | Card grid to browse & select active list |
| WordlistManager | `src/components/wordlists/WordlistManager.tsx` | Admin/parent view: create, edit, delete lists |
| ImportModal | `src/components/wordlists/ImportModal.tsx` | CSV/JSON upload with preview & validation |
| WordlistBadge | `src/components/wordlists/WordlistBadge.tsx` | Shows active list name on dashboard |

### Dashboard Changes

- Add `WordlistBadge` below greeting showing active list name + word count
- Click badge → opens `WordlistSelector` modal
- Admin/Parent dashboard gets "Manage Wordlists" card

### QuizGenerator Adaptation

- <4 words in list: Disable quiz/challenge, show message "Add at least 4 words to start quizzing"
- No synonyms in any word: Skip synonym question type, use definition-only MCQ
- Few words (4–10): Allow quiz but reduce question count options, warn about repetition
- `generateQuizQuestion()` already receives `allWords[]` — no structural change needed, just guards

### Route Changes

- `/wordlists` — WordlistSelector (all users)
- `/wordlists/manage` — WordlistManager (admin/parent only)

---

## Implementation Phases

### Phase 1: Backend — Database & API

**Files to create:**
- `backend/src/migrations/009_add_wordlists.ts` — Schema + seed existing words
- `backend/src/repositories/wordlistRepository.ts` — CRUD operations
- `backend/src/routes/wordlists.ts` — All wordlist endpoints
- `backend/src/middleware/validate.ts` — Add wordlist validation schemas

**Files to modify:**
- `backend/src/migrations/index.ts` — Register migration 009
- `backend/src/types/index.ts` — Add Wordlist types
- `backend/src/routes/index.ts` — Mount wordlist routes

### Phase 2: Frontend — Types, API, Context

**Files to create:**
- `src/types/wordlist.ts` — Wordlist and WordlistWord interfaces

**Files to modify:**
- `src/services/ApiService.ts` — Add wordlist API methods
- `src/contexts/AppContext.tsx` — Replace `/words.json` fetch with active wordlist API
- `src/types/vocabulary.ts` — Ensure VocabularyWord maps from WordlistWord

### Phase 3: Frontend — UI Components

**Files to create:**
- `src/components/wordlists/WordlistSelector.tsx`
- `src/components/wordlists/WordlistManager.tsx`
- `src/components/wordlists/ImportModal.tsx`
- `src/components/wordlists/WordlistBadge.tsx`
- `src/components/wordlists/index.ts`

**Files to modify:**
- `src/components/dashboard/Dashboard.tsx` — Add WordlistBadge + selector trigger
- `src/components/admin/AdminPanel.tsx` — Add "Manage Wordlists" section
- `src/components/parent/ParentDashboard.tsx` — Add wordlist management
- `src/routes/index.tsx` — Add wordlist routes
- `src/services/QuizGenerator.ts` — Add guards for small/incomplete lists
- `src/components/quiz/QuizSetup.tsx` — Disable quiz if <4 words
- `src/components/challenge/DailyChallenge.tsx` — Disable challenge if <4 words

### Phase 4: CSV Import (sequential, after Phase 1)

- **Backend:** Add multer for file uploads, CSV parser, validation pipeline
- **Frontend:** ImportModal with drag-drop, preview table, error display, confirm button

---

## Backward Compatibility

| Concern | Mitigation |
|---------|------------|
| Existing users have no `user_active_wordlist` row | Migration seeds all existing users with `wordlist_id=1` |
| `quiz_answers.word` stores plain strings | No change — stays as string, independent of wordlist |
| `user_vocabulary` tracks learned words by string | No change — works across wordlists |
| Unauthenticated users can't call API | Fetch system wordlist without auth (public endpoint) |
| `public/words.json` still exists | Keep it as fallback. Remove in future version |

---

## Testing Strategy

### P0 — Must pass before shipping

1. Existing 1,832-word list loads correctly via new API path
2. Study/Quiz/Challenge work identically with system wordlist
3. CSV import with valid file creates wordlist and words
4. Switching active wordlist changes Study/Quiz word pool
5. List with <4 words disables Quiz/Challenge with clear message
6. Deleting a wordlist falls back to system list
7. Admin can create system wordlists visible to all

### P1 — Should pass

8. CSV import rejects malformed files with useful error messages
9. Words without synonyms → quiz skips synonym questions
10. Unicode/special characters in words display correctly
11. Large wordlist (5k words) loads without performance degradation
12. Parent can assign wordlist to linked student

### P2 — Nice to have

13. Concurrent wordlist edits don't corrupt data
14. XSS prevention: word definitions rendered safely (React already escapes JSX)
15. File upload >5MB rejected with clear message

---

## Future Roadmap (out of scope for v1)

- **Wordlist sharing/marketplace** — Browse community lists, fork & customize
- **Merge lists** — Combine multiple lists into a study session
- **AI-powered enrichment** — Auto-fill synonyms/examples for uploaded words
- **Word difficulty scoring** — Track per-word accuracy across all users
- **Mobile app** — Same API, React Native client, file picker for CSV import
- **Spaced repetition** — Schedule reviews based on word mastery
- **Backend error i18n** — Return error codes instead of English strings

---

## i18n — New `wordlists` Namespace

Since the app now has i18n support, all new wordlist UI strings need translation files:

- `src/i18n/locales/en/wordlists.json` + `src/i18n/locales/zh-CN/wordlists.json`
- Register namespace in `src/i18n/index.ts`
- ~30 keys: list names, import labels, error messages, badges, confirmation dialogs

---

## Execution Strategy

3 parallel agents + 1 sequential:

1. **Backend agent** — Phase 1 (migration, repository, routes, validation)
2. **Frontend state agent** — Phase 2 (types, API service, context changes)
3. **Frontend UI agent** — Phase 3 (WordlistSelector, Manager, Badge, dashboard integration)
4. **Import agent** — Phase 4 (CSV upload, sequentially after backend is ready)

---

## Verification

1. `cd vocab-master/backend && npx tsx src/index.ts` — migration runs, seeds 1,832 words
2. `curl /api/wordlists` — returns system wordlist
3. `curl /api/wordlists/active` — returns words for current user
4. `npm run dev` — app loads with wordlist from API (not static JSON)
5. Dashboard shows wordlist badge, click opens selector
6. Upload CSV → preview → confirm → new list appears
7. Switch to custom list → Study/Quiz use new words
8. Switch back to system list → original 1,832 words
9. `npx tsc --noEmit` — zero errors
10. `npm run build` — succeeds