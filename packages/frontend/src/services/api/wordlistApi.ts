// Wordlist API endpoints

import { baseApi } from './baseApi';
import type { Wordlist, WordlistWord, CreateWordlistRequest, ImportResult } from '../../types/wordlist';

export const wordlistApi = {
  async getWordlists(): Promise<{ wordlists: Wordlist[] }> {
    return baseApi.fetchWithAuth('/api/wordlists');
  },

  async getWordlist(id: number): Promise<Wordlist> {
    return baseApi.fetchWithAuth(`/api/wordlists/${id}`);
  },

  async getWordlistWords(id: number): Promise<{ words: WordlistWord[] }> {
    return baseApi.fetchWithAuth(`/api/wordlists/${id}/words`);
  },

  async getActiveWordlist(): Promise<{ wordlist: Wordlist; words: WordlistWord[] }> {
    return baseApi.fetchWithAuth('/api/wordlists/active');
  },

  async setActiveWordlist(wordlistId: number): Promise<{ success: boolean }> {
    return baseApi.fetchWithAuth('/api/wordlists/active', {
      method: 'PUT',
      body: JSON.stringify({ wordlistId }),
    });
  },

  async createWordlist(data: CreateWordlistRequest): Promise<{ wordlist: Wordlist }> {
    return baseApi.fetchWithAuth('/api/wordlists', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async importWordlist(file: File, name: string, description?: string): Promise<ImportResult> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', name);
    if (description) formData.append('description', description);

    const headers: Record<string, string> = {};
    const accessToken = baseApi.getAccessToken();
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    const response = await fetch(`${baseApi.getBaseUrl()}/api/wordlists/import`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ message: 'Import failed' }));
      throw new Error(err.message);
    }
    return response.json();
  },

  async updateWordlist(
    id: number,
    data: { name?: string; description?: string }
  ): Promise<{ wordlist: Wordlist }> {
    return baseApi.fetchWithAuth(`/api/wordlists/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteWordlist(id: number): Promise<{ success: boolean }> {
    return baseApi.fetchWithAuth(`/api/wordlists/${id}`, {
      method: 'DELETE',
    });
  },

  async addWordsToWordlist(
    wordlistId: number,
    words: CreateWordlistRequest['words']
  ): Promise<{ success: boolean; wordCount: number }> {
    return baseApi.fetchWithAuth(`/api/wordlists/${wordlistId}/words`, {
      method: 'POST',
      body: JSON.stringify({ words }),
    });
  },

  async updateWordInWordlist(
    wordlistId: number,
    wordId: number,
    data: Partial<Omit<WordlistWord, 'id' | 'wordlistId' | 'sortOrder'>>
  ): Promise<{ success: boolean }> {
    return baseApi.fetchWithAuth(`/api/wordlists/${wordlistId}/words/${wordId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteWordFromWordlist(
    wordlistId: number,
    wordId: number
  ): Promise<{ success: boolean }> {
    return baseApi.fetchWithAuth(`/api/wordlists/${wordlistId}/words/${wordId}`, {
      method: 'DELETE',
    });
  },
};
