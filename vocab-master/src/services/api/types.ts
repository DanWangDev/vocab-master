// Shared type definitions for API services

export interface User {
  id: number;
  username: string;
  displayName: string | null;
  role: 'student' | 'parent' | 'admin';
  email: string | null;
  emailVerified: boolean;
  authProvider: 'local' | 'google';
  createdAt: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: User;
  tokens: TokenPair;
}

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

export interface DailyChallenge {
  id: number;
  userId: number;
  challengeDate: string;
  score: number;
  createdAt: string;
}

export interface TodayChallengeResponse {
  completed: boolean;
  challenge: DailyChallenge | null;
  streak: number;
}

export interface CompleteChallengeResponse {
  challenge: DailyChallenge;
  streak: number;
}

export interface ApiError {
  error: string;
  message: string;
}

// Quiz Result Interfaces
export interface SaveQuizResultRequest {
  quizType: 'quiz' | 'challenge';
  totalQuestions: number;
  correctAnswers: number;
  score: number;
  timePerQuestion: number | null;
  totalTimeSpent: number;
  pointsEarned: number;
  answers: ReadonlyArray<{
    questionIndex: number;
    word: string;
    promptType: string;
    questionFormat: string;
    correctAnswer: string;
    selectedAnswer: string | null;
    isCorrect: boolean;
    timeSpent: number;
  }>;
}

export interface SaveStudySessionRequest {
  wordsReviewed: number;
  startTime: string;
  endTime: string;
  words?: string[];
}

// Admin Interfaces
export interface AdminUserStats {
  id: number;
  username: string;
  display_name: string | null;
  role: 'student' | 'parent' | 'admin';
  parent_id: number | null;
  email: string | null;
  created_at: string;
  quizzes_taken: number;
  total_words_studied: number;
  last_study_date: string | null;
  last_seen_at: string | null;
  avg_accuracy: number | null;
  current_streak: number;
  sessions_this_week: number;
  days_active_this_week: number;
  total_time_this_week_minutes: number;
  activity_status: 'active' | 'some' | 'inactive';
}

export interface QuizHistoryItem {
  id: number;
  completed_at: string;
  total_questions: number;
  correct_answers: number;
  accuracy: number;
  score: number;
  total_time_spent: number;
  quiz_type: string;
}

export interface StudyHistoryItem {
  id: number;
  start_time: string;
  end_time: string | null;
  words_reviewed: number;
}

export interface WeakWordItem {
  word: string;
  incorrect_count: number;
  total_attempts: number;
}

export interface WeeklyComparisonData {
  days_active: number;
  quizzes: number;
  sessions: number;
  words: number;
  time_minutes: number;
  avg_accuracy: number | null;
}

export interface AdminUserDetails {
  quizHistory: QuizHistoryItem[];
  studyHistory: StudyHistoryItem[];
  weakWords: WeakWordItem[];
  weeklyComparison: {
    this_week: WeeklyComparisonData;
    last_week: WeeklyComparisonData;
  };
  summary: {
    days_active_this_week: number;
    total_time_this_week_minutes: number;
    avg_accuracy: number | null;
  };
}

export interface ParentThresholds {
  days_per_week: number;
  minutes_per_day: number;
}

// Notification types
export type NotificationType = 'link_request' | 'link_accepted' | 'link_rejected' | 'achievement' | 'reminder';

export interface Notification {
  id: number;
  userId: number;
  type: NotificationType;
  title: string;
  message: string;
  data: Record<string, unknown> | null;
  readAt: string | null;
  actedAt: string | null;
  createdAt: string;
}

export interface NotificationsResponse {
  notifications: Notification[];
  unreadCount: number;
}

export interface NotificationCountResponse {
  count: number;
}

// Link request types
export type LinkRequestStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled';

export interface LinkRequest {
  id: number;
  parentId: number;
  studentId: number;
  status: LinkRequestStatus;
  notificationId: number | null;
  message: string | null;
  respondedAt: string | null;
  createdAt: string;
  parentUsername?: string;
  parentDisplayName?: string | null;
  studentUsername?: string;
  studentDisplayName?: string | null;
}

export interface StudentSearchResult {
  id: number;
  username: string;
  displayName: string | null;
  status: 'available' | 'pending';
}
