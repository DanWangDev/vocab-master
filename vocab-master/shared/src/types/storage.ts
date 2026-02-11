export interface UserSettings {
  soundEnabled: boolean;
  autoAdvance: boolean;
  language: string;
}

export interface UserStats {
  totalWordsStudied: number;
  quizzesTaken: number;
  challengesCompleted: number;
  bestChallengeScore: number;
  lastStudyDate: string | null;
}

export interface LearningRecord {
  id: string;
  timestamp: number;
  mode: 'study' | 'quiz' | 'challenge';
  wordsEncountered: string[];
  score?: number;
  timeSpent: number;
}

export interface WordProgress {
  word: string;
  timesCorrect: number;
  timesIncorrect: number;
  lastSeen: number;
  masteryLevel: 0 | 1 | 2 | 3 | 4 | 5;
}
