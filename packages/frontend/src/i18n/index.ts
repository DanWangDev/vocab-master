import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import commonEn from './locales/en/common.json'
import authEn from './locales/en/auth.json'
import dashboardEn from './locales/en/dashboard.json'
import studyEn from './locales/en/study.json'
import quizEn from './locales/en/quiz.json'
import challengeEn from './locales/en/challenge.json'
import adminEn from './locales/en/admin.json'
import parentEn from './locales/en/parent.json'
import notificationsEn from './locales/en/notifications.json'
import linkingEn from './locales/en/linking.json'
import wordlistsEn from './locales/en/wordlists.json'
import achievementsEn from './locales/en/achievements.json'
import leaderboardEn from './locales/en/leaderboard.json'
import groupsEn from './locales/en/groups.json'
import reportsEn from './locales/en/reports.json'
import flashcardEn from './locales/en/flashcard.json'
import exercisesEn from './locales/en/exercises.json'
import pvpEn from './locales/en/pvp.json'
import gamificationEn from './locales/en/gamification.json'

import commonZh from './locales/zh-CN/common.json'
import authZh from './locales/zh-CN/auth.json'
import dashboardZh from './locales/zh-CN/dashboard.json'
import studyZh from './locales/zh-CN/study.json'
import quizZh from './locales/zh-CN/quiz.json'
import challengeZh from './locales/zh-CN/challenge.json'
import adminZh from './locales/zh-CN/admin.json'
import parentZh from './locales/zh-CN/parent.json'
import notificationsZh from './locales/zh-CN/notifications.json'
import linkingZh from './locales/zh-CN/linking.json'
import wordlistsZh from './locales/zh-CN/wordlists.json'
import achievementsZh from './locales/zh-CN/achievements.json'
import leaderboardZh from './locales/zh-CN/leaderboard.json'
import groupsZh from './locales/zh-CN/groups.json'
import reportsZh from './locales/zh-CN/reports.json'
import flashcardZh from './locales/zh-CN/flashcard.json'
import exercisesZh from './locales/zh-CN/exercises.json'
import pvpZh from './locales/zh-CN/pvp.json'
import gamificationZh from './locales/zh-CN/gamification.json'

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        common: commonEn,
        auth: authEn,
        dashboard: dashboardEn,
        study: studyEn,
        quiz: quizEn,
        challenge: challengeEn,
        admin: adminEn,
        parent: parentEn,
        notifications: notificationsEn,
        linking: linkingEn,
        wordlists: wordlistsEn,
        achievements: achievementsEn,
        leaderboard: leaderboardEn,
        groups: groupsEn,
        reports: reportsEn,
        flashcard: flashcardEn,
        exercises: exercisesEn,
        pvp: pvpEn,
        gamification: gamificationEn,
      },
      'zh-CN': {
        common: commonZh,
        auth: authZh,
        dashboard: dashboardZh,
        study: studyZh,
        quiz: quizZh,
        challenge: challengeZh,
        admin: adminZh,
        parent: parentZh,
        notifications: notificationsZh,
        linking: linkingZh,
        wordlists: wordlistsZh,
        achievements: achievementsZh,
        leaderboard: leaderboardZh,
        groups: groupsZh,
        reports: reportsZh,
        flashcard: flashcardZh,
        exercises: exercisesZh,
        pvp: pvpZh,
        gamification: gamificationZh,
      },
    },
    fallbackLng: 'en',
    defaultNS: 'common',
    ns: [
      'common',
      'auth',
      'dashboard',
      'study',
      'quiz',
      'challenge',
      'admin',
      'parent',
      'notifications',
      'linking',
      'wordlists',
      'achievements',
      'leaderboard',
      'groups',
      'reports',
      'flashcard',
      'exercises',
      'pvp',
      'gamification',
    ],
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'vocab_master_language',
      caches: ['localStorage'],
    },
  })

export default i18n
