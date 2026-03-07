// API Service for communicating with the backend

import type { Wordlist, WordlistWord, CreateWordlistRequest, ImportResult } from '../types/wordlist';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:9876/api';

// Token storage keys
const ACCESS_TOKEN_KEY = 'vocab_master_access_token';

// Types
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
  answers: Array<{
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
}

export interface AdminUserDetails {
  quizHistory: any[];
  studyHistory: any[];
  weakWords: any[];
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

class ApiServiceClass {
  private accessToken: string | null = null;
  private refreshPromise: Promise<{ accessToken: string }> | null = null;

  constructor() {
    // Load access token from localStorage on init
    this.accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
    // Refresh token is now stored as httpOnly cookie (managed by browser)
    // Clear any legacy refresh token from localStorage
    localStorage.removeItem('vocab_master_refresh_token');
  }

  // Token management
  setTokens(tokens: TokenPair | { accessToken: string }): void {
    this.accessToken = tokens.accessToken;
    localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
    // Refresh token is set as httpOnly cookie by the backend
  }

  clearTokens(): void {
    this.accessToken = null;
    localStorage.removeItem(ACCESS_TOKEN_KEY);
  }

  hasTokens(): boolean {
    return this.accessToken !== null;
  }

  // Core fetch wrapper with auth
  private async fetchWithAuth<T>(
    endpoint: string,
    options: RequestInit = {},
    retry = true
  ): Promise<T> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.accessToken) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${this.accessToken}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
      credentials: 'include',
    });

    // Handle 401 - try refresh (cookie sent automatically)
    if (response.status === 401 && retry) {
      try {
        await this.refreshAccessToken();
        return this.fetchWithAuth<T>(endpoint, options, false);
      } catch {
        this.clearTokens();
        throw new Error('Session expired. Please login again.');
      }
    }

    if (!response.ok) {
      const errorData: ApiError = await response.json().catch(() => ({
        error: 'Unknown Error',
        message: `Request failed with status ${response.status}`
      }));
      throw new Error(errorData.message);
    }

    return response.json();
  }

  private async refreshAccessToken(): Promise<{ accessToken: string }> {
    // Prevent multiple simultaneous refresh attempts
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = (async () => {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const data = await response.json();
      this.setTokens(data.tokens);
      return data.tokens;
    })();

    try {
      return await this.refreshPromise;
    } finally {
      this.refreshPromise = null;
    }
  }

  // Auth endpoints
  /**
   * @deprecated Use registerStudent or registerParent instead
   */
  async register(username: string, password: string, displayName?: string): Promise<AuthResponse> {
    return this.registerStudent(username, password, displayName);
  }

  async registerStudent(username: string, password: string, displayName?: string, turnstileToken?: string): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/register/student`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ username, password, displayName, turnstileToken }),
    });

    if (!response.ok) {
      const errorData: ApiError = await response.json().catch(() => ({
        error: 'Unknown Error',
        message: 'Registration failed'
      }));
      throw new Error(errorData.message);
    }

    const data: AuthResponse = await response.json();
    this.setTokens(data.tokens);
    return data;
  }

  async registerParent(username: string, password: string, email: string, displayName?: string, turnstileToken?: string): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/register/parent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ username, password, email, displayName, turnstileToken }),
    });

    if (!response.ok) {
      const errorData: ApiError = await response.json().catch(() => ({
        error: 'Unknown Error',
        message: 'Registration failed'
      }));
      throw new Error(errorData.message);
    }

    const data: AuthResponse = await response.json();
    this.setTokens(data.tokens);
    return data;
  }

  async googleAuth(
    token: string,
    tokenType: 'id_token' | 'access_token' = 'id_token',
    username?: string
  ): Promise<AuthResponse & { isNewUser: boolean }> {
    const response = await fetch(`${API_BASE_URL}/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ token, tokenType, username }),
    });

    if (!response.ok) {
      const errorData: ApiError = await response.json().catch(() => ({
        error: 'Unknown Error',
        message: 'Google authentication failed'
      }));
      throw new Error(errorData.message);
    }

    const data = await response.json();
    this.setTokens(data.tokens);
    return data;
  }

  async updateProfile(data: { username?: string; displayName?: string }): Promise<{ user: User }> {
    return this.fetchWithAuth<{ user: User }>('/auth/profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async createStudentForParent(
    username: string,
    password: string,
    displayName?: string
  ): Promise<{ success: boolean; user: User }> {
    return this.fetchWithAuth<{ success: boolean; user: User }>('/auth/create-student', {
      method: 'POST',
      body: JSON.stringify({ username, password, displayName }),
    });
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      const errorData: ApiError = await response.json().catch(() => ({
        error: 'Unknown Error',
        message: 'Password reset request failed'
      }));
      throw new Error(errorData.message);
    }

    return response.json();
  }

  async resetPassword(token: string, password: string): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ token, password }),
    });

    if (!response.ok) {
      const errorData: ApiError = await response.json().catch(() => ({
        error: 'Unknown Error',
        message: 'Password reset failed'
      }));
      throw new Error(errorData.message);
    }

    return response.json();
  }

  async validateResetToken(token: string): Promise<{ valid: boolean }> {
    const response = await fetch(`${API_BASE_URL}/auth/validate-reset-token/${token}`);

    if (!response.ok) {
      return { valid: false };
    }

    return response.json();
  }

  async resetUserPassword(userId: number, password: string): Promise<{ success: boolean; message: string }> {
    return this.fetchWithAuth<{ success: boolean; message: string }>(`/admin/users/${userId}/password`, {
      method: 'PATCH',
      body: JSON.stringify({ password }),
    });
  }

  async login(username: string, password: string, turnstileToken?: string): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ username, password, turnstileToken }),
    });

    if (!response.ok) {
      const errorData: ApiError = await response.json().catch(() => ({
        error: 'Unknown Error',
        message: 'Login failed'
      }));
      throw new Error(errorData.message);
    }

    const data: AuthResponse = await response.json();
    this.setTokens(data.tokens);
    return data;
  }

  async logout(): Promise<void> {
    try {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
    } catch {
      // Ignore logout errors
    }
    this.clearTokens();
  }

  async getCurrentUser(): Promise<User | null> {
    if (!this.hasTokens()) {
      return null;
    }

    try {
      const data = await this.fetchWithAuth<{ user: User }>('/auth/me');
      return data.user;
    } catch {
      return null;
    }
  }

  // Settings endpoints
  async getSettings(): Promise<UserSettings> {
    return this.fetchWithAuth<UserSettings>('/settings');
  }

  async updateSettings(settings: Partial<UserSettings>): Promise<UserSettings> {
    return this.fetchWithAuth<UserSettings>('/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  }

  // Stats endpoints
  async getStats(): Promise<UserStats> {
    return this.fetchWithAuth<UserStats>('/stats');
  }

  async updateStats(stats: Partial<UserStats>): Promise<UserStats> {
    return this.fetchWithAuth<UserStats>('/stats', {
      method: 'PATCH',
      body: JSON.stringify(stats),
    });
  }

  async incrementStats(increments: {
    totalWordsStudied?: number;
    quizzesTaken?: number;
    challengesCompleted?: number;
  }): Promise<UserStats> {
    return this.fetchWithAuth<UserStats>('/stats/increment', {
      method: 'POST',
      body: JSON.stringify(increments),
    });
  }

  async getWeakWords(): Promise<{
    weakWords: Array<{
      word: string;
      incorrectCount: number;
      correctCount: number;
      totalAttempts: number;
      accuracy: number;
    }>;
  }> {
    return this.fetchWithAuth('/stats/weak-words');
  }

  async getActivityStats(): Promise<{
    quizCount: number;
    avgAccuracy: number;
    bestScore: number;
    studySessions: number;
    wordsReviewed: number;
    currentStreak: number;
  }> {
    return this.fetchWithAuth('/stats/activity');
  }

  // Challenges endpoints
  async getTodayChallenge(): Promise<TodayChallengeResponse> {
    return this.fetchWithAuth<TodayChallengeResponse>('/challenges/today');
  }

  async completeChallenge(score: number): Promise<CompleteChallengeResponse> {
    return this.fetchWithAuth<CompleteChallengeResponse>('/challenges/complete', {
      method: 'POST',
      body: JSON.stringify({ score }),
    });
  }

  async getChallengeHistory(limit?: number): Promise<{ challenges: DailyChallenge[] }> {
    const url = limit ? `/challenges/history?limit=${limit}` : '/challenges/history';
    return this.fetchWithAuth<{ challenges: DailyChallenge[] }>(url);
  }

  async getStreak(): Promise<{ streak: number; bestScore: number }> {
    return this.fetchWithAuth<{ streak: number; bestScore: number }>('/challenges/streak');
  }

  // Migration endpoints
  async importData(data: { settings?: UserSettings; stats?: UserStats }): Promise<{
    message: string;
    settings: UserSettings | null;
    stats: UserStats | null;
  }> {
    return this.fetchWithAuth('/migrate/import', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async exportData(): Promise<{ settings: UserSettings; stats: UserStats }> {
    return this.fetchWithAuth('/migrate/export');
  }

  // Quiz & Study Result methods
  async saveQuizResult(data: SaveQuizResultRequest): Promise<{ success: boolean; resultId: number }> {
    return this.fetchWithAuth<{ success: boolean; resultId: number }>('/quiz-results', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async saveStudySession(data: SaveStudySessionRequest): Promise<{ success: boolean; sessionId: number }> {
    return this.fetchWithAuth<{ success: boolean; sessionId: number }>('/study-stats', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }



  async getAdminUsers(): Promise<AdminUserStats[]> {
    return this.fetchWithAuth<AdminUserStats[]>('/admin/users');
  }

  async getAdminUserDetails(userId: number): Promise<AdminUserDetails> {
    return this.fetchWithAuth<AdminUserDetails>(`/admin/users/${userId}/details`);
  }

  async updateUserRole(userId: number, role: 'student' | 'parent' | 'admin'): Promise<void> {
    return this.fetchWithAuth<void>(`/admin/users/${userId}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role })
    });
  }

  async updateUserParent(userId: number, parentId: number | null): Promise<void> {
    return this.fetchWithAuth<void>(`/admin/users/${userId}/parent`, {
      method: 'PATCH',
      body: JSON.stringify({ parentId })
    });
  }

  async createUser(data: { username: string; password: string; role: string; parentId: number | null; email?: string }): Promise<void> {
    return this.fetchWithAuth<void>('/admin/users', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async updateUserEmail(userId: number, email: string | null): Promise<void> {
    return this.fetchWithAuth<void>(`/admin/users/${userId}/email`, {
      method: 'PATCH',
      body: JSON.stringify({ email })
    });
  }

  async deleteUser(userId: number): Promise<{ success: boolean; message: string }> {
    return this.fetchWithAuth<{ success: boolean; message: string }>(`/admin/users/${userId}`, {
      method: 'DELETE'
    });
  }

  // Notification methods
  async getNotifications(): Promise<NotificationsResponse> {
    return this.fetchWithAuth<NotificationsResponse>('/notifications');
  }

  async getNotificationCount(): Promise<NotificationCountResponse> {
    return this.fetchWithAuth<NotificationCountResponse>('/notifications/count');
  }

  async markNotificationRead(id: number): Promise<{ success: boolean }> {
    return this.fetchWithAuth<{ success: boolean }>(`/notifications/${id}/read`, {
      method: 'PATCH'
    });
  }

  async markAllNotificationsRead(): Promise<{ success: boolean; markedCount: number }> {
    return this.fetchWithAuth<{ success: boolean; markedCount: number }>('/notifications/read-all', {
      method: 'POST'
    });
  }

  // Link request methods
  async searchStudents(query: string): Promise<{ results: StudentSearchResult[] }> {
    return this.fetchWithAuth<{ results: StudentSearchResult[] }>(
      `/link-requests/search?q=${encodeURIComponent(query)}`
    );
  }

  async sendLinkRequest(studentId: number, message?: string): Promise<{ success: boolean; request: LinkRequest }> {
    return this.fetchWithAuth<{ success: boolean; request: LinkRequest }>('/link-requests', {
      method: 'POST',
      body: JSON.stringify({ studentId, message })
    });
  }

  async getLinkRequests(): Promise<{ requests: LinkRequest[] }> {
    return this.fetchWithAuth<{ requests: LinkRequest[] }>('/link-requests');
  }

  async respondToLinkRequest(id: number, action: 'accept' | 'reject'): Promise<{ success: boolean; message: string }> {
    return this.fetchWithAuth<{ success: boolean; message: string }>(`/link-requests/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ action })
    });
  }

  async cancelLinkRequest(id: number): Promise<{ success: boolean; message: string }> {
    return this.fetchWithAuth<{ success: boolean; message: string }>(`/link-requests/${id}`, {
      method: 'DELETE'
    });
  }

  // Wordlist methods
  async getWordlists(): Promise<{ wordlists: Wordlist[] }> {
    return this.fetchWithAuth('/wordlists');
  }

  async getWordlist(id: number): Promise<Wordlist> {
    return this.fetchWithAuth(`/wordlists/${id}`);
  }

  async getWordlistWords(id: number): Promise<{ words: WordlistWord[] }> {
    return this.fetchWithAuth(`/wordlists/${id}/words`);
  }

  async getActiveWordlist(): Promise<{ wordlist: Wordlist; words: WordlistWord[] }> {
    return this.fetchWithAuth('/wordlists/active');
  }

  async setActiveWordlist(wordlistId: number): Promise<{ success: boolean }> {
    return this.fetchWithAuth('/wordlists/active', {
      method: 'PUT',
      body: JSON.stringify({ wordlistId }),
    });
  }

  async createWordlist(data: CreateWordlistRequest): Promise<{ wordlist: Wordlist }> {
    return this.fetchWithAuth('/wordlists', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async importWordlist(file: File, name: string, description?: string): Promise<ImportResult> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', name);
    if (description) formData.append('description', description);

    const headers: Record<string, string> = {};
    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    const response = await fetch(`${API_BASE_URL}/wordlists/import`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ message: 'Import failed' }));
      throw new Error(err.message);
    }
    return response.json();
  }

  async updateWordlist(id: number, data: { name?: string; description?: string }): Promise<{ wordlist: Wordlist }> {
    return this.fetchWithAuth(`/wordlists/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteWordlist(id: number): Promise<{ success: boolean }> {
    return this.fetchWithAuth(`/wordlists/${id}`, {
      method: 'DELETE',
    });
  }

  async addWordsToWordlist(wordlistId: number, words: CreateWordlistRequest['words']): Promise<{ success: boolean; wordCount: number }> {
    return this.fetchWithAuth(`/wordlists/${wordlistId}/words`, {
      method: 'POST',
      body: JSON.stringify({ words }),
    });
  }

  async updateWordInWordlist(wordlistId: number, wordId: number, data: Partial<Omit<WordlistWord, 'id' | 'wordlistId' | 'sortOrder'>>): Promise<{ success: boolean }> {
    return this.fetchWithAuth(`/wordlists/${wordlistId}/words/${wordId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteWordFromWordlist(wordlistId: number, wordId: number): Promise<{ success: boolean }> {
    return this.fetchWithAuth(`/wordlists/${wordlistId}/words/${wordId}`, {
      method: 'DELETE',
    });
  }

  // Health check
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    const response = await fetch(`${API_BASE_URL}/health`);
    if (!response.ok) {
      throw new Error('Health check failed');
    }
    return response.json();
  }
}

// Singleton instance
export const ApiService = new ApiServiceClass();
export default ApiService;
