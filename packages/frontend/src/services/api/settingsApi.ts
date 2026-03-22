// Settings API endpoints

import { baseApi } from './baseApi';
import type { UserSettings } from './types';

export const settingsApi = {
  async getSettings(): Promise<UserSettings> {
    return baseApi.fetchWithAuth<UserSettings>('/api/settings');
  },

  async updateSettings(settings: Partial<UserSettings>): Promise<UserSettings> {
    return baseApi.fetchWithAuth<UserSettings>('/api/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  },
};
