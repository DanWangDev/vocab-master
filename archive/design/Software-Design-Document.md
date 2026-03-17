# Software Design Document: 11+ Vocabulary Master

**Version:** 1.0
**Status:** Draft for Review
**Last Updated:** January 2026

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Technology Stack](#2-technology-stack)
3. [System Architecture](#3-system-architecture)
4. [Data Models](#4-data-models)
5. [Component Architecture](#5-component-architecture)
6. [State Management](#6-state-management)
7. [Core Algorithms](#7-core-algorithms)
8. [UI/UX Implementation](#8-uiux-implementation)
9. [Storage Strategy](#9-storage-strategy)
10. [Audio System](#10-audio-system)
11. [Project Structure](#11-project-structure)
12. [Build & Deployment](#12-build--deployment)
13. [Future Considerations](#13-future-considerations)

---

## 1. Executive Summary

This document outlines the technical design for **11+ Vocabulary Master**, a web-based vocabulary learning application targeting children (ages 10-11) preparing for UK Grammar School admission exams.

### Key Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Framework | React 18+ with Vite | Fast HMR, excellent TypeScript support, large ecosystem for child-friendly UI components |
| Language | TypeScript | Type safety prevents runtime errors, better IDE support for development |
| Styling | Tailwind CSS | Rapid responsive design, utility-first approach ideal for component-based architecture |
| Animation | Framer Motion | Declarative animations, gestures support, performant on mobile |
| Audio | Howler.js | Cross-browser audio support, sprite support for multiple sounds |
| Storage | localStorage + IndexedDB | No backend needed; IndexedDB for learning history, localStorage for settings |
| Build | Vite | Fast builds, optimized production bundles, excellent DX |

---

## 2. Technology Stack

### 2.1 Core Stack

```
Frontend Framework:  React 18.x
Build Tool:          Vite 5.x
Language:            TypeScript 5.x
Styling:             Tailwind CSS 3.x
Animation:           Framer Motion 11.x
Audio:               Howler.js 2.x
Icons:               Lucide React
Testing:             Vitest + React Testing Library
```

### 2.2 Development Tools

```
Package Manager:     npm / pnpm
Linting:             ESLint + Prettier
Git Hooks:           Husky + lint-staged
```

### 2.3 Why This Stack?

**React + Vite** over alternatives:
- **vs Next.js**: No SSR/SSG needed; this is a pure client-side app
- **vs Vue**: React has broader component ecosystem for educational apps
- **vs Svelte**: React's larger community means more resources for solving edge cases
- **vs Vanilla JS**: Complex state management (quiz progress, timers, scores) benefits from React's declarative model

**Tailwind CSS** over alternatives:
- **vs CSS Modules**: Faster prototyping, built-in responsive utilities
- **vs styled-components**: Better performance (no runtime CSS-in-JS), smaller bundle
- **vs Bootstrap**: More customizable, no opinionated design to override

**No Backend Required** because:
- All vocabulary data is static JSON (~1MB)
- User progress can persist in browser storage
- No user accounts or cloud sync in MVP scope

---

## 3. System Architecture

### 3.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser (Client)                          │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │   React     │  │   Framer    │  │   Howler    │              │
│  │   App       │  │   Motion    │  │   Audio     │              │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘              │
│         │                │                │                      │
│  ┌──────┴────────────────┴────────────────┴──────┐              │
│  │              Application State                 │              │
│  │         (React Context + useReducer)           │              │
│  └──────────────────────┬────────────────────────┘              │
│                         │                                        │
│  ┌──────────────────────┴────────────────────────┐              │
│  │              Storage Layer                     │              │
│  │  ┌─────────────┐    ┌─────────────────────┐   │              │
│  │  │ localStorage │    │     IndexedDB       │   │              │
│  │  │ (Settings)   │    │ (Learning History)  │   │              │
│  │  └─────────────┘    └─────────────────────┘   │              │
│  └───────────────────────────────────────────────┘              │
│                                                                  │
│  ┌───────────────────────────────────────────────┐              │
│  │           Static Assets (Bundled)             │              │
│  │  • words_full.json (~1MB)                     │              │
│  │  • Audio files (success.mp3, error.mp3)       │              │
│  │  • Fonts (Nunito)                             │              │
│  └───────────────────────────────────────────────┘              │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Data Flow

```
User Action → Event Handler → State Update → Re-render → Side Effects
                                   │
                                   ├── Update localStorage (settings)
                                   ├── Update IndexedDB (history)
                                   └── Play audio feedback
```

---

## 4. Data Models

### 4.1 Vocabulary Word (Source Data)

```typescript
// From words_full.json
interface VocabularyWord {
  targetWord: string;
  definition: string[];
  synonyms: string[];
  exampleSentence: string[];
}
```

### 4.2 Application State Types

```typescript
// Study Mode State
interface StudyState {
  words: VocabularyWord[];
  currentIndex: number;
  isFlipped: boolean;
  totalCards: number;
}

// Quiz Mode State
interface QuizState {
  questions: QuizQuestion[];
  currentIndex: number;
  score: number;
  timePerQuestion: number;
  totalQuestions: number;
  answers: AnswerRecord[];
  status: 'setup' | 'active' | 'review' | 'complete';
}

interface QuizQuestion {
  id: string;
  word: VocabularyWord;
  promptType: 'definition' | 'synonym';
  prompt: string;
  options: string[];       // 4 options for MCQ
  correctAnswer: string;   // targetWord
}

interface AnswerRecord {
  questionId: string;
  selectedAnswer: string | null;
  isCorrect: boolean;
  timeSpent: number;  // milliseconds
}

// Daily Challenge State
interface DailyChallengeState extends QuizState {
  questionFormat: ('mcq' | 'type')[];  // Pre-determined format for each question
  pointsEarned: number;
  streak: number;
}

// Global App State
interface AppState {
  currentMode: 'dashboard' | 'study' | 'quiz' | 'challenge';
  settings: UserSettings;
  stats: UserStats;
}

interface UserSettings {
  soundEnabled: boolean;
  autoAdvance: boolean;
  theme: 'light' | 'dark';  // Future feature
}

interface UserStats {
  totalWordsStudied: number;
  quizzesTaken: number;
  challengesCompleted: number;
  bestChallengeScore: number;
  lastStudyDate: string;
}
```

### 4.3 IndexedDB Schema (Learning History)

```typescript
// Database: VocabMasterDB
// Object Store: learningHistory

interface LearningRecord {
  id: string;                    // Auto-generated
  timestamp: number;             // Date.now()
  mode: 'study' | 'quiz' | 'challenge';
  wordsEncountered: string[];    // targetWords
  score?: number;
  timeSpent: number;             // milliseconds
  details: QuizResult | StudyResult;
}

interface QuizResult {
  totalQuestions: number;
  correctAnswers: number;
  incorrectWords: string[];      // Words to review
}

interface StudyResult {
  cardsViewed: number;
  cardsFlipped: number;
}
```

---

## 5. Component Architecture

### 5.1 Component Tree

```
App
├── Dashboard
│   ├── ModeCard (Study)
│   ├── ModeCard (Quiz)
│   └── ModeCard (Daily Challenge)
│
├── StudyMode
│   ├── TopBar
│   │   ├── BackButton
│   │   └── ProgressIndicator
│   ├── FlashCard
│   │   ├── CardFront
│   │   └── CardBack
│   │       ├── DefinitionList
│   │       ├── SynonymPills
│   │       └── ExampleSentence
│   └── NavigationArrows
│       ├── PrevButton
│       └── NextButton
│
├── QuizMode
│   ├── QuizSetup
│   │   ├── QuestionSlider
│   │   ├── TimeInput
│   │   └── StartButton
│   ├── QuizActive
│   │   ├── TopBar
│   │   │   ├── BackButton
│   │   │   ├── ProgressIndicator
│   │   │   └── Timer
│   │   ├── QuestionCard
│   │   │   ├── Prompt
│   │   │   └── OptionGrid (4 buttons)
│   │   └── NextButton
│   └── QuizResults
│       ├── ScoreSummary
│       └── ReviewList
│
├── DailyChallenge
│   ├── TopBar
│   │   ├── BackButton
│   │   ├── ProgressIndicator
│   │   └── CountdownTimer
│   ├── MCQQuestion (same as QuizMode)
│   ├── TypeQuestion
│   │   ├── Prompt
│   │   ├── TextInput
│   │   └── SubmitButton
│   └── ChallengeResults
│       ├── ScoreBreakdown
│       └── Leaderboard (future)
│
└── Shared Components
    ├── Button
    ├── Card
    ├── Timer
    ├── ProgressBar
    ├── Modal
    └── Toast
```

### 5.2 Key Component Specifications

#### FlashCard Component

```typescript
interface FlashCardProps {
  word: VocabularyWord;
  isFlipped: boolean;
  onFlip: () => void;
}

// Features:
// - 3D flip animation using Framer Motion
// - Click anywhere on card to flip
// - Preserves aspect ratio on different screen sizes
// - Accessible: keyboard support (Enter/Space to flip)
```

#### OptionButton Component

```typescript
interface OptionButtonProps {
  label: string;
  state: 'default' | 'selected' | 'correct' | 'incorrect';
  disabled: boolean;
  onClick: () => void;
}

// States:
// - default: neutral styling
// - selected: highlighted border
// - correct: green background + checkmark
// - incorrect: red background + shake animation
```

#### Timer Component

```typescript
interface TimerProps {
  totalSeconds: number;
  onTimeUp: () => void;
  isPaused: boolean;
  variant: 'bar' | 'text';  // countdown bar or text display
}

// Features:
// - Smooth countdown bar animation
// - Color changes (green → yellow → red) as time decreases
// - Pause/resume capability
// - Accessible: ARIA live region for screen readers
```

---

## 6. State Management

### 6.1 Context Structure

```typescript
// contexts/AppContext.tsx
const AppContext = createContext<AppContextType | null>(null);

interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  vocabulary: VocabularyWord[];
  audio: AudioManager;
}

// Separate contexts for isolation:
// - AppContext: Global app state
// - StudyContext: Study mode specific state
// - QuizContext: Quiz mode specific state
// - ChallengeContext: Daily challenge specific state
```

### 6.2 Actions

```typescript
type AppAction =
  | { type: 'SET_MODE'; payload: AppState['currentMode'] }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<UserSettings> }
  | { type: 'UPDATE_STATS'; payload: Partial<UserStats> }
  | { type: 'RESET_QUIZ' }
  | { type: 'SUBMIT_ANSWER'; payload: { questionId: string; answer: string } }
  | { type: 'NEXT_QUESTION' }
  | { type: 'FLIP_CARD' }
  | { type: 'NEXT_CARD' }
  | { type: 'PREV_CARD' };
```

### 6.3 Custom Hooks

```typescript
// hooks/useStudyMode.ts
function useStudyMode(words: VocabularyWord[]) {
  // Returns: shuffled deck, current card, navigation functions
}

// hooks/useQuiz.ts
function useQuiz(words: VocabularyWord[], config: QuizConfig) {
  // Returns: questions, current question, answer handler, score
}

// hooks/useTimer.ts
function useTimer(seconds: number, onComplete: () => void) {
  // Returns: timeRemaining, isRunning, pause, resume, reset
}

// hooks/useLocalStorage.ts
function useLocalStorage<T>(key: string, initialValue: T) {
  // Returns: [value, setValue] with localStorage sync
}

// hooks/useAudio.ts
function useAudio() {
  // Returns: playSuccess, playError, playClick, toggleMute
}
```

---

## 7. Core Algorithms

### 7.1 Fisher-Yates Shuffle

```typescript
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
```

### 7.2 Smart Distractor Algorithm

```typescript
interface DistractorConfig {
  targetWord: string;
  allWords: VocabularyWord[];
  count: number;  // Number of distractors needed (3 for MCQ)
}

function generateDistractors(config: DistractorConfig): string[] {
  const { targetWord, allWords, count } = config;
  const candidates: VocabularyWord[] = allWords.filter(
    w => w.targetWord !== targetWord
  );

  const distractors: string[] = [];
  const targetLength = targetWord.length;
  const targetFirstChar = targetWord[0].toLowerCase();

  // Priority 1: Same first letter
  const sameLetterCandidates = candidates.filter(
    w => w.targetWord[0].toLowerCase() === targetFirstChar
  );

  // Priority 2: Similar length (+/- 2 characters)
  const similarLengthCandidates = candidates.filter(
    w => Math.abs(w.targetWord.length - targetLength) <= 2
  );

  // Build distractor pool with priorities
  const priorityPool = [
    ...shuffleArray(sameLetterCandidates).slice(0, count),
    ...shuffleArray(similarLengthCandidates).slice(0, count),
    ...shuffleArray(candidates).slice(0, count * 2)
  ];

  // Remove duplicates and select
  const uniquePool = [...new Set(priorityPool.map(w => w.targetWord))];

  return shuffleArray(uniquePool).slice(0, count);
}
```

### 7.3 Question Generation

```typescript
function generateQuizQuestion(
  word: VocabularyWord,
  allWords: VocabularyWord[]
): QuizQuestion {
  // Randomly choose definition or synonym as prompt
  const useSynonym = word.synonyms.length > 0 && Math.random() > 0.5;

  const prompt = useSynonym
    ? getRandomElement(word.synonyms)
    : getRandomElement(word.definition);

  const promptType = useSynonym ? 'synonym' : 'definition';

  const distractors = generateDistractors({
    targetWord: word.targetWord,
    allWords,
    count: 3
  });

  const options = shuffleArray([word.targetWord, ...distractors]);

  return {
    id: generateId(),
    word,
    promptType,
    prompt,
    options,
    correctAnswer: word.targetWord
  };
}
```

### 7.4 Daily Challenge Scoring

```typescript
interface ScoringParams {
  isCorrect: boolean;
  timeRemaining: number;  // seconds
  totalTime: number;      // seconds (25 for daily challenge)
  streak: number;         // consecutive correct answers
}

function calculatePoints(params: ScoringParams): number {
  const { isCorrect, timeRemaining, totalTime, streak } = params;

  if (!isCorrect) return 0;

  // Base points for correct answer
  const basePoints = 100;

  // Speed bonus (0-50 points based on time remaining)
  const speedBonus = Math.round((timeRemaining / totalTime) * 50);

  // Streak multiplier (1.0 + 0.1 per streak, max 2.0)
  const streakMultiplier = Math.min(1 + (streak * 0.1), 2.0);

  return Math.round((basePoints + speedBonus) * streakMultiplier);
}
```

---

## 8. UI/UX Implementation

### 8.1 Design Tokens (Tailwind Config)

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        // Primary palette (child-friendly, vibrant)
        primary: {
          50: '#eff6ff',
          500: '#3b82f6',  // Main blue
          600: '#2563eb',
          700: '#1d4ed8',
        },
        // Mode colors
        study: '#10b981',     // Emerald green
        quiz: '#f59e0b',      // Amber
        challenge: '#ef4444', // Red
        // Feedback colors
        correct: '#22c55e',
        incorrect: '#ef4444',
      },
      fontFamily: {
        sans: ['Nunito', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'card-word': ['2.5rem', { lineHeight: '1.2' }],
        'card-definition': ['1.125rem', { lineHeight: '1.6' }],
      },
      boxShadow: {
        'card': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'card-hover': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      },
      animation: {
        'shake': 'shake 0.5s ease-in-out',
        'flip': 'flip 0.6s ease-in-out',
      },
    },
  },
}
```

### 8.2 Responsive Breakpoints

```
Mobile Portrait:   < 640px   (sm)  - Primary target
Mobile Landscape:  640-768px (md)
Tablet Portrait:   768-1024px (lg)
Tablet Landscape:  > 1024px  (xl)
```

### 8.3 Card Dimensions

```css
/* Card container - responsive sizing */
.card-container {
  width: min(90vw, 400px);
  aspect-ratio: 3/4;
  max-height: 70vh;
}

/* Ensure card fits in viewport without scroll */
@media (max-height: 600px) {
  .card-container {
    max-height: 60vh;
    aspect-ratio: 4/3;
  }
}
```

### 8.4 Animation Specifications

| Animation | Duration | Easing | Trigger |
|-----------|----------|--------|---------|
| Card flip | 600ms | ease-in-out | Click on card |
| Wrong answer shake | 500ms | ease-in-out | Incorrect selection |
| Option highlight | 300ms | ease-out | Selection made |
| Timer bar | Linear | linear | Continuous countdown |
| Mode card hover | 200ms | ease-out | Mouse enter |
| Page transition | 400ms | ease-in-out | Route change |

### 8.5 Accessibility Requirements

- **WCAG 2.1 AA** compliance target
- Minimum touch target: 44x44px
- Color contrast ratio: 4.5:1 minimum for text
- Focus indicators for keyboard navigation
- Screen reader support with ARIA labels
- Reduced motion support via `prefers-reduced-motion`

---

## 9. Storage Strategy

### 9.1 localStorage Keys

```typescript
const STORAGE_KEYS = {
  SETTINGS: 'vocab_master_settings',
  STATS: 'vocab_master_stats',
  LAST_STUDY_DECK: 'vocab_master_last_deck',
  DAILY_CHALLENGE_DATE: 'vocab_master_challenge_date',
} as const;
```

### 9.2 IndexedDB Structure

```typescript
// Database initialization
const DB_NAME = 'VocabMasterDB';
const DB_VERSION = 1;

const STORES = {
  LEARNING_HISTORY: 'learningHistory',
  WORD_PROGRESS: 'wordProgress',
} as const;

// Word progress tracking (future: spaced repetition)
interface WordProgress {
  word: string;
  timesCorrect: number;
  timesIncorrect: number;
  lastSeen: number;
  masteryLevel: 0 | 1 | 2 | 3 | 4 | 5;
}
```

### 9.3 Data Persistence Flow

```
                    ┌─────────────────┐
                    │   User Action   │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
              ▼              ▼              ▼
       ┌──────────┐   ┌──────────┐   ┌──────────┐
       │ Settings │   │  Stats   │   │ History  │
       │  Change  │   │  Update  │   │  Record  │
       └────┬─────┘   └────┬─────┘   └────┬─────┘
            │              │              │
            ▼              ▼              ▼
       localStorage   localStorage    IndexedDB
       (immediate)    (immediate)     (batched)
```

---

## 10. Audio System

### 10.1 Sound Effects

| Sound | File | Trigger | Duration |
|-------|------|---------|----------|
| Success | success.mp3 | Correct answer | ~500ms |
| Error | error.mp3 | Wrong answer | ~400ms |
| Click | click.mp3 | Button press | ~100ms |
| Flip | flip.mp3 | Card flip | ~300ms |
| Timer warning | warning.mp3 | 5 seconds left | ~300ms |
| Challenge complete | fanfare.mp3 | Daily challenge end | ~2s |

### 10.2 Audio Manager Implementation

```typescript
// services/AudioManager.ts
class AudioManager {
  private howl: Howl;
  private muted: boolean = false;

  constructor() {
    this.howl = new Howl({
      src: ['/audio/sprite.mp3'],
      sprite: {
        success: [0, 500],
        error: [500, 400],
        click: [900, 100],
        flip: [1000, 300],
        warning: [1300, 300],
        fanfare: [1600, 2000],
      }
    });
  }

  play(sound: keyof typeof this.howl._sprite) {
    if (!this.muted) {
      this.howl.play(sound);
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }
}
```

---

## 11. Project Structure

```
vocab-master/
├── public/
│   ├── audio/
│   │   └── sprite.mp3
│   └── fonts/
│       └── Nunito-*.woff2
│
├── src/
│   ├── assets/
│   │   └── words_full.json
│   │
│   ├── components/
│   │   ├── common/
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── ProgressBar.tsx
│   │   │   ├── Timer.tsx
│   │   │   └── index.ts
│   │   │
│   │   ├── dashboard/
│   │   │   ├── Dashboard.tsx
│   │   │   ├── ModeCard.tsx
│   │   │   └── index.ts
│   │   │
│   │   ├── study/
│   │   │   ├── StudyMode.tsx
│   │   │   ├── FlashCard.tsx
│   │   │   ├── CardFront.tsx
│   │   │   ├── CardBack.tsx
│   │   │   ├── NavigationArrows.tsx
│   │   │   └── index.ts
│   │   │
│   │   ├── quiz/
│   │   │   ├── QuizMode.tsx
│   │   │   ├── QuizSetup.tsx
│   │   │   ├── QuizActive.tsx
│   │   │   ├── QuestionCard.tsx
│   │   │   ├── OptionButton.tsx
│   │   │   ├── QuizResults.tsx
│   │   │   └── index.ts
│   │   │
│   │   ├── challenge/
│   │   │   ├── DailyChallenge.tsx
│   │   │   ├── MCQQuestion.tsx
│   │   │   ├── TypeQuestion.tsx
│   │   │   ├── ChallengeResults.tsx
│   │   │   └── index.ts
│   │   │
│   │   └── layout/
│   │       ├── TopBar.tsx
│   │       ├── BackButton.tsx
│   │       └── index.ts
│   │
│   ├── contexts/
│   │   ├── AppContext.tsx
│   │   ├── StudyContext.tsx
│   │   ├── QuizContext.tsx
│   │   └── ChallengeContext.tsx
│   │
│   ├── hooks/
│   │   ├── useStudyMode.ts
│   │   ├── useQuiz.ts
│   │   ├── useTimer.ts
│   │   ├── useLocalStorage.ts
│   │   ├── useIndexedDB.ts
│   │   └── useAudio.ts
│   │
│   ├── services/
│   │   ├── AudioManager.ts
│   │   ├── StorageService.ts
│   │   └── QuizGenerator.ts
│   │
│   ├── utils/
│   │   ├── shuffle.ts
│   │   ├── distractor.ts
│   │   ├── scoring.ts
│   │   └── helpers.ts
│   │
│   ├── types/
│   │   ├── vocabulary.ts
│   │   ├── quiz.ts
│   │   ├── storage.ts
│   │   └── index.ts
│   │
│   ├── styles/
│   │   └── globals.css
│   │
│   ├── App.tsx
│   ├── main.tsx
│   └── vite-env.d.ts
│
├── tests/
│   ├── components/
│   ├── hooks/
│   ├── utils/
│   └── setup.ts
│
├── index.html
├── package.json
├── tsconfig.json
├── tailwind.config.js
├── vite.config.ts
└── README.md
```

---

## 12. Build & Deployment

### 12.1 Build Configuration

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2020',
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['react', 'react-dom'],
          'motion': ['framer-motion'],
          'audio': ['howler'],
        }
      }
    }
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'framer-motion', 'howler']
  }
});
```

### 12.2 Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| First Contentful Paint | < 1.5s | Lighthouse |
| Largest Contentful Paint | < 2.5s | Lighthouse |
| Time to Interactive | < 3.0s | Lighthouse |
| Total Bundle Size | < 500KB | gzipped |
| Vocabulary JSON | Lazy loaded | After initial render |

### 12.3 Deployment Options

**Recommended: Static Hosting**
- Vercel (recommended - zero config for Vite)
- Netlify
- GitHub Pages
- Cloudflare Pages

**Build Command:** `npm run build`
**Output Directory:** `dist`

---

## 13. Future Considerations

### 13.1 Phase 2 Features (Post-MVP)

1. **Spaced Repetition System**
   - Track word mastery levels
   - Prioritize weak words in Study mode
   - Algorithm: Modified SM-2

2. **Progress Dashboard**
   - Visual statistics
   - Learning streak tracking
   - Word mastery heatmap

3. **User Accounts (Optional)**
   - Cloud sync via Firebase/Supabase
   - Cross-device progress
   - Parent dashboard

4. **Gamification**
   - Achievement badges
   - Daily streaks
   - Leaderboards (anonymized)

### 13.2 Technical Debt Considerations

- Unit test coverage target: 80%
- E2E tests for critical paths (Playwright)
- Performance monitoring (Web Vitals)
- Error tracking (Sentry)

### 13.3 Scalability Notes

The current architecture supports:
- Up to 10,000+ vocabulary words (JSON can be chunked if needed)
- Offline functionality via Service Worker (future)
- PWA conversion for mobile home screen installation

---

## Appendix A: Dependencies

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "framer-motion": "^11.0.0",
    "howler": "^2.2.4",
    "lucide-react": "^0.300.0",
    "idb": "^8.0.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@vitejs/plugin-react": "^4.2.0",
    "typescript": "^5.3.0",
    "vite": "^5.0.0",
    "tailwindcss": "^3.4.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0",
    "vitest": "^1.0.0",
    "@testing-library/react": "^14.1.0",
    "eslint": "^8.56.0",
    "prettier": "^3.2.0"
  }
}
```

---

## Appendix B: API Reference (Internal)

### Helper Functions

```typescript
// Get random element from array
function getRandomElement<T>(arr: T[]): T;

// Generate unique ID
function generateId(): string;

// Format time for display (mm:ss)
function formatTime(seconds: number): string;

// Check if answer is correct (case-insensitive, trimmed)
function isAnswerCorrect(input: string, target: string): boolean;
```

---

*Document prepared for review. Please provide feedback on technology choices and architectural decisions before implementation begins.*
