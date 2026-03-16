import { Request } from 'express';

// Database row types
export interface UserRow {
  id: number;
  username: string;
  password_hash: string | null;
  display_name: string | null;
  role: 'student' | 'parent' | 'admin';
  parent_id: number | null;
  email: string | null;
  email_verified: number; // SQLite stores booleans as integers
  google_id: string | null;
  auth_provider: 'local' | 'google';
  last_seen_at: string | null;
  created_at: string;
}

export interface PasswordResetTokenRow {
  id: number;
  user_id: number;
  token_hash: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
}

export interface UserSettingsRow {
  user_id: number;
  sound_enabled: number; // SQLite stores booleans as integers
  auto_advance: number;
  language: string;
}

export interface UserStatsRow {
  user_id: number;
  total_words_studied: number;
  quizzes_taken: number;
  challenges_completed: number;
  best_challenge_score: number;
  last_study_date: string | null;
}

export interface DailyChallengeRow {
  id: number;
  user_id: number;
  challenge_date: string;
  score: number;
  created_at: string;
}

export interface RefreshTokenRow {
  id: number;
  user_id: number;
  token: string;
  expires_at: string;
  created_at: string;
}

export interface QuizResultRow {
  id: number;
  user_id: number;
  quiz_type: 'quiz' | 'challenge';
  total_questions: number;
  correct_answers: number;
  score: number;
  time_per_question: number | null;
  total_time_spent: number;
  points_earned: number;
  completed_at: string;
}

export interface QuizAnswerRow {
  id: number;
  quiz_result_id: number;
  question_index: number;
  word: string;
  prompt_type: string;
  question_format: string;
  correct_answer: string;
  selected_answer: string | null;
  is_correct: number;
  time_spent: number;
}

export interface StudySessionRow {
  id: number;
  user_id: number;
  words_reviewed: number;
  start_time: string;
  end_time: string;
  created_at: string;
}

export interface AdminSettingsRow {
  id: number;
  password_hash: string;
  created_at: string;
}

// API response types
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

// Auth types
export interface JWTPayload {
  userId: number;
  username: string;
  role: 'student' | 'parent' | 'admin';
}

export interface AuthRequest extends Request {
  user?: JWTPayload;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

// API Request/Response types
export interface RegisterRequest {
  username: string;
  password: string;
  displayName?: string;
}

export interface RegisterStudentRequest {
  username: string;
  password: string;
  displayName?: string;
}

export interface RegisterParentRequest {
  username: string;
  password: string;
  email: string;
  displayName?: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
}

export interface CreateStudentByParentRequest {
  username: string;
  password: string;
  displayName?: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface GoogleAuthRequest {
  token: string;
  tokenType: 'id_token' | 'access_token';
  username?: string;
}

export interface AuthResponse {
  user: User;
  tokens: TokenPair;
}

export interface UpdateProfileRequest {
  username?: string;
  displayName?: string;
}

export interface UpdateSettingsRequest {
  soundEnabled?: boolean;
  autoAdvance?: boolean;
  language?: string;
}

export interface UpdateStatsRequest {
  totalWordsStudied?: number;
  quizzesTaken?: number;
  challengesCompleted?: number;
  bestChallengeScore?: number;
  lastStudyDate?: string | null;
}

export interface CompleteChallengeRequest {
  score: number;
}

// Error response
export interface ErrorResponse {
  error: string;
  message: string;
}

// Notification types
export type NotificationType = 'link_request' | 'link_accepted' | 'link_rejected' | 'achievement' | 'reminder';

export interface NotificationRow {
  id: number;
  user_id: number;
  type: NotificationType;
  title: string;
  message: string;
  data: string | null;
  read_at: string | null;
  acted_at: string | null;
  created_at: string;
}

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

export interface LinkRequestRow {
  id: number;
  parent_id: number;
  student_id: number;
  status: LinkRequestStatus;
  notification_id: number | null;
  message: string | null;
  responded_at: string | null;
  created_at: string;
}

export interface LinkRequest {
  id: number;
  parentId: number;
  studentId: number;
  status: LinkRequestStatus;
  notificationId: number | null;
  message: string | null;
  respondedAt: string | null;
  createdAt: string;
  // Joined fields
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

export interface CreateLinkRequestRequest {
  studentId: number;
  message?: string;
}

export interface LinkRequestActionRequest {
  action: 'accept' | 'reject';
}

// Wordlist types
export interface WordlistRow {
  id: number;
  name: string;
  description: string;
  is_system: number;
  created_by: number | null;
  visibility: 'system' | 'private' | 'shared';
  word_count: number;
  created_at: string;
  updated_at: string;
}

export interface WordlistWordRow {
  id: number;
  wordlist_id: number;
  target_word: string;
  definitions: string;
  synonyms: string;
  example_sentences: string;
  sort_order: number;
}

export interface UserActiveWordlistRow {
  user_id: number;
  wordlist_id: number;
}

// Push token types
export interface PushTokenRow {
  id: number;
  user_id: number;
  expo_push_token: string;
  platform: string;
  created_at: string;
}

// Quiz result parameter types
export interface CreateQuizResultParams {
  userId: number;
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

export interface CreateStudySessionParams {
  userId: number;
  wordsReviewed: number;
  startTime: Date;
  endTime: Date;
  words?: string[];
}
