import { baseApi } from './baseApi';

export interface PvpChallenge {
  id: number;
  challenger_id: number;
  opponent_id: number;
  wordlist_id: number;
  status: 'pending' | 'active' | 'completed' | 'expired' | 'declined';
  challenger_score: number | null;
  opponent_score: number | null;
  winner_id: number | null;
  question_count: number;
  expires_at: string;
  created_at: string;
  challenger_username: string;
  challenger_display_name: string | null;
  opponent_username: string;
  opponent_display_name: string | null;
  wordlist_name: string;
}

export interface PvpQuestion {
  index: number;
  word: string;
  correctAnswer: string;
  options: string[];
}

export interface PvpAnswer {
  questionIndex: number;
  word: string;
  correctAnswer: string;
  selectedAnswer: string | null;
  isCorrect: boolean;
  timeSpent: number;
}

export interface PvpOpponent {
  id: number;
  username: string;
  displayName: string | null;
}

export const pvpApi = {
  async searchOpponents(query: string): Promise<{ opponents: PvpOpponent[] }> {
    return baseApi.fetchWithAuth(`/api/pvp/opponents?q=${encodeURIComponent(query)}`);
  },

  async createChallenge(opponentId: number, wordlistId: number, questionCount = 10): Promise<{ challenge: PvpChallenge }> {
    return baseApi.fetchWithAuth('/api/pvp/challenge', {
      method: 'POST',
      body: JSON.stringify({ opponentId, wordlistId, questionCount }),
    });
  },

  async getPending(): Promise<{ challenges: PvpChallenge[] }> {
    return baseApi.fetchWithAuth('/api/pvp/pending');
  },

  async getActive(): Promise<{ challenges: PvpChallenge[] }> {
    return baseApi.fetchWithAuth('/api/pvp/active');
  },

  async getHistory(limit = 20): Promise<{ challenges: PvpChallenge[] }> {
    return baseApi.fetchWithAuth(`/api/pvp/history?limit=${limit}`);
  },

  async getChallenge(id: number): Promise<{ challenge: PvpChallenge }> {
    return baseApi.fetchWithAuth(`/api/pvp/${id}`);
  },

  async getQuestions(challengeId: number): Promise<{ questions: PvpQuestion[] }> {
    return baseApi.fetchWithAuth(`/api/pvp/${challengeId}/questions`);
  },

  async acceptChallenge(id: number): Promise<{ challenge: PvpChallenge }> {
    return baseApi.fetchWithAuth(`/api/pvp/${id}/accept`, { method: 'POST' });
  },

  async declineChallenge(id: number): Promise<{ success: boolean }> {
    return baseApi.fetchWithAuth(`/api/pvp/${id}/decline`, { method: 'POST' });
  },

  async submitAnswers(challengeId: number, answers: PvpAnswer[]): Promise<{ score: number; waiting: boolean; challenge: PvpChallenge }> {
    return baseApi.fetchWithAuth(`/api/pvp/${challengeId}/submit`, {
      method: 'POST',
      body: JSON.stringify({ answers }),
    });
  },

  async createRematch(challengeId: number): Promise<{ challenge: PvpChallenge }> {
    return baseApi.fetchWithAuth(`/api/pvp/${challengeId}/rematch`, {
      method: 'POST',
    });
  },

  async getQuestionComparison(challengeId: number): Promise<{
    questions: PvpQuestion[];
    challengerAnswers: Array<{ question_index: number; word: string; correct_answer: string; selected_answer: string | null; is_correct: number }>;
    opponentAnswers: Array<{ question_index: number; word: string; correct_answer: string; selected_answer: string | null; is_correct: number }>;
    challenger: { id: number; username: string; displayName: string | null; score: number | null };
    opponent: { id: number; username: string; displayName: string | null; score: number | null };
  }> {
    return baseApi.fetchWithAuth(`/api/pvp/${challengeId}/comparison`);
  },
};
