import type { UserSettings, UserStats } from '../types';

const STORAGE_KEYS = {
  SETTINGS: 'vocab_master_settings',
  STATS: 'vocab_master_stats',
  DAILY_CHALLENGE_DATE: 'vocab_master_challenge_date',
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
  // Settings
  getSettings(): UserSettings {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (stored) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
      }
    } catch {
      console.debug('Failed to load settings from localStorage');
    }
    return DEFAULT_SETTINGS;
  },

  saveSettings(settings: UserSettings): void {
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    } catch {
      console.debug('Failed to save settings to localStorage');
    }
  },

  updateSettings(updates: Partial<UserSettings>): UserSettings {
    const current = this.getSettings();
    const updated = { ...current, ...updates };
    this.saveSettings(updated);
    return updated;
  },

  // Stats
  getStats(): UserStats {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.STATS);
      if (stored) {
        return { ...DEFAULT_STATS, ...JSON.parse(stored) };
      }
    } catch {
      console.debug('Failed to load stats from localStorage');
    }
    return DEFAULT_STATS;
  },

  saveStats(stats: UserStats): void {
    try {
      localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(stats));
    } catch {
      console.debug('Failed to save stats to localStorage');
    }
  },

  updateStats(updates: Partial<UserStats>): UserStats {
    const current = this.getStats();
    const updated = { ...current, ...updates };
    this.saveStats(updated);
    return updated;
  },

  // Daily Challenge
  getDailyChallengeDate(): string | null {
    try {
      return localStorage.getItem(STORAGE_KEYS.DAILY_CHALLENGE_DATE);
    } catch {
      return null;
    }
  },

  setDailyChallengeDate(date: string): void {
    try {
      localStorage.setItem(STORAGE_KEYS.DAILY_CHALLENGE_DATE, date);
    } catch {
      console.debug('Failed to save daily challenge date');
    }
  },

  hasTodayChallenge(): boolean {
    const today = new Date().toISOString().split('T')[0];
    return this.getDailyChallengeDate() === today;
  },
};
