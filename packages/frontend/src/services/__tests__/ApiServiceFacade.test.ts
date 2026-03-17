import { describe, it, expect, vi } from 'vitest';

// Mock all domain API modules before importing the facade
vi.mock('../api/baseApi', () => ({
  baseApi: {
    fetchWithAuth: vi.fn(),
    getBaseUrl: vi.fn().mockReturnValue('http://localhost:9876/api'),
    setTokens: vi.fn(),
    clearTokens: vi.fn(),
    hasTokens: vi.fn().mockReturnValue(false),
    getAccessToken: vi.fn(),
  },
}));

vi.mock('../api/authApi', () => ({
  authApi: {
    register: vi.fn(),
    registerStudent: vi.fn(),
    registerParent: vi.fn(),
    googleAuth: vi.fn(),
    updateProfile: vi.fn(),
    createStudentForParent: vi.fn(),
    forgotPassword: vi.fn(),
    resetPassword: vi.fn(),
    validateResetToken: vi.fn(),
    resetUserPassword: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    getCurrentUser: vi.fn(),
  },
}));

vi.mock('../api/settingsApi', () => ({
  settingsApi: {
    getSettings: vi.fn(),
    updateSettings: vi.fn(),
  },
}));

vi.mock('../api/statsApi', () => ({
  statsApi: {
    getStats: vi.fn(),
    updateStats: vi.fn(),
    incrementStats: vi.fn(),
    getWeakWords: vi.fn(),
    getActivityStats: vi.fn(),
  },
}));

vi.mock('../api/challengeApi', () => ({
  challengeApi: {
    getTodayChallenge: vi.fn(),
    completeChallenge: vi.fn(),
    getChallengeHistory: vi.fn(),
    getStreak: vi.fn(),
  },
}));

vi.mock('../api/quizApi', () => ({
  quizApi: {
    saveQuizResult: vi.fn(),
    saveStudySession: vi.fn(),
    importData: vi.fn(),
    exportData: vi.fn(),
    healthCheck: vi.fn(),
  },
}));

vi.mock('../api/adminApi', () => ({
  adminApi: {
    getAdminUsers: vi.fn(),
    getAdminUserDetails: vi.fn(),
    updateUserRole: vi.fn(),
    updateUserParent: vi.fn(),
    createUser: vi.fn(),
    updateUserEmail: vi.fn(),
    deleteUser: vi.fn(),
    getThresholds: vi.fn(),
    updateThresholds: vi.fn(),
  },
}));

vi.mock('../api/notificationApi', () => ({
  notificationApi: {
    getNotifications: vi.fn(),
    getNotificationCount: vi.fn(),
    markNotificationRead: vi.fn(),
    markAllNotificationsRead: vi.fn(),
  },
}));

vi.mock('../api/linkRequestApi', () => ({
  linkRequestApi: {
    searchStudents: vi.fn(),
    sendLinkRequest: vi.fn(),
    getLinkRequests: vi.fn(),
    respondToLinkRequest: vi.fn(),
    cancelLinkRequest: vi.fn(),
  },
}));

vi.mock('../api/wordlistApi', () => ({
  wordlistApi: {
    getWordlists: vi.fn(),
    getWordlist: vi.fn(),
    getWordlistWords: vi.fn(),
    getActiveWordlist: vi.fn(),
    setActiveWordlist: vi.fn(),
    createWordlist: vi.fn(),
    importWordlist: vi.fn(),
    updateWordlist: vi.fn(),
    deleteWordlist: vi.fn(),
    addWordsToWordlist: vi.fn(),
    updateWordInWordlist: vi.fn(),
    deleteWordFromWordlist: vi.fn(),
  },
}));

import { ApiService } from '../ApiService';
import { baseApi } from '../api/baseApi';
import { authApi } from '../api/authApi';
import { settingsApi } from '../api/settingsApi';
import { statsApi } from '../api/statsApi';
import { challengeApi } from '../api/challengeApi';
import { quizApi } from '../api/quizApi';
import { adminApi } from '../api/adminApi';
import { notificationApi } from '../api/notificationApi';
import { linkRequestApi } from '../api/linkRequestApi';
import { wordlistApi } from '../api/wordlistApi';

describe('ApiService Facade', () => {
  it('is a singleton instance', () => {
    expect(ApiService).toBeDefined();
    expect(typeof ApiService).toBe('object');
  });

  describe('token management delegates to baseApi', () => {
    it('setTokens delegates to baseApi', () => {
      ApiService.setTokens('access', 'refresh');
      expect(baseApi.setTokens).toHaveBeenCalledWith('access', 'refresh');
    });

    it('clearTokens delegates to baseApi', () => {
      ApiService.clearTokens();
      expect(baseApi.clearTokens).toHaveBeenCalled();
    });

    it('hasTokens delegates to baseApi', () => {
      ApiService.hasTokens();
      expect(baseApi.hasTokens).toHaveBeenCalled();
    });
  });

  describe('auth methods delegate to authApi', () => {
    it('login delegates', () => {
      expect(ApiService.login).toBe(authApi.login);
    });

    it('logout delegates', () => {
      expect(ApiService.logout).toBe(authApi.logout);
    });

    it('register delegates', () => {
      expect(ApiService.register).toBe(authApi.register);
    });

    it('registerStudent delegates', () => {
      expect(ApiService.registerStudent).toBe(authApi.registerStudent);
    });

    it('registerParent delegates', () => {
      expect(ApiService.registerParent).toBe(authApi.registerParent);
    });

    it('googleAuth delegates', () => {
      expect(ApiService.googleAuth).toBe(authApi.googleAuth);
    });

    it('getCurrentUser delegates', () => {
      expect(ApiService.getCurrentUser).toBe(authApi.getCurrentUser);
    });

    it('forgotPassword delegates', () => {
      expect(ApiService.forgotPassword).toBe(authApi.forgotPassword);
    });

    it('resetPassword delegates', () => {
      expect(ApiService.resetPassword).toBe(authApi.resetPassword);
    });
  });

  describe('settings methods delegate to settingsApi', () => {
    it('getSettings delegates', () => {
      expect(ApiService.getSettings).toBe(settingsApi.getSettings);
    });

    it('updateSettings delegates', () => {
      expect(ApiService.updateSettings).toBe(settingsApi.updateSettings);
    });
  });

  describe('stats methods delegate to statsApi', () => {
    it('getStats delegates', () => {
      expect(ApiService.getStats).toBe(statsApi.getStats);
    });

    it('updateStats delegates', () => {
      expect(ApiService.updateStats).toBe(statsApi.updateStats);
    });

    it('incrementStats delegates', () => {
      expect(ApiService.incrementStats).toBe(statsApi.incrementStats);
    });

    it('getWeakWords delegates', () => {
      expect(ApiService.getWeakWords).toBe(statsApi.getWeakWords);
    });

    it('getActivityStats delegates', () => {
      expect(ApiService.getActivityStats).toBe(statsApi.getActivityStats);
    });
  });

  describe('challenge methods delegate to challengeApi', () => {
    it('getTodayChallenge delegates', () => {
      expect(ApiService.getTodayChallenge).toBe(challengeApi.getTodayChallenge);
    });

    it('completeChallenge delegates', () => {
      expect(ApiService.completeChallenge).toBe(challengeApi.completeChallenge);
    });

    it('getChallengeHistory delegates', () => {
      expect(ApiService.getChallengeHistory).toBe(challengeApi.getChallengeHistory);
    });

    it('getStreak delegates', () => {
      expect(ApiService.getStreak).toBe(challengeApi.getStreak);
    });
  });

  describe('quiz methods delegate to quizApi', () => {
    it('saveQuizResult delegates', () => {
      expect(ApiService.saveQuizResult).toBe(quizApi.saveQuizResult);
    });

    it('saveStudySession delegates', () => {
      expect(ApiService.saveStudySession).toBe(quizApi.saveStudySession);
    });

    it('importData delegates', () => {
      expect(ApiService.importData).toBe(quizApi.importData);
    });

    it('exportData delegates', () => {
      expect(ApiService.exportData).toBe(quizApi.exportData);
    });

    it('healthCheck delegates', () => {
      expect(ApiService.healthCheck).toBe(quizApi.healthCheck);
    });
  });

  describe('admin methods delegate to adminApi', () => {
    it('getAdminUsers delegates', () => {
      expect(ApiService.getAdminUsers).toBe(adminApi.getAdminUsers);
    });

    it('getAdminUserDetails delegates', () => {
      expect(ApiService.getAdminUserDetails).toBe(adminApi.getAdminUserDetails);
    });

    it('createUser delegates', () => {
      expect(ApiService.createUser).toBe(adminApi.createUser);
    });

    it('deleteUser delegates', () => {
      expect(ApiService.deleteUser).toBe(adminApi.deleteUser);
    });

    it('getThresholds delegates', () => {
      expect(ApiService.getThresholds).toBe(adminApi.getThresholds);
    });

    it('updateThresholds delegates', () => {
      expect(ApiService.updateThresholds).toBe(adminApi.updateThresholds);
    });
  });

  describe('notification methods delegate to notificationApi', () => {
    it('getNotifications delegates', () => {
      expect(ApiService.getNotifications).toBe(notificationApi.getNotifications);
    });

    it('getNotificationCount delegates', () => {
      expect(ApiService.getNotificationCount).toBe(notificationApi.getNotificationCount);
    });

    it('markNotificationRead delegates', () => {
      expect(ApiService.markNotificationRead).toBe(notificationApi.markNotificationRead);
    });

    it('markAllNotificationsRead delegates', () => {
      expect(ApiService.markAllNotificationsRead).toBe(notificationApi.markAllNotificationsRead);
    });
  });

  describe('link request methods delegate to linkRequestApi', () => {
    it('searchStudents delegates', () => {
      expect(ApiService.searchStudents).toBe(linkRequestApi.searchStudents);
    });

    it('sendLinkRequest delegates', () => {
      expect(ApiService.sendLinkRequest).toBe(linkRequestApi.sendLinkRequest);
    });

    it('getLinkRequests delegates', () => {
      expect(ApiService.getLinkRequests).toBe(linkRequestApi.getLinkRequests);
    });

    it('respondToLinkRequest delegates', () => {
      expect(ApiService.respondToLinkRequest).toBe(linkRequestApi.respondToLinkRequest);
    });

    it('cancelLinkRequest delegates', () => {
      expect(ApiService.cancelLinkRequest).toBe(linkRequestApi.cancelLinkRequest);
    });
  });

  describe('wordlist methods delegate to wordlistApi', () => {
    it('getWordlists delegates', () => {
      expect(ApiService.getWordlists).toBe(wordlistApi.getWordlists);
    });

    it('getWordlist delegates', () => {
      expect(ApiService.getWordlist).toBe(wordlistApi.getWordlist);
    });

    it('getWordlistWords delegates', () => {
      expect(ApiService.getWordlistWords).toBe(wordlistApi.getWordlistWords);
    });

    it('getActiveWordlist delegates', () => {
      expect(ApiService.getActiveWordlist).toBe(wordlistApi.getActiveWordlist);
    });

    it('setActiveWordlist delegates', () => {
      expect(ApiService.setActiveWordlist).toBe(wordlistApi.setActiveWordlist);
    });

    it('createWordlist delegates', () => {
      expect(ApiService.createWordlist).toBe(wordlistApi.createWordlist);
    });

    it('importWordlist delegates', () => {
      expect(ApiService.importWordlist).toBe(wordlistApi.importWordlist);
    });

    it('deleteWordlist delegates', () => {
      expect(ApiService.deleteWordlist).toBe(wordlistApi.deleteWordlist);
    });
  });
});
