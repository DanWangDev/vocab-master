import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../baseApi', () => ({
  baseApi: {
    fetchWithAuth: vi.fn(),
    getBaseUrl: vi.fn().mockReturnValue('http://localhost:9876'),
    setTokens: vi.fn(),
    clearTokens: vi.fn(),
    hasTokens: vi.fn(),
    getAccessToken: vi.fn(),
  },
}));

import { settingsApi } from '../settingsApi';
import { baseApi } from '../baseApi';

const mockFetchWithAuth = vi.mocked(baseApi.fetchWithAuth);

describe('settingsApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getSettings', () => {
    it('calls fetchWithAuth with GET /settings', async () => {
      const mockSettings = {
        soundEnabled: true,
        autoAdvance: false,
        language: 'en',
      };
      mockFetchWithAuth.mockResolvedValueOnce(mockSettings);

      const result = await settingsApi.getSettings();

      expect(mockFetchWithAuth).toHaveBeenCalledWith('/api/settings');
      expect(result).toEqual(mockSettings);
    });
  });

  describe('updateSettings', () => {
    it('sends PUT with partial settings', async () => {
      const partial = { language: 'fr' };
      const updatedSettings = { soundEnabled: true, autoAdvance: false, language: 'fr' };
      mockFetchWithAuth.mockResolvedValueOnce(updatedSettings);

      const result = await settingsApi.updateSettings(partial);

      expect(mockFetchWithAuth).toHaveBeenCalledWith('/api/settings', {
        method: 'PUT',
        body: JSON.stringify(partial),
      });
      expect(result).toEqual(updatedSettings);
    });

    it('sends PUT with multiple fields', async () => {
      const partial = { soundEnabled: false, autoAdvance: true, language: 'zh-CN' };
      mockFetchWithAuth.mockResolvedValueOnce(partial);

      const result = await settingsApi.updateSettings(partial);

      expect(mockFetchWithAuth).toHaveBeenCalledWith('/api/settings', {
        method: 'PUT',
        body: JSON.stringify(partial),
      });
      expect(result).toEqual(partial);
    });
  });
});
