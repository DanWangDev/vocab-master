// Legacy facade - delegates to domain-specific API modules
// New code should import from './api/' directly

import { baseApi } from './api/baseApi';
import { authApi } from './api/authApi';
import { settingsApi } from './api/settingsApi';
import { statsApi } from './api/statsApi';
import { challengeApi } from './api/challengeApi';
import { quizApi } from './api/quizApi';
import { adminApi } from './api/adminApi';
import { notificationApi } from './api/notificationApi';
import { linkRequestApi } from './api/linkRequestApi';
import { wordlistApi } from './api/wordlistApi';

// Re-export all types for backward compatibility
export * from './api/types';

class ApiServiceClass {
  // Token management - delegates to baseApi
  setTokens = baseApi.setTokens.bind(baseApi);
  clearTokens = baseApi.clearTokens.bind(baseApi);
  hasTokens = baseApi.hasTokens.bind(baseApi);

  // Auth
  register = authApi.register;
  registerStudent = authApi.registerStudent;
  registerParent = authApi.registerParent;
  googleAuth = authApi.googleAuth;
  updateProfile = authApi.updateProfile;
  createStudentForParent = authApi.createStudentForParent;
  forgotPassword = authApi.forgotPassword;
  resetPassword = authApi.resetPassword;
  validateResetToken = authApi.validateResetToken;
  resetUserPassword = authApi.resetUserPassword;
  login = authApi.login;
  logout = authApi.logout;
  getCurrentUser = authApi.getCurrentUser;

  // Settings
  getSettings = settingsApi.getSettings;
  updateSettings = settingsApi.updateSettings;

  // Stats
  getStats = statsApi.getStats;
  updateStats = statsApi.updateStats;
  incrementStats = statsApi.incrementStats;
  getWeakWords = statsApi.getWeakWords;
  getActivityStats = statsApi.getActivityStats;

  // Challenges
  getTodayChallenge = challengeApi.getTodayChallenge;
  completeChallenge = challengeApi.completeChallenge;
  getChallengeHistory = challengeApi.getChallengeHistory;
  getStreak = challengeApi.getStreak;

  // Quiz & Study
  saveQuizResult = quizApi.saveQuizResult;
  saveStudySession = quizApi.saveStudySession;
  importData = quizApi.importData;
  exportData = quizApi.exportData;

  // Admin
  getAdminUsers = adminApi.getAdminUsers;
  getAdminUserDetails = adminApi.getAdminUserDetails;
  updateUserRole = adminApi.updateUserRole;
  updateUserParent = adminApi.updateUserParent;
  createUser = adminApi.createUser;
  updateUserEmail = adminApi.updateUserEmail;
  deleteUser = adminApi.deleteUser;
  getThresholds = adminApi.getThresholds;
  updateThresholds = adminApi.updateThresholds;

  // Notifications
  getNotifications = notificationApi.getNotifications;
  getNotificationCount = notificationApi.getNotificationCount;
  markNotificationRead = notificationApi.markNotificationRead;
  markAllNotificationsRead = notificationApi.markAllNotificationsRead;

  // Link Requests
  searchStudents = linkRequestApi.searchStudents;
  sendLinkRequest = linkRequestApi.sendLinkRequest;
  getLinkRequests = linkRequestApi.getLinkRequests;
  respondToLinkRequest = linkRequestApi.respondToLinkRequest;
  cancelLinkRequest = linkRequestApi.cancelLinkRequest;

  // Wordlists
  getWordlists = wordlistApi.getWordlists;
  getWordlist = wordlistApi.getWordlist;
  getWordlistWords = wordlistApi.getWordlistWords;
  getActiveWordlist = wordlistApi.getActiveWordlist;
  setActiveWordlist = wordlistApi.setActiveWordlist;
  createWordlist = wordlistApi.createWordlist;
  importWordlist = wordlistApi.importWordlist;
  updateWordlist = wordlistApi.updateWordlist;
  deleteWordlist = wordlistApi.deleteWordlist;
  addWordsToWordlist = wordlistApi.addWordsToWordlist;
  updateWordInWordlist = wordlistApi.updateWordInWordlist;
  deleteWordFromWordlist = wordlistApi.deleteWordFromWordlist;

  // Health
  healthCheck = quizApi.healthCheck;
}

// Singleton instance
export const ApiService = new ApiServiceClass();
export default ApiService;
