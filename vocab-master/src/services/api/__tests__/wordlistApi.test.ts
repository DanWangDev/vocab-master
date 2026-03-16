import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

vi.mock('../baseApi', () => ({
  baseApi: {
    fetchWithAuth: vi.fn(),
    getBaseUrl: vi.fn().mockReturnValue('http://localhost:9876/api'),
    setTokens: vi.fn(),
    clearTokens: vi.fn(),
    hasTokens: vi.fn(),
    getAccessToken: vi.fn().mockReturnValue('test-access-token'),
  },
}));

import { wordlistApi } from '../wordlistApi';
import { baseApi } from '../baseApi';

const mockFetchWithAuth = vi.mocked(baseApi.fetchWithAuth);
const mockGetAccessToken = vi.mocked(baseApi.getAccessToken);

describe('wordlistApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
    mockGetAccessToken.mockReturnValue('test-access-token');
  });

  describe('getWordlists', () => {
    it('calls fetchWithAuth GET /wordlists', async () => {
      const mockData = { wordlists: [{ id: 1, name: 'List 1' }] };
      mockFetchWithAuth.mockResolvedValueOnce(mockData);

      const result = await wordlistApi.getWordlists();

      expect(mockFetchWithAuth).toHaveBeenCalledWith('/wordlists');
      expect(result).toEqual(mockData);
    });
  });

  describe('getWordlist', () => {
    it('calls fetchWithAuth GET /wordlists/:id', async () => {
      const mockData = { id: 5, name: 'My List' };
      mockFetchWithAuth.mockResolvedValueOnce(mockData);

      const result = await wordlistApi.getWordlist(5);

      expect(mockFetchWithAuth).toHaveBeenCalledWith('/wordlists/5');
      expect(result).toEqual(mockData);
    });
  });

  describe('getWordlistWords', () => {
    it('calls fetchWithAuth GET /wordlists/:id/words', async () => {
      const mockData = { words: [{ id: 1, word: 'hello' }] };
      mockFetchWithAuth.mockResolvedValueOnce(mockData);

      const result = await wordlistApi.getWordlistWords(3);

      expect(mockFetchWithAuth).toHaveBeenCalledWith('/wordlists/3/words');
      expect(result).toEqual(mockData);
    });
  });

  describe('getActiveWordlist', () => {
    it('calls fetchWithAuth GET /wordlists/active', async () => {
      const mockData = { wordlist: { id: 1 }, words: [] };
      mockFetchWithAuth.mockResolvedValueOnce(mockData);

      const result = await wordlistApi.getActiveWordlist();

      expect(mockFetchWithAuth).toHaveBeenCalledWith('/wordlists/active');
      expect(result).toEqual(mockData);
    });
  });

  describe('setActiveWordlist', () => {
    it('calls fetchWithAuth PUT /wordlists/active with body', async () => {
      mockFetchWithAuth.mockResolvedValueOnce({ success: true });

      const result = await wordlistApi.setActiveWordlist(7);

      expect(mockFetchWithAuth).toHaveBeenCalledWith('/wordlists/active', {
        method: 'PUT',
        body: JSON.stringify({ wordlistId: 7 }),
      });
      expect(result).toEqual({ success: true });
    });
  });

  describe('createWordlist', () => {
    it('calls fetchWithAuth POST /wordlists', async () => {
      const createData = { name: 'New List', description: 'A test list', words: [] };
      const mockResponse = { wordlist: { id: 10, name: 'New List' } };
      mockFetchWithAuth.mockResolvedValueOnce(mockResponse);

      const result = await wordlistApi.createWordlist(createData);

      expect(mockFetchWithAuth).toHaveBeenCalledWith('/wordlists', {
        method: 'POST',
        body: JSON.stringify(createData),
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('importWordlist', () => {
    it('uses FormData and sends directly via fetch with auth header', async () => {
      const mockFile = new File(['word1,definition1'], 'words.csv', { type: 'text/csv' });
      const mockResponse = { imported: 1, total: 1 };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await wordlistApi.importWordlist(mockFile, 'My Import', 'A description');

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe('http://localhost:9876/api/wordlists/import');
      expect(options.method).toBe('POST');
      expect(options.headers['Authorization']).toBe('Bearer test-access-token');
      expect(options.body).toBeInstanceOf(FormData);
      expect(result).toEqual(mockResponse);
    });

    it('sends FormData without description when not provided', async () => {
      const mockFile = new File(['data'], 'words.csv', { type: 'text/csv' });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ imported: 1 }),
      });

      await wordlistApi.importWordlist(mockFile, 'List Name');

      const [, options] = mockFetch.mock.calls[0];
      const formData = options.body as FormData;
      expect(formData.get('name')).toBe('List Name');
      expect(formData.get('description')).toBeNull();
    });

    it('omits Authorization header when no access token', async () => {
      mockGetAccessToken.mockReturnValueOnce(null);
      const mockFile = new File(['data'], 'words.csv', { type: 'text/csv' });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ imported: 0 }),
      });

      await wordlistApi.importWordlist(mockFile, 'List');

      const [, options] = mockFetch.mock.calls[0];
      expect(options.headers['Authorization']).toBeUndefined();
    });

    it('throws with error message on import failure', async () => {
      const mockFile = new File(['bad'], 'words.csv', { type: 'text/csv' });
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ message: 'Invalid CSV format' }),
      });

      await expect(wordlistApi.importWordlist(mockFile, 'Bad Import')).rejects.toThrow(
        'Invalid CSV format'
      );
    });

    it('throws fallback message when error is not JSON', async () => {
      const mockFile = new File(['bad'], 'words.csv', { type: 'text/csv' });
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.reject(new Error('not json')),
      });

      await expect(wordlistApi.importWordlist(mockFile, 'Fail')).rejects.toThrow('Import failed');
    });
  });

  describe('updateWordlist', () => {
    it('calls fetchWithAuth PUT /wordlists/:id', async () => {
      const updateData = { name: 'Updated Name' };
      const mockResponse = { wordlist: { id: 5, name: 'Updated Name' } };
      mockFetchWithAuth.mockResolvedValueOnce(mockResponse);

      const result = await wordlistApi.updateWordlist(5, updateData);

      expect(mockFetchWithAuth).toHaveBeenCalledWith('/wordlists/5', {
        method: 'PUT',
        body: JSON.stringify(updateData),
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('deleteWordlist', () => {
    it('calls fetchWithAuth DELETE /wordlists/:id', async () => {
      mockFetchWithAuth.mockResolvedValueOnce({ success: true });

      const result = await wordlistApi.deleteWordlist(5);

      expect(mockFetchWithAuth).toHaveBeenCalledWith('/wordlists/5', {
        method: 'DELETE',
      });
      expect(result).toEqual({ success: true });
    });
  });

  describe('addWordsToWordlist', () => {
    it('calls fetchWithAuth POST /wordlists/:id/words', async () => {
      const words = [{ word: 'hello', definition: 'greeting' }];
      mockFetchWithAuth.mockResolvedValueOnce({ success: true, wordCount: 1 });

      const result = await wordlistApi.addWordsToWordlist(3, words);

      expect(mockFetchWithAuth).toHaveBeenCalledWith('/wordlists/3/words', {
        method: 'POST',
        body: JSON.stringify({ words }),
      });
      expect(result).toEqual({ success: true, wordCount: 1 });
    });
  });

  describe('updateWordInWordlist', () => {
    it('calls fetchWithAuth PUT /wordlists/:id/words/:wordId', async () => {
      const updateData = { word: 'updated-word' };
      mockFetchWithAuth.mockResolvedValueOnce({ success: true });

      const result = await wordlistApi.updateWordInWordlist(3, 10, updateData);

      expect(mockFetchWithAuth).toHaveBeenCalledWith('/wordlists/3/words/10', {
        method: 'PUT',
        body: JSON.stringify(updateData),
      });
      expect(result).toEqual({ success: true });
    });
  });

  describe('deleteWordFromWordlist', () => {
    it('calls fetchWithAuth DELETE /wordlists/:id/words/:wordId', async () => {
      mockFetchWithAuth.mockResolvedValueOnce({ success: true });

      const result = await wordlistApi.deleteWordFromWordlist(3, 10);

      expect(mockFetchWithAuth).toHaveBeenCalledWith('/wordlists/3/words/10', {
        method: 'DELETE',
      });
      expect(result).toEqual({ success: true });
    });
  });
});
