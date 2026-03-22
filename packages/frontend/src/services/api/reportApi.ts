import { baseApi } from './baseApi';

export interface MasteryBreakdown {
  new: number;
  learning: number;
  familiar: number;
  mastered: number;
  total: number;
}

export interface WordMasterySummary {
  word: string;
  correctCount: number;
  incorrectCount: number;
  masteryLevel: number;
  accuracy: number;
  lastPracticed: string | null;
}

export interface LearningTrendPoint {
  date: string;
  quizzes: number;
  accuracy: number;
  wordsStudied: number;
}

export interface StudentReportSummary {
  userId: number;
  username: string;
  displayName: string | null;
  masteryBreakdown: MasteryBreakdown;
  recentAccuracy: number;
  totalQuizzes: number;
  totalStudySessions: number;
  currentStreak: number;
  weakWords: WordMasterySummary[];
  strongWords: WordMasterySummary[];
  learningTrend: LearningTrendPoint[];
}

export interface MasteryResponse {
  breakdown: MasteryBreakdown;
  weakWords: WordMasterySummary[];
  strongWords: WordMasterySummary[];
}

export const reportApi = {
  async getMastery(): Promise<MasteryResponse> {
    return baseApi.fetchWithAuth('/api/reports/mastery');
  },

  async getLearningTrend(days = 30): Promise<{ trend: LearningTrendPoint[] }> {
    return baseApi.fetchWithAuth(`/api/reports/trend?days=${days}`);
  },

  async getStudentSummary(studentId: number): Promise<StudentReportSummary> {
    return baseApi.fetchWithAuth(`/api/reports/student/${studentId}/summary`);
  },

  getStudentExportUrl(studentId: number): string {
    return `${baseApi.getBaseUrl()}/api/reports/student/${studentId}/export`;
  },

  getMyExportUrl(): string {
    return `${baseApi.getBaseUrl()}/api/reports/my/export`;
  },
};
