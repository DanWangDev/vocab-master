import type { VocabularyWord } from './vocabulary';

export type QuizStatus = 'setup' | 'active' | 'review' | 'complete';
export type PromptType = 'definition' | 'synonym';
export type QuestionFormat = 'mcq' | 'type' | 'multi-select';

export interface QuizQuestion {
  id: string;
  word: VocabularyWord;
  promptType: PromptType;
  prompt: string;
  options: string[];       // 4 options for MCQ/multi-select
  correctAnswer: string;   // targetWord (for single-select)
  correctAnswers?: string[]; // For multi-select questions
  format: QuestionFormat;  // For daily challenge mixed formats
}

export interface AnswerRecord {
  questionId: string;
  selectedAnswer: string | null;        // For single-select
  selectedAnswers?: string[];           // For multi-select
  isCorrect: boolean;
  timeSpent: number;  // milliseconds
}

export interface QuizConfig {
  totalQuestions: number;
  timePerQuestion: number | null;  // seconds, null = no time limit
  autoAdvance: boolean;
}

export interface QuizState {
  questions: QuizQuestion[];
  currentIndex: number;
  score: number;
  timePerQuestion: number | null;
  totalQuestions: number;
  answers: AnswerRecord[];
  status: QuizStatus;
}

export interface DailyChallengeState extends Omit<QuizState, 'status'> {
  status: 'intro' | QuizStatus;
  pointsEarned: number;
  streak: number;
  todayCompleted: boolean;
}
