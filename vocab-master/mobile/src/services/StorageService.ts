import AsyncStorage from '@react-native-async-storage/async-storage';
import type { UserSettings, UserStats } from '@vocab-master/shared';

const STORAGE_KEYS = {
  SETTINGS: 'vocab_master_settings',
  STATS: 'vocab_master_stats',
  DAILY_CHALLENGE_DATE: 'vocab_master_challenge_date',
  LANGUAGE: 'vocab_master_language',
} as const;

const DEFAULT_SETTINGS: UserSettings = {
  soundEnabled: true,
  autoAdvance: false,
  language: 'en',
};

const DEFAULT_STATS: UserStats = {
  totalWordsStudied: 0,
  quizzesTaken: 0,
  challengesCompleted: 0,
  bestChallengeScore: 0,
  lastStudyDate: null,
};

export const StorageService = {
  async getSettings(): Promise<UserSettings> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (stored) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
      }
    } catch {
      // Failed to load settings
    }
    return DEFAULT_SETTINGS;
  },

  async saveSettings(settings: UserSettings): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    } catch {
      // Failed to save settings
    }
  },

  async updateSettings(updates: Partial<UserSettings>): Promise<UserSettings> {
    const current = await this.getSettings();
    const updated = { ...current, ...updates };
    await this.saveSettings(updated);
    return updated;
  },

  async getStats(): Promise<UserStats> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.STATS);
      if (stored) {
        return { ...DEFAULT_STATS, ...JSON.parse(stored) };
      }
    } catch {
      // Failed to load stats
    }
    return DEFAULT_STATS;
  },

  async saveStats(stats: UserStats): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(stats));
    } catch {
      // Failed to save stats
    }
  },

  async updateStats(updates: Partial<UserStats>): Promise<UserStats> {
    const current = await this.getStats();
    const updated = { ...current, ...updates };
    await this.saveStats(updated);
    return updated;
  },

  async getDailyChallengeDate(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(STORAGE_KEYS.DAILY_CHALLENGE_DATE);
    } catch {
      return null;
    }
  },

  async setDailyChallengeDate(date: string): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.DAILY_CHALLENGE_DATE, date);
    } catch {
      // Failed to save
    }
  },

  async hasTodayChallenge(): Promise<boolean> {
    const today = new Date().toISOString().split('T')[0];
    const stored = await this.getDailyChallengeDate();
    return stored === today;
  },

  async getLanguage(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(STORAGE_KEYS.LANGUAGE);
    } catch {
      return null;
    }
  },

  async setLanguage(language: string): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.LANGUAGE, language);
    } catch {
      // Failed to save
    }
  },
};
